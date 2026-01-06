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
import { findIndustryByKey, type CompanyFeeKey, type PrivateCompanyRecord } from '../../services/privateCompanyService.js';
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
    `> ${formatBudgetValue(profile.budget)} ${formatEmoji('stackmoney')}`
  ].join('\n');

  const taxationHeader = [`**${formatEmoji('documentgavel')} Налоговые ставки:**`, ''].join('\n');

  const residentTaxButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('finance', 'residentTaxEdit', user.id),
    label: 'Изменить',
    emoji: formatEmoji('edit')
  };

  const residentTaxSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          `**${formatEmoji('taxation')} Налог компаний резидентов:**`,
          `> ${profile.residentCompanyTaxRate}%`,
          ''
        ].join('\n')
      }
    ],
    accessory: residentTaxButton
  };

  const foreignTaxButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('finance', 'foreignTaxEdit', user.id),
    label: 'Изменить',
    emoji: formatEmoji('edit')
  };

  const foreignTaxSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${formatEmoji('taxation')} Налог иностранных компаний:**`, `> ${profile.foreignCompanyTaxRate}%`].join(
          '\n'
        )
      }
    ],
    accessory: foreignTaxButton
  };

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
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: taxationHeader },
      residentTaxSection,
      foreignTaxSection,
      populationTaxSection,
      buildSeparator(),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, collectTaxButton).toJSON()
    ]
  };

  return [container];
}

export async function buildCompanyFinanceView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
  countryProfile: CountryProfile;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company, countryProfile } = options;

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

  const companyBalanceContent = [
    `# ${formatEmoji('opendollar')} Информация`,
    '',
    `**${formatEmoji('sackdollar')} Бюджет компании:**`,
    `> ${formatBudgetValue(company.budget)} ${formatEmoji('stackmoney')}`,
    '',
    `**${formatEmoji('companies')} Отрасль:**`,
    `> ${company.industryLabel}`,
    ''
  ].join('\n');

  const branchCount = 1;

  const branchesButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'branchesInfo', user.id),
    label: 'Список',
    emoji: formatEmoji('list')
  };

  const branchesSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${formatEmoji('filialscomp')} Филиалы компании:**`, `> ${branchCount}`].join('\n')
      }
    ],
    accessory: branchesButton
  };

  const industry = findIndustryByKey(company.industryKey);

  const formatRateValue = (value: number | null | undefined) => (value === null || value === undefined ? '*Не выбрано*' : `${value}%`);

  const feeMeta: Record<
    CompanyFeeKey,
    {
      label: string;
      value: number | null;
    }
  > = {
    paymentTransfer: {
      label: 'Коммисии за перевод',
      value: company.paymentTransferFeeRate
    },
    investmentTrade: {
      label: 'Коммисии за сделки',
      value: company.investmentTradeFeeRate
    },
    cryptoTrade: {
      label: 'Коммисии за сделки',
      value: company.cryptoTradeFeeRate
    },
    cryptoTransfer: {
      label: 'Коммисии за перевод',
      value: company.cryptoTransferFeeRate
    },
    constructionProfit: {
      label: 'Сметная прибыль',
      value: company.constructionProfitRate
    },
    manufacturingMarkup: {
      label: 'Наценка на товар',
      value: company.manufacturingMarkupRate
    }
  };

  const feeKeysByIndustry: Record<string, CompanyFeeKey[]> = {
    payment_system: ['paymentTransfer'],
    investment_exchange: ['investmentTrade'],
    crypto_exchange: ['cryptoTrade', 'cryptoTransfer'],
    construction: ['constructionProfit'],
    manufacturing: ['manufacturingMarkup']
  };

  const feeKeys = industry ? (feeKeysByIndustry[industry.key] ?? []) : [];
  const feeComponents: ComponentInContainerData[] = [];

  for (const feeKey of feeKeys) {
    const entry = feeMeta[feeKey];
    const editButton: ButtonComponentData = {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      customId: buildCustomId('companyFinance', 'feeEdit', feeKey, user.id),
      label: 'Редактировать',
      emoji: formatEmoji('edit')
    };

    feeComponents.push({
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [`**${formatEmoji('badgepercent')} ${entry.label}:**`, `> ${formatRateValue(entry.value)}`].join('\n')
        }
      ],
      accessory: editButton
    });
  }

  const taxationContent = [
    `**${formatEmoji('taxation')} Внутренний налог:**`,
    `> ${countryProfile.residentCompanyTaxRate}%`
  ].join('\n');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('companyProfile', 'tab', user.id))
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
      { type: ComponentType.TextDisplay, content: companyBalanceContent },
      branchesSection,
      ...feeComponents,
      { type: ComponentType.TextDisplay, content: taxationContent },
      buildSeparator(),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
    ]
  };

  return [container];
}

export async function buildCompanyBranchesView(options: {
  guild: Guild;
  user: User;
  entries: Array<{
    countryLabel: string;
    registeredUserId?: string;
    taxRate: number;
  }>;
  page: number;
  totalPages: number;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, entries, page, totalPages } = options;

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
        content: [`# ${formatEmoji('list')} Список филиалов:`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const listContent = entries.length
    ? entries
        .map((entry) => {
          const registeredUser = entry.registeredUserId ? `<@${entry.registeredUserId}>` : '*Не найден*';
          return [
            `**>・${entry.countryLabel}**`,
            `**Пользователь:** ${registeredUser}`,
            `**Налоговая ставка:** \`${entry.taxRate}%\``
          ].join('\n');
        })
        .join('\n\n')
    : '*Филиалы не найдены.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'branchesBack', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const prevButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'branchesPrev', user.id, String(page)))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('anglesmallleft'))
    .setDisabled(page <= 1);

  const nextButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'branchesNext', user.id, String(page)))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('anglesmallright'))
    .setDisabled(page >= totalPages);

  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      header,
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: listContent },
      buildSeparator(),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, prevButton, nextButton).toJSON()
    ]
  };

  return [container];
}