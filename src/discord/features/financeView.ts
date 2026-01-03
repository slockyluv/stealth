import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ButtonComponentData,
  type ComponentInContainerData,
  type Guild,
  type SectionComponentData,
  type TopLevelComponentData,
  type User
} from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
import { createEmojiFormatter } from '../emoji.js';
import type { CountryRegistrationRecord } from '../../services/countryRegistrationService.js';
import type { CountryProfile } from '../../services/countryProfileService.js';
import { canCollectPopulationTax } from '../../services/populationTaxService.js';

function buildSeparator(): ComponentInContainerData {
  return {
    type: ComponentType.Separator,
    divider: true
  };
}

function formatBudgetValue(budget: bigint): string {
  return budget.toLocaleString('ru-RU');
}

export async function buildFinanceView(options: {
  guild: Guild;
  user: User;
  registration: CountryRegistrationRecord;
  profile: CountryProfile;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, profile } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const header: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`# ${formatEmoji('wallet')} Финансы`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const governmentBudgetButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('finance', 'budget', user.id),
    label: 'Перейти',
    emoji: formatEmoji('linkalt')
  };

  const governmentBudgetSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: `**${formatEmoji('governmentbudget')} Государственный бюджет:**`
      }
    ],
    accessory: governmentBudgetButton
  };

  const treasuryHeaderContent = [`# ${formatEmoji('governmentbudget')} Казна`, ''].join('\n');

  const treasuryContent = [
    `> *${formatBudgetValue(profile.budget)}* ${formatEmoji('stackmoney')}`,
    '',
    `**${formatEmoji('goldres')} Золотовалютные резервы:**`,
    '> В будущем',
    '',
    `**${formatEmoji('bitcoin')} Криптовалютные резервы:**`,
    '> В будущем',
    '',
    `**${formatEmoji('investment')} Ценные бумаги:**`,
    '> В будущем'
  ].join('\n');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('profile', 'tab', user.id))
    .setPlaceholder('Выберите раздел')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Профиль')
        .setValue('profile')
        .setEmoji(formatEmoji('usernew')),
      new StringSelectMenuOptionBuilder()
        .setLabel('Финансы')
        .setValue('finance')
        .setDefault(true)
        .setEmoji(formatEmoji('wallet'))
    );

  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      header,
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: treasuryHeaderContent },
      governmentBudgetSection,
      { type: ComponentType.TextDisplay, content: treasuryContent },
      buildSeparator(),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
    ]
  };

  return [container];
}

export async function buildGovernmentBudgetView(options: {
  guild: Guild;
  user: User;
  registration: CountryRegistrationRecord;
  profile: CountryProfile;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, profile } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const header: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`# ${formatEmoji('wallet')} Финансы`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const budgetContent = [
    `# ${formatEmoji('governmentbudget')} Государственный бюджет:`,
    '',
    `**${formatEmoji('sackdollar')} Денежные средства:**`,
    `> ${formatBudgetValue(profile.budget)} ${formatEmoji('stackmoney')}`,
    '',
    `**${formatEmoji('taxation')} Налоги организаций:**`,
    '> *Скоро*',
    ''
  ].join('\n');

  const editTaxButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('finance', 'taxationEdit', user.id),
    label: 'Изменить',
    emoji: formatEmoji('edit')
  };

  const populationTaxSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${formatEmoji('taxation')} Налоги населения:**`, `> *${profile.populationTaxRate}%*`].join('\n')
      }
    ],
    accessory: editTaxButton
  };

  const canCollectTax = canCollectPopulationTax(profile.lastPopulationTaxAt);

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('finance', 'budgetBack', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const collectTaxButton = new ButtonBuilder()
    .setCustomId(buildCustomId('finance', 'taxationCollect', user.id))
    .setLabel('Собрать налог')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('taxation'))
    .setDisabled(!canCollectTax);

  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      header,
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: budgetContent },
      populationTaxSection,
      buildSeparator(),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, collectTaxButton).toJSON()
    ]
  };

  return [container];
}