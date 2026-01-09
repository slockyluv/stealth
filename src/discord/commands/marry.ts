import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  type MessageCreateOptions,
  type User
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import {
  buildMarryAlreadyExistsView,
  buildMarryExpiredView,
  buildMarryProposalView,
  buildMarrySingleView,
  buildMarryUnionView,
  buildMarrySelfErrorView,
  buildMarryTargetTakenView
} from '../features/marryView.js';
import { clearMarryProposal, isMarryProposalActive, markMarryProposalActive } from '../features/marryState.js';
import { getMarriageForUser } from '../../services/marriageService.js';
import { logger } from '../../shared/logger.js';

const PROPOSAL_TTL_MS = 5 * 60 * 1000;
const COMPONENTS_FLAG = MessageFlags.IsComponentsV2;
type ComponentsFlag = typeof COMPONENTS_FLAG;

function resolveButtonEmoji(formatEmoji: (name: string) => string, name: string) {
  const token = formatEmoji(name);

  if (token === `:${name}:`) {
    return undefined;
  }

  return token;
}

function formatMarriageDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

const marryCommand = new SlashCommandBuilder()
  .setName('marry')
  .setDescription('Предложить союз пользователю')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true)) as SlashCommandBuilder;

async function buildProposalErrorView(options: {
  guildId: string;
  proposerId: string;
  targetId: string;
}) {
  const { guildId, proposerId, targetId } = options;

  if (proposerId === targetId) {
    return buildMarrySelfErrorView();
  }

  const proposerMarriage = await getMarriageForUser(guildId, proposerId);
  if (proposerMarriage) {
    return buildMarryAlreadyExistsView();
  }

  const targetMarriage = await getMarriageForUser(guildId, targetId);
  if (targetMarriage) {
    return buildMarryTargetTakenView();
  }

  return null;
}

async function scheduleProposalExpiry(message: Message) {
  markMarryProposalActive(message.id);

  setTimeout(() => {
    void (async () => {
      if (!isMarryProposalActive(message.id)) return;
      try {
        clearMarryProposal(message.id);
        await message.edit({
          components: buildMarryExpiredView()
        });
      } catch (error) {
        logger.error(error);
      }
    })();
  }, PROPOSAL_TTL_MS);
}

async function sendProposalMessage(options: {
  guildId: string;
  proposer: User;
  target: User;
  formatEmoji: (name: string) => string
  send: (payload: MessageCreateOptions & { flags: ComponentsFlag }) => Promise<Message>;
}) {
  const { guildId, proposer, target, formatEmoji, send } = options;

  const errorView = await buildProposalErrorView({
    guildId,
    proposerId: proposer.id,
    targetId: target.id
  });

  if (errorView) {
    return await send({ components: errorView, flags: COMPONENTS_FLAG });
  }

  const view = buildMarryProposalView({
    authorMention: proposer.toString(),
    targetMention: target.toString(),
    proposerId: proposer.id,
    targetId: target.id,
    acceptEmoji: resolveButtonEmoji(formatEmoji, 'slide_d'),
    rejectEmoji: resolveButtonEmoji(formatEmoji, 'action_basket')
  });

  const message = await send({ components: view, flags: COMPONENTS_FLAG });
  await scheduleProposalExpiry(message);

  return message;
}

export const marry: Command = {
  data: marryCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    await interaction.deferReply();

    if (!interaction.inCachedGuild()) {
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: COMPONENTS_FLAG
      });
      return;
    }

    const target = interaction.options.getUser('user', true);

    try {
      await sendProposalMessage({
        guildId: interaction.guildId,
        proposer: interaction.user,
        target,
        formatEmoji,
        send: async (payload) =>
          (await interaction.editReply({
            components: payload.components,
            flags: payload.flags
          })) as Message
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось отправить предложение. Попробуйте позже.'),
        flags: COMPONENTS_FLAG
      });
    }
  },

  async executeMessage(message: Message) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!message.inGuild() || !message.guild) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
          flags: COMPONENTS_FLAG
        });
      }
      return;
    }

    const target = message.mentions.users.first();
    if (!target) {
      if (message.channel?.isSendable()) {
        const marriage = await getMarriageForUser(message.guildId, message.author.id);
        if (marriage) {
          await message.channel.send({
            components: buildMarryUnionView({
              user1: message.author.toString(),
              user2: `<@${marriage.partnerId}>`,
              date: formatMarriageDate(marriage.startedAt),
              daysTogether: marriage.daysTogether,
              user1Id: message.author.id,
              user2Id: marriage.partnerId
            }),
            flags: COMPONENTS_FLAG
          });
        } else {
          await message.channel.send({
            components: buildMarrySingleView(),
            flags: COMPONENTS_FLAG
          });
        }
      }
      return;
    }

    if (!message.channel?.isSendable()) return;

    try {
      await sendProposalMessage({
        guildId: message.guildId,
        proposer: message.author,
        target,
        formatEmoji,
        send: (payload) => message.channel.send(payload)
      });
    } catch (error) {
      logger.error(error);
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Не удалось отправить предложение. Попробуйте позже.'),
          flags: COMPONENTS_FLAG
        });
      }
    }
  }
};