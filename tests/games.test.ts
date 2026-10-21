import { describe, it, expect } from 'vitest';
import { plan, type Op } from '../src/plan.js';
import { apply } from '../src/apply.js';
import { mergePrompts } from '../src/onboarding.js';
import { FakeDiscordApi } from '../src/fake.js';
import { desiredForGame, gameChatTopic, validateHub, type Hub, type ProjectConfig, type SnapOnboarding } from '../src/model.js';
import { emptySnapshot, hubWith, GUILD } from './helpers.js';

// ADR-0004: a game question first, then one plugin question per game (Andrew, 2026-10-21: "B but lets call it #wow-forever-chat")
const OSRS = { slug: 'osrs', name: 'Old School RuneScape', chat: 'osrs-chat', prompt: 'Which RuneLite plugins do you use?', emoji: '🗡️' };
const WOW = { slug: 'wow-forever', name: 'WoW: Forever', chat: 'wow-forever-chat', prompt: 'Which WoW: Forever addons do you use?', emojiId: '777' };
const LL: ProjectConfig = { slug: 'loadout-lab', name: 'Loadout Lab', emoji: '🧪', game: 'osrs' };
const GP: ProjectConfig = { slug: 'goal-planner', name: 'Goal Planner', game: 'osrs' };
const FB: ProjectConfig = { slug: 'forever-bags', name: 'Forever Bags', emojiId: '888', game: 'wow-forever' };
const QUESTIONS = ['What do you play?', 'Which RuneLite plugins do you use?', 'Which WoW: Forever addons do you use?'];

function gamesHub(...projects: ProjectConfig[]): Hub {
  return { ...hubWith(...projects), gamePrompt: 'What do you play?', games: [OSRS, WOW] };
}

const upsert = (ops: Op[]) => ops.find((o) => o.kind === 'upsert-onboarding') as Extract<Op, { kind: 'upsert-onboarding' }> | undefined;

describe('hub.json games', () => {
  it('derives a game area: its role, its private category and its chat', () => {
    const g = desiredForGame(WOW);
    expect(g).toMatchObject({ roleName: 'wow-forever', categoryName: 'WoW: Forever', prompt: 'Which WoW: Forever addons do you use?' });
    expect(g.chat).toEqual({ name: 'wow-forever-chat', kind: 'text', roleCanPost: true, tags: [], topic: gameChatTopic('WoW: Forever') });
  });

  it('accepts a hub whose live projects each name a game, and an archived project without one', () => {
    expect(() => validateHub(gamesHub(LL, GP, FB))).not.toThrow();
    expect(() => validateHub(gamesHub(LL, { slug: 'old', name: 'Old', archived: true }))).not.toThrow();
  });

  it('refuses games without a game question, a live project without a game, an unknown game, a game on a hub without games', () => {
    expect(() => validateHub({ ...gamesHub(LL), gamePrompt: '' })).toThrow(/gamePrompt/);
    expect(() => validateHub(gamesHub({ slug: 'loadout-lab', name: 'Loadout Lab' }))).toThrow(/loadout-lab/);
    expect(() => validateHub(gamesHub({ ...LL, game: 'eve' }))).toThrow(/eve/);
    expect(() => validateHub(hubWith(LL))).toThrow(/osrs/);
  });

  it('refuses a game slug that is a project slug, a game name that is a project name, and two questions with one title', () => {
    expect(() => validateHub(gamesHub(LL, { slug: 'osrs', name: 'X', game: 'osrs' }))).toThrow(/osrs/);
    expect(() => validateHub(gamesHub(LL, { slug: 'x', name: 'WoW: Forever', game: 'wow-forever' }))).toThrow(/WoW: Forever/);
    expect(() => validateHub({ ...gamesHub(LL), gamePrompt: OSRS.prompt })).toThrow(/Which RuneLite plugins do you use\?/);
  });
});

describe('plan with games against an empty guild', () => {
  const ops = plan(gamesHub(LL, GP, FB), emptySnapshot());

  it('builds each game area before the projects: role, private category, chat', () => {
    expect(ops.filter((o) => o.kind === 'create-role').map((o) => o.kind === 'create-role' && o.name)).toEqual(['osrs', 'wow-forever', 'loadout-lab', 'goal-planner', 'forever-bags']);
    expect(ops.filter((o) => o.kind === 'create-category').map((o) => o.kind === 'create-category' && [o.name, o.role])).toEqual([
      ['Old School RuneScape', 'osrs'], ['WoW: Forever', 'wow-forever'], ['Loadout Lab', 'loadout-lab'], ['Goal Planner', 'goal-planner'], ['Forever Bags', 'forever-bags'],
    ]);
    expect(ops.filter((o) => o.kind === 'create-channel' && o.name.endsWith('-chat'))).toEqual([
      expect.objectContaining({ name: 'osrs-chat', type: 'text', category: 'Old School RuneScape', role: 'osrs', roleCanPost: true, topic: gameChatTopic('Old School RuneScape') }),
      expect.objectContaining({ name: 'wow-forever-chat', type: 'text', category: 'WoW: Forever', role: 'wow-forever', roleCanPost: true, topic: gameChatTopic('WoW: Forever') }),
    ]);
  });

  it('asks the game first, then one question per game, in order', () => {
    const ob = upsert(ops)!;
    expect(ob.prompts.map((p) => p.title)).toEqual(QUESTIONS);
    expect(ob.drop).toEqual([]);
    expect(ob.prompts[0].options).toEqual([
      { title: 'Old School RuneScape', emoji: '🗡️', roles: ['osrs'], channels: [{ category: 'Old School RuneScape', name: 'osrs-chat' }] },
      { title: 'WoW: Forever', emojiId: '777', roles: ['wow-forever'], channels: [{ category: 'WoW: Forever', name: 'wow-forever-chat' }] },
    ]);
  });

  it("gives each project option its own role and channels; the game's area comes with the game question", () => {
    const ob = upsert(ops)!;
    expect(ob.prompts[1].options.map((o) => o.title)).toEqual(['Loadout Lab', 'Goal Planner']);
    expect(ob.prompts[2].options).toEqual([{
      title: 'Forever Bags', emojiId: '888', roles: ['forever-bags'],
      channels: [{ category: 'Forever Bags', name: 'announcements' }, { category: 'Forever Bags', name: 'general' }, { category: 'Forever Bags', name: 'feedback' }],
    }]);
  });
});

describe('the game layer applied over the single question', () => {
  it('drops the single question, writes the three in order, and re-plans to nothing', async () => {
    const api = new FakeDiscordApi(emptySnapshot());
    const plain = hubWith({ slug: 'loadout-lab', name: 'Loadout Lab', emoji: '🧪' }, { slug: 'forever-bags', name: 'Forever Bags', emojiId: '888' });
    let snap = await api.snapshot(GUILD);
    expect((await apply(plan(plain, snap), api, plain, snap)).failed).toBeUndefined();
    snap = await api.snapshot(GUILD);
    expect(snap.onboarding.prompts.map((p) => p.title)).toEqual(['Which plugins do you use?']);

    const hub = gamesHub(LL, FB);
    const ob = upsert(plan(hub, snap))!;
    expect(ob.drop).toEqual(['Which plugins do you use?']);
    const result = await apply(plan(hub, snap), api, hub, snap);
    expect(result.failed).toBeUndefined();
    const after = await api.snapshot(GUILD);
    expect(after.onboarding.prompts.map((p) => p.title)).toEqual(QUESTIONS);
    const role = (name: string) => after.roles.find((r) => r.name === name)!.id;
    const chat = after.channels.find((c) => c.name === 'wow-forever-chat')!;
    expect(after.channels.find((c) => c.id === chat.parentId)).toMatchObject({ type: 4, name: 'WoW: Forever' });
    const wow = after.onboarding.prompts[0].options.find((o) => o.title === 'WoW: Forever')!;
    expect(wow.roleIds).toEqual([role('wow-forever')]);
    expect(wow.channelIds).toEqual([chat.id]);
    const bags = after.onboarding.prompts[2].options[0];
    expect(bags.title).toBe('Forever Bags');
    expect(bags.roleIds).toEqual([role('forever-bags')]);
    expect(bags.channelIds).not.toContain(chat.id);
    expect(bags.emoji_id).toBe('888');
    expect(plan(hub, after)).toEqual([]);
  });
});

describe('mergePrompts', () => {
  const opt = (title: string, roleIds: string[], channelIds: string[]) => ({ title, roleIds, channelIds });
  const current: SnapOnboarding = {
    enabled: true,
    prompts: [
      { id: '10', title: 'What do you play?', options: [{ id: '11', title: 'Old School RuneScape', roleIds: ['g1'], channelIds: ['c1'] }] },
      { id: '20', title: 'Pronouns', options: [{ id: '21', title: 'they', roleIds: ['r9'], channelIds: [] }] },
      { id: '30', title: 'Which plugins do you use?', options: [{ id: '31', title: 'Loadout Lab', roleIds: ['r1'], channelIds: ['c2'] }] },
    ],
  };
  const desired = [
    { title: 'What do you play?', options: [opt('Old School RuneScape', ['g1'], ['c1']), opt('WoW: Forever', ['g2'], ['c3'])] },
    { title: 'Which RuneLite plugins do you use?', options: [opt('Loadout Lab', ['r1', 'g1'], ['c2', 'c1'])] },
    { title: 'Which WoW: Forever addons do you use?', options: [opt('Forever Bags', ['r2', 'g2'], ['c4', 'c3'])] },
  ];

  it('writes its questions as one block in order where the first stands, new ones with distinct placeholders; drops the old one, echoes the others', () => {
    const out = mergePrompts(current, desired, ['Which plugins do you use?'], '1000')!;
    expect(out.map((p) => [p.id, p.title])).toEqual([
      ['10', 'What do you play?'], ['1000', 'Which RuneLite plugins do you use?'], ['1001', 'Which WoW: Forever addons do you use?'], ['20', 'Pronouns'],
    ]);
    expect(out[0].options[0]).toMatchObject({ id: '11', title: 'Old School RuneScape' });
    expect('id' in out[0].options[1]).toBe(false);
    expect(out[3].options[0]).toMatchObject({ id: '21', title: 'they', role_ids: ['r9'] });
  });

  it('manages only the first question of a title and leaves a same-titled one as it is', () => {
    const live: SnapOnboarding = {
      enabled: true,
      prompts: [
        { id: '1', title: 'Which plugins do you use?', options: [{ id: '2', title: 'Loadout Lab', roleIds: ['r1'], channelIds: ['c1'] }] },
        { id: '3', title: 'which plugins do you use?', options: [{ id: '4', title: 'Hand made', roleIds: ['r9'], channelIds: [] }] },
      ],
    };
    const out = mergePrompts(live, [{ title: 'Which plugins do you use?', options: [opt('Loadout Lab', ['r1'], ['c1', 'c2'])] }])!;
    expect(out.map((p) => [p.id, p.options.map((o) => o.title)])).toEqual([['1', ['Loadout Lab']], ['3', ['Hand made']]]);
  });

  it('returns null when every managed question matches and nothing to drop is live', () => {
    const live: SnapOnboarding = {
      enabled: true,
      prompts: desired.map((p, i) => ({ id: String(40 + i), title: p.title, options: p.options.map((o, j) => ({ id: `${40 + i}${j}`, ...o })) })),
    };
    expect(mergePrompts(live, desired, ['Which plugins do you use?'])).toBeNull();
  });
});

describe('a game with no live project', () => {
  it('gets no question of its own', () => {
    expect(upsert(plan(gamesHub(LL), emptySnapshot()))!.prompts.map((p) => p.title)).toEqual(['What do you play?', 'Which RuneLite plugins do you use?']);
  });

  it('gets its question back in its place when a project comes, and a plan sees questions out of order', async () => {
    const api = new FakeDiscordApi(emptySnapshot());
    const step = async (hub: Hub) => {
      const snap = await api.snapshot(GUILD);
      expect((await apply(plan(hub, snap), api, hub, snap)).failed).toBeUndefined();
      return api.snapshot(GUILD);
    };
    await step(gamesHub(LL, FB));
    let snap = await step(gamesHub({ ...LL, archived: true }, FB));
    expect(snap.onboarding.prompts.map((p) => p.title)).toEqual(['What do you play?', 'Which WoW: Forever addons do you use?']);
    const back = gamesHub({ ...LL, archived: true }, GP, FB);
    snap = await step(back);
    expect(snap.onboarding.prompts.map((p) => p.title)).toEqual(QUESTIONS);
    expect(plan(back, snap)).toEqual([]);
    const swapped = { ...snap, onboarding: { ...snap.onboarding, prompts: [snap.onboarding.prompts[0], snap.onboarding.prompts[2], snap.onboarding.prompts[1]] } };
    expect(plan(back, swapped).map((o) => o.kind)).toEqual(['upsert-onboarding']);
  });

  it('loses its question when its last project is archived', async () => {
    const api = new FakeDiscordApi(emptySnapshot());
    const both = gamesHub(LL, FB);
    let snap = await api.snapshot(GUILD);
    expect((await apply(plan(both, snap), api, both, snap)).failed).toBeUndefined();
    snap = await api.snapshot(GUILD);
    const ob = upsert(plan(gamesHub(LL, { ...FB, archived: true }), snap))!;
    expect(ob.drop).toEqual(['Which WoW: Forever addons do you use?']);
    expect(ob.prompts.map((p) => p.title)).toEqual(['What do you play?', 'Which RuneLite plugins do you use?']);
  });
});

describe('retired questions, emoji, the rest of the validation', () => {
  async function applied(hub: Hub) {
    const api = new FakeDiscordApi(emptySnapshot());
    const snap = await api.snapshot(GUILD);
    expect((await apply(plan(hub, snap), api, hub, snap)).failed).toBeUndefined();
    return api;
  }

  it('drops a renamed question once its old title is in retiredPrompts, and refuses a title both asked and retired', async () => {
    const api = await applied({ ...gamesHub(LL, FB), games: [OSRS, { ...WOW, prompt: 'Which Forever addons?' }] });
    let snap = await api.snapshot(GUILD);
    const renamed = { ...gamesHub(LL, FB), retiredPrompts: ['Which Forever addons?', 'which forever addons?'] };
    expect(upsert(plan(renamed, snap))!.drop).toEqual(['Which Forever addons?']);
    expect((await apply(plan(renamed, snap), api, renamed, snap)).failed).toBeUndefined();
    snap = await api.snapshot(GUILD);
    expect(snap.onboarding.prompts.map((p) => p.title)).toEqual(QUESTIONS);
    expect(plan(renamed, snap)).toEqual([]);
    expect(() => validateHub({ ...gamesHub(LL), retiredPrompts: ['What do you play?'] })).toThrow(/What do you play\?/);
    expect(() => validateHub({ ...hubWith({ slug: 'a', name: 'A' }), retiredPrompts: ['Which plugins do you use?'] })).toThrow(/Which plugins do you use\?/);
  });

  it('re-plans when a unicode emoji changes, not when only the U+FE0F selector differs', async () => {
    const api = await applied(gamesHub(LL, FB));
    const snap = await api.snapshot(GUILD);
    expect(plan(gamesHub(LL, FB), snap)).toEqual([]);
    const sword = { ...gamesHub(LL, FB), games: [{ ...OSRS, emoji: '⚔️' }, WOW] };
    expect(plan(sword, snap).map((o) => o.kind)).toEqual(['upsert-onboarding']);
    const bare = { ...gamesHub(LL, FB), games: [{ ...OSRS, emoji: OSRS.emoji.replace(/️/g, '') }, WOW] };
    expect(plan(bare, snap)).toEqual([]);
  });

  it('refuses a gamePrompt without games, a game that is no object, and names with spaces at an end', () => {
    expect(() => validateHub({ ...hubWith({ slug: 'a', name: 'A' }), gamePrompt: 'What do you play?' })).toThrow(/gamePrompt/);
    expect(() => validateHub({ ...gamesHub(LL), games: [OSRS, null as unknown as typeof OSRS] })).toThrow(/object/);
    expect(() => validateHub({ ...gamesHub(LL), games: [{ ...OSRS, name: ' Old School RuneScape' }, WOW] })).toThrow(/spaces/);
    expect(() => validateHub(gamesHub({ ...LL, name: 'Loadout Lab ' }))).toThrow(/spaces/);
  });
});
