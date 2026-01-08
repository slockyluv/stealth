import { MessageFlags } from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { customIdKey } from '../../../shared/customId.js';
import {
  buildMarryAcceptedView,
  buildMarryAlreadyExistsView,
  buildMarryNotForYouView,
  buildMarryRejectedView,
  buildMarryTargetTakenView,
  MARRY_ACCEPT_ACTION,
  MARRY_REJECT_ACTION,
  MARRY_SCOPE
} from '../../features/marryView.js';
import { clearMarryProposal } from '../../features/marryState.js';
import { createMarriage } from '../../../services/marriageService.js';
import { logger } from '../../../shared/logger.js';
import { buildWarningView } from '../../responses/messageBuilders.js';
import { createEmojiFormatter } from '../../emoji.js';

async function buildWarningComponents(interaction: Parameters<ButtonHandler['execute']>[0], message: string) {
  const formatEmoji = await createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });

  return buildWarningView(formatEmoji, message);
}

export const marryAcceptButton: ButtonHandler = {
  key: customIdKey({ scope: MARRY_SCOPE, action: MARRY_ACCEPT_ACTION }),

  async execute(interaction, ctx) {
    const [proposerId, targetId] = ctx.customId.args;
    if (!proposerId || !targetId) return;

    if (interaction.user.id !== targetId) {
      await interaction.reply({
        components: buildMarryNotForYouView(),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    if (!interaction.guildId) {
      await interaction.followUp({
        components: await buildWarningComponents(interaction, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      const result = await createMarriage({
        guildId: interaction.guildId,
        proposerId,
        targetId
      });

      clearMarryProposal(interaction.message.id);

      if (result.status === 'conflict') {
        const view = result.conflictUserId === targetId ? buildMarryAlreadyExistsView() : buildMarryTargetTakenView();
        await interaction.message.edit({ components: view });
        return;
      }

      await interaction.message.edit({
        components: buildMarryAcceptedView({
          user1: `<@${proposerId}>`,
          user2: `<@${targetId}>`
        })
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: await buildWarningComponents(interaction, 'Не удалось принять предложение. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};

export const marryRejectButton: ButtonHandler = {
  key: customIdKey({ scope: MARRY_SCOPE, action: MARRY_REJECT_ACTION }),

  async execute(interaction, ctx) {
    const [_, targetId] = ctx.customId.args;
    if (!targetId) return;

    if (interaction.user.id !== targetId) {
      await interaction.reply({
        components: buildMarryNotForYouView(),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      clearMarryProposal(interaction.message.id);
      await interaction.message.edit({
        components: buildMarryRejectedView(interaction.user.username)
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: await buildWarningComponents(interaction, 'Не удалось отклонить предложение. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};