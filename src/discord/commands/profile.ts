import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import { getUserRegistration, findCountryByKey } from '../../services/countryRegistrationService.js';
import { getCountryProfile } from '../../services/countryProfileService.js';
import { buildProfileView } from '../features/profileView.js';
import { logger } from '../../shared/logger.js';

export const profile: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Профиль игрока')
    .addUserOption((option) => option.setName('user').setDescription('Пользователь')) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    try {
      const registration = await getUserRegistration(interaction.guildId, targetUser.id);
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

      const profileData = await getCountryProfile(interaction.guildId, countryLookup.country);
      const view = await buildProfileView({
        guild: interaction.guild,
        user: targetUser,
        registration,
        profile: profileData
      });

      await interaction.reply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Не удалось загрузить профиль. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};