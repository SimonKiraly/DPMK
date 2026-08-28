import { useNow } from '@/hooks/useNow';
import { formatCountdown } from '@/utils/format';

export interface CountdownState {
  remainingMs: number;
  expired: boolean;
  label: string;
  /** 0..1 elapsed fraction, if a start time is known. */
  progress: number;
}

/**
 * Live countdown to `expiresAt`. Ticks every second while the app is active.
 * Pass `startAt` to also get an elapsed `progress` fraction (for the ring).
 */
export function useCountdown(
  expiresAt: string | null | undefined,
  startAt?: string | null,
): CountdownState {
  const now = useNow(1000);

  if (!expiresAt) {
    return { remainingMs: 0, expired: false, label: '—', progress: 0 };
  }

  const end = new Date(expiresAt).getTime();
  const remainingMs = Math.max(0, end - now);
  const expired = remainingMs <= 0;

  let progress = 0;
  if (startAt) {
    const start = new Date(startAt).getTime();
    const span = end - start;
    if (span > 0) progress = Math.max(0, Math.min(1, (now - start) / span));
  }

  return { remainingMs, expired, label: formatCountdown(remainingMs), progress };
}
