import { ComponentType, MessageFlags, type TopLevelComponentData } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import type { ContinentId } from '../../features/settings/countriesView.js';
import { logger } from '../../../shared/logger.js';

function buildTextDisplayComponents(content: string): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: [{ type: ComponentType.TextDisplay, content }]
    }
  ];
}

export const registrationContinentSelect: SelectMenuHandler = {
  key: 'registration:continent',
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextDisplayComponents('Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const selectedContinent = interaction.values[0] as ContinentId | undefined;

    await interaction.deferUpdate();

    try {
      const view = await buildRegistrationView({ guild: interaction.guild, selectedContinentId: selectedContinent });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildTextDisplayComponents('Не удалось обновить список континентов. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};