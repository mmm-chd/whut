import { useEffect, useRef, type ReactNode } from 'react';
import type { InspectionPointId } from '../inspectionState';

/**
 * A card is an ordinary DOM region: the reader can open one, read it, and keep
 * the list beside it. Nothing here traps focus, dims the story or pretends the
 * picture is gone.
 */

export interface InspectionCardProps {
  readonly point: InspectionPointId;
  readonly title: string;
  /** Small line above the title, e.g. `IMAGING SYSTEM`. */
  readonly category?: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
  /** The control that opened this card; focus returns here on close. */
  readonly returnFocusTo?: HTMLElement | null;
  /**
   * The primary content slot. It is deliberately empty until an authentic
   * asset exists: a placeholder that says so is honest, a fabricated picture
   * is not.
   */
  readonly media?: { readonly label: string; readonly note: string } | null;
  /** Real media for the slot (a picture or a video); wins over the placeholder. */
  readonly mediaContent?: ReactNode;
  readonly discovered?: boolean;
}

/**
 * A nonmodal card. It is not a dialog, has no backdrop, and closing it returns
 * focus to the control that opened it so the reader keeps their place.
 */
export function InspectionCard({
  point,
  title,
  category,
  children,
  onClose,
  returnFocusTo,
  media,
  mediaContent,
  discovered = false,
}: InspectionCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = `p04-card-title-${point}`;

  useEffect(() => {
    headingRef.current?.focus();
  }, [point]);

  // Return focus when the card unmounts, unless the target has left the page.
  useEffect(() => {
    const target = returnFocusTo ?? null;
    return () => {
      if (target?.isConnected) {
        target.focus();
      }
    };
  }, [returnFocusTo]);

  return (
    <section
      className="p04-card"
      data-inspection-card={point}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {category ? <p className="p04-card-category">{category}</p> : null}
      <h2 className="p04-card-title" id={titleId} tabIndex={-1} ref={headingRef}>
        {title}
      </h2>
      {mediaContent ? (
        <div className="p04-card-media-real" data-media-slot={point}>
          {mediaContent}
        </div>
      ) : media ? (
        <div className="p04-card-media" data-media-slot={point}>
          <p className="p04-card-media-label">{media.label}</p>
          <p className="p04-card-media-note">{media.note}</p>
        </div>
      ) : null}
      <div className="p04-card-body">{children}</div>
      {discovered ? (
        <p className="p04-card-badge" data-discovered={point}>
          Discovered
        </p>
      ) : null}
      <button type="button" className="p04-card-close" onClick={onClose}>
        Close
      </button>
    </section>
  );
}
