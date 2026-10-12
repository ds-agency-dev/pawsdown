import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** The current time, re-rendering on each new minute and on returning to the app (timers pause in the background). */
export function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const d = new Date();
      setNow(d);
      clearTimeout(timer);
      timer = setTimeout(tick, 60_000 - d.getSeconds() * 1000 - d.getMilliseconds() + 20);
    };
    tick();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return now;
}
