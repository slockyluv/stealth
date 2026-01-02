import {
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ButtonComponentData,
  type ComponentInContainerData,
  type Guild,
  type SectionComponentData,
  type TopLevelComponentData,
  type User
} from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
import { createEmojiFormatter } from '../emoji.js';
import { findCountryByKey, type CountryRegistrationRecord } from '../../services/countryRegistrationService.js';
import { getContinent, resolveEmojiIdentifier } from './settings/countriesView.js';
import { formatRegistration, type CountryProfile } from '../../services/countryProfileService.js';

type PoliticalField = 'ideology' | 'governmentForm' | 'stateStructure' | 'religion';

function buildSeparator(): ComponentInContainerData {
  return {
    type: ComponentType.Separator,
    divider: true
  };
}

function normalizePoliticalValue(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return '*Не выбрано*';
  if (trimmed.toLowerCase().startsWith('не выбра')) return '*Не выбрано*';
  return trimmed;
}

function buildPoliticalItem(options: {
  label: string;
  value: string;
  field: PoliticalField;
  userId: string;
  formatEmoji: (name: string) => string;
}): SectionComponentData {
  const button: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: buildCustomId('profile', 'edit', options.field, options.userId),
    label: 'Изменить',
    emoji: options.formatEmoji('edit')
  };

  return {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: `**${options.label}:** ${options.value}`
      }
    ],
    accessory: button
  };
}

export async function buildProfileView(options: {
  guild: Guild;
  user: User;
  registration: CountryRegistrationRecord;
  profile: CountryProfile;
}): Promise<TopLevelComponentData[]> {
  const { guild, user, registration, profile } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const countryLookup = findCountryByKey(registration.countryName);
  const continent = getContinent(countryLookup?.continentId ?? registration.continent);
  const country = countryLookup?.country;
  const countryEmoji = country ? resolveEmojiIdentifier(country.emoji, formatEmoji) : '🏳️';
  const countryLabel = `${countryEmoji} | ${country?.name ?? registration.countryName}`;
  const continentLabel = continent?.label ?? 'Неизвестно';

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

  const generalInfo = [
    `**${formatEmoji('information')} Общая информация**`,
     '',
    `**Государство:** ${countryLabel}`,
    `**Континент:** ${continentLabel}`,
    `**Зарегистрирован:** ${formatRegistration(profile)}`
  ].join('\n');

  const characteristics = [
    `**${formatEmoji('nav')} Характеристика**`,
     '',
    `**Правитель:** ${profile.ruler}`,
    `**Территория:** ${profile.territory}`,
    `**Население:** ${profile.population}`
  ].join('\n');

  const politicsHeader = `**${formatEmoji('point')} Политическое устройство**`;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('profile', 'tab', user.id))
    .setPlaceholder('Выберите раздел')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Профиль')
        .setValue('profile')
        .setDefault(true)
        .setEmoji(formatEmoji('usernew')),
      new StringSelectMenuOptionBuilder()
        .setLabel('Финансы')
        .setValue('finance')
        .setEmoji(formatEmoji('wallet'))
    );

  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      header,
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: generalInfo },
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: characteristics },
      buildSeparator(),
      { type: ComponentType.TextDisplay, content: politicsHeader },
      buildPoliticalItem({
        label: 'Идеология',
        value: normalizePoliticalValue(profile.ideology),
        field: 'ideology',
        userId: user.id,
        formatEmoji
      }),
      buildPoliticalItem({
        label: 'Форма правления',
        value: normalizePoliticalValue(profile.governmentForm),
        field: 'governmentForm',
        userId: user.id,
        formatEmoji
      }),
      buildPoliticalItem({
        label: 'Гос. устройство',
        value: normalizePoliticalValue(profile.stateStructure),
        field: 'stateStructure',
        userId: user.id,
        formatEmoji
      }),
      buildPoliticalItem({
        label: 'Религия',
        value: normalizePoliticalValue(profile.religion),
        field: 'religion',
        userId: user.id,
        formatEmoji
      }),
      buildSeparator(),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
    ]
  };

  return [container];
}