import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildTopView, isTopSection } from '../../features/topView.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { createEmojiFormatter } from '../../emoji.js';
import { logger } from '../../../shared/logger.js';

export const topSectionSelect: SelectMenuHandler = {
  key: 'top:section',

  async execute(interaction, _ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Меню доступно только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const selected = interaction.values[0];
    if (!selected || !isTopSection(selected)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректный выбор раздела.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const view = await buildTopView({
        guild: interaction.guild,
        section: selected,
        page: 1
      });
      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список лидеров.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список лидеров.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};