import { MessageFlags, PermissionsBitField, type Guild } from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { buildTextView } from '../v2Message.js';
import {
  buildCountriesView,
  buildCountryDetailsView,
  getContinent
} from '../../features/settings/countriesView.js';
import { logger } from '../../../shared/logger.js';
import { getCountryProfile } from '../../../services/countryProfileService.js';

function parsePage(args: string[]): number {
  const [, rawPage] = args;
  const parsed = Number.parseInt(rawPage ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function ensureAccess(
  interaction: Parameters<SelectMenuHandler['execute']>[0]
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

export const settingsCountriesContinentSelect: SelectMenuHandler = {
  key: 'settings:countriesContinent',

  async execute(interaction) {
    const guild = await ensureAccess(interaction);
    if (!guild) return;

    const continentId = interaction.values[0] ?? '';
    const continent = getContinent(continentId);

    if (!continent) {
      await interaction.reply({
        components: buildTextView('Указанный континент не найден.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const view = await buildCountriesView({ guild, continent, page: 1 });

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
        components: buildTextView('Не удалось открыть список стран. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const settingsCountriesSelect: SelectMenuHandler = {
  key: 'settings:countriesCountry',

  async execute(interaction, ctx) {
    const guild = await ensureAccess(interaction);
    if (!guild) return;

    const continentId = ctx.customId.args[0] ?? '';
    const continent = getContinent(continentId);

    if (!continent) {
      await interaction.reply({
        components: buildTextView('Континент недоступен. Попробуйте выбрать заново.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [countryName] = interaction.values;
    const countryIndex = continent.countries.findIndex((item) => item.name === countryName);
    const country = countryIndex >= 0 ? continent.countries[countryIndex] : null;

    if (!country) {
      await interaction.reply({
        components: buildTextView('Страна не найдена. Пожалуйста, выберите снова.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const page = parsePage(ctx.customId.args);

    await interaction.deferUpdate();

    try {
      const profile = await getCountryProfile(guild.id, country);
      const view = await buildCountryDetailsView({ guild, continent, country, countryIndex, profile, page });

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
        components: buildTextView('Не удалось обработать выбор страны. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};