import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BIN = 'bin/discord-hub.mjs';
const HUB = 'tests/fixtures/hub.json';
const SNAP = 'tests/fixtures/empty.json';

function run(args: string[], env: Record<string, string> = {}) {
  const { DISCORD_BOT_TOKEN: _drop, ...base } = process.env;
  const r = spawnSync('node', [BIN, ...args], { encoding: 'utf8', env: { ...base, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe('discord-hub plan', () => {
  it('prints the eight ops for one project against an empty snapshot and mutates nothing', () => {
    const r = run(['plan', '--hub', HUB, '--snapshot', SNAP]);
    expect(r.code).toBe(0);
    const lines = r.out.split('\n').filter((l) => /^\s*\d+\. /.test(l));
    expect(lines).toHaveLength(8);
    expect(r.out).toMatch(/create role @loadout-lab/);
    expect(r.out).toMatch(/create forum #bug-reports/);
    expect(r.out).toMatch(/update onboarding prompt/);
  });

  it('includes the shared channels with --shared', () => {
    const r = run(['plan', '--hub', HUB, '--snapshot', SNAP, '--shared']);
    expect(r.code).toBe(0);
    expect(r.out.match(/create shared #/g)).toHaveLength(7);
  });
});

describe('discord-hub apply', () => {
  it('exits 2 and names DISCORD_BOT_TOKEN when the token is missing', () => {
    const r = run(['apply', '--hub', HUB]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/DISCORD_BOT_TOKEN/);
  });

  it('with --snapshot is a dry run', () => {
    const r = run(['apply', '--hub', HUB, '--snapshot', SNAP]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/dry-run/i);
    expect(r.out).toMatch(/create role @loadout-lab/);
  });
});

describe('discord-hub new', () => {
  it('adds the project to hub.json and plans it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-'));
    const hub = join(dir, 'hub.json');
    copyFileSync(HUB, hub);
    const r = run(['new', 'goal-planner', '--name', 'Goal Planner', '--emoji', '🎯', '--repo', 'ajkatz/runelite-goal-planner', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code).toBe(0);
    const saved = JSON.parse(readFileSync(hub, 'utf8'));
    expect(saved.projects.map((p: { slug: string }) => p.slug)).toEqual(['loadout-lab', 'goal-planner']);
    expect(r.out).toMatch(/create role @goal-planner/);
    expect(r.out).toMatch(/discord-announce\.yml/);
  });

  it('refuses a duplicate slug', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-'));
    const hub = join(dir, 'hub.json');
    copyFileSync(HUB, hub);
    const r = run(['new', 'loadout-lab', '--name', 'Again', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/loadout-lab/);
  });
});

describe('discord-hub archive', () => {
  it('marks the project archived and plans the rename', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-'));
    const hub = join(dir, 'hub.json');
    copyFileSync(HUB, hub);
    const r = run(['archive', 'loadout-lab', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code).toBe(0);
    const saved = JSON.parse(readFileSync(hub, 'utf8'));
    expect(saved.projects[0].archived).toBe(true);
  });
});

describe('usage', () => {
  it('exits 2 with usage on no command', () => {
    const r = run([]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/usage/i);
  });
});
