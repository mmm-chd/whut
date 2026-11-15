import type { InspectionPointId } from '../scene-04-percy-inspection/inspectionState';

/**
 * The picture, or the video, at the top of each part's card, as chosen by the
 * story team. Cameras shows a NASA animation; the microphone and MOXIE cards
 * play a YouTube video (embedded through youtube-nocookie.com). The Earth team
 * is text only.
 */
export type PanelMediaSpec =
  | { readonly kind: 'gif'; readonly src: string; readonly alt: string }
  | { readonly kind: 'youtube'; readonly id: string; readonly title: string };

export const P05_MEDIA: Readonly<Record<InspectionPointId, PanelMediaSpec | null>> = {
  cameras: {
    kind: 'gif',
    src: 'https://assets.science.nasa.gov/content/dam/science/missions/mars2020/2024/10/crater-climb-mosaic/PIA26377-perseverance-drive.gif',
    alt: 'An animation of the pictures Perseverance took while driving up the crater rim.',
  },
  microphone: {
    kind: 'youtube',
    id: 'GHenFGnixzU',
    title: 'Sounds recorded by Perseverance on Mars',
  },
  moxie: {
    kind: 'youtube',
    id: 'WHodcMRoRZw',
    title: 'MOXIE, the oxygen-making experiment on Perseverance',
  },
  'earth-team': null,
};

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

/** True where the media makes its own sound, so the story score should step aside. */
export function mediaHasSound(media: PanelMediaSpec | null): boolean {
  return media?.kind === 'youtube';
}
