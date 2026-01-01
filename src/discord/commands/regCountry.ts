import {
  ComponentType,
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  type TopLevelComponentData
} from 'discord.js';
import type { Command } from '../../types/command.js';
import {
  findCountryByQuery,
  registerCountryForUser,
  unregisterCountryForUser
} from '../../services/countryRegistrationService.js';
import { logger } from '../../shared/logger.js';

function buildTextDisplayComponents(content: string): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: [{ type: ComponentType.TextDisplay, content }]
    }
  ];
}

function extractUserId(raw: string): string | null {
  const mentionMatch = raw.match(/^<@!?([0-9]+)>$/);
  if (mentionMatch?.[1]) return mentionMatch[1];

  return /^[0-9]+$/.test(raw) ? raw : null;
}

async function replyNoGuild(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    components: buildTextDisplayComponents('Команда доступна только внутри сервера.'),
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

function hasManageGuildPermission(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild) ?? false;
}

async function ensureManageGuild(interaction: ChatInputCommandInteraction) {
  if (hasManageGuildPermission(interaction)) return true;

  await interaction.reply({
    components: buildTextDisplayComponents('Недостаточно прав для выполнения команды.'),
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });

  return false;
}

async function sendMessageResponse(target: Message, content: string) {
  if (!target.channel.isSendable()) return;

  await target.channel.send({ components: buildTextDisplayComponents(content), flags: MessageFlags.IsComponentsV2 });
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
    if (!interaction.inCachedGuild()) {
      await replyNoGuild(interaction);
      return;
    }

    const allowed = await ensureManageGuild(interaction);
    if (!allowed) return;

    const targetUser = interaction.options.getUser('user', true);
    const countryInput = interaction.options.getString('country', true);

    const countryLookup = findCountryByQuery(countryInput);
    if (!countryLookup) {
      await interaction.reply({
        components: buildTextDisplayComponents('Страна не найдена. Уточните название или эмодзи.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await registerCountryForUser(
        interaction.guildId,
        targetUser.id,
        countryLookup.continentId,
        countryLookup.country
      );

      if (result.status === 'registered') {
        await interaction.editReply({
          components: buildTextDisplayComponents(
            `Пользователь <@${targetUser.id}> зарегистрирован за **${countryLookup.country.name}**.`
          ),
          flags: MessageFlags.IsComponentsV2
        });
      } else if (result.status === 'alreadyRegistered') {
        await interaction.editReply({
          components: buildTextDisplayComponents(
            `Пользователь уже зарегистрирован за **${result.registration.countryName}**.`
          ),
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        const takenBy = result.registration?.userId ? `<@${result.registration.userId.toString()}>` : 'другим пользователем';
        await interaction.editReply({
          components: buildTextDisplayComponents(
            `Эта страна уже занята ${takenBy}. Выберите другую страну.`
          ),
          flags: MessageFlags.IsComponentsV2
        });
      }
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildTextDisplayComponents('Не удалось зарегистрировать пользователя. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.inGuild() || !message.guild) return;
    if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await sendMessageResponse(message, 'Недостаточно прав для выполнения команды.');
      return;
    }

    const [rawUser, ...countryParts] = args;
    if (!rawUser || countryParts.length === 0) {
      await sendMessageResponse(message, 'Использование: !reg-country <@Пользователь> <Страна/флаг>');
      return;
    }

    const userId = extractUserId(rawUser);
    if (!userId) {
      await sendMessageResponse(message, 'Укажите пользователя через упоминание.');
      return;
    }

    const countryInput = countryParts.join(' ');
    const countryLookup = findCountryByQuery(countryInput);
    if (!countryLookup) {
      await sendMessageResponse(message, 'Страна не найдена. Уточните название или эмодзи.');
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
        await sendMessageResponse(
          message,
          `Пользователь <@${userId}> зарегистрирован за **${countryLookup.country.name}**.`
        );
      } else if (result.status === 'alreadyRegistered') {
        await sendMessageResponse(
          message,
          `Пользователь уже зарегистрирован за **${result.registration.countryName}**.`
        );
      } else {
        const takenBy = result.registration?.userId ? `<@${result.registration.userId.toString()}>` : 'другим пользователем';
        await sendMessageResponse(message, `Эта страна уже занята ${takenBy}. Выберите другую страну.`);
      }
    } catch (error) {
      logger.error(error);
      await sendMessageResponse(message, 'Не удалось зарегистрировать пользователя. Попробуйте позже.');
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
    if (!interaction.inCachedGuild()) {
      await replyNoGuild(interaction);
      return;
    }

    const allowed = await ensureManageGuild(interaction);
    if (!allowed) return;

    const targetUser = interaction.options.getUser('user', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await unregisterCountryForUser(interaction.guildId, targetUser.id);

      if (result.status === 'notRegistered') {
        await interaction.editReply({
          components: buildTextDisplayComponents('Пользователь не зарегистрирован ни за одной страной.'),
          flags: MessageFlags.IsComponentsV2
        });
        return;
      }

      await interaction.editReply({
        components: buildTextDisplayComponents(
          `Пользователь <@${targetUser.id}> снят с регистрации страны **${result.registration.countryName}**.`
        ),
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildTextDisplayComponents('Не удалось снять пользователя с регистрации. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.inGuild() || !message.guild) return;
    if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await sendMessageResponse(message, 'Недостаточно прав для выполнения команды.');
      return;
    }

    const [rawUser] = args;
    if (!rawUser) {
      await sendMessageResponse(message, 'Использование: !unreg <@Пользователь>');
      return;
    }

    const userId = extractUserId(rawUser);
    if (!userId) {
      await sendMessageResponse(message, 'Укажите пользователя через упоминание.');
      return;
    }

    try {
      const result = await unregisterCountryForUser(message.guild.id, userId);

      if (result.status === 'notRegistered') {
        await sendMessageResponse(message, 'Пользователь не зарегистрирован ни за одной страной.');
        return;
      }

      await sendMessageResponse(
        message,
        `Пользователь <@${userId}> снят с регистрации страны **${result.registration.countryName}**.`
      );
    } catch (error) {
      logger.error(error);
      await sendMessageResponse(message, 'Не удалось снять пользователя с регистрации. Попробуйте позже.');
    }
  }
};