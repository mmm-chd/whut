import { canContinue } from '../../engine/selectors';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import './ContinueControl.css';

interface ContinueControlProps {
  requiredInteractions: readonly string[];
}

export function ContinueControl({ requiredInteractions }: ContinueControlProps) {
  const { completeScene } = useNarrativeController();
  const status = useStoryStore((state) => state.status);
  const completedInteractions = useStoryStore((state) => state.completedInteractions);

  const canProceed = canContinue({
    status,
    requiredInteractions,
    completedInteractions,
  });

  return (
    <button
      type="button"
      className={`continue-control ${canProceed ? 'continue-control--unlocked' : 'continue-control--locked'}`}
      disabled={!canProceed}
      onClick={() => completeScene()}
      aria-label={
        canProceed
          ? 'Continue to next scene'
          : 'Continue locked — inspect all rocks first'
      }
    >
      <span className="continue-control__label">
        {canProceed ? 'Continue' : 'Continue — inspect all rocks first'}
      </span>
    </button>
  );
}
