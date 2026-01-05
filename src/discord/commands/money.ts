import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  ComponentType,
  type ComponentInContainerData,
  type ContainerComponentData,
  type TopLevelComponentData
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildUsageView, buildWarningView } from '../responses/messageBuilders.js';
import { getUserRegistration, findCountryByKey } from '../../services/countryRegistrationService.js';
import { formatCountryDisplay } from '../features/settings/countriesView.js';
import { MESSAGE_SEPARATOR_COMPONENT } from '../features/applications/config.js';
import { updateCountryBudget, type CountryBudgetChangeType } from '../../services/countryProfileService.js';
import { logger } from '../../shared/logger.js';
import { ALLOW_MONEY, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { logEconomyAction } from '../../services/actionLogger.js';
import { updateCompanyBudgetForUser } from '../../services/privateCompanyService.js';

const GIVE_MONEY_USAGE = '!give-money @Пользователь <Кол-во>';
const TAKE_MONEY_USAGE = '!take-money @Пользователь <Кол-во>';
const RESET_MONEY_USAGE = '!reset-money @Пользователь';

type MoneyCommandResult = { view: TopLevelComponentData[] } | { error: string };

function parseAmount(value: string | undefined): bigint | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return null;
  return BigInt(parsed);
}

function buildHeader(type: CountryBudgetChangeType, targetLabel: string, formatEmoji: (name: string) => string): string {
  const emoji = formatEmoji('opendollar');

  if (type === 'reset') {
    return `**${emoji} Баланс ${targetLabel} обнулён**`;
  }

  if (type === 'decrease') {
    return `**${emoji} Денежные средства списаны у ${targetLabel}**`;
  }

  return `**${emoji} Денежные средства выданы ${targetLabel}**`;
}

function buildMoneyView(options: {
  type: CountryBudgetChangeType;
  targetLabel: string;
  moderatorMention: string;
  targetMention: string;
  amount: bigint;
  formatEmoji: (name: string) => string;
}): TopLevelComponentData[] {
  const { type, targetLabel, moderatorMention, targetMention, amount, formatEmoji } = options;
  const amountText = amount.toLocaleString('ru-RU');
  const components: ComponentInContainerData[] = [
    { type: ComponentType.TextDisplay, content: buildHeader(type, targetLabel, formatEmoji) },
    { ...MESSAGE_SEPARATOR_COMPONENT },
    { type: ComponentType.TextDisplay, content: `**Администратор: ${moderatorMention}**` },
    { type: ComponentType.TextDisplay, content: `**Пользователь: ${targetMention}**` },
    { type: ComponentType.TextDisplay, content: `**Сумма: \`${amountText}\`**` }
  ];

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

async function resolveMoneyCommand(options: {
  guildId: string;
  guild: NonNullable<Message['guild']>;
  targetUserId: string;
  amount: bigint;
  type: CountryBudgetChangeType;
  formatEmoji: (name: string) => string;
  moderatorMention: string;
  moderatorId: string;
}): Promise<MoneyCommandResult> {
  const { guildId, guild, targetUserId, amount, type, formatEmoji, moderatorMention, moderatorId } = options;
  const companyBudgetResult = await updateCompanyBudgetForUser(guildId, targetUserId, { type, amount });
  const targetMention = `<@${targetUserId}>`;
  const amountForDisplay = type === 'reset' ? companyBudgetResult?.previousBudget ?? amount : amount;
  const action = type === 'decrease' ? 'take-money' : type === 'reset' ? 'reset-money' : 'give-money';

  if (companyBudgetResult) {
    void logEconomyAction({
      guild,
      targetId: targetUserId,
      moderatorId,
      amount: amountForDisplay,
      action
    }).catch((error) => logger.error(error));

    return {
      view: buildMoneyView({
        type,
        targetLabel: `компании __${companyBudgetResult.company.name}__`,
        moderatorMention,
        targetMention,
        amount: amountForDisplay,
        formatEmoji
      })
    };
  }

  const registration = await getUserRegistration(guildId, targetUserId);

  if (!registration) {
    return { error: 'Пользователь не зарегистрирован!' };
  }

  const countryLookup = findCountryByKey(registration.countryName);
  if (!countryLookup) {
    return { error: 'Страна пользователя не найдена.' };
  }

  const { previousBudget } = await updateCountryBudget(guildId, countryLookup.country, { type, amount });
  const countryLabel = await formatCountryDisplay(guild, countryLookup.country);
  const countryAmountForDisplay = type === 'reset' ? previousBudget : amount;

  void logEconomyAction({
    guild,
    targetId: targetUserId,
    moderatorId,
    amount: countryAmountForDisplay,
    action
  }).catch((error) => logger.error(error));

  return {
    view: buildMoneyView({
      type,
      targetLabel: countryLabel,
      moderatorMention,
      targetMention,
      amount: countryAmountForDisplay,
      formatEmoji
    })
  };
}

function buildMoneyCommand(commandName: string, description: string): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(commandName)
    .setDescription(description)
    .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true))
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Сумма').setRequired(true).setMinValue(1)
    ) as SlashCommandBuilder;
}

function buildResetMoneyCommand(commandName: string, description: string): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(commandName)
    .setDescription(description)
    .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true)) as SlashCommandBuilder;
}

async function handleInteraction(
  interaction: ChatInputCommandInteraction,
  type: CountryBudgetChangeType
): Promise<void> {
  const formatEmoji = await createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });

  if (!(await enforceInteractionAllow(interaction, ALLOW_MONEY, { formatEmoji }))) return;

  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
      flags: MessageFlags.IsComponentsV2
    });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const amount = type === 'reset' ? 0n : BigInt(interaction.options.getInteger('amount', true));

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  try {
    const result = await resolveMoneyCommand({
      guildId: interaction.guildId,
      guild: interaction.guild,
      targetUserId: targetUser.id,
      amount,
      type,
      formatEmoji,
      moderatorMention: `<@${interaction.user.id}>`,
      moderatorId: interaction.user.id
    });

    if ('error' in result) {
      await interaction.editReply({
        components: buildWarningView(formatEmoji, result.error),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.editReply({
      components: result.view,
      flags: MessageFlags.IsComponentsV2
    });
  } catch (error) {
    logger.error(error);
    await interaction.editReply({
      components: buildWarningView(formatEmoji, 'Не удалось обновить баланс. Попробуйте позже.'),
      flags: MessageFlags.IsComponentsV2
    });
  }
}

async function handleMessage(message: Message, args: string[], type: CountryBudgetChangeType, usage: string) {
  const formatEmoji = await createEmojiFormatter({
    client: message.client,
    guildId: message.guildId ?? message.client.application?.id ?? 'global',
    guildEmojis: message.guild?.emojis.cache.values()
  });

  if (!message.inGuild() || !message.guild) {
    if (message.channel?.isSendable()) {
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
    return;
  }

  if (!(await enforceMessageAllow(message, ALLOW_MONEY, { formatEmoji }))) return;

  const [targetRaw, amountRaw] = args;
  const mentionMatch = targetRaw?.match(/^<@!?(\d+)>$/);
  const targetId = mentionMatch?.[1] ?? targetRaw;
  const parsedAmount = type === 'reset' ? 0n : parseAmount(amountRaw);

  if (!targetId || (type !== 'reset' && !parsedAmount)) {
    if (message.channel?.isSendable()) {
      await message.channel.send({
        components: buildUsageView(formatEmoji, usage),
        flags: MessageFlags.IsComponentsV2
      });
    }
    return;
  }

  const amount = parsedAmount ?? 0n;

  try {
    const result = await resolveMoneyCommand({
      guildId: message.guildId,
      guild: message.guild,
      targetUserId: targetId,
      amount,
      type,
      formatEmoji,
      moderatorMention: `<@${message.author.id}>`,
      moderatorId: message.author.id
    });

    if ('error' in result) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, result.error),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    if (message.channel?.isSendable()) {
      await message.channel.send({
        components: result.view,
        flags: MessageFlags.IsComponentsV2
      });
    }
  } catch (error) {
    logger.error(error);
    if (message.channel?.isSendable()) {
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Не удалось обновить баланс. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
}

export const giveMoney: Command = {
  data: buildMoneyCommand('give-money', 'Выдать деньги'),

  async execute(interaction: ChatInputCommandInteraction) {
    await handleInteraction(interaction, 'increase');
  },

  async executeMessage(message: Message, args: string[]) {
    await handleMessage(message, args, 'increase', GIVE_MONEY_USAGE);
  }
};

export const takeMoney: Command = {
  data: buildMoneyCommand('take-money', 'Списать деньги'),

  async execute(interaction: ChatInputCommandInteraction) {
    await handleInteraction(interaction, 'decrease');
  },

  async executeMessage(message: Message, args: string[]) {
    await handleMessage(message, args, 'decrease', TAKE_MONEY_USAGE);
  }
};

export const resetMoney: Command = {
  data: buildResetMoneyCommand('reset-money', 'Обнулить баланс'),

  async execute(interaction: ChatInputCommandInteraction) {
    await handleInteraction(interaction, 'reset');
  },

  async executeMessage(message: Message, args: string[]) {
    await handleMessage(message, args, 'reset', RESET_MONEY_USAGE);
  }
};