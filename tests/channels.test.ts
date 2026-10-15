import { describe, it, expect } from 'vitest';
import { buildChannelMap, tagIdsFor } from '../src/bot/channels.js';
import { fullSnapshot, hubWith } from './helpers.js';

describe('buildChannelMap', () => {
  it('maps every live project child channel to its slug and kind', () => {
    const hub = hubWith({ slug: 'loadout-lab', name: 'Loadout Lab' }, { slug: 'goal-planner', name: 'Goal Planner', archived: true });
    const snap = fullSnapshot(hub);
    const map = buildChannelMap(hub, snap);
    const kinds = [...map.values()].filter((v) => v.slug === 'loadout-lab').map((v) => v.kind).sort();
    expect(kinds).toEqual(['announcements', 'feedback', 'general']);
    expect([...map.values()].some((v) => v.slug === 'goal-planner')).toBe(false);
    const fb = snap.channels.find((c) => c.name === 'feedback' && c.parentId === snap.channels.find((k) => k.name === 'Loadout Lab')!.id)!;
    expect(map.get(fb.id)).toEqual({ slug: 'loadout-lab', kind: 'feedback' });
  });
});

describe('tagIdsFor', () => {
  it('resolves names case-insensitively and skips unknown names', () => {
    const tags = [{ id: '1', name: 'Acknowledged' }, { id: '2', name: 'known' }];
    expect(tagIdsFor(tags, ['acknowledged', 'nope', 'KNOWN'])).toEqual(['1', '2']);
  });
});
