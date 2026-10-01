import { useEffect, useState } from 'react';

/** Compact density below 1600 × 900 (e.g. 1366×768) — D-43. */
const QUERY = '(max-width: 1599px), (max-height: 899px)';

export function useCompact(): boolean {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setCompact(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return compact;
}
