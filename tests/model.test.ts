import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addProject, desiredFor, loadHub, saveHub, SHARED_CHANNELS, READ_ONLY_SHARED, FEEDBACK_TAGS } from '../src/model.js';
import { hubWith } from './helpers.js';

describe('desiredFor', () => {
  it('derives the role, category and the three channels for a project', () => {
    const d = desiredFor({ slug: 'loadout-lab', name: 'Loadout Lab' });
    expect(d.roleName).toBe('loadout-lab');
    expect(d.categoryName).toBe('Loadout Lab');
    expect(d.channels.map((c) => c.name)).toEqual(['announcements', 'general', 'feedback']);
    expect(d.channels.map((c) => c.kind)).toEqual(['text', 'text', 'forum']);
    expect(d.channels[0]).toMatchObject({ roleCanPost: false });
    expect(d.channels[1]).toMatchObject({ roleCanPost: true });
    expect(d.channels[2]).toMatchObject({ tags: FEEDBACK_TAGS });
    expect(FEEDBACK_TAGS).toEqual(['bug', 'idea', 'question', 'praise', 'acknowledged', 'known', 'in-progress', 'fixed', 'not-an-issue', 'needs-info', 'planned', 'declined']);
  });

  it('prefixes the category name when the project is archived', () => {
    const d = desiredFor({ slug: 'goal-planner', name: 'Goal Planner', archived: true });
    expect(d.categoryName).toBe('[archived] Goal Planner');
    expect(d.roleName).toBe('goal-planner');
  });
});

describe('shared channels', () => {
  it('lists seven top-level channels with at least five writable', () => {
    expect(SHARED_CHANNELS).toHaveLength(7);
    const writable = SHARED_CHANNELS.filter((n) => !READ_ONLY_SHARED.includes(n));
    expect(writable.length).toBeGreaterThanOrEqual(5);
  });
});

describe('addProject', () => {
  it('appends a project without mutating the input hub', () => {
    const hub = hubWith();
    const next = addProject(hub, { slug: 'loadout-lab', name: 'Loadout Lab' });
    expect(next.projects).toHaveLength(1);
    expect(hub.projects).toHaveLength(0);
  });

  it('rejects a duplicate slug', () => {
    const hub = hubWith({ slug: 'loadout-lab', name: 'Loadout Lab' });
    expect(() => addProject(hub, { slug: 'loadout-lab', name: 'Again' })).toThrow(/loadout-lab/);
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(() => addProject(hubWith(), { slug: 'Loadout Lab', name: 'x' })).toThrow(/slug/);
  });
});

describe('loadHub / saveHub', () => {
  it('round-trips through disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-'));
    const path = join(dir, 'hub.json');
    const hub = hubWith({ slug: 'loadout-lab', name: 'Loadout Lab', emoji: '🧪', repo: 'ajkatz/runelite-loadout-lab' });
    saveHub(path, hub);
    expect(loadHub(path)).toEqual(hub);
    expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true);
  });

  it('rejects a hub whose guildId is not a snowflake', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-'));
    const path = join(dir, 'hub.json');
    saveHub(path, hubWith());
    const bad = { ...hubWith(), guildId: 'not-a-guild' };
    expect(() => saveHub(path, bad)).toThrow(/guildId/);
  });
});
