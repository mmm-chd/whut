/**
 * The return idea the narration describes, as four small pictures in a row.
 *
 * It is labelled as a plan that was proposed, never as something that is
 * happening: nothing travels, nothing arrives, and the last picture is not
 * shown as reached. The steps follow the approved narration only.
 */
interface Step {
  readonly id: string;
  readonly label: string;
}

const STEPS: readonly Step[] = [
  { id: 'lander', label: 'A lander picks up the samples' },
  { id: 'rocket', label: 'A small rocket lifts them into orbit' },
  { id: 'orbiter', label: 'An orbiter carries them toward Earth' },
  { id: 'earth', label: 'Scientists on Earth could study them' },
];

function Picture({ id }: { id: string }) {
  switch (id) {
    case 'lander':
      return (
        <g>
          <path d="M6 44 H54" stroke="#7b4636" strokeWidth="3" strokeLinecap="round" />
          <path d="M14 44 L22 30 H38 L46 44" fill="#f3e6ca" stroke="#3b2118" strokeWidth="3" strokeLinejoin="round" />
          <path d="M20 44 L14 52 M40 44 L46 52" stroke="#3b2118" strokeWidth="3" strokeLinecap="round" />
          <rect x="24" y="18" width="12" height="12" rx="3" fill="#b95e43" stroke="#3b2118" strokeWidth="3" />
        </g>
      );
    case 'rocket':
      return (
        <g>
          <path d="M30 8 L38 24 V40 H22 V24 Z" fill="#f3e6ca" stroke="#3b2118" strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 34 L14 44 L22 40 M38 34 L46 44 L38 40" fill="#b95e43" stroke="#3b2118" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="30" cy="26" r="4" fill="#9cc0c8" stroke="#3b2118" strokeWidth="2.5" />
        </g>
      );
    case 'orbiter':
      return (
        <g>
          <ellipse cx="30" cy="30" rx="26" ry="9" fill="none" stroke="#7b4636" strokeWidth="2.5" strokeDasharray="4 5" />
          <rect x="22" y="22" width="16" height="16" rx="3" fill="#f3e6ca" stroke="#3b2118" strokeWidth="3" />
          <path d="M8 30 H22 M38 30 H52" stroke="#3b2118" strokeWidth="3" />
          <rect x="3" y="26" width="8" height="8" fill="#4c7ba5" stroke="#3b2118" strokeWidth="2.5" />
          <rect x="49" y="26" width="8" height="8" fill="#4c7ba5" stroke="#3b2118" strokeWidth="2.5" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="30" cy="30" r="20" fill="#4c7ba5" stroke="#3b2118" strokeWidth="3" />
          <path d="M18 24c5-6 12-5 14 0s-2 8-7 8-10-2-7-8ZM33 36c4-1 9 0 9 5-4 2-9 1-9-5Z" fill="#f3e6ca" />
        </g>
      );
  }
}

export function ReturnPlanDiagram() {
  return (
    <figure className="p08-plan">
      <p className="p08-plan-title">A plan that was proposed</p>
      <ol className="p08-plan-steps">
        {STEPS.map((step, index) => (
          <li key={step.id} className="p08-plan-step">
            <svg viewBox="0 0 60 60" className="p08-plan-picture" aria-hidden="true" focusable="false">
              <Picture id={step.id} />
            </svg>
            <span className="p08-plan-label">
              {index + 1}. {step.label}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="p08-plan-note">An idea from NASA and ESA, not a mission that is on its way.</figcaption>
    </figure>
  );
}
