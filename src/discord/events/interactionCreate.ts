import {
  MessageFlags,
  MessageFlagsBitField,
  type InteractionResponse,
  type Message,
  type Interaction,
  type InteractionReplyOptions,
} from 'discord.js';
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

function hasEphemeralFlag(options: InteractionReplyOptions) {
  if (options.ephemeral === true) return true;

  const { flags } = options;
  if (!flags) return false;
  if (typeof flags === 'number') {
    return (flags & MessageFlags.Ephemeral) === MessageFlags.Ephemeral;
  }
  if (typeof flags === 'bigint') {
    return (flags & BigInt(MessageFlags.Ephemeral)) === BigInt(MessageFlags.Ephemeral);
  }
  if (typeof flags === 'string') {
    return flags === 'Ephemeral';
  }
  if (Array.isArray(flags)) {
    return flags.includes(MessageFlags.Ephemeral);
  }
  if (flags instanceof MessageFlagsBitField) {
    return flags.has(MessageFlags.Ephemeral);
  }
  if ('bitfield' in flags && typeof flags.bitfield === 'number') {
    return (flags.bitfield & MessageFlags.Ephemeral) === MessageFlags.Ephemeral;
  }

  return false;
}

function hasComponentsV2Flag(options: InteractionReplyOptions) {
  const { flags } = options;
  if (!flags) return false;
  if (typeof flags === 'number') {
    return (flags & MessageFlags.IsComponentsV2) === MessageFlags.IsComponentsV2;
  }
  if (typeof flags === 'bigint') {
    return (flags & BigInt(MessageFlags.IsComponentsV2)) === BigInt(MessageFlags.IsComponentsV2);
  }
  if (typeof flags === 'string') {
    return flags === 'IsComponentsV2';
  }
  if (Array.isArray(flags)) {
    return flags.includes(MessageFlags.IsComponentsV2);
  }
  if (flags instanceof MessageFlagsBitField) {
    return flags.has(MessageFlags.IsComponentsV2);
  }
  if ('bitfield' in flags && typeof flags.bitfield === 'number') {
    return (flags.bitfield & MessageFlags.IsComponentsV2) === MessageFlags.IsComponentsV2;
  }

  return false;
}

async function replyWithDeferredSupport(
  interaction: Interaction,
  options: InteractionReplyOptions,
  baseReply: (
    options: InteractionReplyOptions
  ) => Promise<InteractionResponse<boolean> | Message<boolean>>
): Promise<InteractionResponse<boolean> | Message<boolean> | void> {
  if (!interaction.isRepliable()) {
    return;
  }

  if (!interaction.deferred && !interaction.replied) {
    return baseReply(options);
  }

  const wantsEphemeral = hasEphemeralFlag(options);
  const wantsComponentsV2 = hasComponentsV2Flag(options);
  if (wantsEphemeral) {
    try {
      if (!interaction.replied) {
        await interaction.deleteReply();
      }
    } catch {
      // ignore
    }
    return interaction.followUp(options);
  }

  if (wantsComponentsV2) {
    try {
      if (!interaction.replied) {
        await interaction.deleteReply();
      }
    } catch {
      // ignore
    }
    return interaction.followUp(options);
  }

  const { flags: _flags, ...editOptions } = options;
  return interaction.editReply(editOptions);
}

export async function interactionCreate(interaction: Interaction) {
  // Пользовательский фундамент (не блокируем команды при сбоях БД)
  if ('user' in interaction && interaction.user) {
    void upsertUser(interaction.user.id).catch((err) => logger.error(err));
  }

  // Slash-команды
  if (interaction.isChatInputCommand()) {
    logger.info(`Interaction received: /${interaction.commandName} from ${interaction.user.id}`);

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (interaction.commandName !== 'ping' && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: false });
      }

      const replyHandler = replyWithDeferredSupport.bind(null, interaction);
      const originalReply = interaction.reply.bind(interaction);
      const patchedReply = ((options: InteractionReplyOptions) =>
        replyHandler(options, originalReply).catch((err) => {
          logger.error(err);
          throw err;
        })) as typeof originalReply;
      (interaction as { reply: typeof originalReply }).reply = patchedReply;

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