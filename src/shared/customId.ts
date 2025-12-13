import type { CustomIdParts } from '../types/component.js';

const SAFE_PART = /^[a-z0-9_-]{1,32}$/i;

/**
 * Формат customId:
 *   scope:action:arg1:arg2:...
 * Ограничение Discord: customId <= 100 символов.
 */
export function buildCustomId(scope: string, action: string, ...args: string[]): string {
  const parts = [scope, action, ...args];

  for (const p of parts) {
    if (!SAFE_PART.test(p)) {
      throw new Error(`Invalid customId part "${p}". Use [a-z0-9_-] and max 32 chars per part.`);
    }
  }

  const id = parts.join(':');
  if (id.length > 100) throw new Error(`customId too long (${id.length}). Must be <= 100.`);
  return id;
}

export function parseCustomId(customId: string): CustomIdParts | null {
  if (!customId || customId.length > 100) return null;

  const parts = customId.split(':');
  if (parts.length < 2) return null;

  const [scope, action, ...args] = parts;
  if (!scope || !action) return null;
  if (!SAFE_PART.test(scope) || !SAFE_PART.test(action)) return null;

  for (const a of args) {
    if (!a || !SAFE_PART.test(a)) return null;
  }

  return { scope, action, args };
}

export function customIdKey(parts: Pick<CustomIdParts, 'scope' | 'action'>): string {
  return `${parts.scope}:${parts.action}`;
}