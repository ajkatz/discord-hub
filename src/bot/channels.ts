import { desiredFor, eqName, type GuildSnapshot, type Hub } from '../model.js';
import { findCategory, findChild } from '../plan.js';

export type MappedKind = 'bug-reports' | 'feedback' | 'general' | 'announcements';
export interface MappedChannel { slug: string; kind: MappedKind }

/** channel id -> (project, kind) for every live project's four channels. */
export function buildChannelMap(hub: Hub, snap: GuildSnapshot): Map<string, MappedChannel> {
  const map = new Map<string, MappedChannel>();
  for (const p of hub.projects) {
    const d = desiredFor(p);
    if (d.archived) continue;
    const cat = findCategory(snap, d.categoryName);
    if (!cat) continue;
    for (const ch of d.channels) {
      const live = findChild(snap, cat.id, ch.name);
      if (live) map.set(live.id, { slug: p.slug, kind: ch.name as MappedKind });
    }
  }
  return map;
}

/** Forum tag names -> ids, case-insensitive; unknown names are skipped. */
export function tagIdsFor(forumTags: ReadonlyArray<{ id: string; name: string }>, names: string[]): string[] {
  const ids: string[] = [];
  for (const n of names) {
    const t = forumTags.find((ft) => eqName(ft.name, n));
    if (t) ids.push(t.id);
  }
  return ids;
}
