const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'medium'
});

type DurationUnit = 'day' | 'hour' | 'minute' | 'second';

const DURATION_UNITS: { label: DurationUnit; value: number; forms: [string, string, string] }[] = [
  { label: 'day', value: 24 * 60 * 60 * 1000, forms: ['день', 'дня', 'дней'] },
  { label: 'hour', value: 60 * 60 * 1000, forms: ['час', 'часа', 'часов'] },
  { label: 'minute', value: 60 * 1000, forms: ['минуту', 'минуты', 'минут'] },
  { label: 'second', value: 1000, forms: ['секунду', 'секунды', 'секунд'] }
];

export function pluralize(value: number, one: string, few: string, many: string): string {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function formatDateTime(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDuration(ms: number): string {
  const totalMs = Math.abs(ms);

  if (!Number.isFinite(totalMs) || totalMs === 0) return '0 секунд';

  const parts: string[] = [];
  let remaining = totalMs;

  for (const unit of DURATION_UNITS) {
    if (remaining < unit.value) continue;

    const value = Math.floor(remaining / unit.value);
    remaining -= value * unit.value;
    parts.push(`${value} ${pluralize(value, ...unit.forms)}`);
  }

  return parts.join(' ');
}

export function formatRelative(target: Date): string {
  const diff = target.getTime() - Date.now();
  const label = formatDuration(diff);

  if (!label) return 'сейчас';
  return diff >= 0 ? `через ${label}` : `${label} назад`;
}