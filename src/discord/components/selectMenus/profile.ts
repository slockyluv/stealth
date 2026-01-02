import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { getUserRegistration, findCountryByKey } from '../../../services/countryRegistrationService.js';
import { getCountryProfile } from '../../../services/countryProfileService.js';
import { buildProfileView } from '../../features/profileView.js';
import { buildFinanceView } from '../../features/financeView.js';
import { logger } from '../../../shared/logger.js';

export const profileTabSelect: SelectMenuHandler = {
  key: 'profile:tab',

  async execute(interaction, ctx) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Меню доступно только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const userId = ctx.customId.args[0];
    if (!userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректное меню.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Это меню доступно только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const selectedTab = interaction.values[0];
    if (!selectedTab || (selectedTab !== 'profile' && selectedTab !== 'finance')) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректный выбор раздела.'),
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
      const view =
        selectedTab === 'finance'
          ? await buildFinanceView({
              guild: interaction.guild,
              user: interaction.user,
              registration,
              profile
            })
          : await buildProfileView({
              guild: interaction.guild,
              user: interaction.user,
              registration,
              profile
            });

      await interaction.editReply({ components: view });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось загрузить данные. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};