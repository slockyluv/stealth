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
  buildCompanyBranchesView,
  buildCompanyFinanceView,
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
  buildPaymentSystemInfrastructureView,
  buildPaymentSystemLegalNewsActionView,
  buildPaymentSystemPurchaseResultView,
  buildPaymentSystemWebDevelopmentView
} from '../../features/financeView.js';
import { buildCompanyProfileView } from '../../features/companyProfileView.js';
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
  key: 'companyFinance:cryptoExchangeInfrastructureBuild',

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