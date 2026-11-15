import gsap from 'gsap';
import { useEffect, useId, useRef } from 'react';
import { P06_COPY, P06_VIDEO_CARD_ID, type P06Card } from '../content';
import { CardBackIcon } from './CardBackIcon';
import { VideoCard } from './VideoCard';

/** The supplied motion: one turn around the horizontal axis. */
export const P06_FLIP_MS = 550;

interface InfoCardProps {
  readonly card: P06Card;
  /** Open means the information face is showing. */
  readonly opened: boolean;
  /** True while this card is the one allowed to be turning. */
  readonly flipping: boolean;
  readonly disabled: boolean;
  readonly onReveal: (card: P06Card) => void;
  readonly onFlipSettled: (card: P06Card) => void;
  /** Overrides the motion for tests and for the reduced-motion path. */
  readonly flipMs?: number;
  readonly reducedMotion?: boolean;
  /** False once Continue has been accepted: the player must be gone by then. */
  readonly mediaLive?: boolean;
}

/**
 * One card, with an icon back and an information front.
 *
 * The back is a real button, so the closed deck is reachable by Tab and opens
 * with Enter or Space. The front is an `article` — never a button wrapping text,
 * links or a player — and it is `inert` until the card is open, so a screen
 * reader and the Tab order never meet half a card.
 *
 * Both faces share one grid cell: the card is as tall as its taller face before
 * anything is turned, so revealing never pushes the deck around.
 */
export function InfoCard({
  card,
  opened,
  flipping,
  disabled,
  onReveal,
  onFlipSettled,
  flipMs = P06_FLIP_MS,
  reducedMotion = false,
  mediaLive = true,
}: InfoCardProps) {
  const inner = useRef<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  /** Set when the reader opened this card from its own button. */
  const focusWasInside = useRef(false);
  const regionId = useId();
  const instant = reducedMotion || flipMs <= 0;

  // The turn is the only animation in the scene and it lives here. A fresh
  // timeline per card means a pause can freeze this card at its current angle
  // without the deck needing its own clock.
  useEffect(() => {
    const element = inner.current;
    if (!element) {
      return;
    }
    const settle = () => {
      onFlipSettled(card);
      // Focus follows the card only when the reader was still in it.
      if (focusWasInside.current) {
        focusWasInside.current = false;
        heading.current?.focus();
      }
    };

    // Already open (a remount, a replay): sit on the information face without
    // reporting a turn that nobody watched.
    if (opened) {
      gsap.set(element, { rotationY: 180 });
      return;
    }
    if (!flipping) {
      gsap.set(element, { rotationY: 0 });
      return;
    }
    // `flipping` — not `opened` — starts the turn: the card is only `opened`
    // once this animation reports back, so waiting for `opened` would deadlock.
    if (instant) {
      gsap.set(element, { rotationY: 180 });
      settle();
      return;
    }
    // Two phases, one motion: the card leans away faster than it comes back,
    // and dips a little at the halfway point so the turn has weight instead of
    // snapping through. Easing on both halves keeps the join invisible.
    const turn = gsap.timeline({ onComplete: settle });
    turn
      .to(
        element,
        {
          rotationY: 180,
          duration: flipMs / 1000,
          ease: 'power3.inOut',
        },
        0,
      )
      .to(
        element,
        {
          scale: 0.965,
          duration: flipMs / 2000,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: 1,
        },
        0,
      );
    return () => {
      turn.kill();
    };
  }, [card, flipMs, flipping, instant, onFlipSettled, opened]);

  return (
    <div
      className="p06-card"
      data-card-id={card.id}
      data-opened={opened ? 'true' : 'false'}
      data-flipping={flipping ? 'true' : 'false'}
      data-order={card.order}
    >
      <div className="p06-card-inner" ref={inner}>
        <div className="p06-card-face p06-card-back" inert={opened} aria-hidden={opened}>
          <button
            type="button"
            className="p06-card-reveal"
            aria-label={P06_COPY.revealLabel(card)}
            aria-controls={regionId}
            aria-expanded={opened}
            disabled={disabled && !opened}
            onClick={() => {
              focusWasInside.current = true;
              onReveal(card);
            }}
          >
            <span className="p06-card-badge" aria-hidden="true">
              {card.order}
            </span>
            <CardBackIcon icon={card.icon} />
            <span className="p06-card-hint">{P06_COPY.revealHint}</span>
          </button>
        </div>

        <article
          className="p06-card-face p06-card-front"
          id={regionId}
          inert={!opened}
          aria-hidden={!opened}
        >
          <h3 className="p06-card-heading" tabIndex={-1} ref={heading}>
            {card.heading}
          </h3>
          <p className="p06-card-body">{card.body}</p>
          {/* Card one carries the video. It only exists once the card is open,
              and it never replaces the text above it. */}
          {card.id === P06_VIDEO_CARD_ID && opened ? <VideoCard active={mediaLive} /> : null}
        </article>
      </div>
    </div>
  );
}
