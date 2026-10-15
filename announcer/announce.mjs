// Summarize the just-pushed commits and announce them to a Discord channel.
//
// Runs inside the "Announce pushes to Discord" GitHub Action. It reads the push
// event payload GitHub drops on disk, asks the Claude API for a single
// player-facing summary of the whole push, and posts one rich embed via a
// Discord webhook. If the Claude key is absent it degrades to a plain (non-AI)
// commit list; if the webhook is absent it exits quietly (e.g. on forks).
//
// Env:
//   DISCORD_WEBHOOK_URL  (required to post)   Discord channel webhook URL
//   ANTHROPIC_API_KEY    (optional)           enables AI summaries
//   ANTHROPIC_MODEL      (optional)           model id; default claude-haiku-5-5
//   GITHUB_EVENT_PATH    (set by Actions)     path to the push event JSON
//   GITHUB_WORKSPACE     (set by Actions)     repo root (for git commands)
//   PROJECT_NAME         (optional)           display name; default: repo name
//   PROJECT_DESCRIPTION  (optional)           one line about the project for the summary
//   PROJECT_ICON_URL     (optional)           avatar for the post; default: the repo's icon.png
//   REPLAY_FROM          (optional)           make-up run: announce the commits after this ref
//   REPLAY_TO            (optional)           ...up to this ref (default HEAD); needs REPLAY_FROM

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const FEATURES_PATH = "docs/features.json";
const MAX_SUMMARY_CHARS = 1200;

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const REPO_ROOT = process.env.GITHUB_WORKSPACE || process.cwd();
const PROJECT_NAME = process.env.PROJECT_NAME || "";
const PROJECT_DESCRIPTION = process.env.PROJECT_DESCRIPTION || "";

const log = (msg) => console.log(`[announce] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!WEBHOOK) {
  log("DISCORD_WEBHOOK_URL is not set — nothing to post. Exiting cleanly.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Load the push event GitHub handed us - or, for a make-up run, rebuild one
// from git history so everything below runs unchanged.
// ---------------------------------------------------------------------------
function git(...args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

// A missed push (Loadout Lab 0.5.4, 2026-10-15: the announce failed and a rerun
// replays the broken workflow) is announced by hand with a from/to range. The
// payload takes the shape a push delivers: commits oldest -> newest with their
// files, before/after, the compare link, the dispatcher as pusher.
function replayEvent(base, fromRef, toRef) {
  const before = git("rev-parse", `${fromRef}^{commit}`);
  const after = git("rev-parse", `${toRef}^{commit}`);
  const html = base.repository?.html_url ?? "";
  const shas = git("rev-list", "--reverse", `${before}..${after}`).split("\n").filter(Boolean);
  const commits = shas.map((sha) => {
    const [name, timestamp, ...body] = git("show", "-s", "--format=%an%n%aI%n%B", sha).split("\n");
    const added = [], modified = [], removed = [];
    for (const line of git("show", "--name-status", "--format=", sha).split("\n")) {
      const parts = line.split("\t");
      const path = parts[parts.length - 1];
      if (parts.length < 2 || !path) continue;
      (parts[0].startsWith("A") ? added : parts[0].startsWith("D") ? removed : modified).push(path);
    }
    return { id: sha, message: body.join("\n").trim(), url: `${html}/commit/${sha}`,
      author: { name }, timestamp, added, modified, removed };
  });
  log(`Replaying ${before.slice(0, 7)}..${after.slice(0, 7)} (${commits.length} commit(s)).`);
  return {
    ...base,
    ref: base.ref ?? "refs/heads/main",
    before,
    after,
    compare: `${html}/compare/${before.slice(0, 12)}...${after.slice(0, 12)}`,
    pusher: { name: base.sender?.login ?? "someone" },
    head_commit: commits[commits.length - 1] ?? null,
    commits,
  };
}

const rawEvent = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const REPLAY_FROM = process.env.REPLAY_FROM || "";
const event = REPLAY_FROM ? replayEvent(rawEvent, REPLAY_FROM, process.env.REPLAY_TO || "HEAD") : rawEvent;

const repoFullName = event.repository?.full_name ?? "unknown/repo";
const repoName = event.repository?.name ?? repoFullName;
const branch = (event.ref ?? "").replace(/^refs\/heads\//, "") || "unknown";
const pusher = event.pusher?.name ?? event.sender?.login ?? "someone";
const compareUrl = event.compare ?? event.repository?.html_url ?? "";
const before = event.before ?? ZERO_SHA;
const after = event.after ?? ZERO_SHA;

// GitHub lists commits oldest → newest; show newest first.
const commits = [...(event.commits ?? [])].reverse();
if (commits.length === 0) {
  log("Push contained no commits (branch delete or tag). Exiting cleanly.");
  process.exit(0);
}

// Distinct files touched across the push. A live payload has shipped commits
// with no file lists at all (Loadout Lab 541f584, 2026-10-15: a .github-only
// push was announced), so an empty set is re-read from git, which the
// workflow checks out with full history.
const changedFiles = new Set();
for (const c of commits) {
  for (const f of [...(c.added ?? []), ...(c.modified ?? []), ...(c.removed ?? [])]) {
    changedFiles.add(f);
  }
}
if (changedFiles.size === 0 && before !== ZERO_SHA && after !== ZERO_SHA) {
  try {
    for (const f of git("diff", "--name-only", `${before}..${after}`).split("\n")) {
      if (f) changedFiles.add(f);
    }
    log(`Payload listed no files; git names ${changedFiles.size}.`);
  } catch {
    log("Payload listed no files and git could not diff the range.");
  }
}
const featuresChanged = changedFiles.has(FEATURES_PATH);

// Housekeeping pushes (workflows, CI scripts) are not news for players.
const SILENT_PREFIXES = [".github/"];
if (changedFiles.size > 0 && [...changedFiles].every((f) => SILENT_PREFIXES.some((p) => f.startsWith(p)))) {
  log(`Push only touched CI/automation files (${changedFiles.size} file(s)) — nothing for players. Exiting cleanly.`);
  process.exit(0);
}
const hasFeatCommit = commits.some((c) => /^feat(\(|:|!)/i.test(c.message ?? ""));

// ---------------------------------------------------------------------------
// Detect new features by diffing the feature registry across the push.
// ---------------------------------------------------------------------------
function gitShow(ref, path) {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null; // path didn't exist at that ref, or ref unavailable
  }
}

function readFeatures(text) {
  if (!text) return null;
  try {
    const map = new Map();
    for (const f of JSON.parse(text).features ?? []) {
      if (f && f.id) map.set(f.id, { title: f.title ?? f.id, since: f.since ?? null });
    }
    return map;
  } catch {
    return null;
  }
}

// Titles of features that are newly present after this push.
function detectNewFeatures() {
  if (!featuresChanged || before === ZERO_SHA) return [];
  const beforeMap = readFeatures(gitShow(before, FEATURES_PATH));
  const afterMap = readFeatures(gitShow(after, FEATURES_PATH));
  if (!beforeMap || !afterMap) return [];
  const added = [];
  for (const [id, f] of afterMap) if (!beforeMap.has(id)) added.push(f);
  return added;
}

const newFeatures = detectNewFeatures();

// ---------------------------------------------------------------------------
// Build a summary — via Claude when we have a key, else a plain fallback.
// ---------------------------------------------------------------------------
const projectName = PROJECT_NAME || repoName;
const SYSTEM = `You write short, friendly release notes for the #announcements channel of the ${projectName} community Discord.${PROJECT_DESCRIPTION ? " " + PROJECT_DESCRIPTION : ""} The readers are players, not programmers.

Rules:
- Output GitHub-flavored Markdown only. No preamble, no sign-off, no headings.
- First line: a single bolded sentence summarizing the push overall.
- Then up to 6 concise bullet points ("- ") on user-facing changes and, briefly, why each matters. Fold trivial internal chores into at most one bullet, or omit them when there are user-facing changes.
- Translate developer jargon into plain language. Never mention file names, function names, or commit hashes.
- Only describe changes actually present in the input. Never speculate or invent.
- Keep the whole thing under ${MAX_SUMMARY_CHARS} characters.`;

function buildPrompt() {
  const lines = [];
  lines.push(`Repository: ${repoFullName} (branch ${branch})`);
  lines.push(`Pushed by: ${pusher}`);
  lines.push(`${commits.length} commit(s), ${changedFiles.size} file(s) changed.`);
  lines.push("");
  lines.push("Commits (newest first):");
  for (const c of commits) {
    const [subject, ...bodyLines] = (c.message ?? "").split("\n");
    const author = c.author?.username || c.author?.name || "unknown";
    lines.push(`- ${subject} [${author}]`);
    const body = bodyLines.join("\n").trim();
    if (body) lines.push(body.replace(/^/gm, "    "));
  }
  if (newFeatures.length) {
    lines.push("");
    lines.push("Newly added features in the plugin's feature registry:");
    for (const f of newFeatures) {
      lines.push(`- ${f.title}${f.since ? ` (since v${f.since})` : ""}`);
    }
  }
  lines.push("");
  lines.push("Files changed:");
  const fileList = [...changedFiles];
  for (const f of fileList.slice(0, 40)) lines.push(`- ${f}`);
  if (fileList.length > 40) lines.push(`- …and ${fileList.length - 40} more`);
  return lines.join("\n");
}

function plainSummary() {
  const verb = commits.length === 1 ? "commit" : "commits";
  const parts = [`**${pusher} pushed ${commits.length} ${verb} to \`${branch}\`.**`];
  if (newFeatures.length) {
    parts.push("");
    for (const f of newFeatures) {
      parts.push(`✨ New feature: **${f.title}**${f.since ? ` (v${f.since})` : ""}`);
    }
  }
  return parts.join("\n");
}

async function claudeSummary() {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const msg = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt() }],
  });
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

let summary;
if (process.env.ANTHROPIC_API_KEY) {
  try {
    summary = await claudeSummary();
    if (summary) {
      log("Generated summary via Claude.");
    } else {
      // Seen live 2026-10-15: a 10-commit replay posted with no description.
      log("Claude returned an empty summary; using plain fallback.");
      summary = plainSummary();
    }
  } catch (err) {
    log(`Claude summary failed (${err?.message ?? err}); using plain fallback.`);
    summary = plainSummary();
  }
} else {
  log("ANTHROPIC_API_KEY not set — using plain (non-AI) summary.");
  summary = plainSummary();
}

// Discord embed descriptions cap at 4096 chars; keep well under.
if (summary.length > 3800) summary = summary.slice(0, 3797) + "…";

// ---------------------------------------------------------------------------
// Assemble and post the Discord embed.
// ---------------------------------------------------------------------------
const truncateField = (str, limit = 1024) =>
  str.length > limit ? str.slice(0, limit - 1) + "…" : str;

// Commit list: linked short shas + subjects, spread over as many fields as
// Discord allows (1024 chars each, 6000 for the whole embed) - one capped
// field cut a ten-commit release to "…and 6 more" with no way to see the
// rest (Andrew, 2026-10-15). The overflow note only appears when even the
// embed budget runs out.
const FIELD_LIMIT = 1024;
const EMBED_BUDGET = 5600 - summary.length;
const fields = [];
let overflow = 0;
let spent = 0;
let chunk = [];
let chunkLen = 0;
const flush = () => {
  if (!chunk.length) return;
  fields.push({
    name: fields.length ? "Commits (continued)" : commits.length === 1 ? "Commit" : `Commits (${commits.length})`,
    value: chunk.join("\n"),
  });
  spent += chunkLen + 24;
  chunk = [];
  chunkLen = 0;
};
for (const c of commits) {
  const shortSha = (c.id ?? "").slice(0, 7);
  const subject = (c.message ?? "").split("\n")[0];
  const author = c.author?.username || c.author?.name || "unknown";
  const line = `[\`${shortSha}\`](${c.url}) ${subject} — ${author}`;
  if (overflow || spent + chunkLen + line.length + 40 > EMBED_BUDGET) {
    overflow++;
    continue;
  }
  if (chunkLen + line.length + 1 > FIELD_LIMIT - 24) flush();
  chunk.push(line);
  chunkLen += line.length + 1;
}
if (overflow > 0) chunk.push(`_…and ${overflow} more_`);
flush();

if (newFeatures.length) {
  fields.push({
    name: newFeatures.length === 1 ? "New feature" : "New features",
    value: truncateField(
      newFeatures
        .map((f) => `✨ **${f.title}**${f.since ? ` — v${f.since}` : ""}`)
        .join("\n"),
    ),
  });
}

// Green when the push adds features, blurple otherwise.
const color = newFeatures.length || hasFeatCommit ? 0x57f287 : 0x5865f2;

const titleVerb = commits.length === 1 ? "1 new commit" : `${commits.length} new commits`;
const embed = {
  title: `🚀 ${titleVerb} on ${repoName}/${branch}`,
  url: compareUrl || undefined,
  description: summary,
  color,
  fields,
  footer: { text: `${repoFullName} • pushed by ${pusher}` },
  timestamp: event.head_commit?.timestamp || new Date().toISOString(),
};

// The post wears the project's icon (Andrew, 2026-10-15): an explicit URL, else
// the repo's own icon.png at the announced commit when git has it there.
function iconUrl() {
  if (process.env.PROJECT_ICON_URL) return process.env.PROJECT_ICON_URL;
  const html = event.repository?.html_url ?? "";
  if (!html || after === ZERO_SHA) return undefined;
  try {
    git("cat-file", "-e", `${after}:icon.png`);
    return `https://raw.githubusercontent.com/${repoFullName}/${after}/icon.png`;
  } catch {
    return undefined;
  }
}

const payload = {
  username: projectName,
  avatar_url: iconUrl(),
  embeds: [embed],
  allowed_mentions: { parse: [] }, // don't let commit-message @mentions ping
};

async function post() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return true;
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const wait = Math.ceil((body.retry_after ?? 1) * 1000) + 250;
      log(`Rate limited by Discord; waiting ${wait}ms.`);
      await sleep(wait);
      continue;
    }
    const body = await res.text().catch(() => "");
    log(`Discord webhook returned ${res.status}: ${body}`);
    return false;
  }
  return false;
}

if (await post()) {
  log(`Posted announcement to Discord (${commits.length} commit(s)).`);
} else {
  process.exit(1);
}
