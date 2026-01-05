import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildSuccessView, buildWarningView } from '../../responses/messageBuilders.js';
import { registerExistingCompany } from '../../../services/privateCompanyService.js';
import { findCountryByKey } from '../../../services/countryRegistrationService.js';
import { formatNicknameUpdateNotice, updateCompanyNickname } from '../../nickname.js';
import { logger } from '../../../shared/logger.js';

async function getFormatEmoji(interaction: Parameters<SelectMenuHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const companyExistingSelect: SelectMenuHandler = {
  key: 'companyReg:existingSelect',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const companyId = interaction.values[0];
    if (!companyId || companyId === 'unavailable') {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Компания недоступна. Обновите список.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const result = await registerExistingCompany({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        companyId
      });

      if (result.status === 'countryRegistered') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Вы уже зарегистрированы!'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'companyRegistered') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Вы уже зарегистрированы!'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAvailable') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Компания уже занята или недоступна. Обновите список.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      let nicknameNotice = '';
      const countryInfo = findCountryByKey(result.company.countryKey);
      if (countryInfo?.country) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        const nicknameResult = await updateCompanyNickname({
          member,
          country: countryInfo.country,
          industryKey: result.company.industryKey,
          companyName: result.company.name
        });
        nicknameNotice = formatNicknameUpdateNotice(formatEmoji, nicknameResult);
      }

      await interaction.editReply({
        components: buildSuccessView(
          formatEmoji,
          `Компания __${result.company.name}__ успешно зарегистрирована.${nicknameNotice}`
        ),
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось зарегистрировать компанию. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось зарегистрировать компанию. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};