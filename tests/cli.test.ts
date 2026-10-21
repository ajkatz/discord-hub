import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
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
  it('prints the seven ops for one project against an empty snapshot and mutates nothing', () => {
    const r = run(['plan', '--hub', HUB, '--snapshot', SNAP]);
    expect(r.code).toBe(0);
    const lines = r.out.split('\n').filter((l) => /^\s*\d+\. /.test(l));
    expect(lines).toHaveLength(7);
    expect(r.out).toMatch(/create role @loadout-lab/);
    expect(r.out).toMatch(/create forum #feedback/);
    expect(r.out).toMatch(/update onboarding prompt/);
  });

  it('holds back the onboarding prompt with --no-onboarding', () => {
    const r = run(['plan', '--hub', HUB, '--snapshot', SNAP, '--no-onboarding']);
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/update onboarding prompt/);
    expect(r.out.split('\n').filter((l) => /^\s*\d+\. /.test(l))).toHaveLength(6);
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

  it('with --icon in snapshot mode reports the emoji it would upload', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-'));
    const hub = join(dir, 'hub.json');
    copyFileSync(HUB, hub);
    const r = run(['new', 'katz-stats', '--name', 'KatzStats', '--icon', 'tests/fixtures/icon.png', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toMatch(/would upload icon\.png as :katzstats:/);
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

describe('discord-hub new with games (ADR-0004)', () => {
  const gamesHub = () => {
    const hub = join(mkdtempSync(join(tmpdir(), 'hub-')), 'hub.json');
    writeFileSync(hub, JSON.stringify({
      guildId: '100000000000000001',
      onboardingPrompt: 'Which plugins do you use?',
      gamePrompt: 'What do you play?',
      games: [
        { slug: 'osrs', name: 'Old School RuneScape', chat: 'osrs-chat', prompt: 'Which RuneLite plugins do you use?' },
        { slug: 'wow-forever', name: 'WoW: Forever', chat: 'wow-forever-chat', prompt: 'Which WoW: Forever addons do you use?' },
      ],
      projects: [{ slug: 'loadout-lab', name: 'Loadout Lab', game: 'osrs' }],
    }));
    return hub;
  };

  it('needs --game naming one of the games, and saves nothing otherwise', () => {
    const hub = gamesHub();
    let r = run(['new', 'forever-x', '--name', 'Forever X', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/--game/);
    expect(r.err).toMatch(/osrs, wow-forever/);
    r = run(['new', 'forever-x', '--name', 'Forever X', '--game', 'eve', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/eve/);
    expect(JSON.parse(readFileSync(hub, 'utf8')).projects).toHaveLength(1);
  });

  it('saves the project with its game and plans it under that game', () => {
    const hub = gamesHub();
    const r = run(['new', 'forever-x', '--name', 'Forever X', '--game', 'wow-forever', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code, r.err).toBe(0);
    expect(JSON.parse(readFileSync(hub, 'utf8')).projects[1]).toMatchObject({ slug: 'forever-x', game: 'wow-forever' });
    expect(r.out).toMatch(/create private category "WoW: Forever"/);
    expect(r.out).toMatch(/"Which WoW: Forever addons do you use\?" -> \[Forever X\]/);
  });

  it('refuses --game when hub.json lists no games', () => {
    const hub = join(mkdtempSync(join(tmpdir(), 'hub-')), 'hub.json');
    copyFileSync(HUB, hub);
    const r = run(['new', 'goal-planner', '--name', 'Goal Planner', '--game', 'osrs', '--hub', hub, '--snapshot', SNAP]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/no games/);
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
