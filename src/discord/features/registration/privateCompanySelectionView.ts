import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ContainerComponentData,
  type Guild,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import {
  COMPANY_INDUSTRIES,
  getAvailableCompanyCountries
} from '../../../services/privateCompanyService.js';
import {
  getContinent,
  getContinents,
  resolveEmojiIdentifier,
  type ContinentId,
  type Country
} from '../settings/countriesView.js';

const COMPANY_COUNTRY_PAGE_SIZE = 15;

function buildIndustryOptions(formatEmoji: (name: string) => string) {
  return COMPANY_INDUSTRIES.map((industry) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(industry.label)
      .setValue(industry.key)
      .setEmoji(resolveEmojiIdentifier(industry.emoji, formatEmoji))
  );
}

function buildContinentOptions(formatEmoji: (name: string) => string) {
  return getContinents().map((continent) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(continent.label)
      .setValue(continent.id)
      .setEmoji(resolveEmojiIdentifier(continent.emoji, formatEmoji))
  );
}

function buildCountryOptions(countries: Country[], formatEmoji: (name: string) => string) {
  return countries.map((country) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(country.name)
      .setValue(country.name)
      .setEmoji(resolveEmojiIdentifier(country.emoji, formatEmoji))
  );
}

function paginateCountries(countries: Country[], page: number, pageSize: number): Country[] {
  const startIndex = (page - 1) * pageSize;
  return countries.slice(startIndex, startIndex + pageSize);
}

function clampPage(page: number, total: number): number {
  const safeTotal = Math.max(total, 1);
  return Math.min(Math.max(page, 1), safeTotal);
}

export async function buildCompanyIndustrySelectionView(options: {
  guild: Guild;
  messageId: string;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild, messageId } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildCustomId('companyReg', 'industry', messageId))
      .setPlaceholder('Выберите отрасль')
      .addOptions(buildIndustryOptions(formatEmoji))
  );

  const containerComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('staff_warn')} Выберите одну из предложенных вариантов вида отрасли компании!**`
    },
    { type: ComponentType.Separator, divider: true },
    {
      type: ComponentType.TextDisplay,
      content: COMPANY_INDUSTRIES.map((industry) => `・${industry.label}`).join('\n')
    },
    { type: ComponentType.Separator, divider: true },
    menuRow.toJSON()
  ];

  return {
    components: [
      {
        type: ComponentType.Container,
        components: containerComponents
      }
    ]
  };
}

export async function buildCompanyCountrySelectionView(options: {
  guild: Guild;
  messageId: string;
  selectedContinentId?: ContinentId;
  page?: number;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild, messageId, selectedContinentId, page = 1 } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const baseComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('worldpulse')} Страны регистрации компании**`
    },
    { type: ComponentType.Separator, divider: true },
    {
      type: ComponentType.TextDisplay,
      content: '*Выберите континент, а затем страну для регистрации компании.*'
    }
  ];

  const continentRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildCustomId('companyReg', 'continent', messageId))
      .setPlaceholder('Выберите континент')
      .addOptions(buildContinentOptions(formatEmoji))
  );

  let containerComponents: ContainerComponentData['components'] = [...baseComponents, continentRow.toJSON()];

  const selectedContinent = selectedContinentId ? getContinent(selectedContinentId) : null;
  if (selectedContinent) {
    const availableCountries = await getAvailableCompanyCountries(guild.id, selectedContinent.id);
    const totalPages = Math.max(Math.ceil(availableCountries.length / COMPANY_COUNTRY_PAGE_SIZE), 1);
    const currentPage = clampPage(Number.isFinite(page) ? page : 1, totalPages);

    const countryRow = availableCountries.length
      ? new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(buildCustomId('companyReg', 'country', messageId, selectedContinent.id, `${currentPage}`))
            .setPlaceholder('Выберите страну')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
              buildCountryOptions(
                paginateCountries(availableCountries, currentPage, COMPANY_COUNTRY_PAGE_SIZE),
                formatEmoji
              )
            )
        )
      : new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(buildCustomId('companyReg', 'country', messageId, selectedContinent.id, '1'))
            .setPlaceholder('Свободных стран нет')
            .setMinValues(1)
            .setMaxValues(1)
            .setDisabled(true)
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel('Свободных стран нет')
                .setValue('unavailable')
                .setEmoji(formatEmoji('worldpulse'))
            )
        );

    const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId('companyReg', 'back', messageId))
        .setStyle(ButtonStyle.Secondary)
        .setLabel('Назад')
        .setEmoji(formatEmoji('undonew')),
      new ButtonBuilder()
        .setCustomId(buildCustomId('companyReg', 'page', messageId, selectedContinent.id, `${currentPage - 1}`))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(formatEmoji('anglesmallleft'))
        .setDisabled(currentPage <= 1 || totalPages <= 1),
      new ButtonBuilder()
        .setCustomId(buildCustomId('companyReg', 'page', messageId, selectedContinent.id, `${currentPage + 1}`))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(formatEmoji('anglesmallright'))
        .setDisabled(currentPage >= totalPages || totalPages <= 1)
    );

    containerComponents = [
      ...baseComponents,
      { type: ComponentType.Separator, divider: true },
      countryRow.toJSON(),
      paginationRow.toJSON()
    ];
  }

  return {
    components: [
      {
        type: ComponentType.Container,
        components: containerComponents
      }
    ]
  };
}