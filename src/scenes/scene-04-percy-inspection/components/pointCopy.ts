import { P04_FACTS, type FactRecord } from '../content';
import type { InspectionPointId } from '../inspectionState';

/**
 * The words on the four point buttons, kept out of the components so the
 * buttons and the cards cannot drift apart as the copy is finished.
 */
export const P04_POINT_LABELS: Readonly<Record<InspectionPointId, string>> = {
  cameras: 'Cameras',
  microphone: 'Microphone',
  moxie: 'MOXIE',
  'earth-team': 'Team on Earth',
};

export const P04_POINT_HINTS: Readonly<Record<InspectionPointId, string>> = {
  cameras: 'How Percy looks at Mars',
  microphone: 'How Percy listens for Mars',
  moxie: 'How Percy makes air',
  'earth-team': 'Who answers when Percy calls',
};

/** The published fact the greybox card shows under the point's own title. */
export function pointFact(point: InspectionPointId): FactRecord {
  return P04_FACTS[`p04.${point}` as keyof typeof P04_FACTS];
}
