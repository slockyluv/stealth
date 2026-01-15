import { MessageFlags } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView, buildSuccessView } from '../../responses/messageBuilders.js';
import {
  findCountryByKey,
  findCountryByPartialQuery,
  findCountryByQuery,
  getUserRegistration
} from '../../../services/countryRegistrationService.js';
import {
  getCountryProfile,
  normalizeCountryKey,
  updateCountryCompanyTaxRates,
  updateCountryPopulationTaxRate
} from '../../../services/countryProfileService.js';
import {
  findIndustryByKey,
  getUserActiveCompany,
  updateCompanyFeeRateForUser,
  type CompanyFeeKey
} from '../../../services/privateCompanyService.js';
import { buildCompanyFinanceView, buildCompanyRedomiciliationView, buildGovernmentBudgetView } from '../../features/financeView.js';
import { getRedomiciliationInfrastructureContent } from '../../features/financeRedomiciliation.js';
import { resolveEmojiIdentifier } from '../../features/settings/countriesView.js';
import { logger } from '../../../shared/logger.js';
import {
  clearRedomiciliationTasks,
  getRedomiciliationInfrastructureState,
  getRedomiciliationSelection,
  getRedomiciliationTaskState,
  setRedomiciliationSelection
} from '../../../services/redomiciliationService.js';

function parseTaxRate(input: string): number | null {
  const trimmed = input.trim();
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  if (normalized < 1 || normalized > 100) return null;
  return normalized;
}

function parseCompanyTaxRate(input: string): number | null {
  const trimmed = input.trim();
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  if (normalized < 0 || normalized > 100) return null;
  return normalized;
}

function parseCompanyFeeRate(input: string): number | null {
  const trimmed = input.trim();
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  if (normalized < 0 || normalized > 100) return null;
  return normalized;
}

const COMPANY_FEE_KEYS_BY_INDUSTRY: Record<string, CompanyFeeKey[]> = {
  payment_system: ['paymentTransfer'],
  investment_exchange: ['investmentTrade'],
  crypto_exchange: ['cryptoTrade', 'cryptoTransfer'],
  construction: ['constructionProfit'],
  manufacturing: ['manufacturingMarkup']
};

export const financeTaxationEditModal: ModalHandler = {
  key: 'finance:taxationEditModal',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Форма доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта форма доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const rateInput = interaction.fields.getTextInputValue('population-tax-rate');
    const rate = parseTaxRate(rateInput);
    if (!rate) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Введите число от 1 до 100.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const registration = await getUserRegistration(interaction.guildId, userId);
    if (!registration) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован за страной.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const countryLookup = findCountryByKey(registration.countryName);
    if (!countryLookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Страна пользователя не найдена.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const profile = await updateCountryPopulationTaxRate(interaction.guildId, countryLookup.country, rate);
      const view = await buildGovernmentBudgetView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });

      await interaction.followUp({
        components: buildSuccessView(formatEmoji, 'Налог населения обновлен.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось сохранить налог. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const financeResidentTaxEditModal: ModalHandler = {
  key: 'finance:residentTaxEditModal',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Форма доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта форма доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const rateInput = interaction.fields.getTextInputValue('resident-tax-rate');
    const rate = parseCompanyTaxRate(rateInput);
    if (rate === null) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Введите число от 0 до 100.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const registration = await getUserRegistration(interaction.guildId, userId);
    if (!registration) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован за страной.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const countryLookup = findCountryByKey(registration.countryName);
    if (!countryLookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Страна пользователя не найдена.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const profile = await updateCountryCompanyTaxRates(interaction.guildId, countryLookup.country, {
        residentCompanyTaxRate: rate
      });
      const view = await buildGovernmentBudgetView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });

      await interaction.followUp({
        components: buildSuccessView(formatEmoji, 'Налог компаний резидентов обновлен.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось сохранить налог. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const financeForeignTaxEditModal: ModalHandler = {
  key: 'finance:foreignTaxEditModal',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Форма доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта форма доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const rateInput = interaction.fields.getTextInputValue('foreign-tax-rate');
    const rate = parseCompanyTaxRate(rateInput);
    if (rate === null) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Введите число от 0 до 100.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const registration = await getUserRegistration(interaction.guildId, userId);
    if (!registration) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован за страной.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const countryLookup = findCountryByKey(registration.countryName);
    if (!countryLookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Страна пользователя не найдена.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const profile = await updateCountryCompanyTaxRates(interaction.guildId, countryLookup.country, {
        foreignCompanyTaxRate: rate
      });
      const view = await buildGovernmentBudgetView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });

      await interaction.followUp({
        components: buildSuccessView(formatEmoji, 'Налог иностранных компаний обновлен.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось сохранить налог. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileEditModal: ModalHandler = {
  key: 'companyFinance:redomicileEditModal',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Форма доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта форма доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const countryInput = interaction.fields.getTextInputValue('redomicile-country').trim();
    if (!countryInput) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Введите название страны.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const lookup = findCountryByQuery(countryInput) ?? findCountryByPartialQuery(countryInput);
    if (!lookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Страна не найдена. Попробуйте другое название.'),
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

    const nextSelection = {
      countryName: lookup.country.name,
      countryKey: normalizeCountryKey(lookup.country.name),
      continentId: lookup.continentId
    };

    const previousSelection = getRedomiciliationSelection(interaction.guildId, userId);
    if (
      previousSelection &&
      (previousSelection.countryKey !== nextSelection.countryKey || previousSelection.continentId !== nextSelection.continentId)
    ) {
      clearRedomiciliationTasks(interaction.guildId, userId);
    }

    setRedomiciliationSelection(interaction.guildId, userId, nextSelection);

    await interaction.deferUpdate();

    try {
      const profile = await getCountryProfile(interaction.guildId, lookup.country);
      const selectedCountryLabel = `${resolveEmojiIdentifier(lookup.country.emoji, formatEmoji)} | ${lookup.country.name}`;
      const selectedTaxRateLabel = `${profile.foreignCompanyTaxRate}%`;
      const infrastructureContent = getRedomiciliationInfrastructureContent(company.industryKey);
      const infrastructureState = getRedomiciliationInfrastructureState(interaction.guildId, userId);
      const infrastructureCompleted = infrastructureContent.items.every((item) => infrastructureState.has(item.key));
      const taskState = getRedomiciliationTaskState(interaction.guildId, userId);

      const view = await buildCompanyRedomiciliationView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel,
        selectedTaxRateLabel,
        infrastructureTitle: infrastructureContent.title,
        infrastructureDescription: infrastructureContent.description,
        taskState,
        infrastructureCompleted,
        confirmDisabled: false
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить редомициляцию. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceFeeEditModal: ModalHandler = {
  key: 'companyFinance:feeEditModal',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Форма доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const feeKey = ctx.customId.args[0] as CompanyFeeKey | undefined;
    const userId = ctx.customId.args[1];
    if (!feeKey || !userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта форма доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const rateInput = interaction.fields.getTextInputValue('fee-rate');
    const rate = parseCompanyFeeRate(rateInput);
    if (rate === null) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Введите число от 0 до 100.'),
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

    const countryLookup = findCountryByKey(company.countryName);
    if (!countryLookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Страна компании не найдена.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const updatedCompany = await updateCompanyFeeRateForUser(interaction.guildId, userId, feeKey, rate);
      if (!updatedCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const profile = await getCountryProfile(interaction.guildId, countryLookup.country);
      const view = await buildCompanyFinanceView({
        guild: interaction.guild,
        user: interaction.user,
        company: updatedCompany,
        countryProfile: profile
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });

      await interaction.followUp({
        components: buildSuccessView(formatEmoji, 'Комиссия сохранена.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось сохранить комиссию. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};