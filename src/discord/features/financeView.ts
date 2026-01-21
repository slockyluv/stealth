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
import {
  PAYMENT_SYSTEM_ONBOARDING_PRICES,
  INVESTMENT_EXCHANGE_ONBOARDING_PRICES,
  CRYPTO_EXCHANGE_ONBOARDING_PRICES,
  CONSTRUCTION_ONBOARDING_PRICES,
  MANUFACTURING_ONBOARDING_PRICES,
  findIndustryByKey,
  type CompanyFeeKey,
  type PrivateCompanyRecord
} from '../../services/privateCompanyService.js';
import { canCollectPopulationTax } from '../../services/populationTaxService.js';
import type { RedomiciliationTaskState } from '../../services/redomiciliationService.js';
import { formatDateTime } from '../../shared/time.js';

function buildSeparator(): ComponentInContainerData {
  return {
    type: ComponentType.Separator,
    divider: true
  };
}

function buildContainer(components: ComponentInContainerData[]): TopLevelComponentData {
  return {
    type: ComponentType.Container,
    components
  };
}

function formatBudgetValue(budget: bigint): string {
  return budget.toLocaleString('ru-RU');
}

function formatCompanyCount(count: number): string {
  const value = Math.max(0, Math.trunc(count));
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value} компания`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${value} компании`;
  return `${value} компаний`;
}

export async function buildFinanceView(options: {
  guild: Guild;
  user: User;
  registration: CountryRegistrationRecord;
  profile: CountryProfile;
  foreignCompaniesCount: number;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, profile, foreignCompaniesCount } = options;

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
    emoji: formatEmoji('mouseclick')
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

  const treasuryContent = `> *${formatBudgetValue(profile.budget)}* ${formatEmoji('stackmoney')}`;

  const foreignCompaniesButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('finance', 'foreignCompanies', user.id),
    label: 'Список',
    emoji: formatEmoji('nav')
  };

  const foreignCompaniesSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          `**${formatEmoji('filialscomp')} Иностранные компании:**`,
          `> ${formatCompanyCount(foreignCompaniesCount)}`,
          ''
        ].join('\n')
      }
    ],
    accessory: foreignCompaniesButton
  };

  const treasuryAssetsContent = [
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

  const container = buildContainer([
    header,
    buildSeparator(),
    governmentBudgetSection,
    { type: ComponentType.TextDisplay, content: treasuryContent },
    foreignCompaniesSection,
    { type: ComponentType.TextDisplay, content: treasuryAssetsContent },
    buildSeparator(),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
  ]);

  return [container];
}

export type ForeignCompaniesEntry = {
  name: string;
  ownerLabel: string;
  registrationLabel: string;
  industryLabel: string;
  startedAt: Date;
};

export async function buildForeignCompaniesView(options: {
  guild: Guild;
  user: User;
  entries: ForeignCompaniesEntry[];
  page: number;
  totalPages: number;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, entries, page, totalPages } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const headerContent = `**${formatEmoji('filialscomp')} Иностранные компании**`;
  const descriptionContent =
    '```Юридическое лицо, зарегистрированное в другом государстве, созданное для ведения предпринимательской деятельности с целью получения прибыли.```';
  const listHeaderContent = `**${formatEmoji('nav')} Список**`;

  const listComponents: ComponentInContainerData[] = [];

  if (!entries.length) {
    listComponents.push({ type: ComponentType.TextDisplay, content: '*Компании не найдены.*' });
    listComponents.push(buildSeparator());
  } else {
    for (const entry of entries) {
      const content = [
        `> **${entry.name}**`,
        `**Пользователь:** *${entry.ownerLabel}*`,
        `**Страна регистрации:** *${entry.registrationLabel}*`,
        `**Отрасль:** *${entry.industryLabel}*`,
        `**Начало деятельности:** *${formatDateTime(entry.startedAt)}*`
      ].join('\n');
      listComponents.push({ type: ComponentType.TextDisplay, content });
      listComponents.push(buildSeparator());
    }
  }

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('finance', 'foreignCompaniesBack', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const prevButton = new ButtonBuilder()
    .setCustomId(buildCustomId('finance', 'foreignCompaniesPrev', user.id, String(page)))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('anglesmallleft'))
    .setDisabled(page <= 1);

  const nextButton = new ButtonBuilder()
    .setCustomId(buildCustomId('finance', 'foreignCompaniesNext', user.id, String(page)))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('anglesmallright'))
    .setDisabled(page >= totalPages);

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    { type: ComponentType.TextDisplay, content: descriptionContent },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: listHeaderContent },
    ...listComponents,
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, prevButton, nextButton).toJSON()
  ]);

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
    `**${formatEmoji('sackdollar')} Денежные средства:**`,
    `> ${formatBudgetValue(profile.budget)} ${formatEmoji('stackmoney')}`,
    ''
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

  const container = buildContainer([
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
  ]);

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

  if (company.branchCount === 0) {
    if (company.industryKey === 'payment_system') {
      return buildPaymentSystemOnboardingView({ guild, user, company });
    }
    if (company.industryKey === 'investment_exchange') {
      return buildInvestmentExchangeOnboardingView({ guild, user, company });
    }
    if (company.industryKey === 'crypto_exchange') {
      return buildCryptoExchangeOnboardingView({ guild, user, company });
    }
    if (company.industryKey === 'construction') {
      return buildConstructionOnboardingView({ guild, user, company });
    }
    if (company.industryKey === 'manufacturing') {
      return buildManufacturingOnboardingView({ guild, user, company });
    }
  }

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
    `**${formatEmoji('sackdollar')} Бюджет компании:**`,
    `> ${formatBudgetValue(company.budget)} ${formatEmoji('stackmoney')}`,
    '',
    `**${formatEmoji('companies')} Отрасль:**`,
    `> ${company.industryLabel}`,
    ''
  ].join('\n');

  const branchCount = company.branchCount;

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
        content: [`**${formatEmoji('filialscomp')} География деятельности:**`, `> ${branchCount}`].join('\n')
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

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: companyBalanceContent },
    branchesSection,
    ...feeComponents,
    { type: ComponentType.TextDisplay, content: taxationContent },
    buildSeparator(),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
  ]);

  return [container];
}

export async function buildPaymentSystemOnboardingView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

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
        content: [`# ${formatEmoji('control')} Заключительный этап.`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const introContent =
    'Поздравляем, Вы успешно юридически зарегистрировали свою частную коммерческую компанию! Теперь вам предстоит заключительный этап: Вам необходимо найти источник финансирования для полноценного физического запуска цикла деятельности организации, затем выполнить все находящиеся ниже пункты.';

  const legalNewsCompleted = company.paymentSystemLegalNewsDone;
  const legalNewsStarted = company.paymentSystemLegalNewsStarted && !legalNewsCompleted;

  const legalNewsButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId(
      'companyFinance',
      legalNewsCompleted ? 'paymentSystemLegalDone' : legalNewsStarted ? 'paymentSystemLegalDone' : 'paymentSystemLegalStart',
      user.id
    ),
    label: legalNewsCompleted || legalNewsStarted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(legalNewsCompleted || legalNewsStarted ? 'slide_d' : 'bolt'),
    disabled: legalNewsCompleted
  };

  const infrastructureCompleted =
    company.paymentSystemInfrastructureMainOfficeBuilt && company.paymentSystemInfrastructureServerBuilt;

  const infrastructureButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'paymentSystemInfrastructureOpen', user.id),
    label: infrastructureCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(infrastructureCompleted ? 'slide_d' : 'bolt'),
    disabled: infrastructureCompleted
  };

  const webDevelopmentCompleted = company.paymentSystemWebDevelopmentOrdered;

  const webDevelopmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'paymentSystemWebOpen', user.id),
    label: webDevelopmentCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(webDevelopmentCompleted ? 'slide_d' : 'bolt'),
    disabled: webDevelopmentCompleted
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'paymentSystemBack', 'profile', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: introContent },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: '**1. Платежная система:**' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Юридическая регистрация**',
            '> *Напишите подробную новость о юридической регистрации Вашей компании и подготовке к началу операционной деятельности.*'
          ].join('\n')
        }
      ],
      accessory: legalNewsButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Строительство инфраструктуры**',
            '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
          ].join('\n')
        }
      ],
      accessory: infrastructureButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**WEB разработка**',
            '> *Вам необходимо разработать собственное WEB структуру, на базе которой будет работать платежная система.*'
          ].join('\n')
        }
      ],
      accessory: webDevelopmentButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildPaymentSystemLegalNewsActionView(options: {
  guild: Guild;
  user: User;
}): Promise<TopLevelComponentData[]> {
  const { guild, user } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `# ${formatEmoji('documentgavel')} Юридическая регистрация`;
  const content =
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```';
  const note = '> *После успешного выполнения действия вам необходимо вам необходимо вернуться в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'paymentSystemBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: note },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildPaymentSystemInfrastructureView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const mainOfficePrice = PAYMENT_SYSTEM_ONBOARDING_PRICES.mainOffice;
  const serverPrice = PAYMENT_SYSTEM_ONBOARDING_PRICES.serverInfrastructure;

  const mainOfficeButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'paymentSystemInfrastructureBuild', 'mainOffice', user.id),
    label: company.paymentSystemInfrastructureMainOfficeBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.paymentSystemInfrastructureMainOfficeBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.paymentSystemInfrastructureMainOfficeBuilt
  };

  const serverButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'paymentSystemInfrastructureBuild', 'serverInfrastructure', user.id),
    label: company.paymentSystemInfrastructureServerBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.paymentSystemInfrastructureServerBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.paymentSystemInfrastructureServerBuilt
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'paymentSystemBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const subHeader = `**${formatEmoji('filialscomp')} Необходимая инфраструктура:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Главный офис компании**',
            `**Цена: ${formatBudgetValue(mainOfficePrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: mainOfficeButton
    },
    { type: ComponentType.TextDisplay, content: '\u200b' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Серверная инфраструктура**',
            `**Цена: ${formatBudgetValue(serverPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: serverButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildPaymentSystemWebDevelopmentView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const price = PAYMENT_SYSTEM_ONBOARDING_PRICES.webDevelopment;

  const orderButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'paymentSystemWebOrder', user.id),
    label: company.paymentSystemWebDevelopmentOrdered ? 'Завершено' : 'Заказать',
    emoji: formatEmoji(company.paymentSystemWebDevelopmentOrdered ? 'slide_d' : 'buybutton'),
    disabled: company.paymentSystemWebDevelopmentOrdered
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'paymentSystemBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**WEB разработка**',
            `**Цена: ${formatBudgetValue(price)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: orderButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildPaymentSystemPurchaseResultView(options: {
  guild: Guild;
  user: User;
  title: string;
  price: bigint;
  backTarget: 'finance' | 'infrastructure' | 'web';
}): Promise<TopLevelComponentData[]> {
  const { guild, user, title, price, backTarget } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'paymentSystemBack', backTarget, user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: `**Цена:** *${formatBudgetValue(price)}* ${formatEmoji('stackmoney')}` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildInvestmentExchangeOnboardingView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

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
        content: [`# ${formatEmoji('control')} Заключительный этап.`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const introContent =
    'Поздравляем, Вы успешно юридически зарегистрировали свою частную коммерческую компанию! Теперь вам предстоит заключительный этап: Вам необходимо найти источник финансирования для полноценного физического запуска цикла деятельности организации, затем выполнить все находящиеся ниже пункты.';

  const legalNewsCompleted = company.investmentExchangeLegalNewsDone;
  const legalNewsStarted = company.investmentExchangeLegalNewsStarted && !legalNewsCompleted;

  const legalNewsButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId(
      'companyFinance',
      legalNewsCompleted
        ? 'investmentExchangeLegalDone'
        : legalNewsStarted
          ? 'investmentExchangeLegalDone'
          : 'investmentExchangeLegalStart',
      user.id
    ),
    label: legalNewsCompleted || legalNewsStarted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(legalNewsCompleted || legalNewsStarted ? 'slide_d' : 'bolt'),
    disabled: legalNewsCompleted
  };

  const infrastructureCompleted =
    company.investmentExchangeInfrastructureMainOfficeBuilt && company.investmentExchangeInfrastructureServerBuilt;

  const infrastructureButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'investmentExchangeInfrastructureOpen', user.id),
    label: infrastructureCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(infrastructureCompleted ? 'slide_d' : 'bolt'),
    disabled: infrastructureCompleted
  };

  const webDevelopmentCompleted = company.investmentExchangeWebDevelopmentOrdered;

  const webDevelopmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'investmentExchangeWebOpen', user.id),
    label: webDevelopmentCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(webDevelopmentCompleted ? 'slide_d' : 'bolt'),
    disabled: webDevelopmentCompleted
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'investmentExchangeBack', 'profile', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: introContent },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: '**1. Инвестиционная биржа:**' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Юридическая регистрация**',
            '> *Напишите подробную новость о юридической регистрации Вашей компании и подготовке к началу операционной деятельности.*'
          ].join('\n')
        }
      ],
      accessory: legalNewsButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Строительство инфраструктуры**',
            '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
          ].join('\n')
        }
      ],
      accessory: infrastructureButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**WEB разработка**',
            '> *Вам необходимо разработать собственную WEB платформу, на базе которой будет работать инвестиционная биржа.*'
          ].join('\n')
        }
      ],
      accessory: webDevelopmentButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildInvestmentExchangeLegalNewsActionView(options: {
  guild: Guild;
  user: User;
}): Promise<TopLevelComponentData[]> {
  const { guild, user } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `# ${formatEmoji('documentgavel')} Юридическая регистрация`;
  const content =
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```';
  const note = '> *После успешного выполнения действия вам необходимо вам необходимо вернуться в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'investmentExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: note },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildInvestmentExchangeInfrastructureView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const mainOfficePrice = INVESTMENT_EXCHANGE_ONBOARDING_PRICES.mainOffice;
  const serverPrice = INVESTMENT_EXCHANGE_ONBOARDING_PRICES.serverInfrastructure;

  const mainOfficeButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'investmentExchangeInfrastructureBuild', 'mainOffice', user.id),
    label: company.investmentExchangeInfrastructureMainOfficeBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.investmentExchangeInfrastructureMainOfficeBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.investmentExchangeInfrastructureMainOfficeBuilt
  };

  const serverButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'investmentExchangeInfrastructureBuild', 'serverInfrastructure', user.id),
    label: company.investmentExchangeInfrastructureServerBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.investmentExchangeInfrastructureServerBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.investmentExchangeInfrastructureServerBuilt
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'investmentExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const subHeader = `**${formatEmoji('filialscomp')} Необходимая инфраструктура:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Главный офис компании**',
            `**Цена: ${formatBudgetValue(mainOfficePrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: mainOfficeButton
    },
    { type: ComponentType.TextDisplay, content: '\u200b' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Серверная инфраструктура**',
            `**Цена: ${formatBudgetValue(serverPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: serverButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildInvestmentExchangeWebDevelopmentView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const price = INVESTMENT_EXCHANGE_ONBOARDING_PRICES.webDevelopment;

  const orderButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'investmentExchangeWebOrder', user.id),
    label: company.investmentExchangeWebDevelopmentOrdered ? 'Завершено' : 'Заказать',
    emoji: formatEmoji(company.investmentExchangeWebDevelopmentOrdered ? 'slide_d' : 'buybutton'),
    disabled: company.investmentExchangeWebDevelopmentOrdered
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'investmentExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**WEB разработка**',
            `**Цена: ${formatBudgetValue(price)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: orderButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildInvestmentExchangePurchaseResultView(options: {
  guild: Guild;
  user: User;
  title: string;
  price: bigint;
  backTarget: 'finance' | 'infrastructure' | 'web';
}): Promise<TopLevelComponentData[]> {
  const { guild, user, title, price, backTarget } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'investmentExchangeBack', backTarget, user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: `**Цена:** *${formatBudgetValue(price)}* ${formatEmoji('stackmoney')}` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCryptoExchangeOnboardingView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

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
        content: [`# ${formatEmoji('control')} Заключительный этап.`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const introContent =
    'Поздравляем, Вы успешно юридически зарегистрировали свою частную коммерческую компанию! Теперь вам предстоит заключительный этап: Вам необходимо найти источник финансирования для полноценного физического запуска цикла деятельности организации, затем выполнить все находящиеся ниже пункты.';

  const legalNewsCompleted = company.cryptoExchangeLegalNewsDone;
  const legalNewsStarted = company.cryptoExchangeLegalNewsStarted && !legalNewsCompleted;

  const legalNewsButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId(
      'companyFinance',
      legalNewsCompleted
        ? 'cryptoExchangeLegalDone'
        : legalNewsStarted
          ? 'cryptoExchangeLegalDone'
          : 'cryptoExchangeLegalStart',
      user.id
    ),
    label: legalNewsCompleted || legalNewsStarted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(legalNewsCompleted || legalNewsStarted ? 'slide_d' : 'bolt'),
    disabled: legalNewsCompleted
  };

  const infrastructureCompleted =
    company.cryptoExchangeInfrastructureMainOfficeBuilt && company.cryptoExchangeInfrastructureServerBuilt;

  const infrastructureButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'cryptoExchangeInfrastructureOpen', user.id),
    label: infrastructureCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(infrastructureCompleted ? 'slide_d' : 'bolt'),
    disabled: infrastructureCompleted
  };

  const webDevelopmentCompleted = company.cryptoExchangeWebDevelopmentOrdered;

  const webDevelopmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'cryptoExchangeWebOpen', user.id),
    label: webDevelopmentCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(webDevelopmentCompleted ? 'slide_d' : 'bolt'),
    disabled: webDevelopmentCompleted
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'cryptoExchangeBack', 'profile', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: introContent },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Юридическая регистрация**',
            '> *Напишите подробную новость о юридической регистрации Вашей компании и подготовке к началу операционной деятельности.*'
          ].join('\n')
        }
      ],
      accessory: legalNewsButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Строительство инфраструктуры**',
            '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
          ].join('\n')
        }
      ],
      accessory: infrastructureButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**WEB разработка**',
            '> *Вам необходимо разработать собственную WEB платформу, на базе которой будет работать криптовалютная биржа.*'
          ].join('\n')
        }
      ],
      accessory: webDevelopmentButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCryptoExchangeLegalNewsActionView(options: {
  guild: Guild;
  user: User;
}): Promise<TopLevelComponentData[]> {
  const { guild, user } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `# ${formatEmoji('documentgavel')} Юридическая регистрация`;
  const content =
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```';
  const note = '> *После успешного выполнения действия вам необходимо вам необходимо вернуться в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'cryptoExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: note },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCryptoExchangeInfrastructureView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const mainOfficePrice = CRYPTO_EXCHANGE_ONBOARDING_PRICES.mainOffice;
  const serverPrice = CRYPTO_EXCHANGE_ONBOARDING_PRICES.serverInfrastructure;

  const mainOfficeButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'crypto_exchange_infra_build', 'mainOffice', user.id),
    label: company.cryptoExchangeInfrastructureMainOfficeBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.cryptoExchangeInfrastructureMainOfficeBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.cryptoExchangeInfrastructureMainOfficeBuilt
  };

  const serverButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'crypto_exchange_infra_build', 'serverInfrastructure', user.id),
    label: company.cryptoExchangeInfrastructureServerBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.cryptoExchangeInfrastructureServerBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.cryptoExchangeInfrastructureServerBuilt
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'cryptoExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const subHeader = `**${formatEmoji('filialscomp')} Необходимая инфраструктура:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Главный офис компании**',
            `**Цена: ${formatBudgetValue(mainOfficePrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: mainOfficeButton
    },
    { type: ComponentType.TextDisplay, content: '\u200b' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Серверная инфраструктура**',
            `**Цена: ${formatBudgetValue(serverPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: serverButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCryptoExchangeWebDevelopmentView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const price = CRYPTO_EXCHANGE_ONBOARDING_PRICES.webDevelopment;

  const orderButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'cryptoExchangeWebOrder', user.id),
    label: company.cryptoExchangeWebDevelopmentOrdered ? 'Завершено' : 'Заказать',
    emoji: formatEmoji(company.cryptoExchangeWebDevelopmentOrdered ? 'slide_d' : 'buybutton'),
    disabled: company.cryptoExchangeWebDevelopmentOrdered
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'cryptoExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**WEB разработка**',
            `**Цена: ${formatBudgetValue(price)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: orderButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCryptoExchangePurchaseResultView(options: {
  guild: Guild;
  user: User;
  title: string;
  price: bigint;
  backTarget: 'finance' | 'infrastructure' | 'web';
}): Promise<TopLevelComponentData[]> {
  const { guild, user, title, price, backTarget } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'cryptoExchangeBack', backTarget, user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: `**Цена:** *${formatBudgetValue(price)}* ${formatEmoji('stackmoney')}` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildConstructionOnboardingView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

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
        content: [`# ${formatEmoji('control')} Заключительный этап.`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const introContent =
    '*Поздравляем, Вы успешно юридически зарегистрировали свою частную коммерческую компанию! Теперь вам предстоит заключительный этап: Вам необходимо найти источник финансирования для полноценного физического запуска цикла деятельности организации, затем выполнить все находящиеся ниже пункты.*';

  const legalNewsCompleted = company.constructionLegalNewsDone;
  const legalNewsStarted = company.constructionLegalNewsStarted && !legalNewsCompleted;

  const legalNewsButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId(
      'companyFinance',
      legalNewsCompleted ? 'constructionLegalDone' : legalNewsStarted ? 'constructionLegalDone' : 'constructionLegalStart',
      user.id
    ),
    label: legalNewsCompleted || legalNewsStarted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(legalNewsCompleted || legalNewsStarted ? 'slide_d' : 'bolt'),
    disabled: legalNewsCompleted
  };

  const equipmentCompleted = company.constructionEquipmentMainPurchased && company.constructionEquipmentSupportPurchased;

  const equipmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'constructionEquipmentOpen', user.id),
    label: equipmentCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(equipmentCompleted ? 'slide_d' : 'bolt'),
    disabled: equipmentCompleted
  };

  const webDevelopmentCompleted = company.constructionWebDevelopmentOrdered;

  const webDevelopmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'constructionWebOpen', user.id),
    label: webDevelopmentCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(webDevelopmentCompleted ? 'slide_d' : 'bolt'),
    disabled: webDevelopmentCompleted
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'constructionBack', 'profile', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: introContent },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Юридическая регистрация**',
            '> *Напишите подробную новость о юридической регистрации Вашей компании и подготовке к началу операционной деятельности.*'
          ].join('\n')
        }
      ],
      accessory: legalNewsButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Строительная техника**',
            '> *Вам необходимо закупить строительную технику, требуемую для старта деятельности вашей компании.*'
          ].join('\n')
        }
      ],
      accessory: equipmentButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Разработка WEB сайта**',
            '> *Вам необходимо разработать собственный WEB сайт, на котором будет размещена детальная информация о деятельности и опыте вашей компании.*'
          ].join('\n')
        }
      ],
      accessory: webDevelopmentButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildConstructionLegalNewsActionView(options: {
  guild: Guild;
  user: User;
}): Promise<TopLevelComponentData[]> {
  const { guild, user } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `# ${formatEmoji('documentgavel')} Юридическая регистрация`;
  const content =
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```';
  const note = '> *После успешного выполнения действия вам необходимо вам необходимо вернуться в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'constructionBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: note },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildConstructionEquipmentView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const mainEquipmentPrice = CONSTRUCTION_ONBOARDING_PRICES.mainEquipment;
  const supportEquipmentPrice = CONSTRUCTION_ONBOARDING_PRICES.supportEquipment;

  const mainEquipmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'constructionEquipmentBuy', 'mainEquipment', user.id),
    label: company.constructionEquipmentMainPurchased ? 'Закуплено' : 'Закупить',
    emoji: formatEmoji(company.constructionEquipmentMainPurchased ? 'slide_d' : 'buybutton'),
    disabled: company.constructionEquipmentMainPurchased
  };

  const supportEquipmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'constructionEquipmentBuy', 'supportEquipment', user.id),
    label: company.constructionEquipmentSupportPurchased ? 'Закуплено' : 'Закупить',
    emoji: formatEmoji(company.constructionEquipmentSupportPurchased ? 'slide_d' : 'buybutton'),
    disabled: company.constructionEquipmentSupportPurchased
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'constructionBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const subHeader = `**${formatEmoji('filialscomp')} Необходимая техника:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Основная техника**',
            `**Цена: ${formatBudgetValue(mainEquipmentPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: mainEquipmentButton
    },
    { type: ComponentType.TextDisplay, content: '\u200b' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Вспомогательная техника**',
            `**Цена: ${formatBudgetValue(supportEquipmentPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: supportEquipmentButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildConstructionWebDevelopmentView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const price = CONSTRUCTION_ONBOARDING_PRICES.webDevelopment;

  const orderButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'constructionWebOrder', user.id),
    label: company.constructionWebDevelopmentOrdered ? 'Завершено' : 'Заказать',
    emoji: formatEmoji(company.constructionWebDevelopmentOrdered ? 'slide_d' : 'buybutton'),
    disabled: company.constructionWebDevelopmentOrdered
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'constructionBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: ['**WEB сайт**', `**Цена: ${formatBudgetValue(price)} ${formatEmoji('stackmoney')}**`].join('\n')
        }
      ],
      accessory: orderButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildConstructionPurchaseResultView(options: {
  guild: Guild;
  user: User;
  title: string;
  price: bigint;
  backTarget: 'finance' | 'equipment' | 'web';
}): Promise<TopLevelComponentData[]> {
  const { guild, user, title, price, backTarget } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'constructionBack', backTarget, user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: `**Цена:** *${formatBudgetValue(price)}* ${formatEmoji('stackmoney')}` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildManufacturingOnboardingView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

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
        content: [`# ${formatEmoji('control')} Заключительный этап.`, '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const introContent =
    '*Поздравляем, Вы успешно юридически зарегистрировали свою частную коммерческую компанию! Теперь вам предстоит заключительный этап: Вам необходимо найти источник финансирования для полноценного физического запуска цикла деятельности организации, затем выполнить все находящиеся ниже пункты.*';

  const legalNewsCompleted = company.manufacturingLegalNewsDone;
  const legalNewsStarted = company.manufacturingLegalNewsStarted && !legalNewsCompleted;

  const legalNewsButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId(
      'companyFinance',
      legalNewsCompleted ? 'manufacturingLegalDone' : legalNewsStarted ? 'manufacturingLegalDone' : 'manufacturingLegalStart',
      user.id
    ),
    label: legalNewsCompleted || legalNewsStarted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(legalNewsCompleted || legalNewsStarted ? 'slide_d' : 'bolt'),
    disabled: legalNewsCompleted
  };

  const infrastructureCompleted =
    company.manufacturingInfrastructureMainOfficeBuilt && company.manufacturingInfrastructureProductionBuilt;

  const infrastructureButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'manufacturingInfrastructureOpen', user.id),
    label: infrastructureCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(infrastructureCompleted ? 'slide_d' : 'bolt'),
    disabled: infrastructureCompleted
  };

  const equipmentCompleted = company.manufacturingEquipmentMainPurchased && company.manufacturingEquipmentSupportPurchased;

  const equipmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'manufacturingEquipmentOpen', user.id),
    label: equipmentCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(equipmentCompleted ? 'slide_d' : 'bolt'),
    disabled: equipmentCompleted
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'manufacturingBack', 'profile', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: introContent },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Юридическая регистрация**',
            '> *Напишите подробную новость о юридической регистрации Вашей компании и подготовке к началу операционной деятельности.*'
          ].join('\n')
        }
      ],
      accessory: legalNewsButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Строительство инфраструктуры**',
            '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
          ].join('\n')
        }
      ],
      accessory: infrastructureButton
    },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Производственное оборудование**',
            '> *Вам необходимо закупить производственное оборудование, требуемое для старта деятельности вашей компании.*'
          ].join('\n')
        }
      ],
      accessory: equipmentButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildManufacturingLegalNewsActionView(options: {
  guild: Guild;
  user: User;
}): Promise<TopLevelComponentData[]> {
  const { guild, user } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `# ${formatEmoji('documentgavel')} Юридическая регистрация`;
  const content =
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```';
  const note = '> *После успешного выполнения действия вам необходимо вам необходимо вернуться в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'manufacturingBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: note },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildManufacturingInfrastructureView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const mainOfficePrice = MANUFACTURING_ONBOARDING_PRICES.mainOffice;
  const productionPrice = MANUFACTURING_ONBOARDING_PRICES.productionInfrastructure;

  const mainOfficeButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'manufacturingInfrastructureBuild', 'mainOffice', user.id),
    label: company.manufacturingInfrastructureMainOfficeBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.manufacturingInfrastructureMainOfficeBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.manufacturingInfrastructureMainOfficeBuilt
  };

  const productionButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'manufacturingInfrastructureBuild', 'productionInfrastructure', user.id),
    label: company.manufacturingInfrastructureProductionBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.manufacturingInfrastructureProductionBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.manufacturingInfrastructureProductionBuilt
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'manufacturingBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const subHeader = `**${formatEmoji('filialscomp')} Необходимая инфраструктура:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Главный офис компании**',
            `**Цена: ${formatBudgetValue(mainOfficePrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: mainOfficeButton
    },
    { type: ComponentType.TextDisplay, content: '\u200b' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Производственная инфраструктура**',
            `**Цена: ${formatBudgetValue(productionPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: productionButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildManufacturingEquipmentView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const mainEquipmentPrice = MANUFACTURING_ONBOARDING_PRICES.mainEquipment;
  const supportEquipmentPrice = MANUFACTURING_ONBOARDING_PRICES.supportEquipment;

  const mainEquipmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'manufacturingEquipmentBuy', 'mainEquipment', user.id),
    label: company.manufacturingEquipmentMainPurchased ? 'Закуплено' : 'Закупить',
    emoji: formatEmoji(company.manufacturingEquipmentMainPurchased ? 'slide_d' : 'buybutton'),
    disabled: company.manufacturingEquipmentMainPurchased
  };

  const supportEquipmentButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'manufacturingEquipmentBuy', 'supportEquipment', user.id),
    label: company.manufacturingEquipmentSupportPurchased ? 'Закуплено' : 'Закупить',
    emoji: formatEmoji(company.manufacturingEquipmentSupportPurchased ? 'slide_d' : 'buybutton'),
    disabled: company.manufacturingEquipmentSupportPurchased
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'manufacturingBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const subHeader = `**${formatEmoji('filialscomp')} Необходимое оборудование:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
    buildSeparator(),
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Основное оборудование**',
            `**Цена: ${formatBudgetValue(mainEquipmentPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: mainEquipmentButton
    },
    { type: ComponentType.TextDisplay, content: '\u200b' },
    {
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            '**Вспомогательное оборудование**',
            `**Цена: ${formatBudgetValue(supportEquipmentPrice)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: supportEquipmentButton
    },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildManufacturingPurchaseResultView(options: {
  guild: Guild;
  user: User;
  title: string;
  price: bigint;
  backTarget: 'finance' | 'infrastructure' | 'equipment';
}): Promise<TopLevelComponentData[]> {
  const { guild, user, title, price, backTarget } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'manufacturingBack', backTarget, user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: `**Цена:** *${formatBudgetValue(price)}* ${formatEmoji('stackmoney')}` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCompanyActivityView(options: {
  guild: Guild;
  user: User;
  registrationLabel: string;
  registrationTaxRate: number;
  registrationDate: Date;
  entries: Array<{
    countryLabel: string;
    registeredUserId?: string;
    taxRate: number;
    startedAt: Date;
  }>;
  page: number;
  totalPages: number;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, registrationLabel, registrationTaxRate, registrationDate, entries, page, totalPages } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const headerContent = [
    `# ${formatEmoji('filialscomp')} Деятельность компании`,
    '',
    '```Расширяйте географию деятельности своей компании в различных странах мира чтобы масштабироваться и увеличить собственный заработок.```'
  ].join('\n');

  const registrationButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'redomicileOpen', user.id),
    label: 'Редомициляция',
    emoji: formatEmoji('bolt')
  };

  const registrationSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          `**${formatEmoji('documentgavel')} Страна регистрации**`,
          '',
          `**Государство:** *${registrationLabel}*`,
          `**Налог на прибыль:** *${registrationTaxRate}%*`,
          `**Дата регистрации:** *${formatDateTime(registrationDate)}*`
        ].join('\n')
      }
    ],
    accessory: registrationButton
  };

  const activityHeaderContent = `**${formatEmoji('worldpulse')} География деятельности**`;

  const activityComponents: ComponentInContainerData[] = [];

  if (!entries.length) {
    activityComponents.push({ type: ComponentType.TextDisplay, content: '*Страны не найдены.*' });
    activityComponents.push(buildSeparator());
  } else {
    for (const entry of entries) {
      const registeredUser = entry.registeredUserId ? `<@${entry.registeredUserId}>` : 'Отсутствует';
      const entryContent = [
        `> **${entry.countryLabel}**`,
        `**Пользователь:** *${registeredUser}*`,
        `**Налог на прибыль:** *${entry.taxRate}%*`,
        `**Начало деятельности:** *${formatDateTime(entry.startedAt)}*`
      ].join('\n');

      activityComponents.push({ type: ComponentType.TextDisplay, content: entryContent });
      activityComponents.push(buildSeparator());
    }
  }

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

  const startButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'branchesStart', user.id))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('linkalt'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    buildSeparator(),
    registrationSection,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: activityHeaderContent },
    ...activityComponents,
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, prevButton, nextButton, startButton).toJSON()
  ]);

  return [container];
}

export async function buildCompanyActivityCountrySelectionView(options: {
  guild: Guild;
  user: User;
  selectedCountryLabel: string;
  nextDisabled: boolean;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, selectedCountryLabel, nextDisabled } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const headerContent = `# ${formatEmoji('linkalt')} Выбор страны:`;

  const editButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'activityEdit', user.id),
    label: 'Изменить',
    emoji: formatEmoji('edit')
  };

  const selectionSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          `**${formatEmoji('worldpulse')} Страна взаимодействия:**`,
          `*${selectedCountryLabel || 'Не выбрано'}*`
        ].join('\n')
      }
    ],
    accessory: editButton
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'activityBack', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const nextButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'activityNext', user.id))
    .setLabel('Далее')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('slide_d'))
    .setDisabled(nextDisabled);

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    buildSeparator(),
    selectionSection,
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, nextButton).toJSON()
  ]);

  return [container];
}

export async function buildCompanyActivityInteractionView(options: {
  guild: Guild;
  user: User;
  selectedCountryLabel: string;
  geographyStarted: boolean;
  geographyDone: boolean;
  infrastructureReady: boolean;
  infrastructureDone: boolean;
  selectionDisabled: boolean;
}): Promise<TopLevelComponentData[]> {
  const {
    guild,
    user,
    selectedCountryLabel,
    geographyStarted,
    geographyDone,
    infrastructureReady,
    infrastructureDone,
    selectionDisabled
  } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const headerContent = `**${formatEmoji('linkalt')} Взаимодействие:**`;
  const countryContent = [
    `**${formatEmoji('worldpulse')} Страна взаимодействия:**`,
    `*${selectedCountryLabel || 'Не выбрано'}*`
  ].join('\n');

  const geographyAction = geographyStarted ? 'activityGeographyDone' : 'activityGeographyStart';
  const geographyLabel = geographyDone || geographyStarted ? 'Выполнено' : 'Выполнить';
  const geographyEmoji = geographyDone || geographyStarted ? 'slide_d' : 'bolt';

  const geographyButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', geographyAction, user.id),
    label: geographyLabel,
    emoji: formatEmoji(geographyEmoji),
    disabled: selectionDisabled || geographyDone
  };

  const geographySection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          '**1. Расширение географии**',
          '> *Напишите подробную новость о начале деятельности Вашей компании в выбранном государстве.*'
        ].join('\n')
      }
    ],
    accessory: geographyButton
  };

  const infrastructureAction = infrastructureReady ? 'activityInfrastructureDone' : 'activityInfrastructureStart';
  const infrastructureLabel = infrastructureDone || infrastructureReady ? 'Выполнено' : 'Выполнить';
  const infrastructureEmoji = infrastructureDone || infrastructureReady ? 'slide_d' : 'bolt';

  const infrastructureButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', infrastructureAction, user.id),
    label: infrastructureLabel,
    emoji: formatEmoji(infrastructureEmoji),
    disabled: selectionDisabled || infrastructureDone
  };

  const infrastructureSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          '**2. Строительство инфраструктуры**',
          '> *Вам необходимо построить инфраструктуру, необходимую для ведения деятельности компании в выбранном государстве*'
        ].join('\n')
      }
    ],
    accessory: infrastructureButton
  };

  const confirmButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'activityConfirm', user.id),
    label: 'Подтвердить',
    emoji: formatEmoji('slide_d'),
    disabled: selectionDisabled || !geographyDone || !infrastructureDone
  };

  const confirmSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: ['**3. Подтверждение**', '> *Подтвердите запуск деятельности компании в выбранной стране.*'].join('\n')
      }
    ],
    accessory: confirmButton
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'activityInteractionReturn', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: countryContent },
    buildSeparator(),
    geographySection,
    buildSeparator(),
    infrastructureSection,
    buildSeparator(),
    confirmSection,
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCompanyActivityConfirmationView(options: {
  guild: Guild;
  selectedCountryLabel: string;
  foreignTaxRate: number;
}): Promise<TopLevelComponentData[]> {
  const { guild, selectedCountryLabel, foreignTaxRate } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `**${formatEmoji('slide_d')} Деятельность вашей компании успешно расширилась!**`;
  const details = [
    `**${formatEmoji('worldpulse')} Государство:**`,
    `> *${selectedCountryLabel}*`,
    '',
    `**${formatEmoji('taxation')} Налог на прибыль:**`,
    `> *${foreignTaxRate}%*`
  ].join('\n');

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: details },
    buildSeparator()
  ]);

  return [container];
}

export async function buildCompanyActivityGeographyActionView(options: {
  guild: Guild;
  user: User;
}): Promise<TopLevelComponentData[]> {
  const { guild, user } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `**${formatEmoji('worldpulse')} География деятельности**`;
  const content =
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что Ваша компания начинает свою деятельность компании на территории выбранного государства. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```';
  const note =
    '> *После успешного выполнения действия вам необходимо вернуться в меню интерфейса "Взаимодействие" и нажать кнопку Выполнено.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'activityInteractionReturn', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: note },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCompanyActivityInfrastructureActionView(options: {
  guild: Guild;
  user: User;
  actionHeader: string;
  items: Array<{
    key: string;
    label: string;
    actionLabel: string;
    doneLabel: string;
  }>;
  completedItems: Set<string>;
  prices: Record<string, bigint>;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, actionHeader, items, completedItems, prices } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `**${formatEmoji('towercrane')} Строительство инфраструктуры**`;
  const itemComponents: ComponentInContainerData[] = [];

  items.forEach((item, index) => {
    const completed = completedItems.has(item.key);
    const itemButton: ButtonComponentData = {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      customId: buildCustomId('companyFinance', 'activityInfrastructureBuild', item.key, user.id),
      label: completed ? item.doneLabel : item.actionLabel,
      emoji: formatEmoji(completed ? 'slide_d' : 'buybutton'),
      disabled: completed
    };

    itemComponents.push({
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            `**${item.label}**`,
            `**Цена: ${formatBudgetValue(prices[item.key] ?? 0n)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: itemButton
    });

    if (index < items.length - 1) {
      itemComponents.push(buildSeparator());
    }
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'activityInteractionReturn', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    ...itemComponents,
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCompanyActivityInfrastructurePurchaseResultView(options: {
  guild: Guild;
  user: User;
  title: string;
  price: bigint;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, title, price } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'activityInfrastructureStart', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: `**Цена:** *${formatBudgetValue(price)}* ${formatEmoji('stackmoney')}` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildCompanyRedomiciliationView(options: {
  guild: Guild;
  user: User;
  selectedCountryLabel: string;
  selectedTaxRateLabel: string;
  infrastructureTitle: string;
  infrastructureDescription: string;
  taskState: RedomiciliationTaskState;
  infrastructureCompleted: boolean;
  confirmDisabled: boolean;
}): Promise<TopLevelComponentData[]> {
  const {
    guild,
    user,
    selectedCountryLabel,
    selectedTaxRateLabel,
    infrastructureTitle,
    infrastructureDescription,
    taskState,
    infrastructureCompleted,
    confirmDisabled
  } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const headerContent = `**${formatEmoji('bolt')} Редомициляция**`;

  const editButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'redomicileEdit', user.id),
    label: 'Изменить',
    emoji: formatEmoji('edit')
  };

  const selectionSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          `**${formatEmoji('worldpulse')} Страна переезда:**`,
          `> *${selectedCountryLabel}*`,
          `**${formatEmoji('taxation')} Налог на прибыль:**`,
          `> *${selectedTaxRateLabel}*`
        ].join('\n')
      }
    ],
    accessory: editButton
  };

  const jurisdictionCompleted = taskState.jurisdictionDone;
  const jurisdictionStarted = taskState.jurisdictionStarted && !jurisdictionCompleted;

  const jurisdictionButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId(
      'companyFinance',
      jurisdictionCompleted || jurisdictionStarted ? 'redomicileJurisdictionDone' : 'redomicileJurisdictionStart',
      user.id
    ),
    label: jurisdictionCompleted || jurisdictionStarted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(jurisdictionCompleted || jurisdictionStarted ? 'slide_d' : 'bolt'),
    disabled: jurisdictionCompleted
  };

  const infrastructureButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId(
      'companyFinance',
      infrastructureCompleted ? 'redomicileInfrastructureDone' : 'redomicileInfrastructureStart',
      user.id
    ),
    label: infrastructureCompleted ? 'Выполнено' : 'Выполнить',
    emoji: formatEmoji(infrastructureCompleted ? 'slide_d' : 'bolt'),
    disabled: infrastructureCompleted
  };

  const jurisdictionSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          '**Смена юрисдикции**',
          '> *Напишите подробную новость о редомициляции Вашей компании в другую страны и смене юрисдикции.*'
        ].join('\n')
      }
    ],
    accessory: jurisdictionButton
  };

  const infrastructureSection: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [infrastructureTitle, infrastructureDescription].join('\n')
      }
    ],
    accessory: infrastructureButton
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'redomicileBack', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const confirmButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'redomicileConfirm', user.id))
    .setLabel('Подтвердить')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('slide_d'))
    .setDisabled(confirmDisabled);

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    buildSeparator(),
    selectionSection,
    buildSeparator(),
    jurisdictionSection,
    buildSeparator(),
    infrastructureSection,
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, confirmButton).toJSON()
  ]);

  return [container];
}

export async function buildRedomiciliationJurisdictionActionView(options: {
  guild: Guild;
  user: User;
}): Promise<TopLevelComponentData[]> {
  const { guild, user } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `# ${formatEmoji('documentgavel')} Смена юрисдикции`;
  const content =
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания переехала и сменила страну юрисдикции. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```';
  const note =
    '> *После успешного выполнения действия вам необходимо вернуться в меню интерфейса "Редомициляция" и нажать кнопку Выполнено.*';

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'redomicileOpen', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: note },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildRedomiciliationInfrastructureActionView(options: {
  guild: Guild;
  user: User;
  infrastructureTitle: string;
  actionHeader: string;
  items: Array<{
    key: string;
    label: string;
    actionLabel: string;
    doneLabel: string;
  }>;
  completedItems: Set<string>;
  prices: Record<string, bigint>;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, infrastructureTitle, actionHeader, items, completedItems, prices } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const title = `# ${formatEmoji('filialscomp')} ${infrastructureTitle.replaceAll('**', '')}`;
  const subHeader = `**${formatEmoji('filialscomp')} ${actionHeader}:**`;
  const itemComponents: ComponentInContainerData[] = [];

  items.forEach((item, index) => {
    const completed = completedItems.has(item.key);
    const itemButton: ButtonComponentData = {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      customId: buildCustomId('companyFinance', 'redomicileInfrastructureBuild', item.key, user.id),
      label: completed ? item.doneLabel : item.actionLabel,
      emoji: formatEmoji(completed ? 'slide_d' : 'buybutton'),
      disabled: completed
    };

    itemComponents.push({
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: [
            `**${item.label}**`,
            `**Цена: ${formatBudgetValue(prices[item.key] ?? 0n)} ${formatEmoji('stackmoney')}**`
          ].join('\n')
        }
      ],
      accessory: itemButton
    });

    if (index < items.length - 1) {
      itemComponents.push(buildSeparator());
    }
  });

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'redomicileOpen', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
    buildSeparator(),
    ...itemComponents,
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildRedomiciliationPurchaseResultView(options: {
  guild: Guild;
  user: User;
  title: string;
  price: bigint;
  backTarget: 'infrastructure' | 'redomicile';
}): Promise<TopLevelComponentData[]> {
  const { guild, user, title, price, backTarget } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const backButton = new ButtonBuilder()
    .setCustomId(
      backTarget === 'infrastructure'
        ? buildCustomId('companyFinance', 'redomicileInfrastructureStart', user.id)
        : buildCustomId('companyFinance', 'redomicileOpen', user.id)
    )
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: title },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: `**Цена:** *${formatBudgetValue(price)}* ${formatEmoji('stackmoney')}` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}

export async function buildRedomiciliationInteractionView(options: {
  guild: Guild;
  user: User;
  selectedCountryLabel: string;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, selectedCountryLabel } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const headerContent = `**${formatEmoji('linkalt')} Взаимодействие:**`;
  const countryContent = [
    `**${formatEmoji('worldpulse')} Страна взаимодействия:**`,
    `*${selectedCountryLabel || 'Не выбрано'}*`
  ].join('\n');

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'redomicileOpen', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: headerContent },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: countryContent },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

  return [container];
}