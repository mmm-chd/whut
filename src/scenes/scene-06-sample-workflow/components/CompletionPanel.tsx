import { P05_SAMPLE_COPY, completionClarifier } from '../dialogue';
import { NEXT_EXPERIENCES, isNavigable, type NextExperience } from '../nextExperience';
import type { SamplingPhase } from '../samplingState';

interface CompletionPanelProps {
  readonly phase: SamplingPhase;
  readonly tubeCount: number;
  readonly choiceEnabled: boolean;
  readonly onEndingRead: () => void;
  readonly onAchievementSeen: () => void;
  readonly onChoose: (experience: NextExperience) => void;
}

/**
 * Praise, stamp, Ingenuity reward and the honest chooser, in that order. Each
 * step needs the reader's action; none of it ends the scene by itself.
 */
export function CompletionPanel({
  phase,
  tubeCount,
  choiceEnabled,
  onEndingRead,
  onAchievementSeen,
  onChoose,
}: CompletionPanelProps) {
  if (phase !== 'mission-complete' && phase !== 'achievement' && phase !== 'choice' && phase !== 'exiting') {
    return null;
  }

  return (
    <div className="p05s-complete" role="dialog" aria-label="Mission complete" data-phase={phase}>
      <div className="p05s-complete-card">
        {phase === 'mission-complete' ? (
          <>
            <h2 className="p05s-complete-title">{P05_SAMPLE_COPY.completion}</h2>
            <p className="p05s-complete-note">{completionClarifier(tubeCount)}</p>
            <button type="button" className="p05s-button" data-primary onClick={onEndingRead} autoFocus>
              Continue
            </button>
          </>
        ) : null}

        {phase === 'achievement' ? (
          <>
            <div className="p05s-stamp" aria-label="Sample Collector stamp">
              <span>Sample Collector</span>
            </div>
            <p className="p05s-complete-note">You helped Percy collect and store samples.</p>
            <p className="p05s-reward">
              <strong>Ingenuity</strong> has joined your sticker book!
            </p>
            <button type="button" className="p05s-button" data-primary onClick={onAchievementSeen} autoFocus>
              Next
            </button>
          </>
        ) : null}

        {phase === 'choice' || phase === 'exiting' ? (
          <>
            <h2 className="p05s-complete-title">What next?</h2>
            <div className="p05s-choices">
              {NEXT_EXPERIENCES.map((experience) => {
                const navigable = isNavigable(experience);
                const enabled = experience.id === 'percy-story' ? choiceEnabled : false;
                return (
                  <div key={experience.id} className="p05s-choice">
                    <button
                      type="button"
                      className="p05s-button"
                      data-choice={experience.id}
                      disabled={!enabled || phase === 'exiting'}
                      aria-describedby={`p05s-choice-${experience.id}`}
                      onClick={() => onChoose(experience)}
                    >
                      {experience.label}
                    </button>
                    <p className="p05s-choice-note" id={`p05s-choice-${experience.id}`}>
                      {navigable ? '' : experience.unavailableNote}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
