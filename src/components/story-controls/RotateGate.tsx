import { useEffect, useRef, useState } from 'react';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import './RotateGate.css';

const PORTRAIT_QUERY = '(orientation: portrait)';

interface Suspension {
  /** Captured before pausing: was the timeline playhead mid-flight? */
  wasRunning: boolean;
  /** Captured before pausing: had the user paused the story themselves? */
  wasUserPaused: boolean;
}

/**
 * Landscape lock for the storybook.
 *
 * While the viewport is portrait, a full-screen gate covers the scene and
 * everything pauses: the narrative timeline, all audio (through the store's
 * isPaused flag), and every CSS animation via the body-level freeze
 * attribute. Only the gate's own device icon keeps moving.
 *
 * On return to landscape the suspension is undone conditionally, so dialogue
 * gates and manual pauses survive the rotation round-trip.
 */
export function RotateGate() {
  const { isTimelineRunning, pause, resume } = useNarrativeController();
  const [portrait, setPortrait] = useState(
    () => window.matchMedia?.(PORTRAIT_QUERY)?.matches ?? false,
  );
  const suspensionRef = useRef<Suspension | null>(null);

  useEffect(() => {
    const query = window.matchMedia?.(PORTRAIT_QUERY);
    if (!query) {
      return;
    }
    const handleChange = (event: MediaQueryListEvent) => setPortrait(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (portrait) {
      const wasRunning = isTimelineRunning();
      const wasUserPaused = useStoryStore.getState().isPaused;
      // Always hold the story behind the gate: the store flag pauses audio,
      // the typewriter, and the sonar prompts; the timeline stops (a no-op
      // when it already rests at a dialogue gate).
      pause();
      document.body.dataset.storyFrozen = 'true';
      suspensionRef.current = { wasRunning, wasUserPaused };
      return;
    }

    const suspension = suspensionRef.current;
    suspensionRef.current = null;
    delete document.body.dataset.storyFrozen;
    if (!suspension) {
      return;
    }
    if (suspension.wasRunning) {
      // The playhead was mid-flight — continue from the same spot.
      resume();
    } else if (!suspension.wasUserPaused) {
      // The timeline rests at a dialogue gate; only clear our auto-pause and
      // leave the gate waiting for its Continue press.
      useStoryStore.getState().setPaused(false);
    }
    // A pre-existing user pause stays untouched.
  }, [portrait, isTimelineRunning, pause, resume]);

  // Never leave the page frozen if the gate unmounts mid-suspension.
  useEffect(() => {
    return () => {
      delete document.body.dataset.storyFrozen;
    };
  }, []);

  if (!portrait) {
    return null;
  }

  return (
    <div className="rotate-gate" data-rotate-gate role="dialog" aria-modal="true">
      <span className="rotate-gate__device" aria-hidden="true" />
      <p className="rotate-gate__title">Rotate your device</p>
      <p className="rotate-gate__hint">This storybook plays in landscape.</p>
    </div>
  );
}
