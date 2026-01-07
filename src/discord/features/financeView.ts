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
  findIndustryByKey,
  type CompanyFeeKey,
  type PrivateCompanyRecord
} from '../../services/privateCompanyService.js';
import { canCollectPopulationTax } from '../../services/populationTaxService.js';

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

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: treasuryHeaderContent },
    governmentBudgetSection,
    { type: ComponentType.TextDisplay, content: treasuryContent },
    buildSeparator(),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
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
    `# ${formatEmoji('opendollar')} Информация`,
    '',
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

  const content = [
    '*- Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.*',
    '',
    '*После успешного выполнения действия вам необходимо вам необходимо вернуть в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*'
  ].join('\n');

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'paymentSystemBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('staff_warn')} Выполните действие:**` },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
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

  const contentHeader = `**${formatEmoji('staff_warn')} Выполните действие:**`;
  const subHeader = `**${formatEmoji('filialscomp')} Необходимая инфраструктура:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: contentHeader },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
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
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('staff_warn')} Выполните действие:**` },
    buildSeparator(),
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
    { type: ComponentType.TextDisplay, content: `*Цена: ${formatBudgetValue(price)}*` },
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

  const content = [
    '*- Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.*',
    '',
    '*После успешного выполнения действия вам необходимо вам необходимо вернуть в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*'
  ].join('\n');

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'investmentExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('staff_warn')} Выполните действие:**` },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
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

  const contentHeader = `**${formatEmoji('staff_warn')} Выполните действие:**`;
  const subHeader = `**${formatEmoji('filialscomp')} Необходимая инфраструктура:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: contentHeader },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
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
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('staff_warn')} Выполните действие:**` },
    buildSeparator(),
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
    { type: ComponentType.TextDisplay, content: `*Цена: ${formatBudgetValue(price)}*` },
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
    { type: ComponentType.TextDisplay, content: '**1. Криптобиржа:**' },
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

  const content = [
    '*- Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания была успешна юридически зарегистрирована и ведёт подготовку к началу операционной деятельности. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.*',
    '',
    '*После успешного выполнения действия вам необходимо вам необходимо вернуть в меню интерфейса "Финансы" и вновь нажать кнопку Выполнено.*'
  ].join('\n');

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'cryptoExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('staff_warn')} Выполните действие:**` },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content },
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
    customId: buildCustomId('companyFinance', 'cryptoExchangeInfrastructureBuild', 'mainOffice', user.id),
    label: company.cryptoExchangeInfrastructureMainOfficeBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.cryptoExchangeInfrastructureMainOfficeBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.cryptoExchangeInfrastructureMainOfficeBuilt
  };

  const serverButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('companyFinance', 'cryptoExchangeInfrastructureBuild', 'serverInfrastructure', user.id),
    label: company.cryptoExchangeInfrastructureServerBuilt ? 'Построено' : 'Построить',
    emoji: formatEmoji(company.cryptoExchangeInfrastructureServerBuilt ? 'slide_d' : 'buybutton'),
    disabled: company.cryptoExchangeInfrastructureServerBuilt
  };

  const backButton = new ButtonBuilder()
    .setCustomId(buildCustomId('companyFinance', 'cryptoExchangeBack', 'finance', user.id))
    .setLabel('Назад')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('undonew'));

  const contentHeader = `**${formatEmoji('staff_warn')} Выполните действие:**`;
  const subHeader = `**${formatEmoji('filialscomp')} Необходимая инфраструктура:**`;

  const container = buildContainer([
    { type: ComponentType.TextDisplay, content: contentHeader },
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: [subHeader, '\u200b'].join('\n') },
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
    { type: ComponentType.TextDisplay, content: `**${formatEmoji('staff_warn')} Выполните действие:**` },
    buildSeparator(),
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
    { type: ComponentType.TextDisplay, content: `*Цена: ${formatBudgetValue(price)}*` },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton).toJSON()
  ]);

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

  const container = buildContainer([
    header,
    buildSeparator(),
    { type: ComponentType.TextDisplay, content: listContent },
    buildSeparator(),
    new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, prevButton, nextButton).toJSON()
  ]);

  return [container];
}