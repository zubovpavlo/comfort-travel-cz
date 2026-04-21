export function formatPrice(czk: number): string {
  return `${Math.round(czk).toLocaleString('cs-CZ')} Kč`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('cs-CZ');
}

export function formatScore(score: number): string {
  return (score * 100).toFixed(0);
}
