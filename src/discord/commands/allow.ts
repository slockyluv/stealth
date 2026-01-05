import type { ChatInputCommandInteraction, InteractionReplyOptions, Message, MessageCreateOptions } from 'discord.js';
import {
  MessageFlags,
  PermissionsBitField,
  type APIInteractionGuildMember,
  type GuildMember,
  type PermissionResolvable,
  type TopLevelComponentData
} from 'discord.js';
import { buildWarningView } from '../responses/messageBuilders.js';

export type AllowList = string[];

export const ALLOW_PING: AllowList = [];
export const ALLOW_CLEAR: AllowList = [];
export const ALLOW_UI: AllowList = [];
export const ALLOW_SERVER: AllowList = [];
export const ALLOW_SETTINGS: AllowList = [];
export const ALLOW_MUTE: AllowList = [];
export const ALLOW_UNMUTE: AllowList = [];
export const ALLOW_MUTES: AllowList = [];
export const ALLOW_BAN: AllowList = [];
export const ALLOW_UNBAN: AllowList = [];
export const ALLOW_KICK: AllowList = [];
export const ALLOW_SETNICK: AllowList = [];
export const ALLOW_ADD_ROLE: AllowList = [];
export const ALLOW_TAKE_ROLE: AllowList = [];
export const ALLOW_TEMP_ROLE: AllowList = [];
export const ALLOW_MONEY: AllowList = [];
export const ALLOW_OWNERPANEL: AllowList = ['owner'];

const NO_PERMISSIONS_MESSAGE = 'У вас нет прав для использования этой команды.';

function resolvePermissions(
  member: GuildMember | APIInteractionGuildMember | null | undefined,
  permissions?: PermissionResolvable | null
): PermissionsBitField | null {
  if (permissions) {
    try {
      return new PermissionsBitField(permissions);
    } catch {
      return null;
    }
  }

  if (!member) return null;

  const memberPermissions = 'permissions' in member ? (member.permissions as PermissionResolvable | null) : null;
  if (!memberPermissions) return null;

  try {
    return new PermissionsBitField(memberPermissions as PermissionResolvable);
  } catch {
    return null;
  }
}

function resolveRoleIds(member: GuildMember | APIInteractionGuildMember | null | undefined): string[] {
  if (!member) return [];

  if ('roles' in member && Array.isArray((member as APIInteractionGuildMember).roles)) {
    return (member as APIInteractionGuildMember).roles.map(String);
  }

  if ('roles' in member && 'cache' in (member as GuildMember).roles) {
    return Array.from((member as GuildMember).roles.cache.keys());
  }

  return [];
}

function resolveUserId(member: GuildMember | APIInteractionGuildMember | null | undefined): string | null {
  if (!member) return null;

  if ('user' in member && member.user) {
    return member.user.id;
  }

  if ('id' in member && typeof member.id === 'string') {
    return member.id;
  }

  return null;
}

export function isMemberAllowed(
  allowList: AllowList,
  member: GuildMember | APIInteractionGuildMember | null | undefined,
  permissions?: PermissionResolvable | null,
  guildOwnerId?: string | null
): boolean {
  if (allowList.length === 0) return true;

  const roleIds = resolveRoleIds(member);
  const userId = resolveUserId(member);
  const permissionsBitField = resolvePermissions(member, permissions);

  const allowsOwner = allowList.some((value) => value.toLowerCase() === 'owner');
  if (allowsOwner && userId && guildOwnerId && userId === guildOwnerId) {
    return true;
  }

  const allowsAdministrator = allowList.some((value) => value.toLowerCase() === 'administrator');
  if (allowsAdministrator && permissionsBitField?.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  if (userId && allowList.includes(userId)) return true;

  return roleIds.some((roleId) => allowList.includes(roleId));
}

export async function enforceInteractionAllow(
  interaction: ChatInputCommandInteraction,
  allowList: AllowList,
  options?: { formatEmoji?: (name: string) => string }
): Promise<boolean> {
  const formatEmoji = options?.formatEmoji;

  if (isMemberAllowed(allowList, interaction.member, interaction.memberPermissions, interaction.guild?.ownerId)) {
    return true;
  }

  let payload: InteractionReplyOptions = { content: NO_PERMISSIONS_MESSAGE, flags: MessageFlags.Ephemeral };

  if (formatEmoji) {
    const components: TopLevelComponentData[] = buildWarningView(formatEmoji, NO_PERMISSIONS_MESSAGE);
    payload = {
      components,
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    };
  }

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
  return false;
}

export async function enforceMessageAllow(
  message: Message,
  allowList: AllowList,
  options?: { formatEmoji?: (name: string) => string }
): Promise<boolean> {
  if (isMemberAllowed(allowList, message.member, null, message.guild?.ownerId)) {
    return true;
  }

  try {
    if (message.channel?.isSendable()) {
      const formatEmoji = options?.formatEmoji;
      const payload: MessageCreateOptions = formatEmoji
        ? { components: buildWarningView(formatEmoji, NO_PERMISSIONS_MESSAGE), flags: MessageFlags.IsComponentsV2 }
        : { content: NO_PERMISSIONS_MESSAGE };

      await message.channel.send(payload);
    }
  } catch {
    // ignore
  }

  return false;
}