import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ComponentInContainerData,
  type Guild,
  type SectionComponentData,
  type TopLevelComponentData,
  type User
} from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
import { createEmojiFormatter } from '../emoji.js';
import { MESSAGE_SEPARATOR_COMPONENT } from '../features/applications/config.js';
import { resolveEmojiIdentifier } from './settings/countriesView.js';
import { findCountryByKey } from '../../services/countryRegistrationService.js';
import { getIndustryMarker } from '../../services/privateCompanyService.js';
import type { PaymentSystemEntry, TransferEntity } from '../../services/payTransferService.js';

function formatNumber(value: bigint): string {
  return value.toLocaleString('ru-RU');
}

function clampSelectLabel(value: string, maxLength = 25): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed.length ? trimmed : 'Платежная система';
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function buildContainer(components: ComponentInContainerData[]): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components
    }
  ];
}

function resolveCountryEmoji(countryName: string, formatEmoji: (name: string) => string): string | null {
  const lookup = findCountryByKey(countryName);
  if (!lookup) return null;
  return resolveEmojiIdentifier(lookup.country.emoji, formatEmoji);
}

function formatCountryLabel(countryName: string, formatEmoji: (name: string) => string): string {
  const lookup = findCountryByKey(countryName);
  if (!lookup) return countryName;
  const emoji = resolveEmojiIdentifier(lookup.country.emoji, formatEmoji);
  return `${emoji} | ${lookup.country.name}`;
}

async function resolveEntityLabel(
  entity: TransferEntity,
  formatEmoji: (name: string) => string
): Promise<string> {
  if (entity.type === 'company') {
    const marker = getIndustryMarker(entity.company.industryKey) ?? '';
    const markerText = marker ? `${marker} ` : '';
    const emoji = resolveCountryEmoji(entity.company.countryName, formatEmoji);
    const prefix = emoji ? `${emoji} | ` : '';
    return `${prefix}${markerText}${entity.company.name}`.trim();
  }
  return formatCountryLabel(entity.countryName, formatEmoji);
}

async function resolvePaymentSystemLabel(
  entry: PaymentSystemEntry,
  formatEmoji: (name: string) => string
): Promise<string> {
  const marker = getIndustryMarker(entry.company.industryKey) ?? '';
  const markerText = marker ? `${marker} ` : '';
  const emoji = resolveCountryEmoji(entry.company.countryName, formatEmoji);
  const prefix = emoji ? `${emoji} | ` : '';
  return `${prefix}${markerText}${entry.company.name}`.trim();
}

export async function buildPayTransferView(options: {
  guild: Guild;
  user: User;
  recipientEntity: TransferEntity | null;
  paymentSystem: PaymentSystemEntry | null;
  amount: bigint | null;
  feeRate: number;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, recipientEntity, paymentSystem, amount, feeRate } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const recipientLabel = recipientEntity ? await resolveEntityLabel(recipientEntity, formatEmoji) : 'Не выбран';
  const recipientLine = recipientEntity
    ? `> *<@${recipientEntity.userId}> (${recipientLabel})*`
    : '> *Не выбран*';

  const paymentSystemLabel = paymentSystem
    ? await resolvePaymentSystemLabel(paymentSystem, formatEmoji)
    : 'Передача наличными средствами';
  const amountLine = amount ? `> *${formatNumber(amount)}*` : '> *Не указана*';

  const headerContent = [
    `# ${formatEmoji('moneytransfer')} Денежный перевод`,
    '',
    `Пользователь: <@${user.id}>`
  ].join('\n');

  const recipientSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${formatEmoji('user')} Получатель:**`, recipientLine].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      label: 'Изменить',
      emoji: formatEmoji('edit'),
      customId: buildCustomId('pay', 'editRecipient', user.id)
    }
  };

  const methodSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${formatEmoji('transactionglobe')} Способ перевода:**`, `> *${paymentSystemLabel}*`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      label: 'Изменить',
      emoji: formatEmoji('edit'),
      customId: buildCustomId('pay', 'editMethod', user.id)
    }
  };

  const amountSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${formatEmoji('opendollar')} Сумма перевода:**`, amountLine].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      label: 'Изменить',
      emoji: formatEmoji('edit'),
      customId: buildCustomId('pay', 'editAmount', user.id)
    }
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('pay', 'back', user.id))
    .setLabel('Назад')
    .setEmoji(formatEmoji('undonew'))
    .setStyle(ButtonStyle.Secondary);

  const transferButton = new ButtonBuilder()
    .setCustomId(buildCustomId('pay', 'transfer', user.id))
    .setLabel('Перевести')
    .setEmoji(formatEmoji('moneytransfer'))
    .setStyle(ButtonStyle.Secondary);

  return buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    { ...MESSAGE_SEPARATOR_COMPONENT },
    { type: ComponentType.TextDisplay, content: `# ${formatEmoji('investment')} Данные перевода:` },
    recipientSection,
    methodSection,
    amountSection,
    { type: ComponentType.TextDisplay, content: `${formatEmoji('taxation')} Комиссия:\n> ${feeRate}%` },
    { ...MESSAGE_SEPARATOR_COMPONENT },
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, transferButton).toJSON()
  ]);
}

export async function buildPayTransferMethodView(options: {
  guild: Guild;
  user: User;
  paymentSystems: PaymentSystemEntry[];
}): Promise<TopLevelComponentData[]> {
  const { guild, user, paymentSystems } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const headerContent = [
    `# ${formatEmoji('moneytransfer')} Денежный перевод`,
    '',
    `Пользователь: <@${user.id}>`
  ].join('\n');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('pay', 'methodSelect', user.id))
    .setPlaceholder(paymentSystems.length ? 'Выберите платежную систему' : 'Нет доступных платежных систем')
    .setDisabled(paymentSystems.length === 0);

  for (const entry of paymentSystems.slice(0, 25)) {
    const countryLookup = findCountryByKey(entry.company.countryName);
    const emoji = countryLookup ? resolveEmojiIdentifier(countryLookup.country.emoji, formatEmoji) : undefined;
    const marker = getIndustryMarker(entry.company.industryKey) ?? '';
    const markerText = marker ? `${marker} ` : '';
    const label = clampSelectLabel(`${markerText}${entry.company.name}`);
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(entry.company.id.toString())
      .setDescription(`Комиссия: ${entry.feeRate}%`);
    if (emoji) {
      option.setEmoji(emoji);
    }
    selectMenu.addOptions(option);
  }

  return buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    { ...MESSAGE_SEPARATOR_COMPONENT },
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
  ]);
}

export async function buildPayTransferSuccessView(options: {
  guild: Guild;
  user: User;
  recipientEntity: TransferEntity;
  paymentSystem: PaymentSystemEntry | null;
  amount: bigint;
  feeRate: number;
  feeAmount: bigint;
  receivedAmount: bigint;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, recipientEntity, paymentSystem, amount, feeRate, feeAmount, receivedAmount } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const recipientLabel = await resolveEntityLabel(recipientEntity, formatEmoji);
  const paymentSystemLabel = paymentSystem
    ? await resolvePaymentSystemLabel(paymentSystem, formatEmoji)
    : 'Передача наличными средствами';

  const headerContent = [
    `# ${formatEmoji('moneytransfer')} Денежный перевод`,
    '',
    `Пользователь: <@${user.id}>`
  ].join('\n');

  return buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    { ...MESSAGE_SEPARATOR_COMPONENT },
    { type: ComponentType.TextDisplay, content: `# ${formatEmoji('investment')} Данные перевода:` },
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('user')} Получатель:**` },
    { type: ComponentType.TextDisplay, content: `> *<@${recipientEntity.userId}> (${recipientLabel})*` },
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('transactionglobe')} Способ перевода:**` },
    { type: ComponentType.TextDisplay, content: `> *${paymentSystemLabel}*` },
    { ...MESSAGE_SEPARATOR_COMPONENT },
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('opendollar')} Сумма перевода:**` },
    { type: ComponentType.TextDisplay, content: `> *${formatNumber(amount)}*` },
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('taxation')} Комиссия:**` },
    { type: ComponentType.TextDisplay, content: `> *${formatNumber(feeAmount)} (${feeRate}%)*` },
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('cashout')} Получено:**` },
    { type: ComponentType.TextDisplay, content: `> *${formatNumber(receivedAmount)}*` }
  ]);
}