import { motion, useReducedMotion } from 'motion/react';
import './StartOverlay.css';

interface StartOverlayProps {
  onStart: () => void;
}

export function StartOverlay({ onStart }: StartOverlayProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="start-overlay"
      data-start-overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
    >
      <div className="start-overlay__card">
        <p className="start-overlay__eyebrow">P-01 · NASA Mars Storybook</p>
        <h1 className="start-overlay__title">Morning at Jezero</h1>
        <p className="start-overlay__subtitle">
          An interactive story about NASA&apos;s Perseverance rover.
        </p>
        <button type="button" className="start-overlay__button" data-start-button onClick={onStart}>
          Start story
        </button>
      </div>
    </motion.div>
  );
}
