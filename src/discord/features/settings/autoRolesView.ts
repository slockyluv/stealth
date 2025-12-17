import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Guild,
  roleMention,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type AttachmentPayload,
  type ContainerComponentData,
  type MessageActionRowComponentBuilder,
  type Role,
  type TopLevelComponentData
} from 'discord.js';
import { join } from 'node:path';
import { buildCustomId } from '../../../shared/customId.js';

const PAGE_SIZE = 15;
const SETTINGS_BANNER_NAME = 'banner.png';
const SETTINGS_BANNER_PATH = join(process.cwd(), 'src/assets/settings/banner.png');

export type SettingsView = {
  components: TopLevelComponentData[];
  files?: AttachmentPayload[];
  removeAttachments?: boolean;
};

function resolveColorEmoji(role: Role): string {
  if (role.color === 0) return '⚪';

  const [r, g, b] = [
    (role.color >> 16) & 0xff,
    (role.color >> 8) & 0xff,
    role.color & 0xff
  ];

  if (r === g && g === b) return '⚫';
  if (r >= g && r >= b) return '🔴';
  if (g >= r && g >= b) return '🟢';
  return '🔵';
}

function buildSelectedRolesDescription(selectedRoleIds: string[], roles: Role[]): string {
  if (selectedRoleIds.length === 0) {
    return 'Воспользуйтесь выпадающим меню выбора для назначения автоматических ролей\n\n> ➜ Роли ещё не выбраны';
  }

  const roleMap = new Map(roles.map((role) => [role.id, role]));

  const lines = selectedRoleIds.map((id) => {
    const role = roleMap.get(id);
    const mention = role ? roleMention(role.id) : `<@&${id}>`;
    return `> ➜ ${mention}`;
  });

  const formatted = lines.join('\n\n');

  return ['Воспользуйтесь выпадающим меню выбора для назначения автоматических ролей', '', formatted].join('\n');
}

function buildPlaceholder(page: number, selectedInPage: Role[]): string {
  if (selectedInPage.length === 0) {
    return `Роли не выбраны ( Страница ${page} )`;
  }

  const mentions = selectedInPage.map((role) => roleMention(role.id)).join(', ');
  return `${mentions} ( Страница ${page} )`;
}

export async function buildAutoRolesView(options: {
  guild: Guild;
  selectedRoleIds: string[];
  page?: number;
}): Promise<SettingsView & { currentPage: number; totalPages: number; pageRoles: Role[] }> {
  const { guild, selectedRoleIds } = options;
  const requestedPage = options.page ?? 1;

  const roles = await guild.roles.fetch();
  const botMember = guild.members.me;

  const manageableRoles = Array.from(roles.values())
    .filter((role) => role.id !== guild.id)
    .filter((role) => !role.managed)
    .filter((role) => (botMember ? botMember.roles.highest.comparePositionTo(role) > 0 : true))
    .sort((a, b) => b.position - a.position);

  const totalPages = Math.max(Math.ceil(manageableRoles.length / PAGE_SIZE), 1);
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRoles = manageableRoles.slice(start, start + PAGE_SIZE);

  const selectedSet = new Set(selectedRoleIds);
  const selectedInPage = pageRoles.filter((role) => selectedSet.has(role.id));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('settings', 'autoRoles', String(currentPage)))
    .setPlaceholder(buildPlaceholder(currentPage, selectedInPage))
    .setMinValues(0)
    .setMaxValues(Math.max(1, pageRoles.length));

  if (pageRoles.length === 0) {
    selectMenu
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Нет доступных ролей')
          .setValue('none')
          .setDescription('Бот не может управлять ролями на этом сервере')
      )
      .setDisabled(true);
  } else {
    for (const role of pageRoles) {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(role.name)
          .setValue(role.id)
          .setEmoji({ name: resolveColorEmoji(role) })
          .setDefault(selectedSet.has(role.id))
      );
    }
  }

  const description = buildSelectedRolesDescription(selectedRoleIds, manageableRoles);

  const navigationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'back'))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Назад')
      .setEmoji('↩️'),
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'clearRoles', String(currentPage)))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Очистить список ролей')
      .setEmoji('🧹')
      .setDisabled(selectedRoleIds.length === 0),
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'autoPrev', String(currentPage)))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Предыдущая')
      .setEmoji('◀️')
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'autoNext', String(currentPage)))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Следующая')
      .setEmoji('▶️')
      .setDisabled(currentPage >= totalPages)
  );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const framed: ContainerComponentData = {
    type: ComponentType.Container,
    accentColor: 0x2b2d31,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: ['**Автоматические роли**', description].join('\n')
      },
      {
        type: ComponentType.TextDisplay,
        content: `Страница ${currentPage} / ${totalPages}`
      },
      selectRow.toJSON(),
      navigationRow.toJSON()
    ]
  };

  return {
    components: [framed],
    currentPage,
    totalPages,
    pageRoles,
    removeAttachments: true
  };
}

export function buildSettingsMainView(guild: Guild): SettingsView {
  const bannerAttachment: AttachmentPayload = {
    attachment: SETTINGS_BANNER_PATH,
    name: SETTINGS_BANNER_NAME,
    description: 'Баннер настроек'
  };

  const description = [
    '**Настройки сервера**',
    'Перед началом изучите основные требования, затем выберите нужный раздел ниже.',
    '',
    '**Требования:**',
    '• Иметь 15+ лет',
    '• Сохранять стрессоустойчивость и адекватность',
    '• Знать правила сервера',
    '• Уметь работать в коллективе и помогать другим'
  ].join('\n');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('settings', 'section'))
    .setPlaceholder('Выберите параметр для настройки')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Автоматические роли')
        .setValue('auto_roles')
        .setDescription('Настройка автоматической выдачи ролей новым участникам')
        .setEmoji('🛡️')
    );

  const framed: ContainerComponentData = {
    type: ComponentType.Container,
    components: [
      {
        type: ComponentType.File,
        file: {
          url: `attachment://${SETTINGS_BANNER_NAME}`
        },
        spoiler: false
      },
      {
        type: ComponentType.TextDisplay,
        content: description
      },
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
    ]
  };

  return {
    components: [framed],
    files: [bannerAttachment]
  };
}