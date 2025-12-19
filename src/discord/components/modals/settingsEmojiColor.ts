import { MessageFlags } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { normalizeEmojiColor, setEmojiColor } from '../../../services/guildSettingsService.js';
import { logger } from '../../../shared/logger.js';

export const settingsEmojiColorModal: ModalHandler = {
  key: 'settings:emojiColor',

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'Форма доступна только на сервере.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const input = interaction.fields.getTextInputValue('emojiColor');
    const normalized = normalizeEmojiColor(input);

    if (input.trim().length > 0 && !normalized) {
      await interaction.reply({
        content: 'Неверный формат. Укажите HEX-код в формате #RRGGBB.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await setEmojiColor(interaction.guild.id, normalized);

      await interaction.editReply({
        content: normalized
          ? `Цвет эмодзи обновлён: #${normalized}.`
          : 'Цвет эмодзи сброшен на стандартный.'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'GUILD_SETTINGS_TABLE_MISSING') {
        await interaction.editReply({
          content: 'База данных не обновлена. Выполните Prisma миграции и попробуйте снова.'
        });
        return;
      }

      logger.error(error);
      await interaction.editReply({
        content: 'Не удалось сохранить цвет эмодзи. Попробуйте позже.'
      });
    }
  }
};