export function normalizeEmojiColor(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(normalized)) return null;

  return normalized.toUpperCase();
}