import type { GuildBan } from 'discord.js';
import { AuditLogEvent } from 'discord.js';
import { fetchAuditEntry } from '../../services/auditLog.js';
import { logBan } from '../../services/actionLogger.js';
import { consumePendingActionModerator, getBanInfo, setBanInfo } from '../../services/actionLogState.js';

export async function guildBanAdd(ban: GuildBan) {
  const guild = ban.guild;
  const user = ban.user;

  const audit = await fetchAuditEntry({
    guild,
    type: AuditLogEvent.MemberBanAdd,
    targetId: user.id
  });

  const pendingModerator = consumePendingActionModerator({
    guildId: guild.id,
    targetId: user.id,
    action: 'ban'
  });

  const existingBan = getBanInfo(guild.id, user.id);

  const moderatorId = pendingModerator ?? existingBan?.moderatorId ?? audit?.executorId ?? null;
  const reason = existingBan?.reason ?? audit?.reason ?? ban.reason ?? null;
  const createdAt = existingBan?.createdAt ?? audit?.createdAt ?? new Date();

  setBanInfo(guild.id, user.id, {
    reason,
    createdAt,
    moderatorId
  });

  await logBan({ guild, user, moderatorId, reason, createdAt });
}