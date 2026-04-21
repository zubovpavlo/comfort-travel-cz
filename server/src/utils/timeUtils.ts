/**
 * Convert "HH:MM" or "HH:MM:SS" to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Get day of week (1=Mon..7=Sun) from a date string "YYYY-MM-DD".
 */
export function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr);
  const jsDay = date.getDay(); // 0=Sun, 1=Mon..6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Format minutes as "Xh Ym".
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
