import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import { ALLOW_PAY, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import {
  resolvePayTransferViewData,
  upsertPayTransferDraft
} from '../../services/payTransferService.js';
import { buildPayTransferView } from '../features/payTransferView.js';

const PAY_USAGE = '!pay @Пользователь <Сумма>';

function parseAmount(value: string | null | undefined): bigint | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return null;
  return BigInt(parsed);
}

async function buildPayViewPayload(options: {
  guildId: string;
  guild: NonNullable<Message['guild']>;
  user: Message['author'];
}): Promise<{ components: Awaited<ReturnType<typeof buildPayTransferView>> }> {
  const viewData = await resolvePayTransferViewData(options.guildId, options.user.id);
  if (!viewData) {
    throw new Error('SENDER_NOT_REGISTERED');
  }

  const view = await buildPayTransferView({
    guild: options.guild,
    user: options.user,
    recipientEntity: viewData.recipientEntity,
    paymentSystem: viewData.paymentSystem,
    paymentSystemSelected: viewData.paymentSystemSelected,
    amount: viewData.amount,
    feeRate: viewData.feeRate
  });

  return { components: view };
}

export const pay: Command = {
  defer: true,
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Перевод средств')
    .addUserOption((option) => option.setName('user').setDescription('Получатель').setRequired(false))
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Сумма').setRequired(false).setMinValue(1)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!(await enforceInteractionAllow(interaction, ALLOW_PAY, { formatEmoji }))) return;

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const recipient = interaction.options.getUser('user');
    const amountValue = interaction.options.getInteger('amount');
    const amount = amountValue !== null ? BigInt(amountValue) : null;

    await upsertPayTransferDraft(interaction.guildId, interaction.user.id, {
      recipientUserId: recipient?.id ?? null,
      amount: amount ?? null
    });

    try {
      const payload = await buildPayViewPayload({
        guildId: interaction.guildId,
        guild: interaction.guild,
        user: interaction.user
      });
      await interaction.reply({
        components: payload.components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'SENDER_NOT_REGISTERED'
          ? 'Вы не зарегистрированы. Зарегистрируйте страну или компанию.'
          : 'Не удалось открыть меню перевода.';
      await interaction.reply({
        components: buildWarningView(formatEmoji, message),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message, args: string[]) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!(await enforceMessageAllow(message, ALLOW_PAY, { formatEmoji }))) return;

    if (!message.guildId || !message.guild) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    const recipientMention = message.mentions.users.first();
    const mentionIndex = recipientMention ? args.findIndex((arg) => arg.includes(recipientMention.id)) : -1;
    const amountArg =
      mentionIndex >= 0
        ? args.slice(mentionIndex + 1).find((arg) => /^\d+$/.test(arg))
        : args.find((arg) => /^\d+$/.test(arg));
    const amount = parseAmount(amountArg);

    await upsertPayTransferDraft(message.guildId, message.author.id, {
      recipientUserId: recipientMention?.id ?? null,
      amount: amount ?? null
    });

    try {
      const payload = await buildPayViewPayload({
        guildId: message.guildId,
        guild: message.guild,
        user: message.author
      });
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: payload.components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const messageText =
        error instanceof Error && error.message === 'SENDER_NOT_REGISTERED'
          ? 'Вы не зарегистрированы. Зарегистрируйте страну или компанию.'
          : `Использование: ${PAY_USAGE}`;
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, messageText),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};