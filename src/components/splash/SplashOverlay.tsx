import { useEffect, useState } from 'react';
import { useExperienceStore } from '../../app/experience.store';
import '../../styles/stage.css';
import './SplashOverlay.css';

/**
 * Stage 00 — a two-frame opening hook (no rocket, book, or character art;
 * NASA_Storybook_Concept.md section 3):
 *
 *   1. "What happens up there?" fades in, holds, and fades out.
 *   2. The AI-assistance note plays the same fade pattern.
 *   3. The overlay crossfades straight into the launchpad, which is already
 *      mounted and preloading textures behind it.
 *
 * The sequence runs by itself; a click or tap anywhere jumps to the next
 * frame. Text, buttons, and navigation live in the homepage HUD after this.
 */

type SplashPhase = 'frame1' | 'frame2' | 'leaving';

/** Visible window of one frame plus the short gap before the next one. */
const FRAME_WINDOW_MS = 3200;
/** Crossfade into the homepage. */
const LEAVE_MS = 800;

export function SplashOverlay() {
  const setStage = useExperienceStore((state) => state.setStage);
  const [phase, setPhase] = useState<SplashPhase>('frame1');

  // Drive the sequence with one timer per phase.
  useEffect(() => {
    if (phase === 'leaving') {
      const id = window.setTimeout(() => setStage('homepage'), LEAVE_MS);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(
      () => setPhase(phase === 'frame1' ? 'frame2' : 'leaving'),
      FRAME_WINDOW_MS,
    );
    return () => window.clearTimeout(id);
  }, [phase, setStage]);

  // Click or tap anywhere: jump to the next frame (no restart).
  useEffect(() => {
    const onSkip = () => {
      setPhase((current) => (current === 'frame1' ? 'frame2' : 'leaving'));
    };
    window.addEventListener('pointerdown', onSkip);
    return () => window.removeEventListener('pointerdown', onSkip);
  }, []);

  return (
    <div className="splash-overlay story-space story-grain story-on-dark" data-leaving={phase === 'leaving'}>
      {phase === 'frame1' ? (
        <p key="hook" className="splash-frame story-title">
          What happens up there
        </p>
      ) : null}
      {phase === 'frame2' ? (
        <p key="note" className="splash-frame story-note">
          An AI-assisted creative project.
          <br />
          Some visual assets and illustrations are AI-generated.
        </p>
      ) : null}
    </div>
  );
}
