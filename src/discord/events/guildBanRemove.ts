import type { GuildBan } from 'discord.js';
import { AuditLogEvent } from 'discord.js';
import { fetchAuditEntry } from '../../services/auditLog.js';
import { logUnban } from '../../services/actionLogger.js';
import { clearBanInfo, consumePendingActionModerator, getBanInfo } from '../../services/actionLogState.js';

export async function guildBanRemove(ban: GuildBan) {
  const guild = ban.guild;
  const user = ban.user;

  const audit = await fetchAuditEntry({
    guild,
    type: AuditLogEvent.MemberBanRemove,
    targetId: user.id
  });

  const banInfo = getBanInfo(guild.id, user.id);
  clearBanInfo(guild.id, user.id);

  const moderatorId =
    consumePendingActionModerator({ guildId: guild.id, targetId: user.id, action: 'unban' }) ??
    audit?.executorId ??
    null;

  await logUnban({
    guild,
    user,
    moderatorId,
    banReason: banInfo?.reason ?? null,
    bannedAt: banInfo?.createdAt ?? null,
    unbannedAt: audit?.createdAt ?? new Date()
  });
}