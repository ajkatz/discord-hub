import type { GuildSnapshot, Hub, SnapChannel, SnapRole, SnapWebhook } from '../src/model.js';
import { desiredFor } from '../src/model.js';

export const GUILD = '100000000000000001';

export function hubWith(...projects: Hub['projects']): Hub {
  return { guildId: GUILD, onboardingPrompt: 'Which plugins do you use?', projects };
}

export function emptySnapshot(): GuildSnapshot {
  return {
    guildId: GUILD,
    roles: [{ id: GUILD, name: '@everyone' }],
    channels: [],
    webhooks: [],
    onboarding: { enabled: false, prompts: [] },
  };
}

/** A snapshot in which every project of the hub already exists exactly as desired. */
export function fullSnapshot(hub: Hub): GuildSnapshot {
  const snap = emptySnapshot();
  let next = 500;
  const id = () => String(next++);
  const options: GuildSnapshot['onboarding']['prompts'][number]['options'] = [];
  for (const p of hub.projects) {
    const d = desiredFor(p);
    const role: SnapRole = { id: id(), name: d.roleName };
    const cat: SnapChannel = { id: id(), name: d.categoryName, type: 4, parentId: null };
    snap.roles.push(role);
    snap.channels.push(cat);
    const childIds: string[] = [];
    for (const c of d.channels) {
      const ch: SnapChannel = {
        id: id(),
        name: c.name,
        type: c.kind === 'forum' ? 15 : 0,
        parentId: cat.id,
        tags: c.kind === 'forum' ? [...c.tags] : undefined,
        topic: c.topic,
      };
      snap.channels.push(ch);
      childIds.push(ch.id);
      if (c.name === 'announcements') {
        const wh: SnapWebhook = { id: id(), channelId: ch.id, name: 'Push announcer' };
        snap.webhooks.push(wh);
      }
    }
    if (!p.archived) options.push({ id: id(), title: p.name, roleIds: [role.id], channelIds: childIds });
  }
  snap.onboarding.prompts.push({ id: id(), title: hub.onboardingPrompt, options });
  return snap;
}
