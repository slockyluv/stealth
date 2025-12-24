import type { GuildMember, PartialGuildMember } from 'discord.js';
import { AuditLogEvent } from 'discord.js';
import { fetchAuditEntry } from '../../services/auditLog.js';
import { logKick, logTrafficLeave } from '../../services/actionLogger.js';
import { consumeTrafficInviter } from '../../services/actionLogState.js';

export async function guildMemberRemove(member: GuildMember | PartialGuildMember) {
  const guild = member.guild;

  const user = member.user ?? (await guild.client.users.fetch(member.id).catch(() => null));
  if (!user) return;

  const banEntry = await fetchAuditEntry({
    guild,
    type: AuditLogEvent.MemberBanAdd,
    targetId: member.id,
    withinMs: 20000
  });

  if (!banEntry) {
    const kickEntry = await fetchAuditEntry({
      guild,
      type: AuditLogEvent.MemberKick,
      targetId: member.id,
      withinMs: 20000
    });

    if (kickEntry) {
      await logKick({
        guild,
        user,
        moderatorId: kickEntry.executorId ?? null,
        reason: kickEntry.reason ?? null,
        createdAt: kickEntry.createdAt ?? new Date()
      });
    }
  }

  const inviter = consumeTrafficInviter(guild.id, member.id);

  await logTrafficLeave({
    guild,
    userId: member.id,
    inviterId: inviter?.inviterId ?? null,
    joinedAt: 'joinedAt' in member ? member.joinedAt : null,
    leftAt: new Date()
  });
}