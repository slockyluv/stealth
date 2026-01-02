import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type Guild,
  type TopLevelComponentData,
  type ContainerComponentData
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import {
  type ContinentId,
  type Country,
  getContinent,
  getContinents,
  resolveEmojiIdentifier
} from '../settings/countriesView.js';
import { getAvailableCountries } from '../../../services/countryRegistrationService.js';

function buildContinentOptions(
  continents: ReturnType<typeof getContinents>,
  formatEmoji: (id: string) => string
) {
  return continents.map((continent) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(continent.label)
      .setValue(continent.id)
      .setEmoji(resolveEmojiIdentifier(continent.emoji, formatEmoji))
  );
}

function buildCountryOptions(countries: Country[], formatEmoji: (id: string) => string) {
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

const REG_COUNTRY_PAGE_SIZE = 15;

function clampPage(page: number, total: number): number {
  const safeTotal = Math.max(total, 1);
  return Math.min(Math.max(page, 1), safeTotal);
}

export async function buildRegistrationView(options: {
  guild: Guild;
  selectedContinentId?: ContinentId;
  page?: number;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild, selectedContinentId, page = 1 } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const worldEmoji = formatEmoji('worldpulse');
  const continents = getContinents();
  const selectedContinent = selectedContinentId ? getContinent(selectedContinentId) : null;
  const selectedContinentName = selectedContinent?.label ?? '';

  const continentRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildCustomId('registration', 'continent'))
      .setPlaceholder('Выберите континент')
      .addOptions(buildContinentOptions(continents, formatEmoji))
  );

  const baseComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${worldEmoji} Регистрация**`
    },
    { type: ComponentType.Separator, divider: true },
    {
      type: ComponentType.TextDisplay,
      content: [
        '*Чтобы зарегистрироваться выберите в выпадающем меню выбора сначала континент, а затем желаемую страну.*',
        '',
        `**Текущий континент:** ${selectedContinentName}`
      ].join('\n')
    }
  ];

  let containerComponents: ContainerComponentData['components'] = [...baseComponents, continentRow.toJSON()];

  if (selectedContinent) {
    const availableCountries = await getAvailableCountries(guild.id, selectedContinent.id);
    const totalPages = Math.max(Math.ceil(availableCountries.length / REG_COUNTRY_PAGE_SIZE), 1);
    const currentPage = clampPage(Number.isFinite(page) ? page : 1, totalPages);

    const countryRow = availableCountries.length
      ? new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(buildCustomId('registration', 'country', selectedContinent.id, `${currentPage}`))
            .setPlaceholder(
              totalPages > 1 ? `Выберите страну (${currentPage}/${totalPages})` : 'Выберите страну'
            )
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
              buildCountryOptions(
                paginateCountries(availableCountries, currentPage, REG_COUNTRY_PAGE_SIZE),
                formatEmoji
              )
            )
        )
      : new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(buildCustomId('registration', 'country', selectedContinent.id, '1'))
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
        .setCustomId(buildCustomId('registration', 'back'))
        .setStyle(ButtonStyle.Secondary)
        .setLabel('Назад')
        .setEmoji(formatEmoji('undonew')),
      new ButtonBuilder()
        .setCustomId(buildCustomId('registration', 'page', selectedContinent.id, `${currentPage - 1}`))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(formatEmoji('anglesmallleft'))
        .setDisabled(currentPage <= 1 || totalPages <= 1),
      new ButtonBuilder()
        .setCustomId(buildCustomId('registration', 'page', selectedContinent.id, `${currentPage + 1}`))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(formatEmoji('anglesmallright'))
        .setDisabled(currentPage >= totalPages || totalPages <= 1)
    );

    containerComponents = [...baseComponents, { type: ComponentType.Separator, divider: true }, countryRow.toJSON(), paginationRow.toJSON()];
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