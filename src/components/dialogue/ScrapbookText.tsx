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
  /** The reader pressed Continue while the recording was still playing. */
  const [armed, setArmed] = useState(false);
  /** True once `gateAfter` seconds of un-paused stage time have passed. */
  const [gateWaited, setGateWaited] = useState(false);
  const autoAdvanced = useRef(false);
  const panel = line.panel ?? true;
  const textSize = line.textSize ?? 'normal';
  const advance = line.advance;
  const delay = (line.delay ?? 0) * 1000;

  const handleComplete = useCallback(() => setTyped(true), []);

  // A narrated line owns the gate until its voice-over is done. The timer
  // counts only un-paused time, so pausing the story also pausing the wait.
  const gateAfterMs = Math.max(0, (line.gateAfter ?? 0) * 1000);
  useEffect(() => {
    if (gateAfterMs <= 0 || isPaused) {
      return;
    }
    const timer = window.setTimeout(() => setGateWaited(true), gateAfterMs);
    return () => window.clearTimeout(timer);
  }, [gateAfterMs, isPaused, line.id]);
  // A line without a recording has nothing to wait for: derived, not stored.
  const gateOpen = gateAfterMs <= 0 || gateWaited;

  const handleGateActivate = useCallback(() => {
    // Pressing early is a wish, not a cut: it is remembered and carried out
    // once the voice has finished, so the reader is never held and the
    // recording is never truncated.
    if (!gateOpen) {
      setArmed(true);
      return;
    }
    setContinued(true);
    onContinue?.(line);
  }, [gateOpen, line, onContinue]);

  // An early press is carried out here, the moment the recording ends. The
  // gate stays on screen and reads `data-armed`, so the press is acknowledged
  // instead of looking ignored; `carried` keeps it to one call.
  const carried = useRef(false);
  const done = continued || (armed && gateOpen);
  useEffect(() => {
    if (!armed || !gateOpen || carried.current) {
      return;
    }
    carried.current = true;
    onContinue?.(line);
  }, [armed, gateOpen, line, onContinue]);

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

  // A manual gate may wait out the recording: active time only, so a pause
  // keeps what is left instead of restarting it.
  const gateDelayMs = (line.gateDelay ?? 0) * 1000;
  const [gateReady, setGateReady] = useState(gateDelayMs <= 0);
  const gateRemaining = useRef(gateDelayMs);
  useEffect(() => {
    if (!typed || advance !== 'manual' || gateReady) {
      return;
    }
    if (gateRemaining.current <= 0) {
      setGateReady(true);
      return;
    }
    if (isPaused) {
      return;
    }
    const startedAt = performance.now();
    const timer = window.setTimeout(() => setGateReady(true), gateRemaining.current);
    return () => {
      window.clearTimeout(timer);
      gateRemaining.current = Math.max(0, gateRemaining.current - (performance.now() - startedAt));
    };
  }, [advance, gateReady, isPaused, typed]);

  const showGate = advance === 'manual' && typed && gateReady && !done;

  return (
    <motion.div
      className={[
        'scrapbook-text',
        `scrapbook-text--${line.placement}`,
        panel ? 'scrapbook-text--panel' : 'scrapbook-text--bare',
        line.speaker === 'percy' ? 'scrapbook-text--bubble' : '',
        `scrapbook-text--size-${textSize}`,
      ]
        .filter(Boolean)
        .join(' ')}
      data-dialogue-line={line.id}
      data-speaker={line.speaker}
      data-panel={panel ? 'true' : 'false'}
      data-gated={advance === 'manual' ? 'true' : undefined}
      data-armed={armed ? 'true' : undefined}
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
