import {
  ActionRowBuilder,
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
  getContinents
} from '../settings/countriesView.js';
import { getAvailableCountries } from '../../../services/countryRegistrationService.js';

function buildContinentOptions(continents: ReturnType<typeof getContinents>, formatEmoji: (id: string) => string) {
  return continents.map((continent) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(continent.label)
      .setValue(continent.id)
      .setEmoji(formatEmoji(continent.emoji))
  );
}

function buildCountryOptions(countries: Country[], formatEmoji: (id: string) => string) {
  return countries.map((country) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(country.name)
      .setValue(country.name)
      .setEmoji(formatEmoji(country.emoji))
  );
}

function chunkCountries(countries: Country[], chunkSize: number) {
  const chunks: Country[][] = [];
  for (let i = 0; i < countries.length; i += chunkSize) {
    chunks.push(countries.slice(i, i + chunkSize));
  }

  return chunks;
}

export async function buildRegistrationView(options: {
  guild: Guild;
  selectedContinentId?: ContinentId;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild, selectedContinentId } = options;

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const worldEmoji = formatEmoji('worldpulse');
  const continents = getContinents();
  const continentRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildCustomId('registration', 'continent'))
      .setPlaceholder('Выберите континент')
      .addOptions(buildContinentOptions(continents, formatEmoji))
  );

  let containerComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: [`${worldEmoji} Автоматическая регистрация государства`, '', '1) Выберите континент.', '2) Выберите свободную страну.'].join(
        '\n'
      )
    },
    { type: ComponentType.Separator, divider: true },
    continentRow.toJSON()
  ];
  let selectedContinentName = 'не выбран';

  if (selectedContinentId) {
    const continent = getContinent(selectedContinentId);

    if (continent) {
      selectedContinentName = continent.label;
      const availableCountries = await getAvailableCountries(guild.id, selectedContinentId);
      const countryRows = availableCountries.length
        ? chunkCountries(availableCountries, 25).map((chunk, index, chunks) => {
            const countryOptions = buildCountryOptions(chunk, formatEmoji);
            const placeholder =
              chunks.length > 1 ? `Выберите страну (стр. ${index + 1}/${chunks.length})` : 'Выберите страну';

            return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(buildCustomId('registration', 'country', continent.id, `${index}`))
                .setPlaceholder(placeholder)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(countryOptions)
            );
          })
        : [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(buildCustomId('registration', 'country', continent.id, '0'))
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
            )
          ];

      containerComponents = [
        ...containerComponents,
        { type: ComponentType.Separator, divider: true },
        ...countryRows.map((row) => row.toJSON())
      ];
    }
  }

  return {
    components: [
      {
        type: ComponentType.Container,
        components: [
          ...containerComponents,
          {
            type: ComponentType.TextDisplay,
            content: `Текущий континент: **${selectedContinentName}**`
          }
        ]
      }
    ]
  };
}