import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import { getContinent } from '../../features/settings/countriesView.js';
import { registerCountryForUser } from '../../../services/countryRegistrationService.js';
import { logger } from '../../../shared/logger.js';

export const registrationCountrySelect: SelectMenuHandler = {
  key: 'registration:country',
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'Команда доступна только внутри сервера.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const continentId = ctx.customId.args[0];
    const countryName = interaction.values[0];

    const continent = continentId ? getContinent(continentId) : null;

    if (!continent) {
      await interaction.reply({
        content: 'Не удалось определить континент. Обновите меню.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const country = continent.countries.find((item) => item.name === countryName);

    if (!country) {
      await interaction.reply({
        content: 'Страна не найдена или уже недоступна. Обновите список.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const result = await registerCountryForUser(interaction.guildId, interaction.user.id, continent.id, country);

      if (result.status === 'registered') {
        await interaction.followUp({
          content: `Вы успешно зарегистрировались за **${country.name}**.`,
          flags: MessageFlags.Ephemeral
        });
      } else if (result.status === 'alreadyRegistered') {
        await interaction.followUp({
          content: `Вы уже зарегистрированы за **${result.registration.countryName}**.`,
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.followUp({
          content: 'Эта страна уже занята. Список свободных стран обновлен.',
          flags: MessageFlags.Ephemeral
        });
      }

      const updatedView = await buildRegistrationView({ guild: interaction.guild, selectedContinentId: continent.id });
      await interaction.editReply({ components: updatedView.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        content: 'Произошла ошибка при регистрации. Попробуйте позже.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};