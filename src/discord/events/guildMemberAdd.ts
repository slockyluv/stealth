import { PermissionsBitField, type GuildMember } from 'discord.js';
import { getAutoRoles } from '../../services/autoRoleService.js';
import { logger } from '../../shared/logger.js';
import { resolveInviteUsage } from '../services/inviteTracker.js';
import { setTrafficInviter } from '../services/actionLogState.js';
import { logTrafficJoin } from '../services/actionLogger.js';

export async function guildMemberAdd(member: GuildMember) {
  try {
    const autoRoles = await getAutoRoles(member.guild.id);

    if (autoRoles.length > 0) {
      const botMember = member.guild.members.me;
      if (botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        const roles = await member.guild.roles.fetch();

        const assignable = autoRoles
          .map((id) => roles.get(id))
          .filter((role): role is NonNullable<typeof role> => Boolean(role))
          .filter((role) => !role.managed)
          .filter((role) => botMember.roles.highest.comparePositionTo(role) > 0)
          .map((role) => role.id);

        if (assignable.length > 0) {
          await member.roles.add(assignable);
        }
      }
    }
  } catch (error) {
    logger.error(error);
  }

  const { inviterId } = await resolveInviteUsage(member.guild);
  setTrafficInviter(member.guild.id, member.id, inviterId);

  await logTrafficJoin({
    guild: member.guild,
    userId: member.id,
    inviterId,
    joinedAt: member.joinedAt ?? new Date()
  });
}