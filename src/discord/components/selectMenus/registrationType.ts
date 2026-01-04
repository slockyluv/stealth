import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildRegistrationView } from '../../features/registration/registrationView.js';
import { buildPrivateCompanyRegistrationView } from '../../features/registration/privateCompanyRegistrationView.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { createEmojiFormatter } from '../../emoji.js';
import { getUserRegistration } from '../../../services/countryRegistrationService.js';
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
        await interaction.deferUpdate();
        const view = await buildRegistrationView({ guild: interaction.guild });
        await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });

        const existingRegistration = await getUserRegistration(interaction.guildId, interaction.user.id);
        if (existingRegistration) {
          await interaction.followUp({
            components: buildWarningView(formatEmoji, `Вы уже зарегистрированы за **${existingRegistration.countryName}**.`),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          });
        }
      } catch (error) {
        logger.error(error);
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
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
        await interaction.deferUpdate();
        const view = await buildPrivateCompanyRegistrationView({
          guild: interaction.guild,
          userId: interaction.user.id
        });
        await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });
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