import { describe, it, expect } from 'vitest';
import { plan } from '../src/plan.js';
import { desiredFor } from '../src/model.js';
import { emptySnapshot, fullSnapshot, hubWith } from './helpers.js';

const LL = { slug: 'loadout-lab', name: 'Loadout Lab', emoji: '🧪' };

describe('plan against an empty guild', () => {
  const ops = plan(hubWith(LL), emptySnapshot());

  it('creates role, category, four channels, webhook and onboarding, in that order', () => {
    expect(ops.map((o) => o.kind)).toEqual([
      'create-role',
      'create-category',
      'create-channel',
      'create-channel',
      'create-channel',
      'create-channel',
      'create-webhook',
      'upsert-onboarding',
    ]);
  });

  it('parents every channel on the category and binds the role by slug', () => {
    const channels = ops.filter((o) => o.kind === 'create-channel');
    for (const c of channels) {
      expect(c).toMatchObject({ category: 'Loadout Lab', role: 'loadout-lab' });
    }
    expect(channels.map((c) => c.kind === 'create-channel' && c.name)).toEqual(['announcements', 'general', 'bug-reports', 'feedback']);
  });

  it('gives the forums their tags and the text channels none', () => {
    const [ann, gen, bugs, fb] = ops.filter((o) => o.kind === 'create-channel');
    expect(ann).toMatchObject({ type: 'text', roleCanPost: false });
    expect(gen).toMatchObject({ type: 'text', roleCanPost: true });
    expect(bugs).toMatchObject({ type: 'forum', tags: ['acknowledged', 'known', 'in-progress', 'fixed', 'not-an-issue', 'needs-info'] });
    expect(fb).toMatchObject({ type: 'forum', tags: ['idea', 'question', 'praise', 'acknowledged', 'planned', 'declined'] });
  });

  it('targets the webhook at the announcements channel', () => {
    expect(ops.find((o) => o.kind === 'create-webhook')).toMatchObject({ category: 'Loadout Lab', channel: 'announcements', name: 'Push announcer' });
  });

  it('carries one onboarding option for the project', () => {
    const ob = ops.find((o) => o.kind === 'upsert-onboarding');
    expect(ob).toMatchObject({ promptTitle: 'Which plugins do you use?' });
    expect(ob && ob.kind === 'upsert-onboarding' ? ob.options : []).toEqual([
      { title: 'Loadout Lab', emoji: '🧪', role: 'loadout-lab', category: 'Loadout Lab', channels: ['announcements', 'general', 'bug-reports', 'feedback'] },
    ]);
  });

  it('does not plan shared channels unless asked', () => {
    expect(ops.some((o) => o.kind === 'create-shared-channel')).toBe(false);
    const withShared = plan(hubWith(LL), emptySnapshot(), { shared: true });
    const shared = withShared.filter((o) => o.kind === 'create-shared-channel');
    expect(shared).toHaveLength(7);
    expect(shared.filter((s) => s.kind === 'create-shared-channel' && s.everyoneCanPost)).toHaveLength(5);
  });
});

describe('plan against a partial guild', () => {
  it('creates only what is missing when role and category already exist', () => {
    const snap = emptySnapshot();
    snap.roles.push({ id: '900', name: 'loadout-lab' });
    snap.channels.push({ id: '901', name: 'Loadout Lab', type: 4, parentId: null });
    const ops = plan(hubWith(LL), snap);
    expect(ops.map((o) => o.kind)).toEqual([
      'create-channel',
      'create-channel',
      'create-channel',
      'create-channel',
      'create-webhook',
      'upsert-onboarding',
    ]);
  });

  it('matches names case-insensitively', () => {
    const snap = emptySnapshot();
    snap.roles.push({ id: '900', name: 'Loadout-Lab' });
    snap.channels.push({ id: '901', name: 'LOADOUT LAB', type: 4, parentId: null });
    const ops = plan(hubWith(LL), snap);
    expect(ops.some((o) => o.kind === 'create-role')).toBe(false);
    expect(ops.some((o) => o.kind === 'create-category')).toBe(false);
  });

  it('skips the webhook when the announcements channel already has one', () => {
    const hub = hubWith(LL);
    const snap = fullSnapshot(hub);
    snap.onboarding.prompts = [];
    const ops = plan(hub, snap);
    expect(ops.map((o) => o.kind)).toEqual(['upsert-onboarding']);
  });
});

describe('plan guidelines', () => {
  it('sets guidelines on an existing forum that has none, and nothing when they match', () => {
    const hub = hubWith(LL);
    const snap = fullSnapshot(hub);
    const bugs = snap.channels.find((c) => c.name === 'bug-reports')!;
    bugs.topic = null;
    const ops = plan(hub, snap);
    expect(ops.map((o) => o.kind)).toEqual(['set-topic']);
    expect(ops[0]).toMatchObject({ channelId: bugs.id, channel: 'bug-reports' });
    bugs.topic = desiredFor(LL).channels[2].topic;
    expect(plan(hub, snap)).toEqual([]);
  });

  it('leaves a channel alone when the snapshot does not report topics', () => {
    const hub = hubWith(LL);
    const snap = fullSnapshot(hub);
    for (const c of snap.channels) delete c.topic;
    expect(plan(hub, snap)).toEqual([]);
  });
});

describe('plan against a matching guild', () => {
  it('is empty', () => {
    const hub = hubWith(LL, { slug: 'goal-planner', name: 'Goal Planner' });
    expect(plan(hub, fullSnapshot(hub))).toEqual([]);
  });

  it('re-plans onboarding when an option points at a stale role', () => {
    const hub = hubWith(LL);
    const snap = fullSnapshot(hub);
    snap.onboarding.prompts[0].options[0].roleIds = ['1'];
    expect(plan(hub, snap).map((o) => o.kind)).toEqual(['upsert-onboarding']);
  });
});

describe('plan for an archived project', () => {
  it('renames the live category and drops the project from onboarding, deleting nothing', () => {
    const live = hubWith(LL);
    const snap = fullSnapshot(live);
    const archived = hubWith({ ...LL, archived: true });
    const ops = plan(archived, snap);
    expect(ops.map((o) => o.kind)).toEqual(['rename-channel', 'upsert-onboarding']);
    const cat = snap.channels.find((c) => c.type === 4)!;
    expect(ops[0]).toMatchObject({ channelId: cat.id, name: '[archived] Loadout Lab' });
    expect(ops[1]).toMatchObject({ options: [] });
    expect(desiredFor(archived.projects[0]).categoryName).toBe('[archived] Loadout Lab');
  });

  it('is a no-op once the category is renamed and the option removed', () => {
    const archived = hubWith({ ...LL, archived: true });
    expect(plan(archived, fullSnapshot(archived))).toEqual([]);
  });
});
