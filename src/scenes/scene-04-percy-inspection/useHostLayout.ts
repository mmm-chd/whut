import { useEffect, useState, type RefObject } from 'react';
import { layoutP04, type P04Layout } from './layout';

/**
 * Host size in CSS pixels, measured on the scene's own element.
 *
 * The layout is derived, never stored: a resize re-derives the three regions,
 * so the monitor cannot keep the width of a window that no longer exists.
 * `ResizeObserver` is optional here (jsdom has none), so the hook falls back to
 * the window size rather than leaving the scene unmeasured.
 */
export function useHostLayout(ref: RefObject<HTMLElement | null>): P04Layout {
  const [layout, setLayout] = useState<P04Layout>(() => {
    if (typeof window === 'undefined') {
      return layoutP04(1280, 720);
    }
    return layoutP04(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const measure = () => {
      const host = ref.current;
      const width = host?.clientWidth || (typeof window === 'undefined' ? 0 : window.innerWidth);
      const height = host?.clientHeight || (typeof window === 'undefined' ? 0 : window.innerHeight);
      setLayout((previous) =>
        previous.width === Math.floor(width) && previous.height === Math.floor(height)
          ? previous
          : layoutP04(width, height),
      );
    };

    measure();
    const host = ref.current;
    if (!host) {
      return;
    }
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [ref]);

  return layout;
}
