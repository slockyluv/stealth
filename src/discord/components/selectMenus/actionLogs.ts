import { MessageFlags, PermissionsBitField } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildActionLogCategoryView, buildActionLogsOverview } from '../../features/settings/actionLogsView.js';
import { setActionLogChannel, type ActionLogCategory } from '../../../services/actionLogSettingsService.js';
import { parseCustomId } from '../../../shared/customId.js';
import { logger } from '../../../shared/logger.js';
import { buildTextView } from '../v2Message.js';

function ensurePermissions(interaction: Parameters<SelectMenuHandler['execute']>[0]): boolean {
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

export const actionLogsSectionSelect: SelectMenuHandler = {
  key: 'actionLogs:section',

  async execute(interaction) {
    if (!ensurePermissions(interaction)) return;

    const guild = interaction.guild;
    if (!guild) return;

    const [selection] = interaction.values as ActionLogCategory[];
    if (!selection) {
      await interaction.reply({
        components: buildTextView('Выберите доступный журнал.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const view = await buildActionLogCategoryView({ guild, category: selection });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildTextView('Не удалось открыть выбранный журнал. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const actionLogsChannelSelect: SelectMenuHandler = {
  key: 'actionLogs:channel',

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
      const [selection] = interaction.values;
      const channelId = selection ?? null;

      await setActionLogChannel({
        guildId: interaction.guildId ?? guild.id,
        category,
        channelId: channelId === 'none' ? null : channelId,
        adminId: interaction.user.id
      });

      const view = await buildActionLogCategoryView({ guild, category, page });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildTextView('Не удалось сохранить настройки журнала.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};