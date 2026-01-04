import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { buildPrivateCompanyRegistrationView } from '../../features/registration/privateCompanyRegistrationView.js';
import { findIndustryByKey, upsertCompanyDraft } from '../../../services/privateCompanyService.js';
import { logger } from '../../../shared/logger.js';

async function getFormatEmoji(interaction: Parameters<SelectMenuHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const companyIndustrySelect: SelectMenuHandler = {
  key: 'companyReg:industry',

  async execute(interaction, ctx) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [messageId] = ctx.customId.args;
    if (!messageId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректное меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const industryKey = interaction.values[0];
    const industry = findIndustryByKey(industryKey);
    if (!industry) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректный выбор отрасли.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      await upsertCompanyDraft(interaction.guildId, interaction.user.id, {
        industryKey: industry.key,
        industryLabel: industry.label
      });

      const channel = interaction.channel;
      if (!channel || !channel.isTextBased()) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить сообщение регистрации.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const message = await channel.messages.fetch(messageId);
      const view = await buildPrivateCompanyRegistrationView({
        guild: interaction.guild,
        userId: interaction.user.id
      });
      await message.edit({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось сохранить отрасль. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось сохранить отрасль. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};