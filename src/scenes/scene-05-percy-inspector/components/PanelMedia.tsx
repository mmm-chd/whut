import { useState } from 'react';
import { youtubeEmbedUrl, type PanelMediaSpec } from '../panelMedia';

/**
 * The media at the top of a card. The picture is hot-linked from NASA and the
 * video comes from YouTube, so both can fail offline: the card then says so in
 * one line instead of showing a broken box.
 */
export function PanelMedia({ media }: { readonly media: PanelMediaSpec }) {
  const [failed, setFailed] = useState(false);

  if (media.kind === 'youtube') {
    return (
      <div className="p05-media p05-media--video" data-media="youtube">
        <iframe
          className="p05-media-frame"
          src={youtubeEmbedUrl(media.id)}
          title={media.title}
          loading="lazy"
          allow="fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="p05-media" data-media="gif">
      {failed ? (
        <p className="p05-media-error" role="status">
          The picture could not load. Check your internet connection.
        </p>
      ) : (
        <img
          className="p05-media-image"
          src={media.src}
          alt={media.alt}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
