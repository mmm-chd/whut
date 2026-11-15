/**
 * The Earth-team exchange, as a labelled offline simulation.
 *
 * Nothing is sent anywhere: the instruction is a fixed sentence, and the reply
 * is a short local state change. Only the finished response counts.
 */
export interface EarthTeamActivityProps {
  readonly messageOpened: boolean;
  readonly commandState: 'unconfirmed' | 'responding' | 'finished';
  readonly onOpenMessage: () => void;
  readonly onConfirm: () => void;
}

export const P04_INSTRUCTION_TEXT =
  'Dear Percy, please look to your left for a moment.';

export function EarthTeamActivity({
  messageOpened,
  commandState,
  onOpenMessage,
  onConfirm,
}: EarthTeamActivityProps) {
  return (
    <div className="p04-activity" data-activity="earth-team">
      {messageOpened ? (
        <blockquote className="p04-message" data-message>
          {P04_INSTRUCTION_TEXT}
        </blockquote>
      ) : (
        <button type="button" className="p04-activity-button" data-action="open-message" onClick={onOpenMessage}>
          Open message
        </button>
      )}

      {messageOpened && commandState === 'unconfirmed' ? (
        <button type="button" className="p04-activity-button" data-action="send-instruction" onClick={onConfirm}>
          Send the instruction
        </button>
      ) : null}

      {commandState === 'responding' ? (
        <p className="p04-activity-status" role="status" data-command-state="responding">
          Message on its way. Answers from Earth take a while.
        </p>
      ) : null}

      {commandState === 'finished' ? (
        <p className="p04-activity-done" role="status" data-command-state="finished">
          The team has answered: Percy will look to his left.
        </p>
      ) : null}
    </div>
  );
}
