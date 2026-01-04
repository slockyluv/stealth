import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import type { ContinentId } from '../../features/settings/countriesView.js';
import { logger } from '../../../shared/logger.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';

async function getFormatEmoji(interaction: Parameters<SelectMenuHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const registrationContinentSelect: SelectMenuHandler = {
  key: 'registration:continent',
  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const selectedContinent = interaction.values[0] as ContinentId | undefined;

    try {
      await interaction.deferUpdate();
      const view = await buildRegistrationView({
        guild: interaction.guild,
        selectedContinentId: selectedContinent,
        page: 1
      });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список континентов. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список континентов. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};