import { ComponentType, MessageFlags, type TopLevelComponentData } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import { getContinent } from '../../features/settings/countriesView.js';
import { registerCountryForUser } from '../../../services/countryRegistrationService.js';
import { logger } from '../../../shared/logger.js';

function buildTextDisplayComponents(content: string): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: [{ type: ComponentType.TextDisplay, content }]
    }
  ];
}

export const registrationCountrySelect: SelectMenuHandler = {
  key: 'registration:country',
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextDisplayComponents('Команда доступна только внутри сервера.'),
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
        components: buildTextDisplayComponents('Не удалось определить континент. Обновите меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const country = continent.countries.find((item) => item.name === countryName);

    if (!country) {
      await interaction.reply({
        components: buildTextDisplayComponents('Страна не найдена или уже недоступна. Обновите список.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const result = await registerCountryForUser(interaction.guildId, interaction.user.id, continent.id, country);

      const responseMessage =
        result.status === 'registered'
          ? `Вы успешно зарегистрировались за **${country.name}**.`
          : result.status === 'alreadyRegistered'
            ? `Вы уже зарегистрированы за **${result.registration.countryName}**.`
            : 'Эта страна уже занята. Список свободных стран обновлен.';

      const updatedView = await buildRegistrationView({
        guild: interaction.guild,
        selectedContinentId: continent.id,
        page: Number.isFinite(currentPage) ? currentPage : 1
      });
      await interaction.editReply({ components: updatedView.components, flags: MessageFlags.IsComponentsV2 });
      await interaction.followUp({
        components: buildTextDisplayComponents(responseMessage),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildTextDisplayComponents('Произошла ошибка при регистрации. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildTextDisplayComponents('Произошла ошибка при регистрации. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};