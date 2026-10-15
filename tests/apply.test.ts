import { describe, it, expect } from 'vitest';
import { plan } from '../src/plan.js';
import { apply } from '../src/apply.js';
import { FakeDiscordApi } from '../src/fake.js';
import { VIEW_CHANNEL, SEND_MESSAGES } from '../src/discord.js';
import { emptySnapshot, hubWith, GUILD } from './helpers.js';

const LL = { slug: 'loadout-lab', name: 'Loadout Lab', emoji: '🧪' };

async function provision(hub = hubWith(LL)) {
  const api = new FakeDiscordApi(emptySnapshot());
  const snap = await api.snapshot(GUILD);
  const ops = plan(hub, snap);
  const result = await apply(ops, api, hub, snap);
  return { api, ops, result };
}

describe('apply against an empty fake guild', () => {
  it('completes every op and creates the structures with the right parents and tags', async () => {
    const { api, ops, result } = await provision();
    expect(result.failed).toBeUndefined();
    expect(result.completed).toHaveLength(ops.length);
    const snap = await api.snapshot(GUILD);
    const role = snap.roles.find((r) => r.name === 'loadout-lab');
    expect(role).toBeDefined();
    const cat = snap.channels.find((c) => c.type === 4 && c.name === 'Loadout Lab');
    expect(cat).toBeDefined();
    const children = snap.channels.filter((c) => c.parentId === cat!.id);
    expect(children.map((c) => c.name)).toEqual(['announcements', 'general', 'bug-reports', 'feedback']);
    expect(children.map((c) => c.type)).toEqual([0, 0, 15, 15]);
    expect(children[2].tags).toEqual(['acknowledged', 'known', 'in-progress', 'fixed', 'not-an-issue', 'needs-info']);
    expect(children[3].tags).toEqual(['idea', 'question', 'praise', 'acknowledged', 'planned', 'declined']);
  });

  it('hides the category from @everyone and shows it to the role, synced on children', async () => {
    const { api } = await provision();
    const snap = await api.snapshot(GUILD);
    const role = snap.roles.find((r) => r.name === 'loadout-lab')!;
    const cat = snap.channels.find((c) => c.type === 4)!;
    const catOw = api.overwrites(cat.id);
    expect(catOw.find((o) => o.id === GUILD)).toMatchObject({ type: 0, deny: VIEW_CHANNEL.toString() });
    expect(catOw.find((o) => o.id === role.id)).toMatchObject({ type: 0, allow: VIEW_CHANNEL.toString() });
    const ann = snap.channels.find((c) => c.name === 'announcements')!;
    const annRole = api.overwrites(ann.id).find((o) => o.id === role.id)!;
    expect(BigInt(annRole.allow) & VIEW_CHANNEL).toBe(VIEW_CHANNEL);
    expect(BigInt(annRole.deny) & SEND_MESSAGES).toBe(SEND_MESSAGES);
    const gen = snap.channels.find((c) => c.name === 'general')!;
    const genRole = api.overwrites(gen.id).find((o) => o.id === role.id)!;
    expect(BigInt(genRole.allow) & SEND_MESSAGES).toBe(SEND_MESSAGES);
    expect(api.overwrites(gen.id).find((o) => o.id === GUILD)).toMatchObject({ deny: VIEW_CHANNEL.toString() });
  });

  it('returns the webhook url once and never persists it', async () => {
    const { api, result } = await provision();
    expect(result.webhooks).toHaveLength(1);
    expect(result.webhooks[0].slug).toBe('loadout-lab');
    expect(result.webhooks[0].url).toMatch(/^https:\/\/discord\.com\/api\/webhooks\/\d+\/\S+$/);
    const snap = await api.snapshot(GUILD);
    const ann = snap.channels.find((c) => c.name === 'announcements')!;
    expect(snap.webhooks).toEqual([expect.objectContaining({ channelId: ann.id, name: 'Push announcer' })]);
  });

  it('writes the onboarding option bound to the created role and channels', async () => {
    const { api } = await provision();
    const snap = await api.snapshot(GUILD);
    const role = snap.roles.find((r) => r.name === 'loadout-lab')!;
    const cat = snap.channels.find((c) => c.type === 4)!;
    const childIds = snap.channels.filter((c) => c.parentId === cat.id).map((c) => c.id);
    expect(snap.onboarding.prompts).toHaveLength(1);
    const opt = snap.onboarding.prompts[0].options[0];
    expect(opt).toMatchObject({ title: 'Loadout Lab', roleIds: [role.id] });
    expect([...opt.channelIds].sort()).toEqual([...childIds].sort());
    expect(opt.id).toMatch(/^\d+$/);
  });
});

describe('apply is idempotent', () => {
  it('re-plans to nothing and a second apply records zero mutations', async () => {
    const { api } = await provision();
    const hub = hubWith(LL);
    const snap = await api.snapshot(GUILD);
    const ops = plan(hub, snap);
    expect(ops).toEqual([]);
    const before = api.mutations.length;
    await apply(ops, api, hub, snap);
    expect(api.mutations.length).toBe(before);
  });

  it('adds a second project without touching the first', async () => {
    const { api } = await provision();
    const hub = hubWith(LL, { slug: 'goal-planner', name: 'Goal Planner' });
    const snap = await api.snapshot(GUILD);
    const ops = plan(hub, snap);
    expect(ops.filter((o) => o.kind === 'create-role')).toHaveLength(1);
    const before = api.mutations.length;
    const result = await apply(ops, api, hub, snap);
    expect(result.failed).toBeUndefined();
    expect(api.mutations.length - before).toBe(ops.length);
    const after = await api.snapshot(GUILD);
    expect(after.onboarding.prompts[0].options.map((o) => o.title)).toEqual(['Loadout Lab', 'Goal Planner']);
    expect(plan(hub, after)).toEqual([]);
  });
});

describe('apply stops on the first failure', () => {
  it('reports the failed op and the ops completed before it', async () => {
    const api = new FakeDiscordApi(emptySnapshot());
    api.failOn = 'createWebhook';
    const hub = hubWith(LL);
    const snap = await api.snapshot(GUILD);
    const ops = plan(hub, snap);
    const result = await apply(ops, api, hub, snap);
    expect(result.failed?.op.kind).toBe('create-webhook');
    expect(result.failed?.error).toMatch(/createWebhook/);
    expect(result.completed.map((o) => o.kind)).toEqual(['create-role', 'create-category', 'create-channel', 'create-channel', 'create-channel', 'create-channel']);
    api.failOn = undefined;
    const again = plan(hub, await api.snapshot(GUILD));
    expect(again.map((o) => o.kind)).toEqual(['create-webhook', 'upsert-onboarding']);
  });
});

describe('archive via apply', () => {
  it('renames the category and removes the option, deleting nothing', async () => {
    const { api } = await provision();
    const before = await api.snapshot(GUILD);
    const hub = hubWith({ ...LL, archived: true });
    const result = await apply(plan(hub, before), api, hub, before);
    expect(result.failed).toBeUndefined();
    const after = await api.snapshot(GUILD);
    expect(after.channels).toHaveLength(before.channels.length);
    expect(after.roles).toHaveLength(before.roles.length);
    expect(after.channels.find((c) => c.type === 4)!.name).toBe('[archived] Loadout Lab');
    expect(after.onboarding.prompts[0].options).toEqual([]);
  });
});
