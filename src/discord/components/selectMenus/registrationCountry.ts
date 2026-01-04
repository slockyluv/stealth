import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import { getContinent } from '../../features/settings/countriesView.js';
import { registerCountryForUser } from '../../../services/countryRegistrationService.js';
import { logger } from '../../../shared/logger.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildSuccessView, buildWarningView } from '../../responses/messageBuilders.js';
import { formatNicknameUpdateNotice, updateCountryNickname } from '../../nickname.js';

async function getFormatEmoji(interaction: Parameters<SelectMenuHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const registrationCountrySelect: SelectMenuHandler = {
  key: 'registration:country',
  async execute(interaction, ctx) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const continentId = ctx.customId.args[0];
    const currentPage = Number.parseInt(ctx.customId.args[1] ?? '1', 10);
    const countryName = interaction.values[0];

    const continent = continentId ? getContinent(continentId) : null;

    if (!continent) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Не удалось определить континент. Обновите меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

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
      const result = await registerCountryForUser(interaction.guildId, interaction.user.id, continent.id, country);

      const nicknameResult =
        result.status === 'registered'
          ? await updateCountryNickname({ member: interaction.member, country })
          : null;
      const nicknameNotice = formatNicknameUpdateNotice(formatEmoji, nicknameResult);

      const responseComponents =
        result.status === 'registered'
          ? buildSuccessView(
              formatEmoji,
              `Вы успешно зарегистрировались за __${country.name}__.${nicknameNotice}`
            )
          : result.status === 'alreadyRegistered'
            ? buildWarningView(formatEmoji, `Вы уже зарегистрированы!`)
            : result.status === 'companyRegistered'
              ? buildWarningView(
                  formatEmoji,
                  `Вы уже зарегистрированы!`
                )
              : buildWarningView(formatEmoji, 'Эта страна уже занята. Список свободных стран обновлен.');

      const updatedView = await buildRegistrationView({
        guild: interaction.guild,
        selectedContinentId: continent.id,
        page: Number.isFinite(currentPage) ? currentPage : 1
      });
      await interaction.editReply({ components: updatedView.components, flags: MessageFlags.IsComponentsV2 });
      await interaction.followUp({
        components: responseComponents,
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Произошла ошибка при регистрации. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Произошла ошибка при регистрации. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};