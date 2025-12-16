import { PermissionsBitField } from 'discord.js';
import { getAutoRoles } from '../../services/autoRoleService.js';
import { logger } from '../../shared/logger.js';
export async function guildMemberAdd(member) {
    try {
        const autoRoles = await getAutoRoles(member.guild.id);
        if (autoRoles.length === 0)
            return;
        const botMember = member.guild.members.me;
        if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles))
            return;
        const roles = await member.guild.roles.fetch();
        const assignable = autoRoles
            .map((id) => roles.get(id))
            .filter((role) => Boolean(role))
            .filter((role) => !role.managed)
            .filter((role) => botMember.roles.highest.comparePositionTo(role) > 0)
            .map((role) => role.id);
        if (assignable.length === 0)
            return;
        await member.roles.add(assignable);
    }
    catch (error) {
        logger.error(error);
    }
}
//# sourceMappingURL=guildMemberAdd.js.map