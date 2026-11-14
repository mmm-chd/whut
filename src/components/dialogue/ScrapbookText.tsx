import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStoryStore } from '../../stores/story.store';
import { CircularGate } from '../story-controls/CircularGate';
import type { DialogueLine } from './types';
import { Typewriter } from './Typewriter';
import './ScrapbookText.css';

interface ScrapbookTextProps {
  line: DialogueLine;
  /** Fired when the player presses the Continue gate, or on auto-advance. */
  onContinue?: (line: DialogueLine) => void;
}

/**
 * Cream crayon handwriting directly on the stage: no panel, no speaker label.
 * The visible text is typed; the full line is announced once via a live region.
 *
 * Presentational only — visibility is owned by the dialogue store. This
 * component reports when a line finishes typing: `manual` lines surface a
 * Continue gate and call `onContinue` when pressed; `auto` lines call
 * `onContinue` after their `delay` (seconds, omitted = immediately).
 */
export function ScrapbookText({ line, onContinue }: ScrapbookTextProps) {
  const isPaused = useStoryStore((state) => state.isPaused);
  const reducedMotionSetting = useStoryStore((state) => state.settings.reducedMotion);
  const prefersReducedMotion = useReducedMotion();
  const instant = reducedMotionSetting || prefersReducedMotion === true;
  const [typed, setTyped] = useState(false);
  const [continued, setContinued] = useState(false);
  const autoAdvanced = useRef(false);
  const panel = line.panel ?? true;
  const textSize = line.textSize ?? 'normal';
  const advance = line.advance;
  const delay = (line.delay ?? 0) * 1000;

  const handleComplete = useCallback(() => setTyped(true), []);

  const handleGateActivate = useCallback(() => {
    setContinued(true);
    onContinue?.(line);
  }, [line, onContinue]);

  // Auto-advance: resolve after the configured hold. The timer honours the
  // story pause, matching the Typewriter, and a zero delay fires at once.
  useEffect(() => {
    if (!typed || advance !== 'auto' || autoAdvanced.current || isPaused) {
      return;
    }
    if (delay <= 0) {
      autoAdvanced.current = true;
      onContinue?.(line);
      return;
    }
    const timer = window.setTimeout(() => {
      autoAdvanced.current = true;
      onContinue?.(line);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [advance, delay, isPaused, line, onContinue, typed]);

  const showGate = advance === 'manual' && typed && !continued;

  return (
    <motion.div
      className={[
        'scrapbook-text',
        `scrapbook-text--${line.placement}`,
        panel ? 'scrapbook-text--panel' : 'scrapbook-text--bare',
        `scrapbook-text--size-${textSize}`,
      ].join(' ')}
      data-dialogue-line={line.id}
      data-speaker={line.speaker}
      data-panel={panel ? 'true' : 'false'}
      data-gated={advance === 'manual' ? 'true' : undefined}
      data-advance={advance}
      style={line.textAlign ? { textAlign: line.textAlign } : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: instant ? 0 : 0.28, ease: 'easeOut' }}
    >
      <p className="scrapbook-text__line">
        <Typewriter
          text={line.text}
          emphasisText={line.emphasis ? line.emphasisText : undefined}
          instant={instant}
          paused={isPaused}
          onComplete={handleComplete}
        />
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {line.text}
      </p>
      {showGate ? (
        <CircularGate label="Continue" placement="dialogue" onActivate={handleGateActivate} />
      ) : null}
    </motion.div>
  );
}
