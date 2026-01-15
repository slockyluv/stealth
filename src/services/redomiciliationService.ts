import type { ContinentId } from '../discord/features/settings/countriesView.js';

export type RedomiciliationSelection = {
  countryName: string;
  countryKey: string;
  continentId: ContinentId;
};

export type RedomiciliationTaskKey = 'jurisdiction' | 'infrastructure';

export type RedomiciliationTaskState = {
  jurisdictionStarted: boolean;
  jurisdictionDone: boolean;
  infrastructureStarted: boolean;
  infrastructureDone: boolean;
};

export type RedomiciliationInfrastructureItemKey =
  | 'mainOffice'
  | 'serverInfrastructure'
  | 'productionInfrastructure'
  | 'mainEquipment'
  | 'supportEquipment';

const selections = new Map<string, RedomiciliationSelection>();
const taskStates = new Map<string, RedomiciliationTaskState>();
const infrastructureItems = new Map<string, Set<RedomiciliationInfrastructureItemKey>>();

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

export function getRedomiciliationInfrastructureState(
  guildId: string,
  userId: string
): Set<RedomiciliationInfrastructureItemKey> {
  return new Set(infrastructureItems.get(buildKey(guildId, userId)) ?? []);
}

export function markRedomiciliationInfrastructureItemDone(
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

export function clearRedomiciliationInfrastructureState(guildId: string, userId: string): void {
  infrastructureItems.delete(buildKey(guildId, userId));
}

function buildDefaultTaskState(): RedomiciliationTaskState {
  return {
    jurisdictionStarted: false,
    jurisdictionDone: false,
    infrastructureStarted: false,
    infrastructureDone: false
  };
}

export function getRedomiciliationTaskState(guildId: string, userId: string): RedomiciliationTaskState {
  return taskStates.get(buildKey(guildId, userId)) ?? buildDefaultTaskState();
}

export function markRedomiciliationTaskStarted(
  guildId: string,
  userId: string,
  task: RedomiciliationTaskKey
): RedomiciliationTaskState {
  const current = getRedomiciliationTaskState(guildId, userId);
  const updated: RedomiciliationTaskState = {
    ...current,
    ...(task === 'jurisdiction'
      ? { jurisdictionStarted: true }
      : {
          infrastructureStarted: true
        })
  };

  taskStates.set(buildKey(guildId, userId), updated);
  return updated;
}

export function markRedomiciliationTaskDone(
  guildId: string,
  userId: string,
  task: RedomiciliationTaskKey
): RedomiciliationTaskState {
  const current = getRedomiciliationTaskState(guildId, userId);
  const updated: RedomiciliationTaskState = {
    ...current,
    ...(task === 'jurisdiction'
      ? { jurisdictionStarted: true, jurisdictionDone: true }
      : {
          infrastructureStarted: true,
          infrastructureDone: true
        })
  };

  taskStates.set(buildKey(guildId, userId), updated);
  return updated;
}

export function clearRedomiciliationTasks(guildId: string, userId: string): void {
  taskStates.delete(buildKey(guildId, userId));
  clearRedomiciliationInfrastructureState(guildId, userId);
}