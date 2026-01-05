import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import { buildPrivateCompanyEntryView } from '../../features/registration/privateCompanyEntryView.js';
import { buildSuccessView, buildWarningView } from '../../responses/messageBuilders.js';
import { createEmojiFormatter } from '../../emoji.js';
import { getUserRegistration, unregisterCountryForUser } from '../../../services/countryRegistrationService.js';
import { getUserActiveCompany, unregisterCompanyForUser } from '../../../services/privateCompanyService.js';
import { formatNicknameResetNotice, resetCountryNickname } from '../../nickname.js';
import { logger } from '../../../shared/logger.js';

async function getFormatEmoji(interaction: Parameters<SelectMenuHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const registrationTypeSelect: SelectMenuHandler = {
  key: 'registration:type',

  async execute(interaction) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const selected = interaction.values[0];

    if (selected === 'state') {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const existingCompany = await getUserActiveCompany(interaction.guildId, interaction.user.id);
        if (existingCompany) {
          await interaction.editReply({
            components: buildWarningView(
              formatEmoji,
              `Вы уже зарегистрированы!`
            ),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return;
        }

        const existingRegistration = await getUserRegistration(interaction.guildId, interaction.user.id);
        if (existingRegistration) {
          await interaction.editReply({
            components: buildWarningView(formatEmoji, `Вы уже зарегистрированы!`),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return;
        }

        const view = await buildRegistrationView({ guild: interaction.guild });
        await interaction.editReply({
          components: view.components,
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error(error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            components: buildWarningView(formatEmoji, 'Не удалось открыть меню регистрации. Попробуйте позже.'),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
        } else {
          await interaction.reply({
            components: buildWarningView(formatEmoji, 'Не удалось открыть меню регистрации. Попробуйте позже.'),
            flags: MessageFlags.IsComponentsV2
          });
        }
      }
      return;
    }

    if (selected === 'company') {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const existingCompany = await getUserActiveCompany(interaction.guildId, interaction.user.id);
        if (existingCompany) {
          await interaction.editReply({
            components: buildWarningView(
              formatEmoji,
              `Вы уже зарегистрированы!`
            ),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return;
        }
        
        const existingRegistration = await getUserRegistration(interaction.guildId, interaction.user.id);
        if (existingRegistration) {
          await interaction.editReply({
            components: buildWarningView(formatEmoji, `Вы уже зарегистрированы!`),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return;
        }

        const view = await buildPrivateCompanyEntryView({
          guild: interaction.guild
        });
        await interaction.editReply({
          components: view.components,
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error(error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            components: buildWarningView(formatEmoji, 'Не удалось открыть регистрацию компании. Попробуйте позже.'),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
        } else {
          await interaction.reply({
            components: buildWarningView(formatEmoji, 'Не удалось открыть регистрацию компании. Попробуйте позже.'),
            flags: MessageFlags.IsComponentsV2
          });
        }
      }
      return;
    }

    if (selected === 'unreg') {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const [countryResult, companyResult] = await Promise.all([
          unregisterCountryForUser(interaction.guildId, interaction.user.id),
          unregisterCompanyForUser(interaction.guildId, interaction.user.id)
        ]);

        if (countryResult.status === 'notRegistered' && companyResult.status === 'notRegistered') {
          await interaction.editReply({
            components: buildWarningView(formatEmoji, 'Вы не зарегистрированы!'),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
          return;
        }

        let nicknameNotice = '';
        if (countryResult.status === 'unregistered') {
          const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
          const nicknameResult = await resetCountryNickname({ member });
          nicknameNotice = formatNicknameResetNotice(formatEmoji, nicknameResult);
        }

        const notices: string[] = [];
        if (countryResult.status === 'unregistered') {
          notices.push(
            `Вы сняты с регистрации страны __${countryResult.registration.countryName}__.${nicknameNotice}`
          );
        }
        if (companyResult.status === 'unregistered') {
          notices.push(`Вы сняты с компании __${companyResult.company.name}__.`);
        }

        await interaction.editReply({
          components: buildSuccessView(formatEmoji, notices.join('\n')),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error(error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            components: buildWarningView(formatEmoji, 'Не удалось снять регистрацию. Попробуйте позже.'),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
        } else {
          await interaction.reply({
            components: buildWarningView(formatEmoji, 'Не удалось снять регистрацию. Попробуйте позже.'),
            flags: MessageFlags.IsComponentsV2
          });
        }
      }
      return;
    }

    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Некорректный выбор.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
};