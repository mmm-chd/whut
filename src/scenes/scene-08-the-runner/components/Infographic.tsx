import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { assetManifest } from '../../../assets/manifest';

/**
 * The records infographic, in two parts: a small card in the story column that
 * shows the two rows this scene is about (Percy and Oppy), and a viewer that
 * opens the whole poster. The poster is tall and has a dozen rovers on it, so
 * it is only readable full size, in a scrolling sheet over the scene.
 */
const THUMB_ID = 'p07-infographic-top';
const FULL_ID = 'p07-infographic';

export function InfographicCard({
  onOpen,
  triggerRef,
}: {
  readonly onOpen: () => void;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const thumb = assetManifest[THUMB_ID];
  if (!thumb?.path) {
    return null;
  }
  return (
    <figure className="p07-info">
      <button
        ref={triggerRef}
        type="button"
        className="p07-info-open"
        data-open-infographic
        onClick={onOpen}
        aria-haspopup="dialog"
      >
        <img className="p07-info-image" src={thumb.path} alt={thumb.alt ?? ''} draggable={false} />
        <span className="p07-info-cta">See all the records</span>
      </button>
      <figcaption className="p07-info-caption">Percy has now driven a little farther than Oppy.</figcaption>
    </figure>
  );
}

export function InfographicViewer({
  onClose,
  returnFocusTo,
}: {
  readonly onClose: () => void;
  readonly returnFocusTo: RefObject<HTMLButtonElement | null>;
}) {
  const full = assetManifest[FULL_ID];
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Focus moves into the sheet, and goes back to the card when it closes.
  useEffect(() => {
    closeRef.current?.focus();
    const back = returnFocusTo.current;
    return () => back?.focus();
  }, [returnFocusTo]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Two stops, the Close button and the scrolling poster, so Tab never leaves the sheet.
  const trap = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return;
    }
    const stops: HTMLElement[] = [];
    if (closeRef.current) {
      stops.push(closeRef.current);
    }
    if (scrollRef.current) {
      stops.push(scrollRef.current);
    }
    const index = stops.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? (index <= 0 ? stops.length - 1 : index - 1) : (index + 1) % stops.length;
    event.preventDefault();
    stops[next]?.focus();
  };

  if (!full?.path) {
    return null;
  }
  return (
    <div
      className="p07-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Driving records on Mars and the Moon"
      onKeyDown={trap}
      onClick={onClose}
    >
      <div className="p07-viewer-sheet" onClick={(event) => event.stopPropagation()}>
        <button ref={closeRef} type="button" className="p07-button" data-primary data-close-infographic onClick={onClose}>
          Close
        </button>
        <div ref={scrollRef} className="p07-viewer-scroll" tabIndex={0} aria-label="The infographic. Scroll to see every rover.">
          <img className="p07-viewer-image" src={full.path} alt={full.alt ?? ''} draggable={false} />
        </div>
      </div>
    </div>
  );
}
