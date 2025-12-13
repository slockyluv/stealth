import type { Interaction } from 'discord.js';
import { logger } from '../../shared/logger.js';
import { upsertUser } from '../../services/userService.js';
import { parseCustomId, customIdKey } from '../../shared/customId.js';

async function safeReply(interaction: Interaction, message: string) {
  if (!interaction.isRepliable()) return;

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  } catch {
    // ignore
  }
}

export async function interactionCreate(interaction: Interaction) {
  // Пользовательский фундамент (не блокируем команды при сбоях БД)
  try {
    if ('user' in interaction && interaction.user) {
      await upsertUser(interaction.user.id);
    }
  } catch (err) {
    logger.error(err);
  }

  // Slash-команды
  if (interaction.isChatInputCommand()) {
    logger.info(`Interaction received: /${interaction.commandName} from ${interaction.user.id}`);

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(err);
      await safeReply(interaction, 'Произошла ошибка при выполнении команды.');
    }
    return;
  }

  // Buttons
  if (interaction.isButton()) {
    const parts = parseCustomId(interaction.customId);
    if (!parts) {
      await safeReply(interaction, 'Некорректная кнопка.');
      return;
    }

    const key = customIdKey(parts);
    const handler = interaction.client.buttons.get(key);
    if (!handler) {
      await safeReply(interaction, 'Эта кнопка больше не поддерживается.');
      return;
    }

    try {
      await handler.execute(interaction, { customId: parts });
    } catch (err) {
      logger.error(err);
      await safeReply(interaction, 'Произошла ошибка при обработке кнопки.');
    }
    return;
  }

  // Modals
  if (interaction.isModalSubmit()) {
    const parts = parseCustomId(interaction.customId);
    if (!parts) {
      await safeReply(interaction, 'Некорректная форма.');
      return;
    }

    const key = customIdKey(parts);
    const handler = interaction.client.modals.get(key);
    if (!handler) {
      await safeReply(interaction, 'Эта форма больше не поддерживается.');
      return;
    }

    try {
      await handler.execute(interaction, { customId: parts });
    } catch (err) {
      logger.error(err);
      await safeReply(interaction, 'Произошла ошибка при обработке формы.');
    }
    return;
  }

  // Select menus (string)
  if (interaction.isStringSelectMenu()) {
    const parts = parseCustomId(interaction.customId);
    if (!parts) {
      await safeReply(interaction, 'Некорректное меню.');
      return;
    }

    const key = customIdKey(parts);
    const handler = interaction.client.selectMenus.get(key);
    if (!handler) {
      await safeReply(interaction, 'Это меню больше не поддерживается.');
      return;
    }

    try {
      await handler.execute(interaction, { customId: parts });
    } catch (err) {
      logger.error(err);
      await safeReply(interaction, 'Произошла ошибка при обработке меню.');
    }
    return;
  }
}