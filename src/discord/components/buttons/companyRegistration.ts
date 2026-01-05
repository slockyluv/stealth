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
import { buildWarningView, buildSuccessView } from '../../responses/messageBuilders.js';
import {
  buildCompanyIndustrySelectionView,
  buildCompanyCountrySelectionView
} from '../../features/registration/privateCompanySelectionView.js';
import { buildPrivateCompanyEntryView } from '../../features/registration/privateCompanyEntryView.js';
import { buildExistingCompanySelectionView } from '../../features/registration/privateCompanyExistingView.js';
import { buildPrivateCompanyRegistrationView } from '../../features/registration/privateCompanyRegistrationView.js';
import {
  findIndustryByKey,
  getCompanyDraft,
  clearCompanyDraft,
  getUserActiveCompany,
  isCompanyNameTakenError,
  isCountryLimitError,
  registerPrivateCompany
} from '../../../services/privateCompanyService.js';
import { findCountryByKey, getUserRegistration } from '../../../services/countryRegistrationService.js';
import { formatNicknameUpdateNotice, updateCompanyNickname } from '../../nickname.js';
import { logger } from '../../../shared/logger.js';
import type { ContinentId } from '../../features/settings/countriesView.js';

export const companyEntryNewButton: ButtonHandler = {
  key: 'companyReg:entryNew',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const existingCompany = await getUserActiveCompany(interaction.guildId, interaction.user.id);
      if (existingCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Вы уже зарегистрированы!'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const existingRegistration = await getUserRegistration(interaction.guildId, interaction.user.id);
      if (existingRegistration) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Вы уже зарегистрированы!'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      await clearCompanyDraft(interaction.guildId, interaction.user.id);

      const view = await buildPrivateCompanyRegistrationView({
        guild: interaction.guild,
        userId: interaction.user.id
      });
      await interaction.editReply({
        components: view.components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось открыть регистрацию компании. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось открыть регистрацию компании. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

export const companyEntryExistingButton: ButtonHandler = {
  key: 'companyReg:entryExisting',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const existingCompany = await getUserActiveCompany(interaction.guildId, interaction.user.id);
      if (existingCompany) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Вы уже зарегистрированы!'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const existingRegistration = await getUserRegistration(interaction.guildId, interaction.user.id);
      if (existingRegistration) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Вы уже зарегистрированы!'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildExistingCompanySelectionView({
        guild: interaction.guild,
        page: 1
      });
      await interaction.editReply({
        components: view.components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось открыть список компаний. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось открыть список компаний. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

async function getFormatEmoji(interaction: Parameters<ButtonHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const companyEditNameButton: ButtonHandler = {
  key: 'companyReg:editName',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('companyReg', 'nameModal', interaction.message.id))
      .setTitle('Название компании');

    const input = new TextInputBuilder()
      .setCustomId('company-name')
      .setLabel('Название частной компании')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};

export const companyEditIndustryButton: ButtonHandler = {
  key: 'companyReg:editIndustry',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const view = await buildCompanyIndustrySelectionView({
        guild: interaction.guild,
        messageId: interaction.message.id
      });
      await interaction.editReply({
        components: view.components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось открыть список отраслей. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось открыть список отраслей. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

export const companyEditCountryButton: ButtonHandler = {
  key: 'companyReg:editCountry',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const view = await buildCompanyCountrySelectionView({
        guild: interaction.guild,
        messageId: interaction.message.id
      });
      await interaction.editReply({
        components: view.components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось открыть список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось открыть список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

export const companyCreateButton: ButtonHandler = {
  key: 'companyReg:create',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const draft = await getCompanyDraft(interaction.guildId, interaction.user.id);
      const industry = findIndustryByKey(draft?.industryKey);
      const countryLookup = draft?.countryKey ? findCountryByKey(draft.countryKey) : null;

      const result = await registerPrivateCompany({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        name: draft?.name ?? null,
        industryKey: industry?.key ?? null,
        industryLabel: industry?.label ?? null,
        country: countryLookup?.country ?? null,
        continentId: countryLookup?.continentId ?? draft?.continent ?? null
      });

      if (result.status === 'countryRegistered') {
        await interaction.followUp({
          components: buildWarningView(
            formatEmoji,
            `Вы уже зарегистрированы!`
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'companyRegistered') {
        await interaction.followUp({
          components: buildWarningView(
            formatEmoji,
            `Вы уже зарегистрировали компанию!`
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      if (result.status === 'missingData') {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Заполните все поля перед созданием компании.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = await buildPrivateCompanyRegistrationView({
        guild: interaction.guild,
        userId: interaction.user.id
      });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });

      let nicknameNotice = '';
      const countryInfo = findCountryByKey(result.company.countryName);
      if (countryInfo?.country) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        const nicknameResult = await updateCompanyNickname({
          member,
          country: countryInfo.country,
          industryKey: result.company.industryKey,
          companyName: result.company.name
        });
        nicknameNotice = formatNicknameUpdateNotice(formatEmoji, nicknameResult);
      }

      await interaction.followUp({
        components: buildSuccessView(
          formatEmoji,
          `Компания __${result.company.name}__ успешно зарегистрирована.${nicknameNotice}`
        ),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (isCompanyNameTakenError(error)) {
        await interaction.followUp({
          components: buildWarningView(
            formatEmoji,
            'Компания с таким названием уже зарегистрирована. Выберите другое название.'
          ),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }
      if (isCountryLimitError(error)) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Эта страна уже занята. Выберите другую.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось зарегистрировать компанию. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const companyCountryBackButton: ButtonHandler = {
  key: 'companyReg:back',

  async execute(interaction, ctx) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [messageId] = ctx.customId.args;
    if (!messageId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const view = await buildCompanyCountrySelectionView({
        guild: interaction.guild,
        messageId
      });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

export const companyCountryPageButton: ButtonHandler = {
  key: 'companyReg:page',

  async execute(interaction, ctx) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [messageId, continentId, pageRaw] = ctx.customId.args;
    if (!messageId || !continentId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const page = Number.parseInt(pageRaw ?? '1', 10);

    try {
      await interaction.deferUpdate();
      const view = await buildCompanyCountrySelectionView({
        guild: interaction.guild,
        messageId,
        selectedContinentId: continentId as ContinentId,
        page: Number.isFinite(page) ? page : 1
      });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список стран. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

export const companyExistingBackButton: ButtonHandler = {
  key: 'companyReg:existingBack',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferUpdate();
      const view = await buildPrivateCompanyEntryView({ guild: interaction.guild });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось вернуться назад. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};

export const companyExistingPageButton: ButtonHandler = {
  key: 'companyReg:existingPage',

  async execute(interaction, ctx) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [pageRaw] = ctx.customId.args;
    const page = Number.parseInt(pageRaw ?? '1', 10);

    try {
      await interaction.deferUpdate();
      const view = await buildExistingCompanySelectionView({
        guild: interaction.guild,
        page: Number.isFinite(page) ? page : 1
      });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список компаний. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Не удалось обновить список компаний. Попробуйте позже.'),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    }
  }
};