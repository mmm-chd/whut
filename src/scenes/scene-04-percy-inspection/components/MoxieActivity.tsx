/**
 * MOXIE, as four short steps the reader advances one at a time.
 *
 * Opening the card does not count; only `Finish MOXIE` at the last step does.
 * Reopening a finished card lets the reader walk the steps again without
 * resetting the credit, so this component never owns progress itself.
 */
const STEPS = [
  'Martian air is pulled in.',
  'The air is warmed and pressed.',
  'Oxygen is separated from the carbon dioxide.',
  'Oxygen comes out.',
] as const;

export interface MoxieActivityProps {
  readonly step: 0 | 1 | 2 | 3;
  readonly finished: boolean;
  readonly onNext: () => void;
  readonly onFinish: () => void;
}

export function MoxieActivity({ step, finished, onNext, onFinish }: MoxieActivityProps) {
  const atLastStep = step === STEPS.length - 1;

  return (
    <div className="p04-activity" data-activity="moxie">
      <ol className="p04-moxie-steps">
        {STEPS.map((text, index) => (
          <li
            key={text}
            className="p04-moxie-step"
            aria-current={index === step ? 'step' : undefined}
            data-reached={index <= step ? 'true' : 'false'}
          >
            {text}
          </li>
        ))}
      </ol>
      {finished ? (
        <p className="p04-activity-done" role="status">
          MOXIE has finished its test.
        </p>
      ) : atLastStep ? (
        <button type="button" className="p04-activity-button" data-action="finish-moxie" onClick={onFinish}>
          Finish MOXIE
        </button>
      ) : (
        <button type="button" className="p04-activity-button" data-action="next-moxie" onClick={onNext}>
          Next
        </button>
      )}
    </div>
  );
}
