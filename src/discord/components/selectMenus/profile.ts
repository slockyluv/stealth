import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';

export const profileTabSelect: SelectMenuHandler = {
  key: 'profile:tab',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректное меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Это меню доступно только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();
  }
};