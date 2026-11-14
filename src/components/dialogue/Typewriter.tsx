import { useCallback, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  emphasisText?: string;
  speed?: number;
  instant?: boolean;
  paused?: boolean;
  onComplete?: () => void;
}

/**
 * Reveals text with direct DOM updates so typing never re-renders React per character.
 */
export function Typewriter({
  text,
  emphasisText,
  speed = 24,
  instant = false,
  paused = false,
  onComplete,
}: TypewriterProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const visibleCountRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const render = useCallback(
    (count: number) => {
      const node = textRef.current;
      if (!node) {
        return;
      }

      node.replaceChildren();
      const wrapper = node.parentElement;
      if (wrapper) {
        wrapper.dataset.complete = count >= text.length ? 'true' : 'false';
      }
      const visible = text.slice(0, count);

      if (!emphasisText) {
        node.append(document.createTextNode(visible));
        return;
      }

      const start = text.indexOf(emphasisText);
      if (start < 0 || count <= start) {
        node.append(document.createTextNode(visible));
        return;
      }

      const before = text.slice(0, start);
      if (before) {
        node.append(document.createTextNode(before));
      }

      const emphasisVisible = text.slice(start, Math.min(count, start + emphasisText.length));
      if (emphasisVisible) {
        const mark = document.createElement('mark');
        mark.textContent = emphasisVisible;
        node.append(mark);
      }

      if (count > start + emphasisText.length) {
        node.append(document.createTextNode(text.slice(start + emphasisText.length, count)));
      }
    },
    [text, emphasisText],
  );

  useEffect(() => {
    if (instant) {
      visibleCountRef.current = text.length;
      render(text.length);
      onCompleteRef.current?.();
      return;
    }

    visibleCountRef.current = 0;
    render(0);
  }, [text, instant, render]);

  useEffect(() => {
    if (instant || paused || visibleCountRef.current >= text.length) {
      return;
    }

    const timer = window.setInterval(() => {
      if (visibleCountRef.current >= text.length) {
        window.clearInterval(timer);
        return;
      }

      visibleCountRef.current += 1;
      render(visibleCountRef.current);

      if (visibleCountRef.current >= text.length) {
        window.clearInterval(timer);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, instant, speed, paused, render]);

  return (
    <span className="typewriter">
      <span className="typewriter__text" ref={textRef} data-typewriter-text aria-hidden="true" />
      <span className="typewriter__cursor" aria-hidden="true" />
    </span>
  );
}
