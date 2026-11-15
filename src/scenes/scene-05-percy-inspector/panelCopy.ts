import type { InspectionPointId } from '../scene-04-percy-inspection/inspectionState';

/**
 * The panel's two extra lines, per part.
 *
 * `perseverance-3d-inspection-interaction.md` 3.3 asks every panel for a small
 * category label above the title and a prominent primary content area. The
 * category is copy; the content area is the media in `panelMedia.ts`.
 */
export const P05_PANEL_CATEGORY: Readonly<Record<InspectionPointId, string>> = {
  cameras: 'Imaging system',
  microphone: 'Audio system',
  moxie: 'Oxygen experiment',
  'earth-team': 'Mission operations',
};
