import { MessageFlags, type Guild } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { normalizeEmojiColor, setEmojiColor } from '../../../services/guildSettingsService.js';
import { recolorApplicationEmojis } from '../../emojiRecolor.js';
import { logger } from '../../../shared/logger.js';
import { buildTextView } from '../v2Message.js';
import { parseCustomId } from '../../../shared/customId.js';
import { buildSettingsMainView } from '../../features/settings/autoRolesView.js';

async function resetSettingsMenu(interaction: Parameters<ModalHandler['execute']>[0], guild: Guild) {
  const parsed = parseCustomId(interaction.customId);
  const messageId = parsed?.args[0];
  const channel = interaction.channel;

  if (!messageId || !channel?.isTextBased() || !('messages' in channel)) return;

  try {
    const message = await channel.messages.fetch(messageId);
    if (!message.editable) return;
    const view = await buildSettingsMainView(guild);
    await message.edit({ components: view.components });
  } catch (error) {
    logger.error(error);
  }
}

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

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        components: buildTextView('Не удалось определить сервер. Попробуйте позже.'),
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
      await resetSettingsMenu(interaction, guild);
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    try {
      await setEmojiColor(guild.id, normalized);
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
        await resetSettingsMenu(interaction, guild);
        return;
      }

      logger.error(error);
      await interaction.editReply({
        components: buildTextView('Не удалось сохранить цвет эмодзи. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    await resetSettingsMenu(interaction, guild);
  }
};