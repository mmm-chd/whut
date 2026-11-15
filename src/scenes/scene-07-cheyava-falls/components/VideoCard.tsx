import { useEffect, useRef, useState } from 'react';
import { useStoryStore } from '../../../stores/story.store';
import { P06_VIDEO_ID } from '../content';
import { useYoutubePlayer } from '../player/useYoutubePlayer';

/** Canonical watch URL; the `si` sharing parameter is not part of it. */
export const P06_VIDEO_WATCH_URL = `https://www.youtube.com/watch?v=${P06_VIDEO_ID}`;

/**
 * The video on card one, opened in a dialog.
 *
 * The card stays a card: a poster button and a link. Nothing is fetched until
 * the reader presses that button, so a reader who only wants the text never
 * touches the network. The player itself lives in a native `<dialog>`, which
 * brings the focus trap, Escape and the top layer with it; the close button,
 * the backdrop and Escape all end the same way, and closing destroys the player.
 */
export function VideoCard({ active = true }: { readonly active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const paused = useStoryStore((store) => store.isPaused);
  const muted = useStoryStore((store) => store.settings.muted);
  const volume = useStoryStore((store) => store.settings.volume);

  const { status } = useYoutubePlayer({
    container: slot,
    // Only while the dialog is open and the deck is still live.
    enabled: active && open,
    videoId: P06_VIDEO_ID,
    paused,
    muted,
    volume,
  });

  // `showModal` gives the dialog the top layer, a focus trap and Escape.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    // Focus goes back to the button that opened the dialog, not to <body>.
    triggerRef.current?.focus();
  };

  return (
    <section className="p06-video" aria-label="Video accompanying A Different Kind of Rock">
      <button
        type="button"
        ref={triggerRef}
        className="p06-video-poster"
        data-video-open
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        disabled={!active}
      >
        <span className="p06-video-play" aria-hidden="true" />
        <span className="p06-video-poster-text">Watch the video</span>
      </button>
      <a
        className="p06-video-link"
        href={P06_VIDEO_WATCH_URL}
        target="_blank"
        rel="noreferrer noopener"
        referrerPolicy="strict-origin-when-cross-origin"
      >
        Open on YouTube
      </a>

      <dialog
        ref={dialogRef}
        className="p06-video-dialog"
        data-video-dialog
        aria-label="Video accompanying A Different Kind of Rock"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself.
          if (event.target === dialogRef.current) {
            close();
          }
        }}
      >
        <div className="p06-video-dialog-frame" ref={setSlot} data-video-slot data-state={status} />
        <button
          type="button"
          className="p06-video-close"
          data-video-close
          aria-label="Close the video"
          onClick={close}
        >
          <span aria-hidden="true">×</span>
        </button>
        {status === 'loading' ? <p className="p06-video-note">Loading the video...</p> : null}
        {status === 'unavailable' ? (
          <p className="p06-video-note" data-video-fallback>
            The video cannot play here. You can still read the card, or watch it on YouTube.
          </p>
        ) : null}
        <a
          className="p06-video-link"
          href={P06_VIDEO_WATCH_URL}
          target="_blank"
          rel="noreferrer noopener"
          referrerPolicy="strict-origin-when-cross-origin"
        >
          Open on YouTube
        </a>
      </dialog>
    </section>
  );
}
