import { MessageFlags } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildMutesView } from '../../features/mutesView.js';
import { buildTextView } from '../v2Message.js';
import { logger } from '../../../shared/logger.js';

export const mutesPageButton: ButtonHandler = {
  key: 'mutes:page',
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const pageArg = ctx.customId.args[1] ?? ctx.customId.args[0];
    const page = pageArg ? Number.parseInt(pageArg, 10) : 1;

    try {
      await interaction.deferUpdate();
      const view = await buildMutesView({
        guild: interaction.guild,
        page: Number.isFinite(page) && page > 0 ? page : 1
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildTextView('Не удалось обновить список мьютов.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildTextView('Не удалось обновить список мьютов.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};