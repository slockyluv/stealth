import {
  ActionRowBuilder,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ComponentInContainerData,
  type Guild,
  type SectionComponentData,
  type TopLevelComponentData,
  type User
} from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
import { createEmojiFormatter } from '../emoji.js';
import { findCountryByKey } from '../../services/countryRegistrationService.js';
import type { PrivateCompanyRecord } from '../../services/privateCompanyService.js';
import { resolveEmojiIdentifier } from './settings/countriesView.js';
import { formatDateTime } from '../../shared/time.js';

function buildSeparator(): ComponentInContainerData {
  return {
    type: ComponentType.Separator,
    divider: true
  };
}

export async function buildCompanyProfileView(options: {
  guild: Guild;
  user: User;
  company: PrivateCompanyRecord;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, company } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const countryLookup = findCountryByKey(company.countryName);
  const countryEmoji = countryLookup
    ? resolveEmojiIdentifier(countryLookup.country.emoji, formatEmoji)
    : '🏳️';
  const countryLabel = `${countryEmoji} | ${company.countryName}`;

  const header: SectionComponentData = {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: ['# Игровой профиль', '', `**Пользователь:** <@${user.id}>`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Thumbnail,
      media: { url: user.displayAvatarURL({ size: 256 }) },
      description: `Аватар ${user.username}`
    }
  };

  const infoLines = [
    `# ${formatEmoji('infocompany')} Информация`,
    '',
    `**${formatEmoji('documentgavel')} Название:**`,
    `> ${company.name}`,
    '',
    `**${formatEmoji('companies')} Отрасль:**`,
    `> ${company.industryLabel}`,
    '',
    `**${formatEmoji('worldpulse')} Страна регистрации:**`,
    `> ${countryLabel}`,
    '',
    `**${formatEmoji('linkalt')} Зарегистрирован:**`,
    `> \`${formatDateTime(company.registeredAt)}\``
  ].join('\n');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('companyProfile', 'tab', user.id))
    .setPlaceholder('Выберите раздел')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Профиль')
        .setValue('profile')
        .setDefault(true)
        .setEmoji(formatEmoji('usernew'))
    );

  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      header,
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: infoLines },
      buildSeparator(),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
    ]
  };

  return [container];
}