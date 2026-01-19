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
import {
  buildCryptoExchangeInfrastructure,
  buildInvestmentExchangeInfrastructure,
  buildPaymentSystemInfrastructure,
  buildManufacturingInfrastructure,
  findIndustryByKey,
  getRedomiciliationInfrastructurePrice,
  getUserActiveCompany,
  markCryptoExchangeLegalNewsDone,
  markCryptoExchangeLegalNewsStarted,
  markConstructionLegalNewsDone,
  markConstructionLegalNewsStarted,
  markInvestmentExchangeLegalNewsDone,
  markInvestmentExchangeLegalNewsStarted,
  markManufacturingLegalNewsDone,
  markManufacturingLegalNewsStarted,
  markPaymentSystemLegalNewsDone,
  markPaymentSystemLegalNewsStarted,
  purchaseRedomiciliationInfrastructure,
  
  redomiciliateCompany,
  orderCryptoExchangeWebDevelopment,
  orderConstructionWebDevelopment,
  orderInvestmentExchangeWebDevelopment,
  purchaseConstructionEquipment,
  purchaseManufacturingEquipment,
  orderPaymentSystemWebDevelopment,
  type CompanyFeeKey,
  type ConstructionEquipmentKey,
  type CryptoExchangeInfrastructureKey,
  type InvestmentExchangeInfrastructureKey,
  type ManufacturingEquipmentKey,
  type ManufacturingInfrastructureKey,
  type PaymentSystemInfrastructureKey
} from '../../../services/privateCompanyService.js';
import {
  buildCompanyActivityConfirmationView,
  buildCompanyActivityView,
  buildCompanyActivityCountrySelectionView,
  buildCompanyActivityGeographyActionView,
  buildCompanyActivityInfrastructureActionView,
  buildCompanyActivityInfrastructurePurchaseResultView,
  buildCompanyActivityInteractionView,
  buildCompanyFinanceView,
  buildCompanyRedomiciliationView,
  buildFinanceView,
  buildGovernmentBudgetView,
  buildCryptoExchangeInfrastructureView,
  buildCryptoExchangeLegalNewsActionView,
  buildCryptoExchangePurchaseResultView,
  buildCryptoExchangeWebDevelopmentView,
  buildConstructionEquipmentView,
  buildConstructionLegalNewsActionView,
  buildConstructionPurchaseResultView,
  buildConstructionWebDevelopmentView,
  buildInvestmentExchangeInfrastructureView,
  buildInvestmentExchangeLegalNewsActionView,
  buildInvestmentExchangePurchaseResultView,
  buildInvestmentExchangeWebDevelopmentView,
  buildManufacturingEquipmentView,
  buildManufacturingInfrastructureView,
  buildManufacturingLegalNewsActionView,
  buildManufacturingPurchaseResultView,
  buildRedomiciliationInfrastructureActionView,
  buildRedomiciliationInteractionView,
  buildRedomiciliationJurisdictionActionView,
  buildRedomiciliationPurchaseResultView,
  buildPaymentSystemInfrastructureView,
  buildPaymentSystemLegalNewsActionView,
  buildPaymentSystemPurchaseResultView,
  buildPaymentSystemWebDevelopmentView,
  buildForeignCompaniesView
} from '../../features/financeView.js';
import { buildCompanyProfileView } from '../../features/companyProfileView.js';
import { getCompanyActivityInfrastructureContent } from '../../features/financeActivity.js';
import { getRedomiciliationInfrastructureContent } from '../../features/financeRedomiciliation.js';
import { resolveEmojiIdentifier, getCountryNicknameEmoji, type Country } from '../../features/settings/countriesView.js';
import {
  addCompanyActivityCountry,
  getCompanyActivityCountries,
  getForeignCompanyActivitiesInCountry
} from '../../../services/companyActivityCountryService.js';
import { collectPopulationTaxForCountry } from '../../../services/populationTaxService.js';
import { logger } from '../../../shared/logger.js';
import { formatDateTime } from '../../../shared/time.js';
import {
  clearCompanyActivitySelection,
  clearCompanyActivityTasks,
  getCompanyActivityInfrastructureState,
  getCompanyActivitySelection,
  getCompanyActivityTaskState,
  markCompanyActivityInfrastructureItemDone,
  markCompanyActivityTaskDone,
  markCompanyActivityTaskStarted
} from '../../../services/companyActivityService.js';
import {
  clearRedomiciliationTasks,
  clearRedomiciliationSelection,
  getRedomiciliationInfrastructureState,
  getRedomiciliationSelection,
  getRedomiciliationTaskState,
  markRedomiciliationInfrastructureItemDone,
  markRedomiciliationTaskDone,
  markRedomiciliationTaskStarted,
  type RedomiciliationInfrastructureItemKey,
  type RedomiciliationSelection
} from '../../../services/redomiciliationService.js';
import { getIndustryMarker } from '../../../services/privateCompanyService.js';

type EmojiFormatter = (name: string) => string;

function buildCompanyDisplayName(options: {
  country: Country | null;
  industryKey: string | null | undefined;
  name: string;
}): string {
  const trimmedName = options.name.trim();
  if (!options.country) {
    return trimmedName || 'Без названия';
  }

  const marker = getIndustryMarker(options.industryKey);
  if (!marker || !trimmedName) {
    return trimmedName || 'Без названия';
  }

  const countryEmoji = getCountryNicknameEmoji(options.country);
  const prefix = `${countryEmoji} | ${marker} `;
  const maxNameLength = 32 - prefix.length;
  if (maxNameLength <= 0) {
    return `${countryEmoji} | ${marker}`.trim();
  }

  const finalName =
    trimmedName.length > maxNameLength
      ? `${trimmedName.slice(0, Math.max(0, maxNameLength - 1)).trimEnd()}…`
      : trimmedName;
  return `${countryEmoji} | ${marker} ${finalName}`.trim();
}

async function resolveRedomiciliationSelectionLabels(options: {
  guildId: string;
  formatEmoji: EmojiFormatter;
  selection: RedomiciliationSelection | null;
}): Promise<{ selectedCountryLabel: string; selectedTaxRateLabel: string }> {
  const { guildId, selection, formatEmoji } = options;
  let selectedCountryLabel = 'Не выбрано';
  let selectedTaxRateLabel = 'Не выбрано';

  if (!selection) {
    return { selectedCountryLabel, selectedTaxRateLabel };
  }

  const selectedCountryLookup = findCountryByKey(selection.countryName);
  if (selectedCountryLookup) {
    selectedCountryLabel = `${resolveEmojiIdentifier(selectedCountryLookup.country.emoji, formatEmoji)} | ${selectedCountryLookup.country.name}`;
    const profile = await getCountryProfile(guildId, selectedCountryLookup.country);
    selectedTaxRateLabel = `${profile.foreignCompanyTaxRate}%`;
  } else {
    selectedCountryLabel = selection.countryName;
  }

  return { selectedCountryLabel, selectedTaxRateLabel };
}

async function resolveActivitySelectionLabel(options: {
  formatEmoji: EmojiFormatter;
  selection: Awaited<ReturnType<typeof getCompanyActivitySelection>> | null;
}): Promise<string> {
  const { selection, formatEmoji } = options;
  let selectedCountryLabel = 'Не выбрано';

  if (!selection) {
    return selectedCountryLabel;
  }

  const selectedCountryLookup = findCountryByKey(selection.countryName);
  if (selectedCountryLookup) {
    selectedCountryLabel = `${resolveEmojiIdentifier(selectedCountryLookup.country.emoji, formatEmoji)} | ${selectedCountryLookup.country.name}`;
  } else {
    selectedCountryLabel = selection.countryName;
  }

  return selectedCountryLabel;
}

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
      const foreignCompanies = await getForeignCompanyActivitiesInCountry(
        interaction.guildId,
        registration.countryKey
      );
      const view = await buildFinanceView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile,
        foreignCompaniesCount: foreignCompanies.length
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

export const financeForeignCompaniesButton: ButtonHandler = {
  key: 'finance:foreignCompanies',

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
      await renderForeignCompaniesView({
        interaction,
        formatEmoji,
        userId,
        page: 1
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть список. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const financeForeignCompaniesBackButton: ButtonHandler = {
  key: 'finance:foreignCompaniesBack',

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
      const foreignCompanies = await getForeignCompanyActivitiesInCountry(
        interaction.guildId,
        registration.countryKey
      );
      const view = await buildFinanceView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile,
        foreignCompaniesCount: foreignCompanies.length
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

export const financeForeignCompaniesPrevButton: ButtonHandler = {
  key: 'finance:foreignCompaniesPrev',

  async execute(interaction, ctx) {
    await handleForeignCompaniesPagination(interaction, ctx, -1);
  }
};

export const financeForeignCompaniesNextButton: ButtonHandler = {
  key: 'finance:foreignCompaniesNext',

  async execute(interaction, ctx) {
    await handleForeignCompaniesPagination(interaction, ctx, 1);
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

      const result = await collectPopulationTaxForCountry({
        guildId: interaction.guildId,
        country: countryLookup.country
      });

      const view = await buildGovernmentBudgetView({
        guild: interaction.guild,
        user: interaction.user,
        registration,
        profile: result.profile
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

      await renderCompanyActivityView({
        interaction,
        formatEmoji,
        userId,
        page
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть географию деятельности. Попробуйте позже.'),
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

    const page = 1;

    await interaction.deferUpdate();

    try {
      await renderCompanyActivityView({
        interaction,
        formatEmoji,
        userId,
        page
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть географию деятельности. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceBranchesStartButton: ButtonHandler = {
  key: 'companyFinance:branchesStart',

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
      const selection = getCompanyActivitySelection(interaction.guildId, userId);
      const selectedCountryLabel = await resolveActivitySelectionLabel({
        formatEmoji,
        selection
      });

      const view = await buildCompanyActivityCountrySelectionView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel,
        nextDisabled: !selection
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть выбор страны. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityBackButton: ButtonHandler = {
  key: 'companyFinance:activityBack',

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
      await renderCompanyActivityView({
        interaction,
        formatEmoji,
        userId,
        page: 1
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться к географии деятельности. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityEditButton: ButtonHandler = {
  key: 'companyFinance:activityEdit',

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

    const input = new TextInputBuilder()
      .setCustomId('activity-country')
      .setLabel('Название страны')
      .setPlaceholder('Введите часть или полное название страны')
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('companyFinance', 'activityEditModal', userId))
      .setTitle('Выбор страны')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};

export const companyFinanceActivityNextButton: ButtonHandler = {
  key: 'companyFinance:activityNext',

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

    const selection = getCompanyActivitySelection(interaction.guildId, userId);

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

      const selectedCountryLabel = selection
        ? await resolveActivitySelectionLabel({
            formatEmoji,
            selection
          })
        : '';

      const taskState = getCompanyActivityTaskState(interaction.guildId, userId);
      const infrastructureContent = getCompanyActivityInfrastructureContent(company.industryKey);
      const infrastructureState = getCompanyActivityInfrastructureState(interaction.guildId, userId);
      const infrastructureReady = infrastructureContent.items.every((item) => infrastructureState.has(item.key));

      const view = await buildCompanyActivityInteractionView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel,
        geographyStarted: taskState.geographyStarted,
        geographyDone: taskState.geographyDone,
        infrastructureReady,
        infrastructureDone: taskState.infrastructureDone,
        selectionDisabled: false
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть взаимодействие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityInteractionBackButton: ButtonHandler = {
  key: 'companyFinance:activityInteractionBack',

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
      const selection = getCompanyActivitySelection(interaction.guildId, userId);
      const selectedCountryLabel = await resolveActivitySelectionLabel({
        formatEmoji,
        selection
      });

      const view = await buildCompanyActivityCountrySelectionView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel,
        nextDisabled: !selection
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть выбор страны. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityInteractionReturnButton: ButtonHandler = {
  key: 'companyFinance:activityInteractionReturn',

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

    const selection = getCompanyActivitySelection(interaction.guildId, userId);

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

      const selectedCountryLabel = selection
        ? await resolveActivitySelectionLabel({
            formatEmoji,
            selection
          })
        : '';

      const taskState = getCompanyActivityTaskState(interaction.guildId, userId);
      const infrastructureContent = getCompanyActivityInfrastructureContent(company.industryKey);
      const infrastructureState = getCompanyActivityInfrastructureState(interaction.guildId, userId);
      const infrastructureReady = infrastructureContent.items.every((item) => infrastructureState.has(item.key));

      const view = await buildCompanyActivityInteractionView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel,
        geographyStarted: taskState.geographyStarted,
        geographyDone: taskState.geographyDone,
        infrastructureReady,
        infrastructureDone: taskState.infrastructureDone,
        selectionDisabled: false
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть взаимодействие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityGeographyStartButton: ButtonHandler = {
  key: 'companyFinance:activityGeographyStart',

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

    const selection = getCompanyActivitySelection(interaction.guildId, userId);
    if (!selection) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала выберите страну взаимодействия.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      markCompanyActivityTaskStarted(interaction.guildId, userId, 'geography');

      const view = await buildCompanyActivityGeographyActionView({
        guild: interaction.guild,
        user: interaction.user
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityGeographyDoneButton: ButtonHandler = {
  key: 'companyFinance:activityGeographyDone',

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

    const selection = getCompanyActivitySelection(interaction.guildId, userId);
    if (!selection) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала выберите страну взаимодействия.'),
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

      markCompanyActivityTaskDone(interaction.guildId, userId, 'geography');

      const selectedCountryLabel = await resolveActivitySelectionLabel({
        formatEmoji,
        selection
      });

      const taskState = getCompanyActivityTaskState(interaction.guildId, userId);
      const infrastructureContent = getCompanyActivityInfrastructureContent(company.industryKey);
      const infrastructureState = getCompanyActivityInfrastructureState(interaction.guildId, userId);
      const infrastructureReady = infrastructureContent.items.every((item) => infrastructureState.has(item.key));

      const view = await buildCompanyActivityInteractionView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel,
        geographyStarted: taskState.geographyStarted,
        geographyDone: taskState.geographyDone,
        infrastructureReady,
        infrastructureDone: taskState.infrastructureDone,
        selectionDisabled: false
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityInfrastructureStartButton: ButtonHandler = {
  key: 'companyFinance:activityInfrastructureStart',

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

    const selection = getCompanyActivitySelection(interaction.guildId, userId);
    if (!selection) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала выберите страну взаимодействия.'),
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

      markCompanyActivityTaskStarted(interaction.guildId, userId, 'infrastructure');
      const infrastructureContent = getCompanyActivityInfrastructureContent(company.industryKey);
      const infrastructureState = getCompanyActivityInfrastructureState(interaction.guildId, userId);
      const infrastructurePrices = Object.fromEntries(
        infrastructureContent.items.map((item) => [
          item.key,
          getRedomiciliationInfrastructurePrice(
            company.industryKey,
            item.key as RedomiciliationInfrastructureItemKey
          ) ?? 0n
        ])
      );

      const view = await buildCompanyActivityInfrastructureActionView({
        guild: interaction.guild,
        user: interaction.user,
        actionHeader: infrastructureContent.actionHeader,
        items: infrastructureContent.items,
        completedItems: infrastructureState,
        prices: infrastructurePrices
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityInfrastructureBuildButton: ButtonHandler = {
  key: 'companyFinance:activityInfrastructureBuild',

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

    const itemKey = ctx.customId.args[0];
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId) {
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

      const infrastructureContent = getCompanyActivityInfrastructureContent(company.industryKey);
      const item = infrastructureContent.items.find((entry) => entry.key === itemKey);
      if (!item) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const infrastructurePrices = Object.fromEntries(
        infrastructureContent.items.map((entry) => [
          entry.key,
          getRedomiciliationInfrastructurePrice(
            company.industryKey,
            entry.key as RedomiciliationInfrastructureItemKey
          ) ?? 0n
        ])
      );
      const infrastructureState = getCompanyActivityInfrastructureState(interaction.guildId, userId);

      if (infrastructureState.has(item.key)) {
        const view = await buildCompanyActivityInfrastructureActionView({
          guild: interaction.guild,
          user: interaction.user,
          actionHeader: infrastructureContent.actionHeader,
          items: infrastructureContent.items,
          completedItems: infrastructureState,
          prices: infrastructurePrices
        });
        await interaction.editReply({ components: view });
        return;
      }

      const result = await purchaseRedomiciliationInfrastructure(interaction.guildId, userId, item.key);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const isEquipmentPurchase = item.key === 'mainEquipment' || item.key === 'supportEquipment';

      if (result.status === 'insufficientFunds') {
        const view = await buildCompanyActivityInfrastructurePurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для ${
            isEquipmentPurchase ? 'закупки техники' : 'строительства инфраструктуры'
          }!**`,
          price: result.price
        });
        await interaction.editReply({ components: view });
        return;
      }

      markCompanyActivityInfrastructureItemDone(interaction.guildId, userId, item.key);

      const view = await buildCompanyActivityInfrastructurePurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно ${isEquipmentPurchase ? 'приобрели' : 'построили'} __${item.label}__.**`,
        price: result.price
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить покупку. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityInfrastructureDoneButton: ButtonHandler = {
  key: 'companyFinance:activityInfrastructureDone',

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

    const selection = getCompanyActivitySelection(interaction.guildId, userId);
    if (!selection) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала выберите страну взаимодействия.'),
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

      const infrastructureContent = getCompanyActivityInfrastructureContent(company.industryKey);
      const infrastructureState = getCompanyActivityInfrastructureState(interaction.guildId, userId);
      const infrastructureReady = infrastructureContent.items.every((item) => infrastructureState.has(item.key));

      if (!infrastructureReady) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Сначала завершите строительство инфраструктуры.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      markCompanyActivityTaskDone(interaction.guildId, userId, 'infrastructure');

      const selectedCountryLabel = await resolveActivitySelectionLabel({
        formatEmoji,
        selection
      });

      const taskState = getCompanyActivityTaskState(interaction.guildId, userId);

      const view = await buildCompanyActivityInteractionView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel,
        geographyStarted: taskState.geographyStarted,
        geographyDone: taskState.geographyDone,
        infrastructureReady,
        infrastructureDone: taskState.infrastructureDone,
        selectionDisabled: false
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceActivityConfirmButton: ButtonHandler = {
  key: 'companyFinance:activityConfirm',

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

    const selection = getCompanyActivitySelection(interaction.guildId, userId);
    if (!selection) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала выберите страну взаимодействия.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const taskState = getCompanyActivityTaskState(interaction.guildId, userId);
    if (!taskState.geographyDone || !taskState.infrastructureDone) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала завершите все задания взаимодействия.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const selectedCountryLookup = findCountryByKey(selection.countryKey);
    if (!selectedCountryLookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Выбранная страна не найдена.'),
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

      if (company.countryKey === selection.countryKey) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Компания уже ведет деятельность в этой стране.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const result = await addCompanyActivityCountry({
        guildId: interaction.guildId,
        company,
        country: selectedCountryLookup.country,
        continentId: selection.continentId
      });

      if (result.status === 'alreadyExists') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Компания уже ведет деятельность в этой стране.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const profile = await getCountryProfile(interaction.guildId, selectedCountryLookup.country);
      const selectedCountryLabel = `${resolveEmojiIdentifier(
        selectedCountryLookup.country.emoji,
        formatEmoji
      )} | ${selectedCountryLookup.country.name}`;

      clearCompanyActivitySelection(interaction.guildId, userId);
      clearCompanyActivityTasks(interaction.guildId, userId);

      const view = await buildCompanyActivityConfirmationView({
        guild: interaction.guild,
        selectedCountryLabel,
        foreignTaxRate: profile.foreignCompanyTaxRate
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось подтвердить расширение. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileOpenButton: ButtonHandler = {
  key: 'companyFinance:redomicileOpen',

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

      const selection = getRedomiciliationSelection(interaction.guildId, userId);
      const { selectedCountryLabel, selectedTaxRateLabel } = await resolveRedomiciliationSelectionLabels({
        guildId: interaction.guildId,
        formatEmoji,
        selection
      });

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
        confirmDisabled: !selection
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть редомициляцию. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileBackButton: ButtonHandler = {
  key: 'companyFinance:redomicileBack',

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
      await renderCompanyActivityView({
        interaction,
        formatEmoji,
        userId,
        page: 1
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileEditButton: ButtonHandler = {
  key: 'companyFinance:redomicileEdit',

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
      .setCustomId(buildCustomId('companyFinance', 'redomicileEditModal', userId))
      .setTitle('Редомициляция');

    const input = new TextInputBuilder()
      .setCustomId('redomicile-country')
      .setLabel('Страна переезда')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};

export const companyFinanceRedomicileJurisdictionStartButton: ButtonHandler = {
  key: 'companyFinance:redomicileJurisdictionStart',

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
      markRedomiciliationTaskStarted(interaction.guildId, userId, 'jurisdiction');
      const view = await buildRedomiciliationJurisdictionActionView({
        guild: interaction.guild,
        user: interaction.user
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileJurisdictionDoneButton: ButtonHandler = {
  key: 'companyFinance:redomicileJurisdictionDone',

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
      markRedomiciliationTaskDone(interaction.guildId, userId, 'jurisdiction');
      const company = await getUserActiveCompany(interaction.guildId, userId);
      if (!company) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const selection = getRedomiciliationSelection(interaction.guildId, userId);
      const { selectedCountryLabel, selectedTaxRateLabel } = await resolveRedomiciliationSelectionLabels({
        guildId: interaction.guildId,
        formatEmoji,
        selection
      });
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
        confirmDisabled: !selection
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileInfrastructureStartButton: ButtonHandler = {
  key: 'companyFinance:redomicileInfrastructureStart',

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

      markRedomiciliationTaskStarted(interaction.guildId, userId, 'infrastructure');
      const infrastructureContent = getRedomiciliationInfrastructureContent(company.industryKey);
      const infrastructureState = getRedomiciliationInfrastructureState(interaction.guildId, userId);
      const infrastructurePrices = Object.fromEntries(
        infrastructureContent.items.map((item) => [
          item.key,
          getRedomiciliationInfrastructurePrice(
            company.industryKey,
            item.key as RedomiciliationInfrastructureItemKey
          ) ?? 0n
        ])
      );
      const view = await buildRedomiciliationInfrastructureActionView({
        guild: interaction.guild,
        user: interaction.user,
        infrastructureTitle: infrastructureContent.title,
        actionHeader: infrastructureContent.actionHeader,
        items: infrastructureContent.items,
        completedItems: infrastructureState,
        prices: infrastructurePrices
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileInfrastructureBuildButton: ButtonHandler = {
  key: 'companyFinance:redomicileInfrastructureBuild',

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

    const itemKey = ctx.customId.args[0];
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId) {
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

      const infrastructureContent = getRedomiciliationInfrastructureContent(company.industryKey);
      const item = infrastructureContent.items.find((entry) => entry.key === itemKey);
      if (!item) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const infrastructurePrices = Object.fromEntries(
        infrastructureContent.items.map((entry) => [
          entry.key,
          getRedomiciliationInfrastructurePrice(
            company.industryKey,
            entry.key as RedomiciliationInfrastructureItemKey
          ) ?? 0n
        ])
      );
      const infrastructureState = getRedomiciliationInfrastructureState(interaction.guildId, userId);

      if (infrastructureState.has(item.key)) {
        const view = await buildRedomiciliationInfrastructureActionView({
          guild: interaction.guild,
          user: interaction.user,
          infrastructureTitle: infrastructureContent.title,
          actionHeader: infrastructureContent.actionHeader,
          items: infrastructureContent.items,
          completedItems: infrastructureState,
          prices: infrastructurePrices
        });
        await interaction.editReply({ components: view });
        return;
      }

      const result = await purchaseRedomiciliationInfrastructure(interaction.guildId, userId, item.key);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const isEquipmentPurchase = item.key === 'mainEquipment' || item.key === 'supportEquipment';

      if (result.status === 'insufficientFunds') {
        const view = await buildRedomiciliationPurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для ${
            isEquipmentPurchase ? 'закупки техники' : 'строительства инфраструктуры'
          }!**`,
          price: result.price,
          backTarget: 'infrastructure'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const updatedState = markRedomiciliationInfrastructureItemDone(interaction.guildId, userId, item.key);
      const infrastructureCompleted = infrastructureContent.items.every((entry) => updatedState.has(entry.key));
      if (infrastructureCompleted) {
        markRedomiciliationTaskDone(interaction.guildId, userId, 'infrastructure');
      }

      const view = await buildRedomiciliationPurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно ${
          isEquipmentPurchase ? 'приобрели' : 'построили'
        } __${item.label}__.**`,
        price: result.price,
        backTarget: 'infrastructure'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileInfrastructureDoneButton: ButtonHandler = {
  key: 'companyFinance:redomicileInfrastructureDone',

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

      const infrastructureContent = getRedomiciliationInfrastructureContent(company.industryKey);
      const infrastructureState = getRedomiciliationInfrastructureState(interaction.guildId, userId);
      const infrastructureCompleted = infrastructureContent.items.every((item) => infrastructureState.has(item.key));
      if (!infrastructureCompleted) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Сначала завершите строительство инфраструктуры.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      markRedomiciliationTaskDone(interaction.guildId, userId, 'infrastructure');
      const selection = getRedomiciliationSelection(interaction.guildId, userId);
      const { selectedCountryLabel, selectedTaxRateLabel } = await resolveRedomiciliationSelectionLabels({
        guildId: interaction.guildId,
        formatEmoji,
        selection
      });
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
        confirmDisabled: !selection
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileInteractionOpenButton: ButtonHandler = {
  key: 'companyFinance:redomicileInteractionOpen',

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
      const selection = getRedomiciliationSelection(interaction.guildId, userId);
      const { selectedCountryLabel } = await resolveRedomiciliationSelectionLabels({
        guildId: interaction.guildId,
        formatEmoji,
        selection
      });

      const view = await buildRedomiciliationInteractionView({
        guild: interaction.guild,
        user: interaction.user,
        selectedCountryLabel
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть взаимодействие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceRedomicileConfirmButton: ButtonHandler = {
  key: 'companyFinance:redomicileConfirm',

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

    const selection = getRedomiciliationSelection(interaction.guildId, userId);
    if (!selection) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Сначала выберите страну переезда.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const selectedCountryLookup = findCountryByKey(selection.countryName);
    if (!selectedCountryLookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Выбранная страна не найдена.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const result = await redomiciliateCompany({
        guildId: interaction.guildId,
        userId,
        country: selectedCountryLookup.country,
        continentId: selection.continentId
      });

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'sameCountry') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Компания уже зарегистрирована в этой стране.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'tasksIncomplete') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Сначала завершите все обязательные задания компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'insufficientFunds') {
        await interaction.followUp({
          components: buildWarningView(
            formatEmoji,
            `Недостаточно средств для редомициляции. Нужно: ${result.price.toLocaleString('ru-RU')} ${formatEmoji('stackmoney')}.`
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'countryLimit') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'В выбранной стране уже достигнут лимит компаний.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      clearRedomiciliationSelection(interaction.guildId, userId);
      clearRedomiciliationTasks(interaction.guildId, userId);

      await renderCompanyActivityView({
        interaction,
        formatEmoji,
        userId,
        page: 1
      });

      await interaction.followUp({
        components: buildSuccessView(formatEmoji, 'Страна регистрации компании обновлена.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить редомициляцию. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinancePaymentSystemBackButton: ButtonHandler = {
  key: 'companyFinance:paymentSystemBack',

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

    const target = ctx.customId.args[0];
    const userId = ctx.customId.args[1];
    if (!target || !userId) {
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

      if (target === 'profile') {
        const view = await buildCompanyProfileView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'finance') {
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
        return;
      }

      if (target === 'infrastructure') {
        const view = await buildPaymentSystemInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'web') {
        const view = await buildPaymentSystemWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Неизвестное действие.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinancePaymentSystemLegalStartButton: ButtonHandler = {
  key: 'companyFinance:paymentSystemLegalStart',

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
      const updated = await markPaymentSystemLegalNewsStarted(interaction.guildId, userId);
      if (!updated) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildPaymentSystemLegalNewsActionView({
        guild: interaction.guild,
        user: interaction.user
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinancePaymentSystemLegalDoneButton: ButtonHandler = {
  key: 'companyFinance:paymentSystemLegalDone',

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
      const updatedCompany = await markPaymentSystemLegalNewsDone(interaction.guildId, userId);
      if (!updatedCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(updatedCompany.countryName);
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
        company: updatedCompany,
        countryProfile: profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить статус. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinancePaymentSystemInfrastructureOpenButton: ButtonHandler = {
  key: 'companyFinance:paymentSystemInfrastructureOpen',

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

      const view = await buildPaymentSystemInfrastructureView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinancePaymentSystemInfrastructureBuildButton: ButtonHandler = {
  key: 'companyFinance:paymentSystemInfrastructureBuild',

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

    const itemKey = ctx.customId.args[0] as PaymentSystemInfrastructureKey | undefined;
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId || !['mainOffice', 'serverInfrastructure'].includes(itemKey)) {
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
      const result = await buildPaymentSystemInfrastructure(interaction.guildId, userId, itemKey);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildPaymentSystemInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      const nameLabel =
        itemKey === 'mainOffice' ? 'Главный офис компании' : 'Серверная инфраструктура';

      if (result.status === 'insufficientFunds') {
        const view = await buildPaymentSystemPurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для строительства!**`,
          price: result.price,
          backTarget: 'infrastructure'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildPaymentSystemPurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно построили __${nameLabel}__.**`,
        price: result.price,
        backTarget: 'infrastructure'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить строительство. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinancePaymentSystemWebOpenButton: ButtonHandler = {
  key: 'companyFinance:paymentSystemWebOpen',

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

      const view = await buildPaymentSystemWebDevelopmentView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinancePaymentSystemWebOrderButton: ButtonHandler = {
  key: 'companyFinance:paymentSystemWebOrder',

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
      const result = await orderPaymentSystemWebDevelopment(interaction.guildId, userId);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildPaymentSystemWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (result.status === 'insufficientFunds') {
        const view = await buildPaymentSystemPurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для заказа WEB разработки!**`,
          price: result.price,
          backTarget: 'web'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildPaymentSystemPurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно заказали WEB разработку.**`,
        price: result.price,
        backTarget: 'web'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось оформить заказ. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceInvestmentExchangeBackButton: ButtonHandler = {
  key: 'companyFinance:investmentExchangeBack',

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

    const target = ctx.customId.args[0];
    const userId = ctx.customId.args[1];
    if (!target || !userId) {
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

      if (target === 'profile') {
        const view = await buildCompanyProfileView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'finance') {
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
        return;
      }

      if (target === 'infrastructure') {
        const view = await buildInvestmentExchangeInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'web') {
        const view = await buildInvestmentExchangeWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Неизвестное действие.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceInvestmentExchangeLegalStartButton: ButtonHandler = {
  key: 'companyFinance:investmentExchangeLegalStart',

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
      const updated = await markInvestmentExchangeLegalNewsStarted(interaction.guildId, userId);
      if (!updated) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildInvestmentExchangeLegalNewsActionView({
        guild: interaction.guild,
        user: interaction.user
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceInvestmentExchangeLegalDoneButton: ButtonHandler = {
  key: 'companyFinance:investmentExchangeLegalDone',

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
      const updatedCompany = await markInvestmentExchangeLegalNewsDone(interaction.guildId, userId);
      if (!updatedCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(updatedCompany.countryName);
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
        company: updatedCompany,
        countryProfile: profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить статус. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceInvestmentExchangeInfrastructureOpenButton: ButtonHandler = {
  key: 'companyFinance:investmentExchangeInfrastructureOpen',

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

      const view = await buildInvestmentExchangeInfrastructureView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceInvestmentExchangeInfrastructureBuildButton: ButtonHandler = {
  key: 'companyFinance:investmentExchangeInfrastructureBuild',

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

    const itemKey = ctx.customId.args[0] as InvestmentExchangeInfrastructureKey | undefined;
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId || !['mainOffice', 'serverInfrastructure'].includes(itemKey)) {
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
      const result = await buildInvestmentExchangeInfrastructure(interaction.guildId, userId, itemKey);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildInvestmentExchangeInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      const nameLabel =
        itemKey === 'mainOffice' ? 'Главный офис компании' : 'Серверная инфраструктура';

      if (result.status === 'insufficientFunds') {
        const view = await buildInvestmentExchangePurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для строительства!**`,
          price: result.price,
          backTarget: 'infrastructure'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildInvestmentExchangePurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно построили __${nameLabel}__.**`,
        price: result.price,
        backTarget: 'infrastructure'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить строительство. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceInvestmentExchangeWebOpenButton: ButtonHandler = {
  key: 'companyFinance:investmentExchangeWebOpen',

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

      const view = await buildInvestmentExchangeWebDevelopmentView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceInvestmentExchangeWebOrderButton: ButtonHandler = {
  key: 'companyFinance:investmentExchangeWebOrder',

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
      const result = await orderInvestmentExchangeWebDevelopment(interaction.guildId, userId);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildInvestmentExchangeWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (result.status === 'insufficientFunds') {
        const view = await buildInvestmentExchangePurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для заказа разработки WEB платформы!**`,
          price: result.price,
          backTarget: 'web'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildInvestmentExchangePurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно заказали разработку собственной WEB платформы!**`,
        price: result.price,
        backTarget: 'web'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось оформить заказ. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceCryptoExchangeBackButton: ButtonHandler = {
  key: 'companyFinance:cryptoExchangeBack',

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

    const target = ctx.customId.args[0];
    const userId = ctx.customId.args[1];
    if (!target || !userId) {
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

      if (target === 'profile') {
        const view = await buildCompanyProfileView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'finance') {
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
        return;
      }

      if (target === 'infrastructure') {
        const view = await buildCryptoExchangeInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'web') {
        const view = await buildCryptoExchangeWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Неизвестное действие.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceCryptoExchangeLegalStartButton: ButtonHandler = {
  key: 'companyFinance:cryptoExchangeLegalStart',

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
      const updated = await markCryptoExchangeLegalNewsStarted(interaction.guildId, userId);
      if (!updated) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildCryptoExchangeLegalNewsActionView({
        guild: interaction.guild,
        user: interaction.user
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceCryptoExchangeLegalDoneButton: ButtonHandler = {
  key: 'companyFinance:cryptoExchangeLegalDone',

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
      const updatedCompany = await markCryptoExchangeLegalNewsDone(interaction.guildId, userId);
      if (!updatedCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(updatedCompany.countryName);
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
        company: updatedCompany,
        countryProfile: profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить статус. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceCryptoExchangeInfrastructureOpenButton: ButtonHandler = {
  key: 'companyFinance:cryptoExchangeInfrastructureOpen',

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

      const view = await buildCryptoExchangeInfrastructureView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceCryptoExchangeInfrastructureBuildButton: ButtonHandler = {
  key: 'companyFinance:crypto_exchange_infra_build',

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

    const itemKey = ctx.customId.args[0] as CryptoExchangeInfrastructureKey | undefined;
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId || !['mainOffice', 'serverInfrastructure'].includes(itemKey)) {
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
      const result = await buildCryptoExchangeInfrastructure(interaction.guildId, userId, itemKey);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildCryptoExchangeInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      const nameLabel =
        itemKey === 'mainOffice' ? 'Главный офис компании' : 'Серверная инфраструктура';

      if (result.status === 'insufficientFunds') {
        const view = await buildCryptoExchangePurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для строительства!**`,
          price: result.price,
          backTarget: 'infrastructure'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildCryptoExchangePurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно построили __${nameLabel}__.**`,
        price: result.price,
        backTarget: 'infrastructure'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить строительство. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceCryptoExchangeWebOpenButton: ButtonHandler = {
  key: 'companyFinance:cryptoExchangeWebOpen',

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

      const view = await buildCryptoExchangeWebDevelopmentView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceCryptoExchangeWebOrderButton: ButtonHandler = {
  key: 'companyFinance:cryptoExchangeWebOrder',

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
      const result = await orderCryptoExchangeWebDevelopment(interaction.guildId, userId);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildCryptoExchangeWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (result.status === 'insufficientFunds') {
        const view = await buildCryptoExchangePurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для заказа разработки WEB платформы!**`,
          price: result.price,
          backTarget: 'web'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildCryptoExchangePurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно заказали разработку собственной WEB платформы!**`,
        price: result.price,
        backTarget: 'web'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось оформить заказ. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceConstructionBackButton: ButtonHandler = {
  key: 'companyFinance:constructionBack',

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

    const target = ctx.customId.args[0];
    const userId = ctx.customId.args[1];
    if (!target || !userId) {
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

      if (target === 'profile') {
        const view = await buildCompanyProfileView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'finance') {
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
        return;
      }

      if (target === 'equipment') {
        const view = await buildConstructionEquipmentView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'web') {
        const view = await buildConstructionWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Неизвестное действие.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceConstructionLegalStartButton: ButtonHandler = {
  key: 'companyFinance:constructionLegalStart',

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
      const updated = await markConstructionLegalNewsStarted(interaction.guildId, userId);
      if (!updated) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildConstructionLegalNewsActionView({
        guild: interaction.guild,
        user: interaction.user
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceConstructionLegalDoneButton: ButtonHandler = {
  key: 'companyFinance:constructionLegalDone',

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
      const updatedCompany = await markConstructionLegalNewsDone(interaction.guildId, userId);
      if (!updatedCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(updatedCompany.countryName);
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
        company: updatedCompany,
        countryProfile: profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить статус. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceConstructionEquipmentOpenButton: ButtonHandler = {
  key: 'companyFinance:constructionEquipmentOpen',

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

      const view = await buildConstructionEquipmentView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceConstructionEquipmentBuyButton: ButtonHandler = {
  key: 'companyFinance:constructionEquipmentBuy',

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

    const itemKey = ctx.customId.args[0] as ConstructionEquipmentKey | undefined;
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId || !['mainEquipment', 'supportEquipment'].includes(itemKey)) {
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
      const result = await purchaseConstructionEquipment(interaction.guildId, userId, itemKey);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildConstructionEquipmentView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      const nameLabel = itemKey === 'mainEquipment' ? 'Основная техника' : 'Вспомогательная техника';

      if (result.status === 'insufficientFunds') {
        const view = await buildConstructionPurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для закупки строительной техники!**`,
          price: result.price,
          backTarget: 'equipment'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildConstructionPurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно приобрели __${nameLabel}__.**`,
        price: result.price,
        backTarget: 'equipment'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceConstructionWebOpenButton: ButtonHandler = {
  key: 'companyFinance:constructionWebOpen',

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

      const view = await buildConstructionWebDevelopmentView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceConstructionWebOrderButton: ButtonHandler = {
  key: 'companyFinance:constructionWebOrder',

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
      const result = await orderConstructionWebDevelopment(interaction.guildId, userId);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildConstructionWebDevelopmentView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (result.status === 'insufficientFunds') {
        const view = await buildConstructionPurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для заказа разработки WEB сайта!**`,
          price: result.price,
          backTarget: 'web'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildConstructionPurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно заказали разработку собственного WEB сайта!**`,
        price: result.price,
        backTarget: 'web'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceManufacturingBackButton: ButtonHandler = {
  key: 'companyFinance:manufacturingBack',

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

    const target = ctx.customId.args[0];
    const userId = ctx.customId.args[1];
    if (!target || !userId) {
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

      if (target === 'profile') {
        const view = await buildCompanyProfileView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'finance') {
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
        return;
      }

      if (target === 'infrastructure') {
        const view = await buildManufacturingInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      if (target === 'equipment') {
        const view = await buildManufacturingEquipmentView({
          guild: interaction.guild,
          user: interaction.user,
          company
        });
        await interaction.editReply({ components: view });
        return;
      }

      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Неизвестное действие.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceManufacturingLegalStartButton: ButtonHandler = {
  key: 'companyFinance:manufacturingLegalStart',

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
      const updated = await markManufacturingLegalNewsStarted(interaction.guildId, userId);
      if (!updated) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildManufacturingLegalNewsActionView({
        guild: interaction.guild,
        user: interaction.user
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceManufacturingLegalDoneButton: ButtonHandler = {
  key: 'companyFinance:manufacturingLegalDone',

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
      const updatedCompany = await markManufacturingLegalNewsDone(interaction.guildId, userId);
      if (!updatedCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить статус действия.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const countryLookup = findCountryByKey(updatedCompany.countryName);
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
        company: updatedCompany,
        countryProfile: profile
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось обновить статус. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceManufacturingInfrastructureOpenButton: ButtonHandler = {
  key: 'companyFinance:manufacturingInfrastructureOpen',

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

      const view = await buildManufacturingInfrastructureView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceManufacturingInfrastructureBuildButton: ButtonHandler = {
  key: 'companyFinance:manufacturingInfrastructureBuild',

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

    const itemKey = ctx.customId.args[0] as ManufacturingInfrastructureKey | undefined;
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId || !['mainOffice', 'productionInfrastructure'].includes(itemKey)) {
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
      const result = await buildManufacturingInfrastructure(interaction.guildId, userId, itemKey);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildManufacturingInfrastructureView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      const nameLabel =
        itemKey === 'mainOffice' ? 'Главный офис компании' : 'Производственная инфраструктура';

      if (result.status === 'insufficientFunds') {
        const view = await buildManufacturingPurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для строительства!**`,
          price: result.price,
          backTarget: 'infrastructure'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildManufacturingPurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно построили __${nameLabel}__.**`,
        price: result.price,
        backTarget: 'infrastructure'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceManufacturingEquipmentOpenButton: ButtonHandler = {
  key: 'companyFinance:manufacturingEquipmentOpen',

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

      const view = await buildManufacturingEquipmentView({
        guild: interaction.guild,
        user: interaction.user,
        company
      });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось открыть раздел. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyFinanceManufacturingEquipmentBuyButton: ButtonHandler = {
  key: 'companyFinance:manufacturingEquipmentBuy',

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

    const itemKey = ctx.customId.args[0] as ManufacturingEquipmentKey | undefined;
    const userId = ctx.customId.args[1];
    if (!itemKey || !userId || !['mainEquipment', 'supportEquipment'].includes(itemKey)) {
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
      const result = await purchaseManufacturingEquipment(interaction.guildId, userId, itemKey);

      if (result.status === 'notFound') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован как владелец компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'notAllowed') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта функция недоступна для компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'alreadyCompleted') {
        const view = await buildManufacturingEquipmentView({
          guild: interaction.guild,
          user: interaction.user,
          company: result.company
        });
        await interaction.editReply({ components: view });
        return;
      }

      const nameLabel = itemKey === 'mainEquipment' ? 'Основное оборудование' : 'Вспомогательное оборудование';

      if (result.status === 'insufficientFunds') {
        const view = await buildManufacturingPurchaseResultView({
          guild: interaction.guild,
          user: interaction.user,
          title: `**${formatEmoji('staff_warn')} У вашей компании недостаточно средств для закупки производственного оборудования!**`,
          price: result.price,
          backTarget: 'equipment'
        });
        await interaction.editReply({ components: view });
        return;
      }

      const view = await buildManufacturingPurchaseResultView({
        guild: interaction.guild,
        user: interaction.user,
        title: `**${formatEmoji('slide_d')} Вы успешно приобрели __${nameLabel}__.**`,
        price: result.price,
        backTarget: 'equipment'
      });
      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось выполнить действие. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
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

async function renderCompanyActivityView(options: {
  interaction: Parameters<ButtonHandler['execute']>[0];
  formatEmoji: (name: string) => string;
  userId: string;
  page: number;
}): Promise<void> {
  const { interaction, formatEmoji, userId, page } = options;

  if (!interaction.guildId || !interaction.guild) {
    await interaction.followUp({
      components: buildWarningView(formatEmoji, 'Интерфейс доступен только внутри сервера.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
  }

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
  const registrationLabel = `${resolveEmojiIdentifier(countryLookup.country.emoji, formatEmoji)} | ${countryLookup.country.name}`;

  const { entries, totalPages, page: resolvedPage } = await resolveCompanyActivityEntries({
    guildId: interaction.guildId,
    company,
    formatEmoji,
    page,
    registrationCountry: countryLookup.country,
    registrationProfile: profile
  });

  const view = await buildCompanyActivityView({
    guild: interaction.guild,
    user: interaction.user,
    registrationLabel,
    registrationTaxRate: profile.residentCompanyTaxRate,
    registrationDate: company.registeredAt,
    entries,
    page: resolvedPage,
    totalPages
  });

  await interaction.editReply({ components: view });
}

async function renderForeignCompaniesView(options: {
  interaction: Parameters<ButtonHandler['execute']>[0];
  formatEmoji: (name: string) => string;
  userId: string;
  page: number;
}): Promise<void> {
  const { interaction, formatEmoji, userId, page } = options;

  if (!interaction.guildId || !interaction.guild) {
    await interaction.followUp({
      components: buildWarningView(formatEmoji, 'Интерфейс доступен только внутри сервера.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
  }

  const registration = await getUserRegistration(interaction.guildId, userId);
  if (!registration) {
    await interaction.followUp({
      components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован за страной.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
  }

  const foreignCompanies = await getForeignCompanyActivitiesInCountry(interaction.guildId, registration.countryKey);

  const entries = foreignCompanies.map((entry) => {
    const company = entry.company;
    const registrationLookup = company ? findCountryByKey(company.countryKey) : null;
    const registrationCountry = registrationLookup?.country ?? null;
    const registrationLabel = registrationLookup
      ? `${resolveEmojiIdentifier(registrationLookup.country.emoji, formatEmoji)} | ${registrationLookup.country.name}`
      : company?.countryName ?? entry.activity.countryName;

    const name = company
      ? buildCompanyDisplayName({
          country: registrationCountry,
          industryKey: company.industryKey,
          name: company.name
        })
      : entry.activity.companyName;
    const ownerLabel = company?.ownerId ? `<@${company.ownerId.toString()}>` : 'Отсутствует';
    const industryLabel = company?.industryLabel ?? entry.activity.companyIndustryLabel;

    return {
      name,
      ownerLabel,
      registrationLabel,
      industryLabel,
      startedAt: entry.activity.startedAt
    };
  });

  const totalPages = Math.max(1, Math.ceil(entries.length / 5));
  const resolvedPage = Math.min(totalPages, Math.max(1, Math.trunc(page)));
  const start = (resolvedPage - 1) * 5;
  const pagedEntries = entries.slice(start, start + 5);

  const view = await buildForeignCompaniesView({
    guild: interaction.guild,
    user: interaction.user,
    entries: pagedEntries,
    page: resolvedPage,
    totalPages
  });

  await interaction.editReply({ components: view });
}

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

    await renderCompanyActivityView({
      interaction,
      formatEmoji,
      userId,
      page: page + direction
    });
  } catch (error) {
    logger.error(error);
    await interaction.followUp({
      components: buildWarningView(formatEmoji, 'Не удалось загрузить страницу. Попробуйте позже.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
}

async function handleForeignCompaniesPagination(
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
    await renderForeignCompaniesView({
      interaction,
      formatEmoji,
      userId,
      page: page + direction
    });
  } catch (error) {
    logger.error(error);
    await interaction.followUp({
      components: buildWarningView(formatEmoji, 'Не удалось загрузить страницу. Попробуйте позже.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
}

async function resolveCompanyActivityEntries(options: {
  guildId: string;
  company: Awaited<ReturnType<typeof getUserActiveCompany>>;
  formatEmoji: (name: string) => string;
  page: number;
  registrationCountry?: Country | null;
  registrationProfile?: Awaited<ReturnType<typeof getCountryProfile>>;
}): Promise<{
  entries: Array<{ countryLabel: string; registeredUserId?: string; taxRate: number; startedAt: Date }>;
  page: number;
  totalPages: number;
}> {
  const { guildId, company, formatEmoji, page: requestedPage, registrationCountry, registrationProfile } = options;

  if (!company) {
    return { entries: [], page: 1, totalPages: 1 };
  }

  const entries: Array<{ countryLabel: string; registeredUserId?: string; taxRate: number; startedAt: Date }> = [];
  const resolvedCountry = registrationCountry ?? findCountryByKey(company.countryName)?.country ?? null;
  if (resolvedCountry) {
    const profile = registrationProfile ?? (await getCountryProfile(guildId, resolvedCountry));
    const countryLabel = `${resolveEmojiIdentifier(resolvedCountry.emoji, formatEmoji)} | ${resolvedCountry.name}`;
    const registeredUserId = profile.registeredUserId ? profile.registeredUserId.toString() : undefined;

    entries.push({
      countryLabel,
      registeredUserId,
      taxRate: profile.foreignCompanyTaxRate,
      startedAt: company.registeredAt
    });
  }

  const activityCountries = await getCompanyActivityCountries(guildId, company.id);
  const activityEntries = await Promise.all(
    activityCountries
      .filter((record) => record.countryKey !== company.countryKey)
      .map(async (record) => {
        const lookup = findCountryByKey(record.countryKey);
        const country = lookup?.country;
        const labelEmoji = country ? resolveEmojiIdentifier(country.emoji, formatEmoji) : '🏳️';
        const labelName = country?.name ?? record.countryName;
        const countryLabel = `${labelEmoji} | ${labelName}`;
        const profile = country ? await getCountryProfile(guildId, country) : null;

        return {
          countryLabel,
          registeredUserId: profile?.registeredUserId ? profile.registeredUserId.toString() : undefined,
          taxRate: profile?.foreignCompanyTaxRate ?? 0,
          startedAt: record.startedAt
        };
      })
  );

  entries.push(...activityEntries);

  const totalPages = Math.max(1, Math.ceil(entries.length / 5));
  const page = Math.min(totalPages, Math.max(1, Math.trunc(requestedPage)));
  const start = (page - 1) * 5;
  const pagedEntries = entries.slice(start, start + 5);

  return { entries: pagedEntries, page, totalPages };
}