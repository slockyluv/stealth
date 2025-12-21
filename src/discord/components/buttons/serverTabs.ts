import { MessageFlags } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildTextView } from '../../components/v2Message.js';
import { buildServerView, type ServerViewTab } from '../../commands/server.js';
import { logger } from '../../../shared/logger.js';

const VALID_TABS: ServerViewTab[] = ['server', 'members', 'channels'];

export const serverTabsButton: ButtonHandler = {
  key: 'server:tab',

  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Эта кнопка доступна только на сервере.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const tab = ctx.customId.args[0] as ServerViewTab | undefined;
    if (!tab || !VALID_TABS.includes(tab)) {
      await interaction.reply({
        components: buildTextView('Неизвестная вкладка. Попробуйте ещё раз.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const components = await buildServerView({
        guild: interaction.guild,
        tab
      });

      await interaction.editReply({
        components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);

      await interaction.editReply({
        components: buildTextView('Не удалось обновить информацию о сервере. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};