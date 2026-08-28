import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * A `Date.now()` value that refreshes every `intervalMs` while the app is in
 * the foreground. Used by countdowns and "in X min" labels so they stay live
 * without every component wiring its own timer.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id) return;
      setNow(Date.now());
      id = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };

    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
