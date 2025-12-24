const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'medium'
});

const DURATION_UNITS: { label: string; value: number }[] = [
  { label: 'д', value: 24 * 60 * 60 * 1000 },
  { label: 'ч', value: 60 * 60 * 1000 },
  { label: 'м', value: 60 * 1000 },
  { label: 'с', value: 1000 }
];

export function formatDateTime(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDuration(ms: number): string {
  const totalMs = Math.abs(ms);

  if (!Number.isFinite(totalMs) || totalMs === 0) return '0с';

  const parts: string[] = [];
  let remaining = totalMs;

  for (const unit of DURATION_UNITS) {
    if (remaining < unit.value) continue;

    const value = Math.floor(remaining / unit.value);
    remaining -= value * unit.value;
    parts.push(`${value}${unit.label}`);
  }

  return parts.join(' ');
}

export function formatRelative(target: Date): string {
  const diff = target.getTime() - Date.now();
  const label = formatDuration(diff);

  if (!label) return 'сейчас';
  return diff >= 0 ? `через ${label}` : `${label} назад`;
}