import { ComponentType, MessageFlags, type TopLevelComponentData } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import { getContinent } from '../../features/settings/countriesView.js';
import { logger } from '../../../shared/logger.js';

function buildTextDisplayComponents(content: string): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: [{ type: ComponentType.TextDisplay, content }]
    }
  ];
}

export const registrationBackButton: ButtonHandler = {
  key: 'registration:back',
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextDisplayComponents('Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
      const view = await buildRegistrationView({ guild: interaction.guild });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          components: buildTextDisplayComponents('Не удалось открыть список континентов. Попробуйте позже.'),
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildTextDisplayComponents('Не удалось открыть список континентов. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

export const registrationPageButton: ButtonHandler = {
  key: 'registration:page',
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextDisplayComponents('Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const continentId = ctx.customId.args[0];
    const page = Number.parseInt(ctx.customId.args[1] ?? '1', 10);
    const continent = continentId ? getContinent(continentId) : null;

    if (!continent) {
      await interaction.reply({
        components: buildTextDisplayComponents('Не удалось определить континент. Обновите меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
      const view = await buildRegistrationView({
        guild: interaction.guild,
        selectedContinentId: continent.id,
        page: Number.isFinite(page) ? page : 1
      });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          components: buildTextDisplayComponents('Не удалось обновить список стран. Попробуйте позже.'),
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildTextDisplayComponents('Не удалось обновить список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};