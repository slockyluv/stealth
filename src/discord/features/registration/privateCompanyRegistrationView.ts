import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ContainerComponentData,
  type Guild,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import { getCompanyDraft } from '../../../services/privateCompanyService.js';
import { findCountryByKey } from '../../../services/countryRegistrationService.js';
import { resolveEmojiIdentifier } from '../settings/countriesView.js';

export async function buildPrivateCompanyRegistrationView(options: {
  guild: Guild;
  userId: string;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild, userId } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const draft = await getCompanyDraft(guild.id, userId);

  const nameLabel = draft?.name ?? '*Не выбрано*';
  const industryLabel = draft?.industryLabel ?? '*Не выбрано*';
  const countryLookup = draft?.countryKey ? findCountryByKey(draft.countryKey) : null;
  const countryEmoji = countryLookup?.country
    ? resolveEmojiIdentifier(countryLookup.country.emoji, formatEmoji)
    : '';
  const countryLabel = draft?.countryName
    ? `${countryEmoji ? `${countryEmoji} | ` : ''}${draft.countryName}`
    : '*Не выбрана*';

  const nameButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'editName'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('edit'))
      .setLabel('Редактировать')
  );

  const industryButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'editIndustry'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('edit'))
      .setLabel('Редактировать')
  );

  const countryButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'editCountry'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('edit'))
      .setLabel('Редактировать')
  );

  const canCreate = Boolean(draft?.name && draft?.industryKey && draft?.countryKey && draft?.continent);

  const createButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'create'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('documentgavel'))
      .setLabel('Создать компанию')
      .setDisabled(!canCreate)
  );

  const spacer = '\u200B';
  const containerComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('filialscomp')} Частная компания**\n*Это форма организации бизнеса, находящаяся в собственности частных лиц. Деятельность направлена на достижение коммерческих целей.*`
    },
    { type: ComponentType.Separator, divider: true },
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('documentgavel')} Регистрация:**`
    },
    {
      type: ComponentType.TextDisplay,
      content: spacer
    },
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('infocompany')} Название:**`
    },
    {
      type: ComponentType.TextDisplay,
      content: `> ${nameLabel}`
    },
    nameButtonRow.toJSON(),
    {
      type: ComponentType.TextDisplay,
      content: spacer
    },
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('infocompany')} Отрасль:**`
    },
    {
      type: ComponentType.TextDisplay,
      content: `> ${industryLabel}`
    },
    industryButtonRow.toJSON(),
    {
      type: ComponentType.TextDisplay,
      content: spacer
    },
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('worldpulse')} Страна регистрации:**`
    },
    {
      type: ComponentType.TextDisplay,
      content: `> ${countryLabel}`
    },
    countryButtonRow.toJSON(),
    { type: ComponentType.Separator, divider: true },
    createButtonRow.toJSON()
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