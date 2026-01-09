import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags, type Message } from 'discord.js';
import type { Command } from '../../types/command.js';
import { ALLOW_PING, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildTextContainer } from '../responses/messageBuilders.js';

export const ping: Command = {
  defer: false,
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  async execute(interaction: ChatInputCommandInteraction) {
    const deliveryMs = Math.max(0, Math.round(Date.now() - interaction.createdTimestamp));
    const wsMs = Math.max(0, Math.round(interaction.client.ws.ping));
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!(await enforceInteractionAllow(interaction, ALLOW_PING, { formatEmoji }))) return;
    const replyStartedAt = Date.now();
    await interaction.reply({
      components: buildTextContainer(
        `**WS:** ${wsMs} ms\n**Delivery:** ${deliveryMs} ms\n**API:** …`
      ),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    const apiMs = Math.max(0, Math.round(Date.now() - replyStartedAt));
    await interaction.editReply({
      components: buildTextContainer(
        `**WS:** ${wsMs} ms\n**Delivery:** ${deliveryMs} ms\n**API:** ${apiMs} ms`
      )
    });
  },

  async executeMessage(message: Message) {
    const deliveryMs = Math.max(0, Math.round(Date.now() - message.createdTimestamp));
    const wsMs = Math.max(0, Math.round(message.client.ws.ping));
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!(await enforceMessageAllow(message, ALLOW_PING, { formatEmoji }))) return;
    
    if (!message.channel?.isSendable()) return;
    const replyStartedAt = Date.now();
    const sentMessage = await message.channel.send({
      components: buildTextContainer(
        `**WS:** ${wsMs} ms\n**Delivery:** ${deliveryMs} ms\n**API:** …`
      ),
      flags: MessageFlags.IsComponentsV2
    });
    const apiMs = Math.max(0, Math.round(Date.now() - replyStartedAt));
    await sentMessage.edit({
      components: buildTextContainer(
        `**WS:** ${wsMs} ms\n**Delivery:** ${deliveryMs} ms\n**API:** ${apiMs} ms`
      )
    });
  }
};
