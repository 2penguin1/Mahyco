import { format } from 'date-fns';

/** Parse yyyy-MM-dd as local calendar date (avoids UTC off-by-one from parseISO). */
export function parseIsoDateLocal(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parts = iso.split('-');
  if (parts.length !== 3) return undefined;
  const [y, m, d] = parts.map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return undefined;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

export function formatIsoDateLocal(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}
