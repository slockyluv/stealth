import { MessageFlags, PermissionsBitField, SlashCommandBuilder, type ChatInputCommandInteraction, type Message, type TopLevelComponentData } from 'discord.js';
import type { Command } from '../../types/command.js';
import {
  findCountryByQuery,
  registerCountryForUser,
  unregisterCountryForUser
} from '../../services/countryRegistrationService.js';
import { logger } from '../../shared/logger.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildSuccessView, buildUsageView, buildWarningView } from '../responses/messageBuilders.js';
import { formatNicknameResetNotice, formatNicknameUpdateNotice, resetCountryNickname, updateCountryNickname } from '../nickname.js';

function extractUserId(raw: string): string | null {
  const mentionMatch = raw.match(/^<@!?([0-9]+)>$/);
  if (mentionMatch?.[1]) return mentionMatch[1];

  return /^[0-9]+$/.test(raw) ? raw : null;
}

function hasManageGuildPermission(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild) ?? false;
}

async function replyNoGuild(interaction: ChatInputCommandInteraction, formatEmoji: (name: string) => string) {
  await interaction.reply({
    components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

async function ensureManageGuild(
  interaction: ChatInputCommandInteraction,
  formatEmoji: (name: string) => string
) {
  if (hasManageGuildPermission(interaction)) return true;

  await interaction.reply({
    components: buildWarningView(formatEmoji, 'Недостаточно прав для выполнения команды.'),
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });

  return false;
}

async function sendMessageResponse(
  target: Message,
  view: TopLevelComponentData[],
  flags:
    | MessageFlags.SuppressEmbeds
    | MessageFlags.SuppressNotifications
    | MessageFlags.IsComponentsV2 = MessageFlags.IsComponentsV2
) {
  if (!target.channel.isSendable()) return;

  await target.channel.send({ components: view, flags });
}

const regCountryBuilder = new SlashCommandBuilder()
    .setName('reg-country')
    .setDescription('Ручная регистрация пользователя за страну')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true))
    .addStringOption((option) =>
      option.setName('country').setDescription('Название страны или эмодзи флага').setRequired(true)
    );

export const regCountry: Command = {
  data: regCountryBuilder as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await replyNoGuild(interaction, formatEmoji);
      return;
    }

    const allowed = await ensureManageGuild(interaction, formatEmoji);
    if (!allowed) return;

    const targetUser = interaction.options.getUser('user', true);
    const countryInput = interaction.options.getString('country', true);

    const countryLookup = findCountryByQuery(countryInput);
    if (!countryLookup) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Страна не найдена. Уточните название или эмодзи.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    try {
      const result = await registerCountryForUser(
        interaction.guildId,
        targetUser.id,
        countryLookup.continentId,
        countryLookup.country
      );

      if (result.status === 'registered') {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch((error) => {
          logger.error(error);
          return null;
        });
        const nicknameResult = await updateCountryNickname({
          member: targetMember,
          country: countryLookup.country
        });
        const nicknameNotice = formatNicknameUpdateNotice(formatEmoji, nicknameResult);
        await interaction.editReply({
          components: buildSuccessView(
            formatEmoji,
            `Пользователь <@${targetUser.id}> зарегистрирован за **${countryLookup.country.name}**.${nicknameNotice}`
          ),
          flags: MessageFlags.IsComponentsV2
        });
      } else if (result.status === 'alreadyRegistered') {
        await interaction.editReply({
          components: buildWarningView(
            formatEmoji,
            `Пользователь уже зарегистрирован за **${result.registration.countryName}**.`
          ),
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        const takenBy = result.registration?.userId ? `<@${result.registration.userId.toString()}>` : 'другим пользователем';
        await interaction.editReply({
          components: buildWarningView(
            formatEmoji,
            `Эта страна уже занята ${takenBy}. Выберите другую страну.`
          ),
          flags: MessageFlags.IsComponentsV2
        });
      }
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(
          formatEmoji,
          'Не удалось зарегистрировать пользователя. Попробуйте позже.'
        ),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.inGuild() || !message.guild) return;

    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await sendMessageResponse(message, buildWarningView(formatEmoji, 'Недостаточно прав для выполнения команды.'));
      return;
    }

    const [rawUser, ...countryParts] = args;
    if (!rawUser || countryParts.length === 0) {
      await sendMessageResponse(
        message,
        buildUsageView(formatEmoji, '!reg-country <@Пользователь> <Страна/флаг>')
      );
      return;
    }

    const userId = extractUserId(rawUser);
    if (!userId) {
      await sendMessageResponse(message, buildWarningView(formatEmoji, 'Укажите пользователя через упоминание.'));
      return;
    }

    const countryInput = countryParts.join(' ');
    const countryLookup = findCountryByQuery(countryInput);
    if (!countryLookup) {
      await sendMessageResponse(message, buildWarningView(formatEmoji, 'Страна не найдена. Уточните название или эмодзи.'));
      return;
    }

    try {
      const result = await registerCountryForUser(
        message.guild.id,
        userId,
        countryLookup.continentId,
        countryLookup.country
      );

      if (result.status === 'registered') {
        const targetMember = await message.guild.members.fetch(userId).catch((error) => {
          logger.error(error);
          return null;
        });
        const nicknameResult = await updateCountryNickname({
          member: targetMember,
          country: countryLookup.country
        });
        const nicknameNotice = formatNicknameUpdateNotice(formatEmoji, nicknameResult);
        await sendMessageResponse(
          message,
          buildSuccessView(
            formatEmoji,
            `Пользователь <@${userId}> зарегистрирован за **${countryLookup.country.name}**.${nicknameNotice}`
          )
        );
      } else if (result.status === 'alreadyRegistered') {
        await sendMessageResponse(
          message,
          buildWarningView(formatEmoji, `Пользователь уже зарегистрирован за **${result.registration.countryName}**.`)
        );
      } else {
        const takenBy = result.registration?.userId ? `<@${result.registration.userId.toString()}>` : 'другим пользователем';
        await sendMessageResponse(
          message,
          buildWarningView(formatEmoji, `Эта страна уже занята ${takenBy}. Выберите другую страну.`)
        );
      }
    } catch (error) {
      logger.error(error);
      await sendMessageResponse(message, buildWarningView(formatEmoji, 'Не удалось зарегистрировать пользователя. Попробуйте позже.'));
    }
  }
};

const unregBuilder = new SlashCommandBuilder()
    .setName('unreg')
    .setDescription('Снять регистрацию пользователя с страны')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true));

export const unreg: Command = {
  data: unregBuilder as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await replyNoGuild(interaction, formatEmoji);
      return;
    }

    const allowed = await ensureManageGuild(interaction, formatEmoji);
    if (!allowed) return;

    const targetUser = interaction.options.getUser('user', true);

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    try {
      const result = await unregisterCountryForUser(interaction.guildId, targetUser.id);

      if (result.status === 'notRegistered') {
        await interaction.editReply({
          components: buildWarningView(formatEmoji, 'Пользователь не зарегистрирован ни за одной страной.'),
          flags: MessageFlags.IsComponentsV2
        });
        return;
      }

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const nicknameResult = await resetCountryNickname({ member });
      const nicknameNotice = formatNicknameResetNotice(formatEmoji, nicknameResult);

      await interaction.editReply({
        components: buildSuccessView(
          formatEmoji,
          `Пользователь <@${targetUser.id}> снят с регистрации страны **${result.registration.countryName}**.${nicknameNotice}`
        ),
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(
          formatEmoji,
          'Не удалось снять пользователя с регистрации. Попробуйте позже.'
        ),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.inGuild() || !message.guild) return;

    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await sendMessageResponse(message, buildWarningView(formatEmoji, 'Недостаточно прав для выполнения команды.'));
      return;
    }

    const [rawUser] = args;
    if (!rawUser) {
      await sendMessageResponse(message, buildUsageView(formatEmoji, '!unreg <@Пользователь>'));
      return;
    }

    const userId = extractUserId(rawUser);
    if (!userId) {
      await sendMessageResponse(message, buildWarningView(formatEmoji, 'Укажите пользователя через упоминание.'));
      return;
    }

    try {
      const result = await unregisterCountryForUser(message.guild.id, userId);

      if (result.status === 'notRegistered') {
        await sendMessageResponse(message, buildWarningView(formatEmoji, 'Пользователь не зарегистрирован ни за одной страной.'));
        return;
      }

      const member = await message.guild.members.fetch(userId).catch(() => null);
      const nicknameResult = await resetCountryNickname({ member });
      const nicknameNotice = formatNicknameResetNotice(formatEmoji, nicknameResult);

      await sendMessageResponse(
        message,
        buildSuccessView(
          formatEmoji,
          `Пользователь <@${userId}> снят со страны **${result.registration.countryName}**.${nicknameNotice}`
        )
      );
    } catch (error) {
      logger.error(error);
      await sendMessageResponse(
        message,
        buildWarningView(formatEmoji, 'Не удалось снять пользователя со страны. Попробуйте позже.')
      );
    }
  }
};