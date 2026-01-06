import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildSuccessView, buildWarningView } from '../../responses/messageBuilders.js';
import { getUserRegistration, findCountryByKey } from '../../../services/countryRegistrationService.js';
import { getCountryProfile } from '../../../services/countryProfileService.js';
import { findIndustryByKey, getUserActiveCompany, type CompanyFeeKey } from '../../../services/privateCompanyService.js';
import { buildCompanyBranchesView, buildCompanyFinanceView, buildFinanceView, buildGovernmentBudgetView } from '../../features/financeView.js';
import { collectPopulationTaxForCountry } from '../../../services/populationTaxService.js';
import { logger } from '../../../shared/logger.js';
import { formatDateTime } from '../../../shared/time.js';

export const financeBudgetButton: ButtonHandler = {
  key: 'finance:budget',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const registration = await getUserRegistration(interaction.guildId, userId);
      if (!registration) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован за страной.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(registration.countryName);
      if (!countryLookup) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Страна пользователя не найдена.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const profile = await getCountryProfile(interaction.guildId, countryLookup.country);
      const view = await buildGovernmentBudgetView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть бюджет. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const financeBudgetBackButton: ButtonHandler = {
  key: 'finance:budgetBack',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const registration = await getUserRegistration(interaction.guildId, userId);
      if (!registration) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован за страной.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(registration.countryName);
      if (!countryLookup) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Страна пользователя не найдена.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const profile = await getCountryProfile(interaction.guildId, countryLookup.country);
      const view = await buildFinanceView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться к финансам. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const financeTaxationEditButton: ButtonHandler = {
  key: 'finance:taxationEdit',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('finance', 'taxationEditModal', userId))
      .setTitle('Налоги населения');

    const input = new TextInputBuilder()
      .setCustomId('population-tax-rate')
      .setLabel('Процент налогов (1-100)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};

export const financeResidentTaxEditButton: ButtonHandler = {
  key: 'finance:residentTaxEdit',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('finance', 'residentTaxEditModal', userId))
      .setTitle('Налог компаний резидентов');

    const input = new TextInputBuilder()
      .setCustomId('resident-tax-rate')
      .setLabel('Процент налога (0-100)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};

export const financeForeignTaxEditButton: ButtonHandler = {
  key: 'finance:foreignTaxEdit',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('finance', 'foreignTaxEditModal', userId))
      .setTitle('Налог иностранных компаний');

    const input = new TextInputBuilder()
      .setCustomId('foreign-tax-rate')
      .setLabel('Процент налога (0-100)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
}

export const financeTaxationCollectButton: ButtonHandler = {
  key: 'finance:taxationCollect',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const registration = await getUserRegistration(interaction.guildId, userId);
      if (!registration) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован за страной.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(registration.countryName);
      if (!countryLookup) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Страна пользователя не найдена.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const profile = await getCountryProfile(interaction.guildId, countryLookup.country);
      const result = await collectPopulationTaxForCountry({
        guildId: interaction.guildId,
        country: countryLookup.country,
        population: profile.population,
        taxRate: profile.populationTaxRate ?? 10,
        lastCollectedAt: profile.lastPopulationTaxAt
      });

      const updatedProfile = await getCountryProfile(interaction.guildId, countryLookup.country);
      const view = await buildGovernmentBudgetView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile: updatedProfile
      });

      await interaction.editReply({ components: view });

      if (result.status === 'collected') {
        await interaction.followUp({
          components: buildSuccessView(
            formatEmoji,
            `Налог собран: +${result.taxAmount.toLocaleString('ru-RU')} ${formatEmoji('stackmoney')}`
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.followUp({
          components: buildWarningView(
            formatEmoji,
            `Налог можно собрать после \`${formatDateTime(result.availableAt)}\`.`
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось собрать налог. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceBranchesButton: ButtonHandler = {
  key: 'companyFinance:branches',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const requestedPage = Number(ctx.customId.args[1] ?? '1');
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.trunc(requestedPage) : 1;

    await interaction.deferUpdate();

    try {
      const company = await getUserActiveCompany(interaction.guildId, userId);
      if (!company) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const { entries, totalPages, page: resolvedPage } = await resolveBranchEntries({ page });
      const view = await buildCompanyBranchesView({
        guild: interaction.guild,
        user: interaction.user,
        entries,
        page: resolvedPage,
        totalPages
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть список филиалов. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceBranchesInfoButton: ButtonHandler = {
  key: 'companyFinance:branchesInfo',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Список филиалов пока недоступен.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
};

const COMPANY_FEE_KEYS_BY_INDUSTRY: Record<string, CompanyFeeKey[]> = {
  payment_system: ['paymentTransfer'],
  investment_exchange: ['investmentTrade'],
  crypto_exchange: ['cryptoTrade', 'cryptoTransfer'],
  construction: ['constructionProfit'],
  manufacturing: ['manufacturingMarkup']
};

const COMPANY_FEE_MODAL_META: Record<CompanyFeeKey, { title: string; label: string }> = {
  paymentTransfer: {
    title: 'Комиссии за перевод',
    label: 'Процент комиссии (0-100)'
  },
  investmentTrade: {
    title: 'Комиссии за сделки',
    label: 'Процент комиссии (0-100)'
  },
  cryptoTrade: {
    title: 'Комиссии за сделки',
    label: 'Процент комиссии (0-100)'
  },
  cryptoTransfer: {
    title: 'Комиссии за перевод',
    label: 'Процент комиссии (0-100)'
  },
  constructionProfit: {
    title: 'Сметная прибыль',
    label: 'Процент прибыли (0-100)'
  },
  manufacturingMarkup: {
    title: 'Наценка на товар',
    label: 'Процент наценки (0-100)'
  }
};

export const companyFinanceFeeEditButton: ButtonHandler = {
  key: 'companyFinance:feeEdit',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const feeKey = ctx.customId.args[0] as CompanyFeeKey | undefined;
    const userId = ctx.customId.args[1];
    if (!feeKey || !userId || !(feeKey in COMPANY_FEE_MODAL_META)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const company = await getUserActiveCompany(interaction.guildId, userId);
    if (!company) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const industry = findIndustryByKey(company.industryKey);
    const allowedFees = industry ? COMPANY_FEE_KEYS_BY_INDUSTRY[industry.key] ?? [] : [];
    if (!allowedFees.includes(feeKey)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта настройка недоступна для отрасли компании.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const meta = COMPANY_FEE_MODAL_META[feeKey];
    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('companyFinance', 'feeEditModal', feeKey, userId))
      .setTitle(meta.title);

    const input = new TextInputBuilder()
      .setCustomId('fee-rate')
      .setLabel(meta.label)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};

export const companyFinanceBranchesBackButton: ButtonHandler = {
  key: 'companyFinance:branchesBack',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const company = await getUserActiveCompany(interaction.guildId, userId);
      if (!company) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(company.countryName);
      if (!countryLookup) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Страна компании не найдена.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const profile = await getCountryProfile(interaction.guildId, countryLookup.country);
      const view = await buildCompanyFinanceView({
        guild: interaction.guild,
        user: interaction.user,
        company,
        countryProfile: profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться к финансам. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceBranchesPrevButton: ButtonHandler = {
  key: 'companyFinance:branchesPrev',

  async execute(interaction, ctx) {
    await handleBranchPagination(interaction, ctx, -1);
  }
};

export const companyFinanceBranchesNextButton: ButtonHandler = {
  key: 'companyFinance:branchesNext',

  async execute(interaction, ctx) {
    await handleBranchPagination(interaction, ctx, 1);
  }
};

async function handleBranchPagination(
  interaction: Parameters<ButtonHandler['execute']>[0],
  ctx: Parameters<ButtonHandler['execute']>[1],
  direction: number
): Promise<void> {
  const formatEmoji = await createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });

  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Кнопка доступна только внутри сервера.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
  }

  const userId = ctx.customId.args[0];
  if (!userId) {
    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
  }

  if (interaction.user.id !== userId) {
    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
  }

  const currentPage = Number(ctx.customId.args[1] ?? '1');
  const page = Number.isFinite(currentPage) && currentPage > 0 ? Math.trunc(currentPage) : 1;

  await interaction.deferUpdate();

  try {
    const company = await getUserActiveCompany(interaction.guildId, userId);
    if (!company) {
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const { entries, totalPages, page: resolvedPage } = await resolveBranchEntries({ page: page + direction });
    const view = await buildCompanyBranchesView({
      guild: interaction.guild,
      user: interaction.user,
      entries,
      page: resolvedPage,
      totalPages
    });

    await interaction.editReply({ components: view });
  } catch (error) {
    logger.error(error);
    await interaction.followUp({
      components: buildWarningView(formatEmoji, 'Не удалось загрузить страницу. Попробуйте позже.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
}

async function resolveBranchEntries(options: {
  page: number;
}): Promise<{
  entries: Array<{ countryLabel: string; registeredUserId?: string; taxRate: number }>;
  page: number;
  totalPages: number;
}> {
  const branches: Array<{ countryLabel: string; registeredUserId?: string; taxRate: number }> = [];
  const totalPages = Math.max(1, Math.ceil(branches.length / 5));
  const page = Math.min(totalPages, Math.max(1, Math.trunc(options.page)));
  const start = (page - 1) * 5;
  const entries = branches.slice(start, start + 5);

  return { entries, page, totalPages };
}