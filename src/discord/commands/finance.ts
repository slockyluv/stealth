import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Guild,
  type Message,
  type TopLevelComponentData
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import { getUserRegistration, findCountryByKey } from '../../services/countryRegistrationService.js';
import { getCountryProfile } from '../../services/countryProfileService.js';
import { getUserActiveCompany } from '../../services/privateCompanyService.js';
import { buildCompanyFinanceView, buildFinanceView } from '../features/financeView.js';
import { logger } from '../../shared/logger.js';

type FinanceViewResult = { view: TopLevelComponentData[] } | { error: string };

async function resolveFinanceView(options: {
  guildId: string;
  guild: Guild;
  user: Message['author'];
}): Promise<FinanceViewResult> {
  const { guildId, guild, user } = options;
  const company = await getUserActiveCompany(guildId, user.id);
  if (company) {
    const countryLookup = findCountryByKey(company.countryName);
    if (!countryLookup) {
      return { error: 'Страна компании не найдена.' };
    }

    const profileData = await getCountryProfile(guildId, countryLookup.country);
    const view = await buildCompanyFinanceView({
      guild,
      user,
      company,
      countryProfile: profileData
    });

    return { view };
  }
  
  const registration = await getUserRegistration(guildId, user.id);
  if (!registration) {
    return { error: 'Пользователь не зарегистрирован за страной.' };
  }

  const countryLookup = findCountryByKey(registration.countryName);
  if (!countryLookup) {
    return { error: 'Страна пользователя не найдена.' };
  }

  const profileData = await getCountryProfile(guildId, countryLookup.country);
  const view = await buildFinanceView({
    guild,
    user,
    registration,
    profile: profileData
  });

  return { view };
}

export const finance: Command = {
  data: new SlashCommandBuilder()
    .setName('finance')
    .setDescription('Финансы игрока')
    .addUserOption((option) => option.setName('user').setDescription('Пользователь')) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
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

    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    try {
      const result = await resolveFinanceView({
        guildId: interaction.guildId,
        guild: interaction.guild,
        user: targetUser
      });

      if ('error' in result) {
        await interaction.reply({
          components: buildWarningView(formatEmoji, result.error),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      await interaction.reply({
        components: result.view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Не удалось загрузить финансы. Попробуйте позже.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!message.inGuild() || !message.guild) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    const targetUser = message.mentions.users.first() ?? message.author;

    try {
      const result = await resolveFinanceView({
        guildId: message.guildId,
        guild: message.guild,
        user: targetUser
      });

      if ('error' in result) {
        if (message.channel?.isSendable()) {
          await message.channel.send({
            components: buildWarningView(formatEmoji, result.error),
            flags: MessageFlags.IsComponentsV2
          });
        }
        return;
      }

      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: result.view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Не удалось загрузить финансы. Попробуйте позже.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  }
};