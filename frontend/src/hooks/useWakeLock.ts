import { useEffect } from 'react';

/**
 * Hold the screen on while a session is running. Unsupported on iOS Safari
 * before 16.4 and revoked whenever the tab is backgrounded, so it re-requests
 * on every return to visibility and quietly does nothing where it can't.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        /* denied, low battery, or unsupported — the timer still works */
      }
    };

    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
