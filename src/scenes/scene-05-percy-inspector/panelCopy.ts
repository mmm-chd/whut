import type { InspectionPointId } from '../scene-04-percy-inspection/inspectionState';

/**
 * The panel's two extra lines, per part.
 *
 * `perseverance-3d-inspection-interaction.md` 3.3 asks every panel for a small
 * category label above the title and a prominent primary content area. The
 * category is copy; the content area is a slot, and until an authentic NASA
 * recording exists the slot says so instead of showing something invented.
 */
export const P05_PANEL_CATEGORY: Readonly<Record<InspectionPointId, string>> = {
  cameras: 'Imaging system',
  microphone: 'Audio system',
  moxie: 'Oxygen experiment',
  'earth-team': 'Mission operations',
};

export interface PanelMedia {
  /** What belongs in the slot, in two words. */
  readonly label: string;
  /** Why the slot is empty, said plainly. */
  readonly note: string;
}

/**
 * Only two parts are media-led. MOXIE and the Earth team are interactions, so
 * their primary content is the activity itself and they get no media slot.
 */
export const P05_PANEL_MEDIA: Readonly<Record<InspectionPointId, PanelMedia | null>> = {
  cameras: {
    label: 'Recorded from Mars',
    note: 'Mastcam-Z footage and images are not loaded yet. This slot is reserved for NASA media.',
  },
  microphone: {
    label: 'Recorded on Mars',
    note: 'SuperCam and chassis recordings are not loaded yet. This slot is reserved for NASA audio.',
  },
  moxie: null,
  'earth-team': null,
};
