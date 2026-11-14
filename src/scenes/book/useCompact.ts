import { useEffect, useState } from 'react';

/**
 * True on a narrow viewport, where the book shows one page at a time (concept
 * 9.2). jsdom has no `matchMedia`, so tests see the desktop spread.
 */
export function useCompact(query = '(max-width: 900px)'): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true,
  );

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) {
      return;
    }
    setMatches(list.matches);
    const onChange = () => setMatches(list.matches);
    list.addEventListener?.('change', onChange);
    return () => list.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}
