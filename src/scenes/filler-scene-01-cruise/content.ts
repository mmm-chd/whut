/**
 * The cruise: a ship that creeps forward while a bar fills and "Did you know?"
 * cards change. Dates are NASA's (Mars 2020 mission page, checked 2026-11-15:
 * launch 30 July 2020, landing 18 February 2021; about 203 days between them,
 * which is the "about 7 months").
 */
export interface CruiseFact {
  readonly text: string;
}

export const CRUISE_FACTS: readonly CruiseFact[] = [
  {
    text: 'On July 30, 2020, Perseverance blasted off from Earth. For 203 days it zoomed through space, traveling 472 million kilometers. That’s like circling the whole Earth almost 11,800 times! Then, on February 18, 2021, it touched down on Mars.',
  },
  {
    text: 'Messages from Mars aren’t instant. When Perseverance arrived, its radio signal took about 11 minutes and 22 seconds to reach Earth.',
  },
  {
    text: 'Fun fact! Perseverance left Earth in July 2020 and was already on its way to Mars when COVID-19 vaccines began rolling out at the end of that year. Good thing robots don’t get sick!',
  },
];

/** One block of the bar per fact: it fills when the reader asks for the next one. */
export const CRUISE_BLOCKS = CRUISE_FACTS.length;
/** Pause on the full bar before the next scene. */
export const CRUISE_DONE_PAUSE_MS = 1400;
