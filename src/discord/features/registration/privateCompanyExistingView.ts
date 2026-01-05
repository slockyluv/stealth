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
import { getInactiveCompanies } from '../../../services/privateCompanyService.js';

const EXISTING_COMPANY_PAGE_SIZE = 15;

function buildCompanyOptions(companies: Array<{ id: bigint; name: string; industryLabel: string; countryName: string }>) {
  return companies.map((company) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(company.name)
      .setValue(company.id.toString())
      .setDescription(`${company.industryLabel} • ${company.countryName}`)
  );
}

function paginateCompanies<T>(companies: T[], page: number, pageSize: number): T[] {
  const startIndex = (page - 1) * pageSize;
  return companies.slice(startIndex, startIndex + pageSize);
}

function clampPage(page: number, total: number): number {
  const safeTotal = Math.max(total, 1);
  return Math.min(Math.max(page, 1), safeTotal);
}

export async function buildExistingCompanySelectionView(options: {
  guild: Guild;
  page?: number;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild, page = 1 } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const companies = await getInactiveCompanies(guild.id);
  const totalPages = Math.max(Math.ceil(companies.length / EXISTING_COMPANY_PAGE_SIZE), 1);
  const currentPage = clampPage(Number.isFinite(page) ? page : 1, totalPages);
  const pageCompanies = paginateCompanies(companies, currentPage, EXISTING_COMPANY_PAGE_SIZE);

  const menuRow = pageCompanies.length
    ? new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildCustomId('companyReg', 'existingSelect', `${currentPage}`))
          .setPlaceholder('Выберите компанию')
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(buildCompanyOptions(pageCompanies))
      )
    : new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildCustomId('companyReg', 'existingSelect', '1'))
          .setPlaceholder('Свободных компаний нет')
          .setMinValues(1)
          .setMaxValues(1)
          .setDisabled(true)
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('Свободных компаний нет')
              .setValue('unavailable')
          )
      );

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'existingBack'))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Назад')
      .setEmoji(formatEmoji('undonew')),
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'existingPage', `${currentPage - 1}`))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('anglesmallleft'))
      .setDisabled(currentPage <= 1 || totalPages <= 1),
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'existingPage', `${currentPage + 1}`))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('anglesmallright'))
      .setDisabled(currentPage >= totalPages || totalPages <= 1)
  );

  const containerComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('filialscomp')} Существующие частные компании**`
    },
    {
      type: ComponentType.TextDisplay,
      content: '*Выберите компанию для регистрации.*'
    },
    menuRow.toJSON(),
    { type: ComponentType.Separator, divider: true },
    buttonsRow.toJSON()
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