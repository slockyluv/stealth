import { MessageFlags, PermissionsBitField, type Guild } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { buildTextView } from '../v2Message.js';
import { buildCountryDetailsView, getContinent } from '../../features/settings/countriesView.js';
import { logger } from '../../../shared/logger.js';
import { updateCountryProfile } from '../../../services/countryProfileService.js';

async function ensureAccess(
  interaction: Parameters<ModalHandler['execute']>[0]
): Promise<Guild | null> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      components: buildTextView('Меню доступно только на сервере.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return null;
  }

  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
    await interaction.reply({
      components: buildTextView('Требуется право **Управление ролями**.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return null;
  }

  return interaction.guild;
}

export const settingsCountriesEditModal: ModalHandler = {
  key: 'settings:countriesEditModal',

  async execute(interaction, ctx) {
    const guild = await ensureAccess(interaction);
    if (!guild) return;

    const [continentId, rawPage, countryIndexRaw] = ctx.customId.args;
    const continent = getContinent(continentId ?? '');

    if (!continent) {
      await interaction.reply({
        components: buildTextView('Континент не найден. Вернитесь к выбору континента.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const countryIndex = Number.parseInt(countryIndexRaw ?? '-1', 10);
    const country = Number.isFinite(countryIndex) && countryIndex >= 0 ? continent.countries[countryIndex] : undefined;

    if (!country) {
      await interaction.reply({
        components: buildTextView('Страна не найдена. Попробуйте выбрать снова.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const ruler = interaction.fields.getTextInputValue('ruler').trim();
    const territory = interaction.fields.getTextInputValue('territory').trim();
    const population = interaction.fields.getTextInputValue('population').trim();
    const page = Number.parseInt(rawPage ?? '1', 10);

    await interaction.deferUpdate();

    try {
      const profile = updateCountryProfile(guild.id, country, { ruler, territory, population });
      const view = await buildCountryDetailsView({
        guild,
        continent,
        country,
        countryIndex,
        profile,
        page: Number.isFinite(page) ? page : 1
      });

      await interaction.editReply({
        embeds: [],
        components: view.components,
        files: [],
        attachments: [],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildTextView('Не удалось сохранить изменения. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};