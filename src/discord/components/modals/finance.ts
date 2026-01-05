import { MessageFlags } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView, buildSuccessView } from '../../responses/messageBuilders.js';
import { getUserRegistration, findCountryByKey } from '../../../services/countryRegistrationService.js';
import { updateCountryCompanyTaxRates, updateCountryPopulationTaxRate } from '../../../services/countryProfileService.js';
import { buildGovernmentBudgetView } from '../../features/financeView.js';
import { logger } from '../../../shared/logger.js';

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