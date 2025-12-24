import { MessageFlags, PermissionsBitField } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildActionLogCategoryView, buildActionLogsOverview } from '../../features/settings/actionLogsView.js';
import { parseCustomId } from '../../../shared/customId.js';
import { logger } from '../../../shared/logger.js';
import { buildTextView } from '../v2Message.js';
import { type ActionLogCategory } from '../../../services/actionLogSettingsService.js';

function ensurePermissions(interaction: Parameters<ButtonHandler['execute']>[0]): boolean {
  if (!interaction.inCachedGuild()) {
    interaction.reply({
      components: buildTextView('Настройки журнала доступны только на сервере.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    }).catch(() => {});
    return false;
  }

  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    interaction.reply({
      components: buildTextView('Требуется право **Управление сервером** для изменения журнала действий.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    }).catch(() => {});
    return false;
  }

  return true;
}

export const actionLogsPageButton: ButtonHandler = {
  key: 'actionLogs:page',

  async execute(interaction) {
    if (!ensurePermissions(interaction)) return;

    const guild = interaction.guild;
    if (!guild) return;

    const parsed = parseCustomId(interaction.customId);
    if (!parsed || parsed.args.length < 2) {
      await interaction.reply({
        components: buildTextView('Некорректный идентификатор действия.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [category, pageRaw] = parsed.args as [ActionLogCategory, string];
    const page = Number.parseInt(pageRaw, 10) || 1;

    await interaction.deferUpdate();

    try {
      const view = await buildActionLogCategoryView({ guild, category, page });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildTextView('Не удалось обновить страницу списка каналов.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const actionLogsHomeButton: ButtonHandler = {
  key: 'actionLogs:home',

  async execute(interaction) {
    if (!ensurePermissions(interaction)) return;

    await interaction.deferUpdate();

    try {
      const guild = interaction.guild;
      if (!guild) return;

      const view = await buildActionLogsOverview(guild);
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildTextView('Не удалось открыть список журналов.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};