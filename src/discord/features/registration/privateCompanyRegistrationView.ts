import {
  ButtonStyle,
  ComponentType,
  type ButtonComponentData,
  type ContainerComponentData,
  type Guild,
  type SectionComponentData,
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

  const canCreate = Boolean(draft?.name && draft?.industryKey && draft?.countryKey && draft?.continent);

  const createButton: ButtonComponentData = {
    type: ComponentType.Button,
    customId: buildCustomId('companyReg', 'create'),
    style: ButtonStyle.Secondary,
    emoji: formatEmoji('documentgavel'),
    label: 'Создать компанию',
    disabled: !canCreate
  };

  const spacer = '\u200B';

  const buildEditableSection = (options: {
    label: string;
    value: string;
    customId: string;
  }): SectionComponentData => ({
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${options.label}:**`, `> ${options.value}`].join('\n')
      }
    ],
    accessory: {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      customId: options.customId,
      label: 'Редактировать',
      emoji: formatEmoji('edit')
    }
  });
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
    buildEditableSection({
      label: `${formatEmoji('infocompany')} Название`,
      value: nameLabel,
      customId: buildCustomId('companyReg', 'editName')
    }),
    {
      type: ComponentType.TextDisplay,
      content: spacer
    },
    buildEditableSection({
      label: `${formatEmoji('infocompany')} Отрасль`,
      value: industryLabel,
      customId: buildCustomId('companyReg', 'editIndustry')
    }),
    {
      type: ComponentType.TextDisplay,
      content: spacer
    },
    buildEditableSection({
      label: `${formatEmoji('worldpulse')} Страна регистрации`,
      value: countryLabel,
      customId: buildCustomId('companyReg', 'editCountry')
    }),
    { type: ComponentType.Separator, divider: true },
    {
      type: ComponentType.ActionRow,
      components: [createButton]
    }
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