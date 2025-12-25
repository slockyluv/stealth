import { AuditLogEvent, type GuildMember, type PartialGuildMember } from 'discord.js';
import { fetchAuditEntry } from '../../services/auditLog.js';
import {
  logMute,
  logNicknameChange,
  logRoleGrant,
  logRoleRevoke,
  logUnmute
} from '../../services/actionLogger.js';
import { clearMute, getMute, upsertMute } from '../../services/muteService.js';
import { consumePendingActionModerator, consumeTempRole } from '../../services/actionLogState.js';

export async function guildMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
  const guild = newMember.guild;

  const oldTimeout = 'communicationDisabledUntilTimestamp' in oldMember
    ? oldMember.communicationDisabledUntilTimestamp ?? null
    : null;
  const newTimeout = newMember.communicationDisabledUntilTimestamp ?? null;

  if (!oldTimeout && newTimeout) {
    const audit = await fetchAuditEntry({
      guild,
      type: AuditLogEvent.MemberUpdate,
      targetId: newMember.id,
      predicate: (entry) => entry.changes?.some((change) => change.key === 'communication_disabled_until') ?? false
    });

    const moderatorId =
      consumePendingActionModerator({ guildId: guild.id, targetId: newMember.id, action: 'mute' }) ??
      audit?.executorId ??
      null;
    const reason = audit?.reason ?? null;
    const createdAt = audit?.createdAt ?? new Date();
    const durationMs = Math.max(0, newTimeout - (audit?.createdTimestamp ?? Date.now()));

    await logMute({
      guild,
      user: newMember.user,
      moderatorId,
      reason,
      durationMs,
      expiresAt: new Date(newTimeout),
      createdAt
    });

    if (newMember.client.user?.id) {
      await upsertMute({
        guildId: guild.id,
        userId: newMember.id,
        moderatorId: moderatorId ?? newMember.client.user.id,
        reason: reason ?? undefined,
        expiresAt: new Date(newTimeout)
      });
    }
  } else if (oldTimeout && !newTimeout) {
    const audit = await fetchAuditEntry({
      guild,
      type: AuditLogEvent.MemberUpdate,
      targetId: newMember.id,
      predicate: (entry) => entry.changes?.some((change) => change.key === 'communication_disabled_until') ?? false,
      withinMs: 30000
    });

    const record = await getMute({ guildId: guild.id, userId: newMember.id });
    const moderatorId =
      consumePendingActionModerator({ guildId: guild.id, targetId: newMember.id, action: 'unmute' }) ??
      audit?.executorId ??
      null;

    await logUnmute({
      guild,
      user: newMember.user,
      moderatorId,
      reason: record?.reason ?? audit?.reason ?? null,
      durationMs: record ? record.expiresAt.getTime() - record.createdAt.getTime() : null,
      expiresAt: record?.expiresAt ?? new Date(oldTimeout),
      mutedAt: record?.createdAt ?? null,
      removedAt: new Date()
    });

    await clearMute({ guildId: guild.id, userId: newMember.id });
  }

  const oldNickname = 'nickname' in oldMember ? oldMember.nickname : null;

  if (oldNickname !== null && oldNickname !== newMember.nickname) {
    const audit = await fetchAuditEntry({
      guild,
      type: AuditLogEvent.MemberUpdate,
      targetId: newMember.id,
      predicate: (entry) => entry.changes?.some((change) => change.key === 'nick') ?? false,
      withinMs: 30000
    });

    await logNicknameChange({
      guild,
      user: newMember.user,
      moderatorId:
        consumePendingActionModerator({ guildId: guild.id, targetId: newMember.id, action: 'nickname' }) ??
        audit?.executorId ??
        null,
      oldNickname,
      newNickname: newMember.nickname,
      changedAt: audit?.createdAt ?? new Date()
    });
  }

  const oldRoles = 'roles' in oldMember ? new Set(oldMember.roles.cache.keys()) : null;
  const newRoles = new Set(newMember.roles.cache.keys());

  const addedRoles: string[] = [];
  const removedRoles: string[] = [];

  if (oldRoles) {
    for (const roleId of newRoles) {
      if (!oldRoles.has(roleId)) addedRoles.push(roleId);
    }

    for (const roleId of oldRoles) {
      if (!newRoles.has(roleId)) removedRoles.push(roleId);
    }
  }

  if (addedRoles.length > 0 || removedRoles.length > 0) {
    const audit = await fetchAuditEntry({
      guild,
      type: AuditLogEvent.MemberRoleUpdate,
      targetId: newMember.id,
      withinMs: 30000
    });

    const moderatorId = audit?.executorId ?? null;
    const timestamp = audit?.createdAt ?? new Date();

    for (const roleId of addedRoles) {
      const tempRole = consumeTempRole(guild.id, newMember.id, roleId);
      await logRoleGrant({
        guild,
        roleId,
        userId: newMember.id,
        moderatorId:
          consumePendingActionModerator({
            guildId: guild.id,
            targetId: newMember.id,
            action: 'role-add',
            extraId: roleId
          }) ?? moderatorId,
        at: timestamp,
        temporary: Boolean(tempRole),
        durationLabel: tempRole?.durationLabel,
        expiresAt: tempRole?.expiresAt
      });
    }

    for (const roleId of removedRoles) {
      await logRoleRevoke({
        guild,
        roleId,
        userId: newMember.id,
        moderatorId:
          consumePendingActionModerator({
            guildId: guild.id,
            targetId: newMember.id,
            action: 'role-remove',
            extraId: roleId
          }) ?? moderatorId,
        at: timestamp
      });
    }
  }
}