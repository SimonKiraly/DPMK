import { useEffect, useRef } from 'react';

/**
 * Declarative setInterval. Passing `delay = null` pauses the timer without
 * unmounting. The latest callback is always used without resetting the timer.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
