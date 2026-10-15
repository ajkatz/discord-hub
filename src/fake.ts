import type { CreateChannelBody, DiscordApi, Overwrite } from './discord.js';
import type { GuildSnapshot, SnapChannel, SnapOnboarding, SnapPrompt, SnapRole } from './model.js';
import type { PutPrompt } from './onboarding.js';

interface FakeWebhook { id: string; channelId: string; name: string; token: string }

/**
 * In-memory Discord guild for tests: same seam as the live API, records every
 * mutating call, hands out incrementing snowflake-like ids. @everyone's id is the
 * guild id, as on Discord.
 */
export class FakeDiscordApi implements DiscordApi {
  readonly mutations: string[] = [];
  /** Name of the next method that should throw once (e.g. 'createWebhook'). */
  failOn?: string;

  private roles: SnapRole[];
  private channels: SnapChannel[];
  private webhooks: FakeWebhook[];
  private onboarding: SnapOnboarding;
  private readonly overwritesById = new Map<string, Overwrite[]>();
  private next = 1000;

  constructor(seed: GuildSnapshot) {
    this.roles = seed.roles.map((r) => ({ ...r }));
    this.channels = seed.channels.map((c) => ({ ...c, tags: c.tags ? [...c.tags] : undefined }));
    this.webhooks = seed.webhooks.map((w) => ({ ...w, token: 'seeded-token' }));
    this.onboarding = clonePrompts(seed.onboarding);
    if (!this.roles.some((r) => r.id === seed.guildId)) this.roles.unshift({ id: seed.guildId, name: '@everyone' });
  }

  overwrites(channelId: string): Overwrite[] {
    return this.overwritesById.get(channelId) ?? [];
  }

  private id(): string {
    return String(this.next++);
  }

  private guard(method: string): void {
    if (this.failOn === method) {
      this.failOn = undefined;
      throw new Error(`fake: ${method} failed on purpose`);
    }
    this.mutations.push(method);
  }

  readonly botId = '999000000000000000';

  async snapshot(guildId: string): Promise<GuildSnapshot> {
    return {
      guildId,
      botId: this.botId,
      roles: this.roles.map((r) => ({ ...r })),
      channels: this.channels.map((c) => ({ ...c, tags: c.tags ? [...c.tags] : undefined })),
      webhooks: this.webhooks.map(({ id, channelId, name }) => ({ id, channelId, name })),
      onboarding: clonePrompts(this.onboarding),
    };
  }

  async createRole(_guildId: string, body: { name: string; mentionable: boolean }): Promise<{ id: string }> {
    this.guard('createRole');
    const role = { id: this.id(), name: body.name };
    this.roles.push(role);
    return { id: role.id };
  }

  async createChannel(_guildId: string, body: CreateChannelBody): Promise<{ id: string }> {
    this.guard('createChannel');
    const ch: SnapChannel = {
      id: this.id(),
      name: body.name,
      type: body.type,
      parentId: body.parent_id ?? null,
      tags: body.available_tags ? body.available_tags.map((t) => t.name) : undefined,
    };
    this.channels.push(ch);
    this.overwritesById.set(ch.id, (body.permission_overwrites ?? []).map((o) => ({ ...o })));
    return { id: ch.id };
  }

  async modifyChannel(channelId: string, body: { name?: string }): Promise<void> {
    this.guard('modifyChannel');
    const ch = this.channels.find((c) => c.id === channelId);
    if (!ch) throw new Error(`fake: unknown channel ${channelId}`);
    if (body.name !== undefined) ch.name = body.name;
  }

  async createWebhook(channelId: string, name: string): Promise<{ id: string; token: string }> {
    this.guard('createWebhook');
    if (!this.channels.some((c) => c.id === channelId)) throw new Error(`fake: unknown channel ${channelId}`);
    const wh: FakeWebhook = { id: this.id(), channelId, name, token: `tok-${this.id()}` };
    this.webhooks.push(wh);
    return { id: wh.id, token: wh.token };
  }

  async getOnboarding(_guildId: string): Promise<SnapOnboarding> {
    return clonePrompts(this.onboarding);
  }

  async putOnboarding(_guildId: string, body: { prompts: PutPrompt[] }): Promise<void> {
    this.guard('putOnboarding');
    const known = new Set(this.onboarding.prompts.map((p) => p.id));
    this.onboarding = {
      enabled: this.onboarding.enabled,
      prompts: body.prompts.map((p) => ({
        id: known.has(p.id) ? p.id : this.id(),
        title: p.title,
        type: p.type,
        single_select: p.single_select,
        required: p.required,
        in_onboarding: p.in_onboarding,
        options: p.options.map((o) => ({
          id: o.id ?? this.id(),
          title: o.title,
          roleIds: [...o.role_ids],
          channelIds: [...o.channel_ids],
          emoji_name: o.emoji_name ?? null,
          description: o.description ?? null,
        })),
      })),
    };
  }
}

function clonePrompts(o: SnapOnboarding): SnapOnboarding {
  return {
    enabled: o.enabled,
    prompts: o.prompts.map(
      (p): SnapPrompt => ({
        ...p,
        options: p.options.map((opt) => ({ ...opt, roleIds: [...opt.roleIds], channelIds: [...opt.channelIds] })),
      }),
    ),
  };
}
