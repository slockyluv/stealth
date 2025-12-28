import {
  ActionRowBuilder,
  ComponentType,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  type TopLevelComponentData
} from 'discord.js';
import type { SelectMenuHandler } from '../../../types/component.js';
import { customIdKey, parseCustomId, buildCustomId } from '../../../shared/customId.js';
import {
  buildReviewRoleKey,
  resolveVacancy,
  vacancyReviewRoles
} from '../../features/applications/config.js';
function display(lines: string[]): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: lines.map((content) => ({ type: ComponentType.TextDisplay, content }))
    }
  ];
}

function buildApplicationModal(options: { vacancyKey: string }): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(buildCustomId('application', 'submit', options.vacancyKey))
    .setTitle('Заявка на вакансию')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('application-name')
          .setLabel('Ваше имя:')
          .setPlaceholder('Введите ваше имя')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('application-age')
          .setLabel('Ваш возраст:')
          .setPlaceholder('Например: 18')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(50)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('application-experience')
          .setLabel('Ваш опыт:')
          .setPlaceholder('Опишите ваш опыт в модерации/организации')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(200)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('application-timezone')
          .setLabel('Часовой пояс:')
          .setPlaceholder('Например: UTC+3')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true)
      )
    );
}

export const applicationSelectMenu: SelectMenuHandler = {
  key: customIdKey({ scope: 'application', action: 'select' }),
  async execute(interaction: StringSelectMenuInteraction) {
    const value = interaction.values[0];
    const vacancy = resolveVacancy(value);

    if (!vacancy) {
      await interaction.reply({
        components: display(['Вакансия не найдена.']),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.showModal(buildApplicationModal({ vacancyKey: vacancy.key }));
  }
};

export const applicationReviewSelect: SelectMenuHandler = {
  key: customIdKey({ scope: 'application', action: 'review' }),
  async execute(interaction: StringSelectMenuInteraction) {
    const ctx = parseCustomId(interaction.customId);
    const choice = interaction.values[0];

    if (!ctx || ctx.args.length < 2) {
      await interaction.reply({
        components: display(['Неверный идентификатор действия.']),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return;
    }

    const vacancy = resolveVacancy(ctx.args[0]);
    const applicantId = ctx.args[1];

    if (!vacancy || !applicantId) {
      await interaction.reply({
        components: display(['Вакансия не найдена.']),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return;
    }

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: display(['Действие доступно только на сервере.']),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return;
    }

    const member = interaction.member; // cached guild interaction guarantees GuildMember
    const reviewKey = buildReviewRoleKey(vacancy);
    const requiredRoles = vacancyReviewRoles[reviewKey] ?? [];

    if (requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((roleId) => member.roles.cache.has(roleId));
      if (!hasRole) {
        await interaction.reply({
          components: display(['У вас нет прав для рассмотрения этой заявки.']),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
        return;
      }
    }

    if (choice !== 'approve' && choice !== 'reject') {
      await interaction.reply({
        components: display(['Выберите корректное действие.']),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('application', 'decision', vacancy.key, applicantId, choice))
      .setTitle('Рассмотрение заявки')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('application-decision-reason')
            .setLabel('Причина:')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Укажите причину решения')
            .setRequired(true)
            .setMaxLength(500)
        )
      );

    await interaction.showModal(modal);
  }
};