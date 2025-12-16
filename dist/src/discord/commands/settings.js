import { SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { buildSettingsMainView } from '../features/settings/autoRolesView.js';
function hasManageRoles(interaction) {
    return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles) ?? false;
}
export const settings = {
    data: new SlashCommandBuilder().setName('settings').setDescription('Настройки сервера'),
    async execute(interaction) {
        if (!interaction.inCachedGuild()) {
            await interaction.reply({
                content: 'Команда доступна только на сервере.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        if (!hasManageRoles(interaction)) {
            await interaction.reply({
                content: 'Требуется право **Управление ролями**.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        const botMember = interaction.guild.members.me;
        if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            await interaction.reply({
                content: 'У бота нет права **Управление ролями** для изменения настроек.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        const view = buildSettingsMainView(interaction.guild);
        await interaction.reply({
            embeds: [view.embed],
            components: view.components,
            flags: MessageFlags.Ephemeral
        });
    }
};
//# sourceMappingURL=settings.js.map