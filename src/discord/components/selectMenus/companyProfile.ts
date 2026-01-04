import { MessageFlags } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { logger } from '../../../shared/logger.js';
import { getUserActiveCompany } from '../../../services/privateCompanyService.js';
import { buildCompanyProfileView } from '../../features/companyProfileView.js';

export const companyProfileTabSelect: SelectMenuHandler = {
  key: 'companyProfile:tab',

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
    if (!selectedTab || selectedTab !== 'profile') {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректный выбор раздела.'),
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

      const view = await buildCompanyProfileView({
        guild: interaction.guild,
        user: interaction.user,
        company
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