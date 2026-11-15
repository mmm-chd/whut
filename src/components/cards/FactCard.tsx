import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { InteractionCard } from '../../scenes/scene-01-jezero/interactions';
import './FactCard.css';

interface FactCardProps {
  card: InteractionCard;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
}

export function FactCard({ card, onClose, returnFocusTo }: FactCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus to the close button when the card opens.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Return focus to the rock when the card unmounts.
  useEffect(() => {
    return () => {
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  // Close on Escape key.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleClose = useCallback(() => {
    closeButtonRef.current?.blur();
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="fact-card"
        ref={cardRef}
        className="fact-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <div className="fact-card__backdrop" onClick={handleClose} />
        <div className="fact-card__panel" onClick={(event) => event.stopPropagation()}>
          <div className="fact-card__header">
            {/* <span className="fact-card__fact-id">{card.factId}</span> */}
            <h2 className="fact-card__title">{card.title}</h2>
            <button
              type="button"
              ref={closeButtonRef}
              className="fact-card__close"
              aria-label="Close card"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>
          <div className="fact-card__body">{card.body}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
