/**
 * P-06 (story) / `scene-07-cheyava-falls` (runtime): five information cards.
 *
 * The rider-facing copy was supplied by the user and is reproduced verbatim.
 * It is the approved wording, so nothing here may be paraphrased: a change to
 * a card body is a content revision, not a refactor.
 *
 * The cards are information, not a game. Their state is view state (is the card
 * turned over?), never scientific progress, scoring or reward eligibility.
 */
export const P06_CARD_IDS = [
  'different-rock',
  'leopard-spots',
  'ancient-river',
  'sapphire-canyon',
  'life-clues',
] as const;

export type P06CardId = (typeof P06_CARD_IDS)[number];

/** The one card that owns the user-selected video, below its text. */
export const P06_VIDEO_CARD_ID: P06CardId = 'different-rock';
/** Fixed by the user-supplied link; never derived at runtime. */
export const P06_VIDEO_ID = '9bLhVJKoIOg' as const;

/** Which drawing sits on the back of a card. One primary icon per card. */
export type P06CardIcon = 'rock' | 'spots' | 'river' | 'tube' | 'clue';

export interface P06Card {
  readonly id: P06CardId;
  /** Card number, shown as a badge on the back. */
  readonly order: 1 | 2 | 3 | 4 | 5;
  readonly heading: string;
  readonly body: string;
  readonly icon: P06CardIcon;
  /** The icon is decoration for a screen reader; this names it for everyone else. */
  readonly iconLabel: string;
}

export const P06_CARDS: readonly P06Card[] = [
  {
    id: 'different-rock',
    order: 1,
    heading: 'A Different Kind of Rock',
    body:
      'In Jezero Crater, Percy found a rock about one meter by sixty centimeters. It was named Cheyava Falls, after a waterfall in the Grand Canyon on Earth.',
    icon: 'rock',
    iconLabel: 'A rock under a magnifying glass',
  },
  {
    id: 'leopard-spots',
    order: 2,
    heading: 'Leopard Spots',
    body:
      'The rock has small spots that look like leopard skin and poppy seeds. Percy had never seen anything like them before. The spots formed through chemical reactions, and the way they formed has scientists curious.',
    icon: 'spots',
    iconLabel: 'A rounded rock covered in small spots',
  },
  {
    id: 'ancient-river',
    order: 3,
    heading: 'Traces of an Ancient River',
    body:
      'The rock was found along the edge of Neretva Vallis, the remains of an ancient river channel on Mars. Water once flowed there, so this place has a long history.',
    icon: 'river',
    iconLabel: 'A winding river channel across dry ground',
  },
  {
    id: 'sapphire-canyon',
    order: 4,
    heading: 'Sapphire Canyon Sample',
    body:
      'Percy drilled into the rock, collected a sample called “Sapphire Canyon,” and stored it in a tube. This is part of its mission to collect samples to bring back to Earth someday.',
    icon: 'tube',
    iconLabel: 'A capped sample tube holding a few rock fragments',
  },
  {
    id: 'life-clues',
    order: 5,
    heading: 'A Clue, Not Proof',
    body:
      'Scientists call the spots a potential biosignature—a sign that may be linked to ancient microbial life. But processes that don’t involve living organisms could also have formed them, so there’s no certainty yet. The answer can only be found by examining the sample in a lab on Earth.',
    icon: 'clue',
    iconLabel: 'A magnifying glass holding a question mark',
  },
];

/**
 * Where the copy came from. Kept beside the copy rather than inside it: a
 * reader needs the words, a reviewer needs the provenance.
 */
export const P06_COPY_SOURCE = {
  source: 'user-supplied-comments',
  suppliedOn: '2026-11-15',
  review: 'draft',
  claim:
    'Five information cards about Cheyava Falls: dimensions and naming, spotted texture and its chemistry, the Neretva Vallis river channel, the Sapphire Canyon sample, and why a potential biosignature is not proof.',
  /**
   * The `only` in card five is the one sentence that needs a source before this
   * can be called verified: return to Earth is the mission's plan, not a
   * finished fact.
   */
  reviewNote:
    'Review dimensions/naming, the chemical-reaction explanation, Neretva Vallis, the sample history and the scope of card five’s laboratory claim against NASA/JPL sources before release.',
} as const;

export function findCard(id: P06CardId): P06Card {
  const card = P06_CARDS.find((entry) => entry.id === id);
  if (!card) {
    // Unreachable while the IDs and the deck are declared from one list.
    throw new Error(`Unknown P-06 card: ${id}`);
  }
  return card;
}

export function isP06CardId(value: unknown): value is P06CardId {
  return typeof value === 'string' && (P06_CARD_IDS as readonly string[]).includes(value);
}

/** The deck in reading order, which is also the fixed DOM order. */
export function orderedCards(): readonly P06Card[] {
  return P06_CARDS;
}

/** Words used by the deck's controls, kept together so they cannot drift apart. */
export const P06_COPY = {
  heading: 'Cheyava Falls',
  revealHint: 'Tap to reveal',
  /**
   * The plan's suggested invitation, used word for word. It replaces the old
   * activity instruction, which promised an activity this chapter no longer has.
   */
  invite: "Let's take a closer look at what scientists have found. Tap a card to learn more.",
  revealLabel: (card: P06Card) => `Reveal card ${card.order}: ${card.heading}`,
  continueLabel: "Continue Percy's Story",
  /** Shown only under a Continue that has not been unlocked yet. */
  continueHint: 'Open all five cards to continue.',
} as const;
