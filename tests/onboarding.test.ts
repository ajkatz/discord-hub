import { describe, it, expect } from 'vitest';
import { mergeOnboarding } from '../src/onboarding.js';
import type { SnapOnboarding } from '../src/model.js';

const TITLE = 'Which plugins do you use?';
const ll = { title: 'Loadout Lab', emoji: '🧪', roleIds: ['r1'], channelIds: ['c1', 'c2'] };
const gp = { title: 'Goal Planner', roleIds: ['r2'], channelIds: ['c3'] };

describe('mergeOnboarding with no prompt', () => {
  it('creates the prompt with a placeholder id and id-less options', () => {
    const current: SnapOnboarding = { enabled: false, prompts: [] };
    const out = mergeOnboarding(current, TITLE, [ll], 'placeholder-1');
    expect(out).not.toBeNull();
    expect(out).toHaveLength(1);
    const p = out![0];
    expect(p).toMatchObject({ id: 'placeholder-1', title: TITLE, type: 0, single_select: false, required: false, in_onboarding: true });
    expect(p.options).toHaveLength(1);
    expect(p.options[0]).toMatchObject({ title: 'Loadout Lab', role_ids: ['r1'], channel_ids: ['c1', 'c2'], emoji_name: '🧪' });
    expect('id' in p.options[0]).toBe(false);
  });

  it('leaves other prompts untouched', () => {
    const other = { id: '77', title: 'Pronouns', options: [{ id: '78', title: 'they', roleIds: ['r9'], channelIds: [] }] };
    const current: SnapOnboarding = { enabled: true, prompts: [other] };
    const out = mergeOnboarding(current, TITLE, [ll], 'placeholder-1')!;
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: '77', title: 'Pronouns' });
    expect(out[0].options[0]).toMatchObject({ id: '78', title: 'they', role_ids: ['r9'] });
  });
});

describe('mergeOnboarding with an existing prompt', () => {
  const current: SnapOnboarding = {
    enabled: true,
    prompts: [{ id: '10', title: TITLE, options: [{ id: '11', title: 'Goal Planner', roleIds: ['r2'], channelIds: ['c3'] }] }],
  };

  it('keeps the existing option id and appends the new option without one', () => {
    const out = mergeOnboarding(current, TITLE, [gp, ll])!;
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('10');
    expect(out[0].options).toHaveLength(2);
    expect(out[0].options[0]).toMatchObject({ id: '11', title: 'Goal Planner' });
    expect(out[0].options[1]).toMatchObject({ title: 'Loadout Lab' });
    expect('id' in out[0].options[1]).toBe(false);
  });

  it('matches the prompt title case-insensitively', () => {
    const out = mergeOnboarding(current, TITLE.toUpperCase(), [gp, ll])!;
    expect(out[0].id).toBe('10');
  });

  it('returns null when already in sync, regardless of id order', () => {
    expect(mergeOnboarding(current, TITLE, [{ ...gp, channelIds: ['c3'] }])).toBeNull();
    const twoChannels: SnapOnboarding = {
      enabled: true,
      prompts: [{ id: '10', title: TITLE, options: [{ id: '11', title: 'Loadout Lab', roleIds: ['r1'], channelIds: ['c2', 'c1'] }] }],
    };
    expect(mergeOnboarding(twoChannels, TITLE, [ll])).toBeNull();
  });

  it('drops an option that is no longer desired', () => {
    const out = mergeOnboarding(current, TITLE, [])!;
    expect(out[0].options).toEqual([]);
  });

  it('updates channel ids of an existing option in place', () => {
    const out = mergeOnboarding(current, TITLE, [{ ...gp, channelIds: ['c3', 'c4'] }])!;
    expect(out[0].options[0]).toMatchObject({ id: '11', channel_ids: ['c3', 'c4'] });
  });
});
