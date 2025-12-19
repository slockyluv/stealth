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
import { getAutoRoles } from '../../../services/autoRoleService.js';
import { logger } from '../../../shared/logger.js';
import { buildCustomId } from '../../../shared/customId.js';

export const settingsSectionSelect: SelectMenuHandler = {
  key: 'settings:section',

  async execute(interaction) {
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

    const [selection] = interaction.values;

    if (selection === 'auto_roles') {
      const botMember = interaction.guild.members.me;

      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        await interaction.reply({
          content: 'У бота нет права **Управление ролями** для настройки автодобавления.',
          flags: MessageFlags.Ephemeral
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
          content: 'Не удалось открыть автоматические роли. Попробуйте позже.',
          flags: MessageFlags.Ephemeral
        });
      }

      return;
    }

    if (selection === 'emoji_color') {
      try {
        const modal = new ModalBuilder()
          .setCustomId(buildCustomId('settings', 'emojiColor'))
          .setTitle('Цвет эмодзи')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              (() => {
                const input = new TextInputBuilder()
                  .setCustomId('emojiColor')
                  .setLabel('Введите HEX-код цвета (например, #5865F2)')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('#5865F2')
                  .setRequired(false);

                return input;
              })()
            )
          );

        await interaction.showModal(modal);
      } catch (error) {
        logger.error(error);
        await interaction.reply({
          content: 'Не удалось открыть настройку цвета эмодзи. Попробуйте позже.',
          flags: MessageFlags.Ephemeral
        });
      }

      return;
    }

    const view = buildSettingsMainView(interaction.guild);
    await interaction.update({
      embeds: [],
      components: view.components,
      files: view.files,
      attachments: [],
      flags: MessageFlags.IsComponentsV2
    });
  }
};