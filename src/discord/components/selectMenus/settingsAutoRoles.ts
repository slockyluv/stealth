import { MessageFlags, PermissionsBitField } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildAutoRolesView } from '../../features/settings/autoRolesView.js';
import { getAutoRoles, setAutoRoles } from '../../../services/autoRoleService.js';
import { logger } from '../../../shared/logger.js';
import { buildTextView } from '../v2Message.js';

function parsePage(args: string[]): number {
  const [raw] = args;
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export const settingsAutoRolesSelect: SelectMenuHandler = {
  key: 'settings:autoRoles',

  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'Меню доступно только на сервере.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
      await interaction.reply({
        content: 'Требуется право **Управление ролями**.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const botMember = interaction.guild.members.me;

    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      await interaction.reply({
        content: 'У бота нет права **Управление ролями** для применения изменений.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const page = parsePage(ctx.customId.args);

    await interaction.deferUpdate();

    try {
      const existingRoles = await getAutoRoles(interaction.guild.id);
      const currentView = await buildAutoRolesView({
        guild: interaction.guild,
        selectedRoleIds: existingRoles,
        page
      });

      const pageRoleIds = new Set(currentView.pageRoles.map((role) => role.id));
      const keptRoles = existingRoles.filter((id) => !pageRoleIds.has(id));
      const nextSelection = [...keptRoles, ...interaction.values];

      const savedRoles = await setAutoRoles(interaction.guild.id, nextSelection);
      const view = await buildAutoRolesView({ guild: interaction.guild, selectedRoleIds: savedRoles, page });

      await interaction.editReply({
        embeds: [],
        components: view.components,
        attachments: view.removeAttachments ? [] : undefined,
        flags: MessageFlags.IsComponentsV2
      });
      await interaction.followUp({
        components: buildTextView(
          'Список ролей успешно обновлен.\nАвтоматические роли будут выдаваться новым участникам.'
        ),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        content: 'Не удалось обновить автоматические роли. Попробуйте позже.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};