import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionsBitField,
  MessageFlags,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildSettingsMainView } from '../features/settings/autoRolesView.js';

function hasManageRoles(interaction: ChatInputCommandInteraction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles) ?? false;
}

function hasManageRolesMessage(message: Message) {
  return message.member?.permissions.has(PermissionsBitField.Flags.ManageRoles) ?? false;
}

export const settings: Command = {
  data: new SlashCommandBuilder().setName('settings').setDescription('Настройки сервера'),

  async execute(interaction: ChatInputCommandInteraction) {
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

    const view = await buildSettingsMainView(interaction.guild);

    await interaction.reply({
      components: view.components,
      files: view.files,
      flags: MessageFlags.IsComponentsV2
    });
  },

  async executeMessage(message: Message) {
    if (!message.guild) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send('Команда доступна только на сервере.');
      return;
    }

    if (!hasManageRolesMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send('Требуется право **Управление ролями**.');
      return;
    }

    const botMember = message.guild.members.me;

    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send('У бота нет права **Управление ролями** для изменения настроек.');
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