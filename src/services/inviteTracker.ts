import type { Collection, Invite, Guild } from 'discord.js';
import { logger } from '../shared/logger.js';

type InviteState = {
  uses: number;
  inviterId: string | null;
};

const inviteCache = new Map<string, Map<string, InviteState>>();

function toState(invite: Invite): InviteState {
  return {
    uses: invite.uses ?? 0,
    inviterId: invite.inviter?.id ?? null
  };
}

function mergeInvites(collection: Collection<string, Invite>): Map<string, InviteState> {
  const map = new Map<string, InviteState>();
  for (const invite of collection.values()) {
    map.set(invite.code, toState(invite));
  }
  return map;
}

export async function snapshotGuildInvites(guild: Guild) {
  try {
    const invites = await guild.invites.fetch();
    inviteCache.set(guild.id, mergeInvites(invites));
  } catch (error) {
    logger.error(error);
  }
}

export async function refreshGuildInvites(guild: Guild) {
  await snapshotGuildInvites(guild);
}

export function handleInviteCreate(invite: Invite) {
  const map = inviteCache.get(invite.guild?.id ?? '') ?? new Map<string, InviteState>();
  if (!invite.guild) return;

  map.set(invite.code, toState(invite));
  inviteCache.set(invite.guild.id, map);
}

export function handleInviteDelete(invite: Invite) {
  const guildId = invite.guild?.id;
  if (!guildId) return;

  const map = inviteCache.get(guildId);
  if (!map) return;

  map.delete(invite.code);
}

export async function resolveInviteUsage(guild: Guild): Promise<{ inviterId: string | null }> {
  try {
    const previous = inviteCache.get(guild.id) ?? new Map<string, InviteState>();
    const currentInvites = await guild.invites.fetch();
    const current = mergeInvites(currentInvites);

    inviteCache.set(guild.id, current);

    let matched: InviteState | null = null;

    for (const [code, state] of current.entries()) {
      const before = previous.get(code);
      if (!before) continue;
      if (state.uses > before.uses) {
        matched = state;
        break;
      }
    }

    if (matched) {
      return { inviterId: matched.inviterId };
    }
  } catch (error) {
    logger.error(error);
  }

  return { inviterId: null };
}