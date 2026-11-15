import { useEffect, useState, type RefObject } from 'react';

export interface HostSize {
  readonly width: number;
  readonly height: number;
}

/**
 * The host's size in CSS pixels, measured on the scene's own element.
 * `ResizeObserver` is optional (jsdom has none), so the window is the fallback.
 */
export function useHostSize(ref: RefObject<HTMLElement | null>): HostSize {
  const [size, setSize] = useState<HostSize>(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  }));

  useEffect(() => {
    const measure = () => {
      const host = ref.current;
      const width = Math.floor(host?.clientWidth || window.innerWidth);
      const height = Math.floor(host?.clientHeight || window.innerHeight);
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    measure();
    const host = ref.current;
    if (typeof ResizeObserver === 'undefined' || !host) {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
