import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return key;
  return key.slice(0, 7) + '...' + key.slice(-4);
}

/**
 * Format an enum-like value (e.g. "TO_BE_REVIEWED", "PASSED") into a human label.
 * Examples:
 * - "TO_BE_REVIEWED" -> "To be reviewed"
 * - "REVIEWED" -> "Reviewed"
 * - "UNUSED" -> "Unused"
 * - "PASSED" -> "Passed"
 */
export function formatEnumLabel(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = String(value).toLowerCase();
  const parts = normalized.split('_').filter(Boolean);
  if (parts.length === 0) return '';
  const [first, ...rest] = parts;
  const capitalize = (s: string) => (s.length ? s[0].toUpperCase() + s.slice(1) : s);
  return [capitalize(first), ...rest].join(' ');
}

export function formatGoldOutput(value: Record<string, unknown> | null | undefined): string {
  if (!value) return '-';
  const entries = Object.entries(value);
  if (entries.length === 0) return '-';

  const parts = entries
    .map(([key, rawValue]) => {
      if (rawValue === null || rawValue === undefined || rawValue === '') return null;
      const display =
        typeof rawValue === 'object' && 'value' in (rawValue as Record<string, unknown>)
          ? String((rawValue as { value?: unknown }).value ?? '')
          : String(rawValue);
      if (!display.trim()) return null;
      return `${key} - ${display}`;
    })
    .filter(Boolean) as string[];

  if (parts.length > 0) return parts.join('\n');

  const raw = JSON.stringify(value);
  return raw.length > 120 ? `${raw.slice(0, 120)}...` : raw;
}
