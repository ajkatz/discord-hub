import { REST, DiscordAPIError, HTTPError } from '@discordjs/rest';
import {
  Routes,
  type APIChannel,
  type APIGuildForumChannel,
  type APIGuildOnboarding,
  type APIRole,
  type APIUser,
  type APIWebhook,
} from 'discord-api-types/v10';
import type { GuildSnapshot, SnapOnboarding } from './model.js';
import type { PutPrompt } from './onboarding.js';

export const VIEW_CHANNEL = 1n << 10n;
export const SEND_MESSAGES = 1n << 11n;
export const CREATE_PUBLIC_THREADS = 1n << 35n;
export const SEND_MESSAGES_IN_THREADS = 1n << 38n;
export const READ_MESSAGE_HISTORY = 1n << 16n;
export const MANAGE_WEBHOOKS = 1n << 29n;
export const MANAGE_THREADS = 1n << 34n;
/** What the bot grants itself on every category and child it creates. */
export const BOT_PERMS = VIEW_CHANNEL | SEND_MESSAGES | SEND_MESSAGES_IN_THREADS | CREATE_PUBLIC_THREADS | READ_MESSAGE_HISTORY | MANAGE_WEBHOOKS | MANAGE_THREADS;

export interface Overwrite {
  id: string;
  /** 0 role, 1 member. */
  type: 0 | 1;
  allow: string;
  deny: string;
}

export interface CreateChannelBody {
  name: string;
  type: number;
  parent_id?: string | null;
  topic?: string;
  permission_overwrites?: Overwrite[];
  available_tags?: { name: string }[];
}

/** The seam: everything the applier needs from Discord. Live and fake implement it. */
export interface DiscordApi {
  snapshot(guildId: string): Promise<GuildSnapshot>;
  createRole(guildId: string, body: { name: string; mentionable: boolean }): Promise<{ id: string }>;
  createChannel(guildId: string, body: CreateChannelBody): Promise<{ id: string }>;
  modifyChannel(channelId: string, body: { name?: string; topic?: string; available_tags?: { id?: string; name: string }[] }): Promise<void>;
  createWebhook(channelId: string, name: string): Promise<{ id: string; token: string }>;
  getOnboarding(guildId: string): Promise<SnapOnboarding>;
  putOnboarding(guildId: string, body: { prompts: PutPrompt[] }): Promise<void>;
}

export function webhookUrl(id: string, token: string): string {
  return `https://discord.com/api/webhooks/${id}/${token}`;
}

export function mapOnboarding(o: APIGuildOnboarding): SnapOnboarding {
  return {
    enabled: o.enabled,
    prompts: o.prompts.map((p) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      single_select: p.single_select,
      required: p.required,
      in_onboarding: p.in_onboarding,
      options: p.options.map((opt) => ({
        id: opt.id,
        title: opt.title,
        roleIds: [...opt.role_ids],
        channelIds: [...opt.channel_ids],
        emoji_name: opt.emoji?.name ?? null,
        description: opt.description ?? null,
      })),
    })),
  };
}

export class RestDiscordApi implements DiscordApi {
  private readonly rest: REST;

  constructor(token: string) {
    this.rest = new REST({ version: '10' }).setToken(token);
  }

  async snapshot(guildId: string): Promise<GuildSnapshot> {
    const [me, roles, channels, webhooks, onboarding] = await Promise.all([
      this.rest.get(Routes.user('@me')) as Promise<APIUser>,
      this.rest.get(Routes.guildRoles(guildId)) as Promise<APIRole[]>,
      this.rest.get(Routes.guildChannels(guildId)) as Promise<APIChannel[]>,
      this.rest.get(Routes.guildWebhooks(guildId)) as Promise<APIWebhook[]>,
      this.rest.get(Routes.guildOnboarding(guildId)) as Promise<APIGuildOnboarding>,
    ]);
    return {
      guildId,
      botId: me.id,
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      channels: channels.map((c) => {
        const forum = c as APIGuildForumChannel;
        const parentId = 'parent_id' in c ? (c.parent_id ?? null) : null;
        return {
          id: c.id,
          name: c.name ?? '',
          type: c.type,
          parentId,
          tags: Array.isArray(forum.available_tags) ? forum.available_tags.map((t) => t.name) : undefined,
          tagObjects: Array.isArray(forum.available_tags) ? forum.available_tags.map((t) => ({ id: t.id, name: t.name })) : undefined,
          topic: 'topic' in c ? (c.topic ?? null) : null,
        };
      }),
      webhooks: webhooks.filter((w) => w.channel_id).map((w) => ({ id: w.id, channelId: w.channel_id as string, name: w.name ?? '' })),
      onboarding: mapOnboarding(onboarding),
    };
  }

  async createRole(guildId: string, body: { name: string; mentionable: boolean }): Promise<{ id: string }> {
    const r = (await this.rest.post(Routes.guildRoles(guildId), { body })) as APIRole;
    return { id: r.id };
  }

  async createChannel(guildId: string, body: CreateChannelBody): Promise<{ id: string }> {
    const c = (await this.rest.post(Routes.guildChannels(guildId), { body })) as APIChannel;
    return { id: c.id };
  }

  async modifyChannel(channelId: string, body: { name?: string; topic?: string; available_tags?: { id?: string; name: string }[] }): Promise<void> {
    await this.rest.patch(Routes.channel(channelId), { body });
  }

  async createWebhook(channelId: string, name: string): Promise<{ id: string; token: string }> {
    const w = (await this.rest.post(Routes.channelWebhooks(channelId), { body: { name } })) as APIWebhook;
    if (!w.token) throw new Error(`Discord returned webhook ${w.id} without a token`);
    return { id: w.id, token: w.token };
  }

  async getOnboarding(guildId: string): Promise<SnapOnboarding> {
    return mapOnboarding((await this.rest.get(Routes.guildOnboarding(guildId))) as APIGuildOnboarding);
  }

  async putOnboarding(guildId: string, body: { prompts: PutPrompt[] }): Promise<void> {
    await this.rest.put(Routes.guildOnboarding(guildId), { body });
  }
}

/** One line: endpoint, status and Discord's own message, for the CLI. */
export function describeError(e: unknown): string {
  if (e instanceof DiscordAPIError) {
    const detail = typeof e.rawError === 'object' && e.rawError && 'errors' in e.rawError ? ' ' + JSON.stringify((e.rawError as { errors: unknown }).errors) : '';
    return `${e.method} ${e.url} -> ${e.status} ${e.code}: ${e.message}${detail}`;
  }
  if (e instanceof HTTPError) return `${e.method} ${e.url} -> ${e.status}: ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}
