import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import type { ButtonHandler } from '../../../types/component.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import { buildWarningView } from '../../responses/messageBuilders.js';

const FIELD_LABELS: Record<string, string> = {
  ideology: 'Идеология',
  governmentForm: 'Форма правления',
  stateStructure: 'Гос. устройство',
  religion: 'Религия'
};

export const profileEditButton: ButtonHandler = {
  key: 'profile:edit',

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

    const [field, userId] = ctx.customId.args;
    if (!field || !userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Некорректная кнопка.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Эта кнопка доступна только владельцу профиля.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const label = FIELD_LABELS[field] ?? 'Параметр';

    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('profile', 'editModal', field, userId))
      .setTitle(`Изменить: ${label}`);

    const input = new TextInputBuilder()
      .setCustomId('profile-value')
      .setLabel(label)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};