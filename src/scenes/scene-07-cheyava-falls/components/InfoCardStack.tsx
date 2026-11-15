import type { CSSProperties } from 'react';
import { P06_COPY, orderedCards, type P06Card } from '../content';
import { allCardsOpened, deckView, type P06State } from '../state';
import { InfoCard, P06_FLIP_MS } from './InfoCard';

interface InfoCardStackProps {
  readonly state: P06State;
  /** False while the scene is paused, hidden or not in the cards phase. */
  readonly inputLive: boolean;
  readonly onReveal: (card: P06Card) => void;
  readonly onFlipSettled: (card: P06Card) => void;
  readonly onContinue: () => void;
  readonly reducedMotion?: boolean;
  readonly flipMs?: number;
  /** True once Continue has been accepted and the deck is leaving the screen. */
  readonly leaving?: boolean;
}

/**
 * The deck: five upright cards in one row, plus Continue.
 *
 * The row is the reading order from left to right, and it never becomes a
 * column: the reader sees the whole deck at once instead of scrolling for the
 * last card. A card that is open keeps its column and shows its text inside it,
 * so no card can grow the page. On a host too narrow for five columns the row
 * stays a row and slides sideways rather than stacking.
 *
 * Continue never waits for the deck. The cards are information the reader may
 * skip, so the button is available as soon as the intro has resolved — that is
 * the whole point of the revision this scene follows.
 */
export function InfoCardStack({
  state,
  inputLive,
  onReveal,
  onFlipSettled,
  onContinue,
  reducedMotion = false,
  flipMs = P06_FLIP_MS,
  leaving = false,
}: InfoCardStackProps) {
  const opened = deckView(state);
  const cards = orderedCards();
  // All five cards, or no Continue: the reader sees every card before the story
  // moves on. The button is not there at all until the last card is open.
  const everyCardOpened = allCardsOpened(state);
  const canContinue =
    everyCardOpened && inputLive && state.phase === 'cards' && !state.continueAccepted;

  return (
    <div
      className="p06-deck"
      data-deck
      data-phase={state.phase}
      data-leaving={leaving ? 'true' : 'false'}
      data-complete={everyCardOpened ? 'true' : 'false'}
    >
      <div className="p06-deck-body">
        <h2 className="p06-deck-heading">{P06_COPY.heading}</h2>
        <p className="p06-deck-lead">
          Five things Percy found in the crater, and what scientists make of them.
        </p>
        <ol className="p06-card-list">
          {cards.map((card, index) => (
            <li
              key={card.id}
              className="p06-card-item"
              style={{ '--i': index } as CSSProperties}
            >
              <InfoCard
                card={card}
                opened={opened[index].opened}
                flipping={state.flippingCard === card.id}
                disabled={!inputLive || (state.flippingCard !== null && state.flippingCard !== card.id)}
                onReveal={onReveal}
                onFlipSettled={onFlipSettled}
                flipMs={flipMs}
                reducedMotion={reducedMotion}
                mediaLive={!leaving}
              />
            </li>
          ))}
        </ol>
      </div>
      <div className="p06-deck-foot">
        {everyCardOpened ? (
          <button
            type="button"
            className="p06-continue"
            data-continue
            onClick={onContinue}
            disabled={!canContinue}
          >
            {P06_COPY.continueLabel}
          </button>
        ) : (
          <p className="p06-deck-progress" data-deck-progress>
            {opened.filter((entry) => entry.opened).length} of {cards.length} cards opened
          </p>
        )}
      </div>
    </div>
  );
}
