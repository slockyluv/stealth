import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionsBitField,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildSettingsMainView, buildAutoRolesView } from '../../features/settings/autoRolesView.js';
import { buildActionLogsOverview } from '../../features/settings/actionLogsView.js';
import { getAutoRoles } from '../../../services/autoRoleService.js';
import { logger } from '../../../shared/logger.js';
import { buildCustomId } from '../../../shared/customId.js';
import { buildTextView } from '../v2Message.js';
import { buildCountriesContinentView } from '../../features/settings/countriesView.js';

export const settingsSectionSelect: SelectMenuHandler = {
  key: 'settings:section',

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Меню доступно только на сервере.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
      await interaction.reply({
        components: buildTextView('Требуется право **Управление ролями**.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [selection] = interaction.values;

    if (selection === 'auto_roles') {
      const botMember = interaction.guild.members.me;

      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        await interaction.reply({
          components: buildTextView('У бота нет права **Управление ролями** для настройки автодобавления.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      await interaction.deferUpdate();

      try {
        const selectedRoles = await getAutoRoles(interaction.guild.id);
        const view = await buildAutoRolesView({ guild: interaction.guild, selectedRoleIds: selectedRoles });

        await interaction.editReply({
          embeds: [],
          components: view.components,
          files: view.files,
          attachments: view.removeAttachments ? [] : undefined,
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error(error);
        await interaction.followUp({
          components: buildTextView('Не удалось открыть автоматические роли. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }

      return;
    }

    if (selection === 'emoji_color') {
      try {
        const modal = new ModalBuilder()
          .setCustomId(buildCustomId('settings', 'emojiColor', interaction.message.id))
          .setTitle('Цвет эмодзи')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              (() => {
                const input = new TextInputBuilder()
                  .setCustomId('emojiColor')
                  .setLabel('Введите HEX-код цвета (#RRGGBB или #AARRGGBB)')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('#5865F2 или #FF5865F2')
                  .setRequired(false);

                return input;
              })()
            )
          );

        await interaction.showModal(modal);
      } catch (error) {
        logger.error(error);
        await interaction.reply({
          components: buildTextView('Не удалось открыть настройку цвета эмодзи. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }

      return;
    }

    if (selection === 'action_logs') {
      await interaction.deferUpdate();

      try {
        const view = await buildActionLogsOverview(interaction.guild);
        await interaction.editReply({
          embeds: [],
          components: view.components,
          files: [],
          attachments: [],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error(error);
        await interaction.followUp({
          components: buildTextView('Не удалось открыть журнал действий. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }

      return;
    }

    if (selection === 'countries') {
      await interaction.deferUpdate();

      try {
        const view = await buildCountriesContinentView(interaction.guild);

        await interaction.editReply({
          embeds: [],
          components: view.components,
          files: [],
          attachments: [],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error(error);
        await interaction.followUp({
          components: buildTextView('Не удалось загрузить список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }

      return;
    }

    const view = await buildSettingsMainView(interaction.guild);
    await interaction.update({
      embeds: [],
      components: view.components,
      files: view.files,
      attachments: [],
      flags: MessageFlags.IsComponentsV2
    });
  }
};