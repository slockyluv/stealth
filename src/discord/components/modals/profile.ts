import { MessageFlags } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { getUserRegistration, findCountryByKey } from '../../../services/countryRegistrationService.js';
import { updateCountryPolitics } from '../../../services/countryProfileService.js';
import { buildProfileView } from '../../features/profileView.js';
import { logger } from '../../../shared/logger.js';

const FIELD_MAP: Record<string, keyof Parameters<typeof updateCountryPolitics>[2]> = {
  ideology: 'ideology',
  governmentForm: 'governmentForm',
  stateStructure: 'stateStructure',
  religion: 'religion'
};

export const profileEditModal: ModalHandler = {
  key: 'profile:editModal',

  async execute(interaction, ctx) {
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

    const [fieldKey, userId] = ctx.customId.args;
    const mappedField = fieldKey ? FIELD_MAP[fieldKey] : undefined;
    if (!mappedField || !userId) {
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

    const value = interaction.fields.getTextInputValue('profile-value').trim();
    if (!value) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Укажите значение для сохранения.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const registration = await getUserRegistration(interaction.guildId, userId);
    if (!registration) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Профиль не найден.'),
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
      const profile = await updateCountryPolitics(interaction.guildId, countryLookup.country, {
        [mappedField]: value
      });

      const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
      const view = await buildProfileView({
        guild: interaction.guild,
        user: targetUser ?? interaction.user,
        registration,
        profile
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось сохранить изменения. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};