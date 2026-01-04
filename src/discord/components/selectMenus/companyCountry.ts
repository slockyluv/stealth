import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { buildPrivateCompanyRegistrationView } from '../../features/registration/privateCompanyRegistrationView.js';
import { getContinent } from '../../features/settings/countriesView.js';
import { getAvailableCompanyCountries, upsertCompanyDraft } from '../../../services/privateCompanyService.js';
import { normalizeCountryKey } from '../../../services/countryProfileService.js';
import { logger } from '../../../shared/logger.js';

async function getFormatEmoji(interaction: Parameters<SelectMenuHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const companyCountrySelect: SelectMenuHandler = {
  key: 'companyReg:country',

  async execute(interaction, ctx) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [messageId, continentId] = ctx.customId.args;
    if (!messageId || !continentId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректное меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const continent = getContinent(continentId);
    if (!continent) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Не удалось определить континент. Обновите меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const countryName = interaction.values[0];
    const country = continent.countries.find((item) => item.name === countryName);

    if (!country) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Страна не найдена или уже недоступна. Обновите список.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const available = await getAvailableCompanyCountries(interaction.guildId, continent.id);
      const stillAvailable = available.some((item) => item.name === country.name);
      if (!stillAvailable) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта страна уже занята. Выберите другую.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      await upsertCompanyDraft(interaction.guildId, interaction.user.id, {
        countryName: country.name,
        countryKey: normalizeCountryKey(country.name),
        continent: continent.id
      });

      const view = await buildPrivateCompanyRegistrationView({
        guild: interaction.guild,
        userId: interaction.user.id
      });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось сохранить страну. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось сохранить страну. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};