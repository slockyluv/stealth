import type { ContinentId } from '../discord/features/settings/countriesView.js';

export type RedomiciliationSelection = {
  countryName: string;
  countryKey: string;
  continentId: ContinentId;
};

const selections = new Map<string, RedomiciliationSelection>();

function buildKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function setRedomiciliationSelection(
  guildId: string,
  userId: string,
  selection: RedomiciliationSelection
): void {
  selections.set(buildKey(guildId, userId), selection);
}

export function getRedomiciliationSelection(guildId: string, userId: string): RedomiciliationSelection | null {
  return selections.get(buildKey(guildId, userId)) ?? null;
}

export function clearRedomiciliationSelection(guildId: string, userId: string): void {
  selections.delete(buildKey(guildId, userId));
}