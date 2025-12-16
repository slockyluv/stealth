import { MessageFlags, PermissionsBitField } from 'discord.js';
import { buildAutoRolesView, buildSettingsMainView } from '../../features/settings/autoRolesView.js';
import { getAutoRoles, setAutoRoles } from '../../../services/autoRoleService.js';
import { logger } from '../../../shared/logger.js';
function parsePage(args) {
    const [raw] = args;
    const parsed = Number.parseInt(raw ?? '1', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
async function ensurePermissions(interaction) {
    if (!interaction.inCachedGuild()) {
        await interaction.reply({
            content: 'Доступно только на сервере.',
            flags: MessageFlags.Ephemeral
        });
        return null;
    }
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
        await interaction.reply({
            content: 'Требуется право **Управление ролями**.',
            flags: MessageFlags.Ephemeral
        });
        return null;
    }
    const botMember = interaction.guild.members.me;
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        await interaction.reply({
            content: 'У бота нет права **Управление ролями** для применения настроек.',
            flags: MessageFlags.Ephemeral
        });
        return null;
    }
    return interaction.guild;
}
async function renderAutoRoles(interaction, guild, page) {
    const selectedRoles = await getAutoRoles(guild.id);
    const view = await buildAutoRolesView({ guild, selectedRoleIds: selectedRoles, page });
    await interaction.editReply({ embeds: [view.embed], components: view.components });
}
export const settingsBackButton = {
    key: 'settings:back',
    async execute(interaction) {
        const guild = await ensurePermissions(interaction);
        if (!guild)
            return;
        const view = buildSettingsMainView(guild);
        await interaction.update({ embeds: [view.embed], components: view.components });
    }
};
export const settingsClearRolesButton = {
    key: 'settings:clearRoles',
    async execute(interaction, ctx) {
        const guild = await ensurePermissions(interaction);
        if (!guild)
            return;
        const page = parsePage(ctx.customId.args);
        await interaction.deferUpdate();
        try {
            await setAutoRoles(guild.id, []);
            await renderAutoRoles(interaction, guild, page);
        }
        catch (error) {
            logger.error(error);
            await interaction.followUp({
                content: 'Не удалось очистить список ролей.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
export const settingsAutoPrevButton = {
    key: 'settings:autoPrev',
    async execute(interaction, ctx) {
        const guild = await ensurePermissions(interaction);
        if (!guild)
            return;
        const page = Math.max(parsePage(ctx.customId.args) - 1, 1);
        await interaction.deferUpdate();
        try {
            await renderAutoRoles(interaction, guild, page);
        }
        catch (error) {
            logger.error(error);
            await interaction.followUp({
                content: 'Не удалось обновить страницу ролей.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
export const settingsAutoNextButton = {
    key: 'settings:autoNext',
    async execute(interaction, ctx) {
        const guild = await ensurePermissions(interaction);
        if (!guild)
            return;
        const page = parsePage(ctx.customId.args) + 1;
        await interaction.deferUpdate();
        try {
            await renderAutoRoles(interaction, guild, page);
        }
        catch (error) {
            logger.error(error);
            await interaction.followUp({
                content: 'Не удалось обновить страницу ролей.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
//# sourceMappingURL=settingsAutoRoles.js.map