import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import {
  resolvePayTransferViewData,
  upsertPayTransferDraft
} from '../../../services/payTransferService.js';
import { buildPayTransferView } from '../../features/payTransferView.js';
import { logger } from '../../../shared/logger.js';

export const payMethodSelect: SelectMenuHandler = {
  key: 'pay:methodSelect',

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
        components: buildWarningView(formatEmoji, 'Некорректный выбор.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Этот выбор доступен только владельцу перевода.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [selected] = interaction.values;
    if (!selected) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Выберите платежную систему.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const paymentSystemId = selected === 'cash' ? null : BigInt(selected);
      await upsertPayTransferDraft(interaction.guildId, userId, {
        paymentSystemCompanyId: paymentSystemId,
        paymentSystemSelected: true
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
        paymentSystemSelected: viewData.paymentSystemSelected,
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
        components: buildWarningView(formatEmoji, 'Не удалось выбрать платежную систему.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};