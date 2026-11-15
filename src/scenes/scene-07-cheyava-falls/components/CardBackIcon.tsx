import type { P06CardIcon } from '../content';

/**
 * The drawing on the back of a card.
 *
 * One primary icon per card, chosen so the closed deck says what each card is
 * about without words: a rock being examined, a spotted rock, a river channel,
 * a sample tube, a question mark under a lens. They share a 64x64 box and the
 * same 3px stroke, so five of them read as one family.
 *
 * Decoration only: the reveal button carries the name in its label, so every
 * SVG here is `aria-hidden` and cannot be focused or clicked on its own.
 */
export function CardBackIcon({ icon }: { readonly icon: P06CardIcon }) {
  return (
    <svg
      className="p06-icon"
      data-icon={icon}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      {icon === 'rock' ? <RockIcon /> : null}
      {icon === 'spots' ? <SpotsIcon /> : null}
      {icon === 'river' ? <RiverIcon /> : null}
      {icon === 'tube' ? <TubeIcon /> : null}
      {icon === 'clue' ? <ClueIcon /> : null}
    </svg>
  );
}

/** Card one: an ordinary-looking rock, examined. */
function RockIcon() {
  return (
    <>
      <path className="p06-icon-fill" d="M18 52 14 40l6-9 12-4 12 5 5 9-3 11z" />
      <path className="p06-icon-line" d="M20 42 28 38l9 3" />
      <circle className="p06-icon-line" cx="40" cy="22" r="8" />
      <path className="p06-icon-line" d="m46 28 6 6" />
    </>
  );
}

/** Card two: the spotted surface. */
function SpotsIcon() {
  return (
    <>
      <path className="p06-icon-fill" d="M9 44c0-12 10-20 23-20s23 8 23 20c0 8-9 12-23 12S9 52 9 44Z" />
      <circle className="p06-icon-dot" cx="22" cy="38" r="4.5" />
      <circle className="p06-icon-dot" cx="35" cy="33" r="3.5" />
      <circle className="p06-icon-dot" cx="44" cy="43" r="5" />
      <circle className="p06-icon-dot" cx="28" cy="49" r="3" />
      <circle className="p06-icon-dot" cx="16" cy="47" r="2.5" />
    </>
  );
}

/** Card three: the dried channel of an ancient river. */
function RiverIcon() {
  return (
    <>
      <path className="p06-icon-line" d="M6 52c10-2 12-8 16-14s10-10 18-10 12 4 18 4" />
      <path className="p06-icon-line" d="M6 60c12-2 15-9 20-15s11-9 17-9 9 3 15 3" />
      <path className="p06-icon-fill" d="M20 14c6 0 10 4 10 9s-4 8-10 8-10-3-10-8 4-9 10-9Z" />
    </>
  );
}

/** Card four: the core in its tube, with the bit that drilled it. */
function TubeIcon() {
  return (
    <>
      <rect className="p06-icon-fill" x="24" y="16" width="16" height="38" rx="6" />
      <path className="p06-icon-line" d="M24 24h16" />
      <circle className="p06-icon-dot" cx="30" cy="34" r="2.5" />
      <circle className="p06-icon-dot" cx="35" cy="42" r="2.5" />
      <path className="p06-icon-line" d="m46 22 6 6-3 3-6-6z" />
      <path className="p06-icon-line" d="M49 25 40 34" />
    </>
  );
}

/** Card five: a clue that is not an answer. Never a creature. */
function ClueIcon() {
  return (
    <>
      <circle className="p06-icon-fill" cx="28" cy="28" r="16" />
      <path className="p06-icon-line" d="m40 40 10 10" />
      <path className="p06-icon-line" d="M23 24c0-3 2-5 5-5s5 2 5 5c0 4-5 4-5 8" />
      <path className="p06-icon-dot" d="M28 38h.01" />
    </>
  );
}
