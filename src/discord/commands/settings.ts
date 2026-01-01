import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionsBitField,
  MessageFlags,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildSettingsMainView } from '../features/settings/autoRolesView.js';
import { ALLOW_SETTINGS, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';

function hasManageRoles(interaction: ChatInputCommandInteraction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles) ?? false;
}

function hasManageRolesMessage(message: Message) {
  return message.member?.permissions.has(PermissionsBitField.Flags.ManageRoles) ?? false;
}

export const settings: Command = {
  data: new SlashCommandBuilder().setName('settings').setDescription('Настройки сервера'),

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    })

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_SETTINGS))) return;
    
    if (!hasManageRoles(interaction)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Требуется право **Управление ролями**.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = interaction.guild.members.me;

    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'У бота нет права **Управление ролями** для изменения настроек.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = await buildSettingsMainView(interaction.guild);

    await interaction.reply({
      components: view.components,
      files: view.files,
      flags: MessageFlags.IsComponentsV2
    });
  },

  async executeMessage(message: Message) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!message.guild) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceMessageAllow(message, ALLOW_SETTINGS))) return;

    if (!hasManageRolesMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Требуется право **Управление ролями**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = message.guild.members.me;

    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'У бота нет права **Управление ролями** для изменения настроек.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = await buildSettingsMainView(message.guild);

    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: view.components,
      files: view.files,
      flags: MessageFlags.IsComponentsV2
    });
  }
};