import { ComponentType, type Guild, type SeparatorComponentData, type APIMessageComponentEmoji } from 'discord.js';

export const MESSAGE_SEPARATOR_COMPONENT: SeparatorComponentData = { type: ComponentType.Separator };

export const NABOR_BANNER_NAME = 'nabor.png';
export const NABOR_BANNER_PATH = `${process.cwd()}/src/assets/settings/${NABOR_BANNER_NAME}`;

export const rulesChannelId = '1373273403775127555';
export const reviewChannelId = '1446861281427587142';

export const APPROVE_EMOJI = { name: 'slide_d' } as const;
export const REJECT_EMOJI = { name: 'action_basket' } as const;
export const PLUS_EMOJI = { name: 'plus' } as const;

export function formatEmoji(emoji: { name: string; id?: string }, guild?: Guild | null): string {
  const matched = guild?.emojis.cache.find(
    (item) => item.name === emoji.name || (!!emoji.id && item.id === emoji.id)
  );

  if (matched) {
    return matched.toString();
  }

  if (emoji.id) {
    return `<:${emoji.name}:${emoji.id}>`;
  }

  return `:${emoji.name}:`;
}

export function resolveComponentEmoji(
  emoji: { name: string; id?: string },
  guild?: Guild | null
): APIMessageComponentEmoji {
  const matched = guild?.emojis.cache.find(
    (item) => item.name === emoji.name || (!!emoji.id && item.id === emoji.id)
  );

  if (matched) {
    return { id: matched.id, name: matched.name, animated: matched.animated ?? undefined };
  }

  if (emoji.id) {
    return { id: emoji.id, name: emoji.name };
  }

  return { name: emoji.name };
}

export const vacancyReviewRoles: Record<string, string[]> = {
  application_answer_moderator: [],
  application_answer_curatorofwar: [],
  application_answer_curatorofrp: [],
  application_answer_eventer: [],
  application_answer_anketolog: [],
  application_answer_kartograph: []
};

export const vacancyApproveRoles: Record<string, string[]> = {
  application_giverole_moderator: [],
  application_giverole_curatorofwar: [],
  application_giverole_curatorofrp: [],
  application_giverole_eventer: [],
  application_giverole_anketolog: [],
  application_giverole_kartograph: []
};

export type VacancyKey =
  | 'moderator'
  | 'curatorofwar'
  | 'curatorofrp'
  | 'anketolog'
  | 'kartograph'
  | 'eventer';

export type VacancyConfig = {
  key: VacancyKey;
  label: string;
  mentionLine: string;
};

export const vacancies: VacancyConfig[] = [
  { key: 'moderator', label: '・Moderator', mentionLine: '・<@&1453660268956614777>' },
  { key: 'curatorofwar', label: '・Curator of War', mentionLine: '・<@&1453663593378615371>' },
  { key: 'curatorofrp', label: '・Curator of RP', mentionLine: '・<@&1453680874267611136>' },
  { key: 'anketolog', label: '・Анкетолог', mentionLine: '・<@&1453661194115223625>' },
  { key: 'eventer', label: '・Eventer', mentionLine: ' ・<@&1454781576985706588>' },
  { key: 'kartograph', label: '・Картограф', mentionLine: '・<@&1453666531849277572>' }
];

export function resolveVacancy(key: string | undefined): VacancyConfig | null {
  return vacancies.find((vacancy) => vacancy.key === key) ?? null;
}

export function buildReviewRoleKey(vacancy: VacancyConfig): keyof typeof vacancyReviewRoles {
  return (`application_answer_${vacancy.key}`) as keyof typeof vacancyReviewRoles;
}

export function buildApproveRoleKey(vacancy: VacancyConfig): keyof typeof vacancyApproveRoles {
  return (`application_giverole_${vacancy.key}`) as keyof typeof vacancyApproveRoles;
}