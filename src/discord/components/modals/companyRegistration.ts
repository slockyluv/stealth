import { MessageFlags } from 'discord.js';
import type { ModalHandler } from '../../../types/component.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView, buildSuccessView } from '../../responses/messageBuilders.js';
import { buildPrivateCompanyRegistrationView } from '../../features/registration/privateCompanyRegistrationView.js';
import { upsertCompanyDraft } from '../../../services/privateCompanyService.js';
import { logger } from '../../../shared/logger.js';

async function getFormatEmoji(interaction: Parameters<ModalHandler['execute']>[0]) {
  return createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
    guildEmojis: interaction.guild?.emojis.cache.values()
  });
}

export const companyNameModal: ModalHandler = {
  key: 'companyReg:nameModal',

  async execute(interaction, ctx) {
    const formatEmoji = await getFormatEmoji(interaction);

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const [messageId] = ctx.customId.args;
    if (!messageId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная форма.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const name = interaction.fields.getTextInputValue('company-name').trim();
    if (!name) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Укажите название компании.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      await upsertCompanyDraft(interaction.guildId, interaction.user.id, {
        name
      });

      const view = await buildPrivateCompanyRegistrationView({
        guild: interaction.guild,
        userId: interaction.user.id
      });
      const components = [
        ...buildSuccessView(formatEmoji, 'Название компании сохранено.'),
        ...view.components
      ];
      await interaction.editReply({
        components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.followUp({
        components: buildWarningView(formatEmoji, 'Не удалось сохранить название. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  }
};