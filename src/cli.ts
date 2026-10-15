import { readFileSync } from 'node:fs';
import { apply, type ApplyResult } from './apply.js';
import { RestDiscordApi, type DiscordApi } from './discord.js';
import { addProject, loadHub, saveHub, type GuildSnapshot, type Hub } from './model.js';
import { describeOp, plan, type Op } from './plan.js';

const USAGE = `usage: discord-hub <command> [options]

commands
  init                       ensure the shared channels + onboarding prompt, then every project
  new <slug> --name <Name> [--emoji E] [--repo owner/repo]
                             add a project to hub.json and provision it
  plan                       print what apply would do (no changes)
  apply                      reconcile the guild with hub.json
  archive <slug>             drop the project from onboarding, rename its category

options
  --hub <path>               hub.json to use (default ./hub.json)
  --snapshot <file>          read guild state from a JSON snapshot instead of Discord (dry run)
  --dry-run                  print the plan without applying
  --shared                   plan/apply: include the seven shared top-level channels
  --no-onboarding            leave the onboarding prompt alone (keeps new projects behind the wall)

env
  DISCORD_BOT_TOKEN          bot token, required for every live command (never stored)

exit codes: 0 ok, 1 failure, 2 usage`;

interface Args {
  command: string | undefined;
  positional: string[];
  hub: string;
  snapshot?: string;
  dryRun: boolean;
  shared: boolean;
  noOnboarding: boolean;
  name?: string;
  emoji?: string;
  repo?: string;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { command: undefined, positional: [], hub: 'hub.json', dryRun: false, shared: false, noOnboarding: false };
  const takeValue = (flag: string, i: number): string => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new UsageError(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--hub': args.hub = takeValue(a, i++); break;
      case '--snapshot': args.snapshot = takeValue(a, i++); break;
      case '--name': args.name = takeValue(a, i++); break;
      case '--emoji': args.emoji = takeValue(a, i++); break;
      case '--repo': args.repo = takeValue(a, i++); break;
      case '--dry-run': args.dryRun = true; break;
      case '--shared': args.shared = true; break;
      case '--no-onboarding': args.noOnboarding = true; break;
      case '--help': case '-h': throw new UsageError('');
      default:
        if (a.startsWith('--')) throw new UsageError(`unknown option ${a}`);
        if (args.command === undefined) args.command = a;
        else args.positional.push(a);
    }
  }
  return args;
}

class UsageError extends Error {}

/** A DiscordApi that only answers snapshot(); every mutation is a bug in dry-run routing. */
class SnapshotApi implements DiscordApi {
  constructor(private readonly snap: GuildSnapshot) {}
  async snapshot(): Promise<GuildSnapshot> { return this.snap; }
  private refuse(): never { throw new Error('snapshot mode is read-only'); }
  createRole(): never { this.refuse(); }
  createChannel(): never { this.refuse(); }
  modifyChannel(): never { this.refuse(); }
  createWebhook(): never { this.refuse(); }
  getOnboarding(): never { this.refuse(); }
  putOnboarding(): never { this.refuse(); }
}

function printOps(ops: Op[], out: (s: string) => void): void {
  if (ops.length === 0) { out('nothing to do: the guild already matches hub.json'); return; }
  ops.forEach((op, i) => out(`  ${i + 1}. ${describeOp(op)}`));
}

function announcerSnippet(slug: string, name: string, repo: string | undefined): string {
  const lines = [
    `Announcer for ${name}: copy templates/discord-announce.yml into ${repo ?? '<owner/repo>'} as .github/workflows/discord-announce.yml,`,
    `  set project_name: "${name}", and add the repo secrets DISCORD_WEBHOOK_URL (printed above when created) and ANTHROPIC_API_KEY.`,
  ];
  return lines.join('\n');
}

function reportApply(result: ApplyResult, hub: Hub, out: (s: string) => void, err: (s: string) => void): number {
  for (const op of result.completed) out(`  done: ${describeOp(op)}`);
  for (const w of result.webhooks) {
    const project = hub.projects.find((p) => p.slug === w.slug);
    out('');
    out(`Webhook for ${w.slug} (shown once, not saved anywhere):`);
    out(`  ${w.url}`);
    out(`  Store it as the DISCORD_WEBHOOK_URL secret of ${project?.repo ?? 'the project repo'}.`);
  }
  if (result.failed) {
    err('');
    err(`apply failed at: ${describeOp(result.failed.op)}`);
    err(`  ${result.failed.error}`);
    err(`  ${result.completed.length} operation(s) completed before the failure; re-run apply to resume from the current guild state.`);
    return 1;
  }
  return 0;
}

export async function main(argv: string[], io = { out: console.log, err: console.error, env: process.env }): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    if (e instanceof UsageError && e.message) io.err(e.message);
    io.err(USAGE);
    return 2;
  }
  if (!args.command) { io.err(USAGE); return 2; }

  try {
    let hub = loadHub(args.hub);
    let shared = args.shared;

    switch (args.command) {
      case 'init':
        shared = true;
        break;
      case 'new': {
        const slug = args.positional[0];
        if (!slug || !args.name) throw new UsageError('new needs <slug> and --name <Name>');
        hub = addProject(hub, { slug, name: args.name, ...(args.emoji ? { emoji: args.emoji } : {}), ...(args.repo ? { repo: args.repo } : {}) });
        saveHub(args.hub, hub);
        io.out(`added ${slug} to ${args.hub}`);
        break;
      }
      case 'archive': {
        const slug = args.positional[0];
        if (!slug) throw new UsageError('archive needs <slug>');
        const p = hub.projects.find((q) => q.slug === slug);
        if (!p) throw new Error(`no project ${slug} in ${args.hub}`);
        hub = { ...hub, projects: hub.projects.map((q) => (q.slug === slug ? { ...q, archived: true } : q)) };
        saveHub(args.hub, hub);
        io.out(`archived ${slug} in ${args.hub}`);
        break;
      }
      case 'plan':
      case 'apply':
        break;
      default:
        throw new UsageError(`unknown command ${args.command}`);
    }

    const dryRun = args.command === 'plan' || args.dryRun || args.snapshot !== undefined;
    let api: DiscordApi;
    if (args.snapshot) {
      api = new SnapshotApi(JSON.parse(readFileSync(args.snapshot, 'utf8')) as GuildSnapshot);
    } else {
      const token = io.env.DISCORD_BOT_TOKEN;
      if (!token) { io.err('DISCORD_BOT_TOKEN is not set; export the bot token or use --snapshot <file> for a dry run'); return 2; }
      api = new RestDiscordApi(token);
    }

    const snapshot = await api.snapshot(hub.guildId);
    const ops = plan(hub, snapshot, { shared }).filter((op) => !(args.noOnboarding && op.kind === 'upsert-onboarding'));
    io.out(dryRun ? `plan (dry-run, ${ops.length} operation(s)):` : `applying ${ops.length} operation(s):`);
    printOps(ops, io.out);

    let code = 0;
    if (!dryRun && ops.length > 0) {
      const result = await apply(ops, api, hub, snapshot);
      code = reportApply(result, hub, io.out, io.err);
    }
    if (args.command === 'new') {
      const p = hub.projects[hub.projects.length - 1];
      io.out('');
      io.out(announcerSnippet(p.slug, p.name, p.repo));
    }
    return code;
  } catch (e) {
    if (e instanceof UsageError) { io.err(e.message); io.err(USAGE); return 2; }
    io.err(e instanceof Error ? e.message : String(e));
    return 1;
  }
}
