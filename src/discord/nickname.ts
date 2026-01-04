import type { GuildMember } from 'discord.js';
import type { Country } from './features/settings/countriesView.js';
import { buildCountryNickname, getCountryNicknameEmoji } from './features/settings/countriesView.js';
import { logger } from '../shared/logger.js';
import { getIndustryMarker } from '../services/privateCompanyService.js';

export type NicknameUpdateResult =
  | { status: 'updated' }
  | { status: 'skipped'; reason: 'unchanged' | 'notManageable' | 'missing' }
  | { status: 'failed' };

export async function updateCountryNickname(options: {
  member: GuildMember | null;
  country: Country;
}): Promise<NicknameUpdateResult> {
  const { member, country } = options;
  if (!member) {
    return { status: 'skipped', reason: 'missing' };
  }

  const nickname = buildCountryNickname(country);
  if (member.nickname === nickname) {
    return { status: 'skipped', reason: 'unchanged' };
  }

  if (!member.manageable) {
    return { status: 'skipped', reason: 'notManageable' };
  }

  try {
    await member.setNickname(nickname);
    return { status: 'updated' };
  } catch (error) {
    logger.error(error);
    return { status: 'failed' };
  }
}

export async function resetCountryNickname(options: { member: GuildMember | null }): Promise<NicknameUpdateResult> {
  const { member } = options;
  if (!member) {
    return { status: 'skipped', reason: 'missing' };
  }

  if (member.nickname === null) {
    return { status: 'skipped', reason: 'unchanged' };
  }

  if (!member.manageable) {
    return { status: 'skipped', reason: 'notManageable' };
  }

  try {
    await member.setNickname(null);
    return { status: 'updated' };
  } catch (error) {
    logger.error(error);
    return { status: 'failed' };
  }
}

function buildCompanyNickname(country: Country, marker: string, name: string): string {
  const emoji = getCountryNicknameEmoji(country);
  const prefix = `${emoji} | ${marker} `;
  const maxNameLength = 32 - prefix.length;
  if (maxNameLength <= 0) {
    return `${emoji} | ${marker}`.trim();
  }
  const trimmedName = name.trim();
  const finalName =
    trimmedName.length > maxNameLength
      ? `${trimmedName.slice(0, Math.max(0, maxNameLength - 1)).trimEnd()}…`
      : trimmedName;
  return `${emoji} | ${marker} ${finalName}`.trim();
}

export async function updateCompanyNickname(options: {
  member: GuildMember | null;
  country: Country;
  industryKey: string | null;
  companyName: string;
}): Promise<NicknameUpdateResult> {
  const { member, country, industryKey, companyName } = options;
  if (!member) {
    return { status: 'skipped', reason: 'missing' };
  }

  const marker = getIndustryMarker(industryKey);
  if (!marker || !companyName.trim()) {
    return { status: 'skipped', reason: 'missing' };
  }

  const nickname = buildCompanyNickname(country, marker, companyName);
  if (member.nickname === nickname) {
    return { status: 'skipped', reason: 'unchanged' };
  }

  if (!member.manageable) {
    return { status: 'skipped', reason: 'notManageable' };
  }

  try {
    await member.setNickname(nickname);
    return { status: 'updated' };
  } catch (error) {
    logger.error(error);
    return { status: 'failed' };
  }
}

export function formatNicknameUpdateNotice(
  formatEmoji: (name: string) => string,
  result: NicknameUpdateResult | null
): string {
  if (!result || result.status === 'updated') return '';
  if (result.status === 'skipped' && result.reason === 'unchanged') return '';
  return ` ${formatEmoji('staff_warn')} Никнейм обновить не удалось.`;
}

export function formatNicknameResetNotice(
  formatEmoji: (name: string) => string,
  result: NicknameUpdateResult | null
): string {
  if (!result || result.status === 'updated') return '';
  if (result.status === 'skipped' && result.reason === 'unchanged') return '';
  return ` ${formatEmoji('staff_warn')} Никнейм сбросить не удалось.`;
}