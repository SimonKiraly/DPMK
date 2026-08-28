/** Formatting helpers — locale-aware where it matters (Slovak). */

const pad = (n: number) => String(n).padStart(2, '0');

/** "14:32" from an ISO string or Date. */
export function formatClock(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "27. aug 2026" */
export function formatDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const months = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** "€1,10" — Slovak decimal comma. */
export function formatEuros(amount: number, withSign = false): string {
  const sign = amount < 0 ? '−' : withSign ? '+' : '';
  const abs = Math.abs(amount);
  return `${sign}€${abs.toFixed(2).replace('.', ',')}`;
}

/** Compact duration: "19 min", "1 h 05 min". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${pad(rem)} min`;
}

/** Countdown "MM:SS" or "H:MM:SS" for the active ticket. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "o 2 min", "teraz", "o 1 h" — relative departure. */
export function formatRelativeMinutes(minutes: number): string {
  if (minutes <= 0) return 'teraz';
  if (minutes < 60) return `o ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `o ${h} h` : `o ${h} h ${m} min`;
}

/** "pred 12 min", "pred 2 h", "včera" */
export function formatTimeAgo(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'práve teraz';
  if (min < 60) return `pred ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `pred ${h} h`;
  const days = Math.round(h / 24);
  if (days === 1) return 'včera';
  if (days < 7) return `pred ${days} dňami`;
  return formatDate(d);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
