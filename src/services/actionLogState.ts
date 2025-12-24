type BanKey = `${string}:${string}`;
type RoleKey = `${string}:${string}:${string}`;
type TrafficKey = `${string}:${string}`;

export type BanInfo = {
  reason: string | null;
  createdAt: Date;
  moderatorId: string | null;
};

export type TempRoleInfo = {
  guildId: string;
  userId: string;
  roleId: string;
  durationLabel: string;
  expiresAt: Date;
  moderatorId: string;
};

export type TrafficInfo = {
  inviterId: string | null;
};

const banHistory = new Map<BanKey, BanInfo>();
const tempRoles = new Map<RoleKey, TempRoleInfo>();
const trafficInviters = new Map<TrafficKey, TrafficInfo>();

export function setBanInfo(guildId: string, userId: string, info: BanInfo) {
  banHistory.set(`${guildId}:${userId}`, info);
}

export function getBanInfo(guildId: string, userId: string): BanInfo | null {
  return banHistory.get(`${guildId}:${userId}`) ?? null;
}

export function clearBanInfo(guildId: string, userId: string) {
  banHistory.delete(`${guildId}:${userId}`);
}

export function addTempRole(info: TempRoleInfo) {
  tempRoles.set(`${info.guildId}:${info.userId}:${info.roleId}`, info);
}

export function consumeTempRole(guildId: string, userId: string, roleId: string): TempRoleInfo | null {
  const key: RoleKey = `${guildId}:${userId}:${roleId}`;
  const value = tempRoles.get(key) ?? null;
  if (value) tempRoles.delete(key);
  return value;
}

export function setTrafficInviter(guildId: string, userId: string, inviterId: string | null) {
  trafficInviters.set(`${guildId}:${userId}`, { inviterId });
}

export function consumeTrafficInviter(guildId: string, userId: string): TrafficInfo | null {
  const key: TrafficKey = `${guildId}:${userId}`;
  const value = trafficInviters.get(key) ?? null;
  if (value) trafficInviters.delete(key);
  return value;
}