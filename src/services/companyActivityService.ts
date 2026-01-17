import type { ContinentId } from '../discord/features/settings/countriesView.js';
import type { RedomiciliationInfrastructureItemKey } from './redomiciliationService.js';

export type CompanyActivitySelection = {
  countryName: string;
  countryKey: string;
  continentId: ContinentId;
};

export type CompanyActivityTaskKey = 'geography' | 'infrastructure';

export type CompanyActivityTaskState = {
  geographyStarted: boolean;
  geographyDone: boolean;
  infrastructureStarted: boolean;
  infrastructureDone: boolean;
};

const selections = new Map<string, CompanyActivitySelection>();
const taskStates = new Map<string, CompanyActivityTaskState>();
const infrastructureItems = new Map<string, Set<RedomiciliationInfrastructureItemKey>>();

function buildKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function setCompanyActivitySelection(
  guildId: string,
  userId: string,
  selection: CompanyActivitySelection
): void {
  selections.set(buildKey(guildId, userId), selection);
}

export function getCompanyActivitySelection(guildId: string, userId: string): CompanyActivitySelection | null {
  return selections.get(buildKey(guildId, userId)) ?? null;
}

export function clearCompanyActivitySelection(guildId: string, userId: string): void {
  selections.delete(buildKey(guildId, userId));
}

export function getCompanyActivityInfrastructureState(
  guildId: string,
  userId: string
): Set<RedomiciliationInfrastructureItemKey> {
  return new Set(infrastructureItems.get(buildKey(guildId, userId)) ?? []);
}

export function markCompanyActivityInfrastructureItemDone(
  guildId: string,
  userId: string,
  item: RedomiciliationInfrastructureItemKey
): Set<RedomiciliationInfrastructureItemKey> {
  const key = buildKey(guildId, userId);
  const current = infrastructureItems.get(key) ?? new Set<RedomiciliationInfrastructureItemKey>();
  current.add(item);
  infrastructureItems.set(key, current);
  return new Set(current);
}

export function clearCompanyActivityInfrastructureState(guildId: string, userId: string): void {
  infrastructureItems.delete(buildKey(guildId, userId));
}

function buildDefaultTaskState(): CompanyActivityTaskState {
  return {
    geographyStarted: false,
    geographyDone: false,
    infrastructureStarted: false,
    infrastructureDone: false
  };
}

export function getCompanyActivityTaskState(guildId: string, userId: string): CompanyActivityTaskState {
  return taskStates.get(buildKey(guildId, userId)) ?? buildDefaultTaskState();
}

export function markCompanyActivityTaskStarted(
  guildId: string,
  userId: string,
  task: CompanyActivityTaskKey
): CompanyActivityTaskState {
  const current = getCompanyActivityTaskState(guildId, userId);
  const updated: CompanyActivityTaskState = {
    ...current,
    ...(task === 'geography'
      ? { geographyStarted: true }
      : {
          infrastructureStarted: true
        })
  };

  taskStates.set(buildKey(guildId, userId), updated);
  return updated;
}

export function markCompanyActivityTaskDone(
  guildId: string,
  userId: string,
  task: CompanyActivityTaskKey
): CompanyActivityTaskState {
  const current = getCompanyActivityTaskState(guildId, userId);
  const updated: CompanyActivityTaskState = {
    ...current,
    ...(task === 'geography'
      ? { geographyStarted: true, geographyDone: true }
      : {
          infrastructureStarted: true,
          infrastructureDone: true
        })
  };

  taskStates.set(buildKey(guildId, userId), updated);
  return updated;
}

export function clearCompanyActivityTasks(guildId: string, userId: string): void {
  taskStates.delete(buildKey(guildId, userId));
  clearCompanyActivityInfrastructureState(guildId, userId);
}