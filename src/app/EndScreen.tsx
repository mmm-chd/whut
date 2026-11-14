import { motion } from 'motion/react';
import { useStoryStore } from '../stores/story.store';
import './EndScreen.css';

export function EndScreen() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);

  return (
    <motion.div
      className="end-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.4 }}
    >
      <div className="end-screen__card">
        <h2 className="end-screen__title">P-02 not built yet</h2>
        <p className="end-screen__subtitle">
          This is the end of P-01 &ldquo;Pagi di Jezero&rdquo;. The next milestone is in development.
        </p>
      </div>
    </motion.div>
  );
}
