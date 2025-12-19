import { MessageFlags } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { normalizeEmojiColor, setEmojiColor } from '../../../services/guildSettingsService.js';
import { recolorApplicationEmojis } from '../../emojiRecolor.js';
import { logger } from '../../../shared/logger.js';
import { buildTextView } from '../v2Message.js';

export const settingsEmojiColorModal: ModalHandler = {
  key: 'settings:emojiColor',

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Форма доступна только на сервере.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const input = interaction.fields.getTextInputValue('emojiColor');
    const normalized = normalizeEmojiColor(input);

    if (input.trim().length > 0 && !normalized) {
      await interaction.reply({
        components: buildTextView('Неверный формат. Укажите HEX-код в формате #RRGGBB или #AARRGGBB.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    try {
      await setEmojiColor(interaction.guild.id, normalized);
      let lastProgress = -1;
      const result = await recolorApplicationEmojis({
        client: interaction.client,
        color: normalized,
        onProgress: async ({ current, total }) => {
          if (current !== total && current === lastProgress) return;
          if (current !== total && current % 3 !== 0) return;
          lastProgress = current;
          const progressText = `Прогресс ${current}/${total}`;
          await interaction.editReply({
            components: buildTextView(progressText),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
        }
      });

      const outcome = normalized ? `Цвет эмодзи успешно изменён: #${normalized}.` : 'Цвет эмодзи сброшен.';
      const details = `Перекрашено: ${result.updated}, пропущено: ${result.skipped}, ошибок: ${result.failed}.`;

      await interaction.editReply({
        components: buildTextView(`${outcome}\n${details}`),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'GUILD_SETTINGS_TABLE_MISSING') {
        await interaction.editReply({
          components: buildTextView('База данных не обновлена. Выполните Prisma миграции и попробуйте снова.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      logger.error(error);
      await interaction.editReply({
        components: buildTextView('Не удалось сохранить цвет эмодзи. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};