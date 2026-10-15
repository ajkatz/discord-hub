import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';

describe('announcer', () => {
  it('announce.mjs skips a push that only touches .github/', () => {
    const src = readFileSync('announcer/announce.mjs', 'utf8');
    expect(src).toMatch(/SILENT_PREFIXES = \[\".github\/\"\]/);
    expect(src.indexOf('SILENT_PREFIXES')).toBeLessThan(src.indexOf('async function claudeSummary'));
  });

  it('announce.mjs parses', () => {
    const r = spawnSync('node', ['--check', 'announcer/announce.mjs'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('both workflow files parse as YAML (an unquoted colon in a description broke every caller once)', () => {
    for (const f of ['.github/workflows/announce.yml', 'templates/discord-announce.yml']) {
      expect(() => parse(readFileSync(f, 'utf8')), f).not.toThrow();
    }
    const called = parse(readFileSync('.github/workflows/announce.yml', 'utf8'));
    expect(Object.keys(called.on.workflow_call.inputs)).toEqual(['project_name', 'project_description', 'hub_ref', 'replay_from', 'replay_to']);
  });

  it('the reusable workflow is callable and declares both secrets', () => {
    const wf = readFileSync('.github/workflows/announce.yml', 'utf8');
    expect(wf).toMatch(/workflow_call/);
    expect(wf).toMatch(/DISCORD_WEBHOOK_URL/);
    expect(wf).toMatch(/ANTHROPIC_API_KEY/);
    expect(wf).toMatch(/project_name/);
    expect(wf).toMatch(/fetch-depth: 0/);
  });

  it('the reusable workflow runs on a push OR a replay, and hands the range to the announcer', () => {
    const called = parse(readFileSync('.github/workflows/announce.yml', 'utf8'));
    const job = called.jobs.announce;
    expect(String(job.if)).toMatch(/head_commit != null/);
    expect(String(job.if)).toMatch(/replay_from/);
    const run = job.steps.find((s: any) => s.name === 'Summarize and announce');
    expect(run.env.REPLAY_FROM).toBe('${{ inputs.replay_from }}');
    expect(run.env.REPLAY_TO).toBe('${{ inputs.replay_to }}');
  });

  it('the caller template points at this repo and passes both secrets by name', () => {
    const t = readFileSync('templates/discord-announce.yml', 'utf8');
    expect(t).toMatch(/uses: ajkatz\/discord-hub\/\.github\/workflows\/announce\.yml@/);
    expect(t).toMatch(/DISCORD_WEBHOOK_URL: \$\{\{ secrets\.DISCORD_WEBHOOK_URL \}\}/);
    expect(t).toMatch(/ANTHROPIC_API_KEY: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
    expect(t).not.toMatch(/secrets: inherit/);
    expect(t).toMatch(/branches: \[main\]/);
  });

  it('the caller template offers a manual make-up run with a from/to range', () => {
    const t = parse(readFileSync('templates/discord-announce.yml', 'utf8'));
    expect(Object.keys(t.on.workflow_dispatch.inputs)).toEqual(['from', 'to']);
    expect(t.on.workflow_dispatch.inputs.from.required).toBe(true);
    expect(t.on.workflow_dispatch.inputs.to.required).toBe(false);
    expect(t.jobs.announce.with.replay_from).toBe('${{ inputs.from }}');
    expect(t.jobs.announce.with.replay_to).toBe('${{ inputs.to }}');
  });
});

/** A real git repo, a local webhook, the real script: the replay path end to end. */
describe('announcer replay', () => {
  const work = mkdtempSync(join(tmpdir(), 'announcer-replay-'));
  const repo = join(work, 'repo');
  const git = (...args: string[]) => {
    const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const commit = (msg: string, files: Record<string, string>) => {
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(join(repo, path, '..'), { recursive: true });
      writeFileSync(join(repo, path), body);
    }
    git('add', '-A');
    git('-c', 'user.name=Purrdee', '-c', 'user.email=p@example.com', 'commit', '-q', '-m', msg);
    return git('rev-parse', 'HEAD');
  };

  mkdirSync(repo);
  spawnSync('git', ['init', '-q', '-b', 'main', repo]);
  const base = commit('0.5.3: the release before', {
    'README.md': 'hi\n',
    'docs/features.json': JSON.stringify({ features: [{ id: 'owned-bis', title: 'Best owned set', since: '0.1.0' }] }),
  });
  const mid = commit('feat: runes in your rune pouch count as owned\n\nMumblerit asked.', {
    'src/Ledger.java': 'class Ledger {}\n',
    'docs/features.json': JSON.stringify({ features: [
      { id: 'owned-bis', title: 'Best owned set', since: '0.1.0' },
      { id: 'rune-pouch', title: 'Rune pouch tracking', since: '0.5.4' },
    ] }),
  });
  const head = commit('0.5.4: rune pouch runes count', { 'build.gradle': "version = '0.5.4'\n" });
  const ciOnly = commit('ci: pass announcer secrets by name', { '.github/workflows/discord-announce.yml': 'name: x\n' });

  const posts: any[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => { posts.push(JSON.parse(body)); res.statusCode = 204; res.end(); });
  });
  const ready = new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as any).port)));
  afterAll(() => { server.close(); rmSync(work, { recursive: true, force: true }); });

  const dispatchEvent = join(work, 'event.json');
  writeFileSync(dispatchEvent, JSON.stringify({
    ref: 'refs/heads/main',
    repository: { full_name: 'AKAddons/demo', name: 'demo', html_url: 'https://github.com/AKAddons/demo' },
    sender: { login: 'ajkatz' },
    inputs: { from: '', to: '' },
  }));

  // Async on purpose: a sync spawn would block this process's event loop, and
  // the webhook server above lives in it - the child would wait forever.
  const run = async (from: string, to: string) => {
    const port = await ready;
    posts.length = 0;
    const r = await promisify(execFile)('node', ['announcer/announce.mjs'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: '',
        DISCORD_WEBHOOK_URL: `http://127.0.0.1:${port}/hook`,
        GITHUB_EVENT_PATH: dispatchEvent,
        GITHUB_WORKSPACE: repo,
        PROJECT_NAME: 'Demo',
        REPLAY_FROM: from,
        REPLAY_TO: to,
      },
    }).then((r) => ({ status: 0, ...r }), (e) => ({ status: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' }));
    return r;
  };

  it('rebuilds the push from the range and posts one embed with every commit in it', async () => {
    const r = await run(base, head);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/Replaying/);
    expect(posts).toHaveLength(1);
    const embed = posts[0].embeds[0];
    expect(embed.title).toBe('🚀 2 new commits on demo/main');
    expect(embed.url).toBe(`https://github.com/AKAddons/demo/compare/${base.slice(0, 12)}...${head.slice(0, 12)}`);
    const commitsField = embed.fields[0];
    expect(commitsField.name).toBe('Commits (2)');
    expect(commitsField.value).toMatch(new RegExp(`\\[\`${head.slice(0, 7)}\`\\]\\(https://github.com/AKAddons/demo/commit/${head}\\) 0.5.4: rune pouch runes count — Purrdee`));
    expect(commitsField.value.indexOf(head.slice(0, 7))).toBeLessThan(commitsField.value.indexOf(mid.slice(0, 7)));
    expect(embed.footer.text).toBe('AKAddons/demo • pushed by ajkatz');
    expect(posts[0].username).toBe('Demo');
  });

  it('spots the feature the range added, exactly like a push would', async () => {
    const r = await run(base, head);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const embed = posts[0].embeds[0];
    expect(embed.fields[1].name).toBe('New feature');
    expect(embed.fields[1].value).toBe('✨ **Rune pouch tracking** — v0.5.4');
    expect(embed.color).toBe(0x57f287);
    expect(embed.description).toMatch(/New feature: \*\*Rune pouch tracking\*\* \(v0\.5\.4\)/);
  });

  it('accepts a tag and defaults the end of the range to HEAD', async () => {
    git('tag', 'v0.5.3', base);
    const r = await run('v0.5.3', '');
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(posts[0].embeds[0].title).toBe('🚀 3 new commits on demo/main');
  });

  it('stays quiet when the range only touches CI files', async () => {
    const r = await run(head, ciOnly);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/only touched CI/);
    expect(posts).toHaveLength(0);
  });

  it('stays quiet when the range is empty', async () => {
    const r = await run(head, head);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(posts).toHaveLength(0);
  });
});
