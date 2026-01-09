import { MessageFlags } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildTopView, isTopSection } from '../../features/topView.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { createEmojiFormatter } from '../../emoji.js';
import { logger } from '../../../shared/logger.js';

export const topPageButton: ButtonHandler = {
  key: 'top:page',
  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const sectionArg = ctx.customId.args[1] ?? 'levels';
    const pageArg = ctx.customId.args[2] ?? ctx.customId.args[1];
    const section = isTopSection(sectionArg) ? sectionArg : 'levels';
    const parsedPage = pageArg ? Number.parseInt(pageArg, 10) : 1;
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    try {
      await interaction.deferUpdate();
      const view = await buildTopView({
        guild: interaction.guild,
        section,
        page
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