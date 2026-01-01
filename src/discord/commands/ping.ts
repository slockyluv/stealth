import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags, type Message } from 'discord.js';
import type { Command } from '../../types/command.js';
import { ALLOW_PING, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildTextContainer } from '../responses/messageBuilders.js';

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  async execute(interaction: ChatInputCommandInteraction) {
    const ping = Math.max(0, Math.round(Date.now() - interaction.createdTimestamp));
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!(await enforceInteractionAllow(interaction, ALLOW_PING, { formatEmoji }))) return;
    await interaction.reply({
      components: buildTextContainer(`**Задержка: ${ping} ms**`),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  },

  async executeMessage(message: Message) {
    const ping = Math.max(0, Math.round(Date.now() - message.createdTimestamp));
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!(await enforceMessageAllow(message, ALLOW_PING, { formatEmoji }))) return;
    
    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: buildTextContainer(`**Задержка: ${ping} ms**`),
      flags: MessageFlags.IsComponentsV2
    });
  }
};
