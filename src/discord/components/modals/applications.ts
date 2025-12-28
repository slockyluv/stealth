import { ComponentType, MessageFlags, TextInputBuilder, TextInputStyle, type ModalSubmitInteraction, type TopLevelComponentData } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { buildCustomId, customIdKey, parseCustomId } from '../../../shared/customId.js';
import {
  APPROVE_EMOJI_NAME,
  MESSAGE_SEPARATOR_COMPONENT,
  REJECT_EMOJI_NAME,
  buildApproveRoleKey,
  buildReviewRoleKey,
  formatEmoji,
  resolveVacancy,
  reviewChannelId,
  vacancyApproveRoles,
  vacancyReviewRoles
} from '../../features/applications/config.js';
import {
  buildReviewDisplay,
  extractAnswersFromComponents,
  type ApplicationPayload
} from '../../features/applications/review.js';
import { logger } from '../../../shared/logger.js';

function display(lines: string[]): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: lines.map((content) => ({ type: ComponentType.TextDisplay, content }))
    }
  ];
}

function extractAnswers(description: string | null | undefined) {
  const lines = description?.split('\n') ?? [];
  const nameIndex = lines.indexOf('**Ваше имя:**');
  const ageIndex = lines.indexOf('**Ваш возраст:**');
  const experienceIndex = lines.indexOf('**Ваш опыт:**');
  const timezoneIndex = lines.indexOf('**Часовой пояс:**');

  const pick = (index: number) => (index >= 0 ? lines[index + 1]?.replace(/^>\s?/, '') ?? '—' : '—');

  return {
    name: pick(nameIndex),
    age: pick(ageIndex),
    experience: pick(experienceIndex),
    timezone: pick(timezoneIndex)
  };
}

export const applicationSubmitModal: ModalHandler = {
  key: customIdKey({ scope: 'application', action: 'submit' }),
  async execute(interaction: ModalSubmitInteraction) {
    const sendError = async (lines: string[]) => {
      const payload = { components: display(lines), flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    };

    try {
      const ctx = parseCustomId(interaction.customId);
      const vacancy = resolveVacancy(ctx?.args[0]);

      if (!vacancy) {
        await sendError(['Вакансия не найдена.']);
        return;
      }

      if (!interaction.inCachedGuild()) {
        await sendError(['Команда доступна только на сервере.']);
        return;
      }

      const answers = {
        name: interaction.fields.getTextInputValue('application-name').trim(),
        age: interaction.fields.getTextInputValue('application-age').trim(),
        experience: interaction.fields.getTextInputValue('application-experience').trim(),
        timezone: interaction.fields.getTextInputValue('application-timezone').trim()
      };

      await interaction.deferReply({ ephemeral: true });

      const reviewerKey = buildReviewRoleKey(vacancy);
      const reviewers = vacancyReviewRoles[reviewerKey] ?? [];
      const reviewerMention = reviewers.length > 0 ? reviewers.map((id) => `<@&${id}>`).join('\n') : '—';

      const payload: ApplicationPayload = {
        vacancy,
        applicantId: interaction.user.id,
        answers
      };

      const reviewDisplay = buildReviewDisplay({
        payload,
        status: 'На рассмотрении',
        reviewerMention,
        reason: undefined,
        includeActions: true,
        actionCustomId: buildCustomId('application', 'review', vacancy.key, interaction.user.id)
      });

      const channel = await interaction.client.channels.fetch(reviewChannelId).catch((error) => {
        logger.error(error);
        return null;
      });

      if (!channel || !channel.isSendable()) {
        await interaction.editReply({
          components: display(['Не удалось отправить заявку. Обратитесь к администрации.']),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
        return;
      }

      await channel.send({ components: reviewDisplay.components, flags: MessageFlags.IsComponentsV2 });

      const slideEmoji = formatEmoji(APPROVE_EMOJI_NAME, interaction.guild);

      await interaction.editReply({
        components: display([`${slideEmoji} Ваша заявка успешно отправлена на рассмотрение!`]),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error(error);
      await sendError(['Произошла ошибка при обработке формы.']);
    }
  }
};

export const applicationDecisionModal: ModalHandler = {
  key: customIdKey({ scope: 'application', action: 'decision' }),
  async execute(interaction: ModalSubmitInteraction) {
    const sendError = async (lines: string[]) => {
      const payload = { components: display(lines), flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    };

    try {
      const ctx = parseCustomId(interaction.customId);

      if (!ctx || ctx.args.length < 3) {
        await sendError(['Неверный идентификатор действия.']);
        return;
      }

      if (!interaction.inCachedGuild()) {
        await sendError(['Действие доступно только на сервере.']);
        return;
      }

      const vacancyKey = ctx.args[0]!;
      const applicantId = ctx.args[1]!;
      const decision = ctx.args[2]!;
      const vacancy = resolveVacancy(vacancyKey);

      if (!vacancy) {
        await sendError(['Вакансия не найдена.']);
        return;
      }

      const reason = interaction.fields.getTextInputValue('application-decision-reason').trim();
      const decisionStatus = decision === 'approve' ? 'Одобрено' : decision === 'reject' ? 'Отклонено' : null;

      if (!decisionStatus) {
        await sendError(['Некорректное решение.']);
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const message = interaction.message;

      if (!message) {
        await interaction.editReply({
          components: display(['Не удалось обновить заявку. Сообщите администрации.']),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
        return;
      }

      const messageJson = message.toJSON() as { components?: unknown };
      const messageComponents = (messageJson.components ?? []) as TopLevelComponentData[];

      const approveRolesKey = buildApproveRoleKey(vacancy);
      const approveRoles = vacancyApproveRoles[approveRolesKey] ?? [];

      const applicationPayload: ApplicationPayload = {
        vacancy,
        applicantId,
        answers: extractAnswersFromComponents(messageComponents)
      };

      const reviewKey = buildReviewRoleKey(vacancy);
      const reviewerMention = vacancyReviewRoles[reviewKey]?.map((id) => `<@&${id}>`).join('\n') ?? '—';

      const updatedDisplay = buildReviewDisplay({
        payload: applicationPayload,
        status: decisionStatus,
        reviewerMention,
        reviewerDisplay: interaction.user.id,
        reason
      });

      await message.edit({ components: updatedDisplay.components, flags: MessageFlags.IsComponentsV2 });

      const guild = interaction.guild;

      if (decision === 'approve' && approveRoles.length > 0) {
        try {
          const member = await guild.members.fetch(applicantId);
          for (const roleId of approveRoles) {
            await member.roles.add(roleId, 'Заявка одобрена');
          }
        } catch (error) {
          logger.error(error);
        }
      }

      try {
        const user = await interaction.client.users.fetch(applicantId);
        await user.send({
          components: [
            {
              type: ComponentType.Container,
              components: [
                { type: ComponentType.TextDisplay, content: '**Статус вашей анкеты изменен**' },
                MESSAGE_SEPARATOR_COMPONENT,
                { type: ComponentType.TextDisplay, content: `**Статус:** \`${decisionStatus}\`` },
                { type: ComponentType.TextDisplay, content: `**Рассмотрел:** <@${interaction.user.id}>` },
                { type: ComponentType.TextDisplay, content: `**Причина:** \`${reason}\`` }
              ]
            }
          ],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        logger.error(error);
      }

      const decisionEmoji = formatEmoji(decision === 'approve' ? APPROVE_EMOJI_NAME : REJECT_EMOJI_NAME, interaction.guild);

      await interaction.editReply({
        components: display([`${decisionEmoji} Решение по заявке зафиксировано.`]),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error(error);
      await sendError(['Произошла ошибка при обработке формы.']);
    }
  }
};