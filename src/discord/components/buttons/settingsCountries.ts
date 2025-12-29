import { MessageFlags, PermissionsBitField, type Guild } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildTextView } from '../v2Message.js';
import { buildCountriesView, getContinent } from '../../features/settings/countriesView.js';
import { logger } from '../../../shared/logger.js';

const PAGE_SIZE = 15;

function parsePage(args: string[]): number {
  const [, rawPage] = args;
  const parsed = Number.parseInt(rawPage ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function ensureAccess(
  interaction: Parameters<ButtonHandler['execute']>[0]
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

async function renderPage(
  interaction: Parameters<ButtonHandler['execute']>[0],
  guild: Guild,
  continentId: string,
  page: number
) {
  const continent = getContinent(continentId);

  if (!continent) {
    await interaction.reply({
      components: buildTextView('Континент не найден. Вернитесь к выбору континента.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
  }

  try {
    const view = await buildCountriesView({ guild, continent, page, pageSize: PAGE_SIZE });

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
      components: buildTextView('Не удалось обновить страницу стран. Попробуйте позже.'),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
}

export const settingsCountriesFirstButton: ButtonHandler = {
  key: 'settings:countriesFirst',

  async execute(interaction, ctx) {
    const guild = await ensureAccess(interaction);
    if (!guild) return;

    const continentId = ctx.customId.args[0] ?? '';

    await interaction.deferUpdate();
    await renderPage(interaction, guild, continentId, 1);
  }
};

export const settingsCountriesPrevButton: ButtonHandler = {
  key: 'settings:countriesPrev',

  async execute(interaction, ctx) {
    const guild = await ensureAccess(interaction);
    if (!guild) return;

    const continentId = ctx.customId.args[0] ?? '';
    const currentPage = parsePage(ctx.customId.args);
    const targetPage = Math.max(currentPage - 1, 1);

    await interaction.deferUpdate();
    await renderPage(interaction, guild, continentId, targetPage);
  }
};

export const settingsCountriesNextButton: ButtonHandler = {
  key: 'settings:countriesNext',

  async execute(interaction, ctx) {
    const guild = await ensureAccess(interaction);
    if (!guild) return;

    const continentId = ctx.customId.args[0] ?? '';
    const targetPage = parsePage(ctx.customId.args) + 1;

    await interaction.deferUpdate();
    await renderPage(interaction, guild, continentId, targetPage);
  }
};

export const settingsCountriesLastButton: ButtonHandler = {
  key: 'settings:countriesLast',

  async execute(interaction, ctx) {
    const guild = await ensureAccess(interaction);
    if (!guild) return;

    const continentId = ctx.customId.args[0] ?? '';
    const continent = getContinent(continentId);

    if (!continent) {
      await interaction.reply({
        components: buildTextView('Континент не найден. Вернитесь к выбору континента.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const totalPages = Math.max(Math.ceil(continent.countries.length / PAGE_SIZE), 1);

    await interaction.deferUpdate();
    await renderPage(interaction, guild, continent.id, totalPages);
  }
};