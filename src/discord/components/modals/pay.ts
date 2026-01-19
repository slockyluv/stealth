import { MessageFlags } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import {
  findRecipientUserIdByQuery,
  resolvePayTransferViewData,
  upsertPayTransferDraft
} from '../../../services/payTransferService.js';
import { buildPayTransferView } from '../../features/payTransferView.js';
import { logger } from '../../../shared/logger.js';

const RECIPIENT_INPUT_ID = 'pay-recipient-input';
const AMOUNT_INPUT_ID = 'pay-amount-input';

function parseAmount(value: string): bigint | null {
  const trimmed = value.trim().replace(/\s+/g, '');
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    const parsed = BigInt(trimmed);
    if (parsed <= 0n) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const payRecipientModal: ModalHandler = {
  key: 'pay:recipientModal',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта форма доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const value = interaction.fields.getTextInputValue(RECIPIENT_INPUT_ID).trim();
    if (!value) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Введите название страны или компании.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const recipientUserId = await findRecipientUserIdByQuery(interaction.guildId, value);
    if (!recipientUserId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Получатель не найден.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      await upsertPayTransferDraft(interaction.guildId, userId, {
        recipientUserId
      });

      const viewData = await resolvePayTransferViewData(interaction.guildId, userId);
      if (!viewData) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Сначала зарегистрируйте страну или компанию.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildPayTransferView({
        guild: interaction.guild,
        user: interaction.user,
        recipientEntity: viewData.recipientEntity,
        paymentSystem: viewData.paymentSystem,
        amount: viewData.amount,
        feeRate: viewData.feeRate
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить получателя.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const payAmountModal: ModalHandler = {
  key: 'pay:amountModal',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта форма доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const value = interaction.fields.getTextInputValue(AMOUNT_INPUT_ID);
    const amount = parseAmount(value);
    if (!amount) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Введите корректную сумму перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      await upsertPayTransferDraft(interaction.guildId, userId, {
        amount
      });

      const viewData = await resolvePayTransferViewData(interaction.guildId, userId);
      if (!viewData) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Сначала зарегистрируйте страну или компанию.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildPayTransferView({
        guild: interaction.guild,
        user: interaction.user,
        recipientEntity: viewData.recipientEntity,
        paymentSystem: viewData.paymentSystem,
        amount: viewData.amount,
        feeRate: viewData.feeRate
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить сумму.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};