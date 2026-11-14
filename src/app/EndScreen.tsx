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
        <h2 className="end-screen__title">To be continued...</h2>
        <p className="end-screen__subtitle">
          Percy and Ginny are on their way to Mars. The next chapter of their story is in
          development.
        </p>
      </div>
    </motion.div>
  );
}
