import { AnimatePresence, motion } from 'motion/react';
import { useStoryStore } from '../../stores/story.store';
import './DimTransition.css';

export function DimTransition() {
  const status = useStoryStore((state) => state.status);
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);

  return (
    <AnimatePresence>
      {status === 'completed' && (
        <motion.div
          className="dim-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.4 }}
        />
      )}
    </AnimatePresence>
  );
}
