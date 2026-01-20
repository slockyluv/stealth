import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import type { Guild, User } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { buildPayTransferMethodView, buildPayTransferSuccessView, buildPayTransferView } from '../../features/payTransferView.js';
import {
  getPayTransferDraft,
  getPaymentSystemsForCountry,
  performPayTransfer,
  resolvePayTransferViewData
} from '../../../services/payTransferService.js';
import { logger } from '../../../shared/logger.js';

const RECIPIENT_INPUT_ID = 'pay-recipient-input';
const AMOUNT_INPUT_ID = 'pay-amount-input';

async function buildMainView(guildId: string, userId: string, guild: Guild, user: User) {
  const viewData = await resolvePayTransferViewData(guildId, userId);
  if (!viewData) {
    throw new Error('SENDER_NOT_REGISTERED');
  }

  return buildPayTransferView({
    guild,
    user,
    recipientEntity: viewData.recipientEntity,
    paymentSystem: viewData.paymentSystem,
    paymentSystemSelected: viewData.paymentSystemSelected,
    amount: viewData.amount,
    feeRate: viewData.feeRate
  });
}

export const payEditRecipientButton: ButtonHandler = {
  key: 'pay:editRecipient',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('pay', 'recipientModal', userId))
      .setTitle('Выбор получателя');

    const input = new TextInputBuilder()
      .setCustomId(RECIPIENT_INPUT_ID)
      .setLabel('Название страны или компании')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
  }
};

export const payEditMethodButton: ButtonHandler = {
  key: 'pay:editMethod',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const viewData = await resolvePayTransferViewData(interaction.guildId, userId);
    if (!viewData) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала зарегистрируйте страну или компанию.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    const paymentSystems = await getPaymentSystemsForCountry(interaction.guildId, viewData.senderEntity.countryKey);
    const view = await buildPayTransferMethodView({
      guild: interaction.guild,
      user: interaction.user,
      paymentSystems,
      selectedPaymentSystemId: viewData.paymentSystem?.company.id ?? null
    });

    await interaction.editReply({
      components: view,
      flags: MessageFlags.IsComponentsV2
    });
  }
};

export const payEditAmountButton: ButtonHandler = {
  key: 'pay:editAmount',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('pay', 'amountModal', userId))
      .setTitle('Сумма перевода');

    const input = new TextInputBuilder()
      .setCustomId(AMOUNT_INPUT_ID)
      .setLabel('Сумма')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
  }
};

export const payBackButton: ButtonHandler = {
  key: 'pay:back',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const view = await buildMainView(interaction.guildId, userId, interaction.guild, interaction.user);
      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить меню перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const payConfirmMethodButton: ButtonHandler = {
  key: 'pay:confirmMethod',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const view = await buildMainView(interaction.guildId, userId, interaction.guild, interaction.user);
      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось подтвердить платежную систему.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const payTransferButton: ButtonHandler = {
  key: 'pay:transfer',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [userId] = ctx.customId.args;
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const draft = await getPayTransferDraft(interaction.guildId, userId);
    if (!draft?.recipientUserId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Укажите получателя перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!draft.amount || draft.amount <= 0n) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Укажите сумму перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    const result = await performPayTransfer({
      guildId: interaction.guildId,
      senderUserId: userId,
      recipientUserId: draft.recipientUserId.toString(),
      amount: draft.amount,
      preferredPaymentSystemId: draft.paymentSystemCompanyId ?? undefined
    });

    if (result.status === 'error') {
      await interaction.followUp({
        components: buildWarningView(formatEmoji, result.reason),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const paymentSystems = await getPaymentSystemsForCountry(interaction.guildId, result.senderEntity.countryKey);
    const paymentSystem =
      result.paymentSystemCompanyId !== null
        ? paymentSystems.find((entry) => entry.company.id === result.paymentSystemCompanyId) ?? null
        : null;

    const view = await buildPayTransferSuccessView({
      guild: interaction.guild,
      user: interaction.user,
      recipientEntity: result.recipientEntity,
      paymentSystem,
      amount: draft.amount,
      feeRate: result.feeRate,
      feeAmount: result.feeAmount,
      receivedAmount: result.receivedAmount
    });

    await interaction.editReply({
      components: view,
      flags: MessageFlags.IsComponentsV2
    });
  }
};