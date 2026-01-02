import type { GuildMember } from 'discord.js';
import type { Country } from './features/settings/countriesView.js';
import { buildCountryNickname } from './features/settings/countriesView.js';
import { logger } from '../shared/logger.js';

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