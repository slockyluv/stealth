import { MessageFlags } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildSuccessView, buildWarningView } from '../../responses/messageBuilders.js';
import { ALLOW_OWNERPANEL, isMemberAllowed } from '../../commands/allow.js';
import { resetAllCountryProfiles } from '../../../services/countryProfileService.js';
import { resetPrivateCompanies } from '../../../services/privateCompanyService.js';
import { logger } from '../../../shared/logger.js';

async function getFormatEmoji(interaction: Parameters<ButtonHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

async function enforceOwnerPanelAllow(interaction: Parameters<ButtonHandler['execute']>[0]) {
  const formatEmoji = await getFormatEmoji(interaction);

  if (
    isMemberAllowed(
      ALLOW_OWNERPANEL,
      interaction.member,
      interaction.memberPermissions,
      interaction.guild?.ownerId ?? null
    )
  ) {
    return { allowed: true as const, formatEmoji };
  }

  await interaction.reply({
    components: buildWarningView(formatEmoji, 'У вас нет прав для использования этой команды.'),
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
  return { allowed: false as const, formatEmoji };
}

export const ownerPanelResetCountriesButton: ButtonHandler = {
  key: 'ownerpanel:resetCountries',

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      const formatEmoji = await getFormatEmoji(interaction);
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const { allowed, formatEmoji } = await enforceOwnerPanelAllow(interaction);
    if (!allowed) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await resetAllCountryProfiles(interaction.guildId);
      const message = `Сброс стран выполнен. Регистраций: ${result.registrationsCleared}, профилей: ${result.profilesCleared}.`;
      await interaction.editReply({
        components: buildSuccessView(formatEmoji, message),
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось сбросить страны. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};

export const ownerPanelResetCompaniesButton: ButtonHandler = {
  key: 'ownerpanel:resetCompanies',

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      const formatEmoji = await getFormatEmoji(interaction);
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const { allowed, formatEmoji } = await enforceOwnerPanelAllow(interaction);
    if (!allowed) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await resetPrivateCompanies(interaction.guildId);
      const message = `Частные компании удалены. Компаний: ${result.companiesCleared}, черновиков: ${result.draftsCleared}.`;
      await interaction.editReply({
        components: buildSuccessView(formatEmoji, message),
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось удалить компании. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};