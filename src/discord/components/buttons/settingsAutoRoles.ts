import { MessageFlags, PermissionsBitField, type Guild } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildAutoRolesView, buildSettingsMainView } from '../../features/settings/autoRolesView.js';
import { getAutoRoles, setAutoRoles } from '../../../services/autoRoleService.js';
import { logger } from '../../../shared/logger.js';

function parsePage(args: string[]): number {
  const [raw] = args;
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function ensurePermissions(
  interaction: Parameters<ButtonHandler['execute']>[0]
): Promise<Guild | null> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: 'Доступно только на сервере.',
      flags: MessageFlags.Ephemeral
    });
    return null;
  }

  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
    await interaction.reply({
      content: 'Требуется право **Управление ролями**.',
      flags: MessageFlags.Ephemeral
    });
    return null;
  }

  const botMember = interaction.guild.members.me;

  if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    await interaction.reply({
      content: 'У бота нет права **Управление ролями** для применения настроек.',
      flags: MessageFlags.Ephemeral
    });
    return null;
  }

  return interaction.guild;
}

async function renderAutoRoles(interaction: Parameters<ButtonHandler['execute']>[0], guild: Guild, page: number) {
  const selectedRoles = await getAutoRoles(guild.id);
  const view = await buildAutoRolesView({ guild, selectedRoleIds: selectedRoles, page });

  await interaction.editReply({
    embeds: [],
    components: view.components,
    files: view.files,
    attachments: view.removeAttachments ? [] : undefined,
    flags: MessageFlags.IsComponentsV2
  });
}

export const settingsBackButton: ButtonHandler = {
  key: 'settings:back',

  async execute(interaction) {
    const guild = await ensurePermissions(interaction);
    if (!guild) return;

    const view = await buildSettingsMainView(guild);
    await interaction.update({
      embeds: [],
      components: view.components,
      files: view.files,
      attachments: [],
      flags: MessageFlags.IsComponentsV2
    });
  }
};

export const settingsClearRolesButton: ButtonHandler = {
  key: 'settings:clearRoles',

  async execute(interaction, ctx) {
    const guild = await ensurePermissions(interaction);
    if (!guild) return;

    const page = parsePage(ctx.customId.args);

    await interaction.deferUpdate();

    try {
      await setAutoRoles(guild.id, []);
      await renderAutoRoles(interaction, guild, page);
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        content: 'Не удалось очистить список ролей.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export const settingsAutoPrevButton: ButtonHandler = {
  key: 'settings:autoPrev',

  async execute(interaction, ctx) {
    const guild = await ensurePermissions(interaction);
    if (!guild) return;

    const page = Math.max(parsePage(ctx.customId.args) - 1, 1);

    await interaction.deferUpdate();

    try {
      await renderAutoRoles(interaction, guild, page);
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        content: 'Не удалось обновить страницу ролей.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export const settingsAutoNextButton: ButtonHandler = {
  key: 'settings:autoNext',

  async execute(interaction, ctx) {
    const guild = await ensurePermissions(interaction);
    if (!guild) return;

    const page = parsePage(ctx.customId.args) + 1;

    await interaction.deferUpdate();

    try {
      await renderAutoRoles(interaction, guild, page);
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        content: 'Не удалось обновить страницу ролей.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};