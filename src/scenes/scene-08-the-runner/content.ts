/**
 * Facts and the distance comparison for P-07 (story "The Runner").
 *
 * Each record names its source, the date it was read and whether it has been
 * checked. A record is only `verified` when its page was read in full; one that
 * rests on a search summary stays `draft` and says so on screen.
 */
export type FactStatus = 'draft' | 'verified';

export interface FactRecord {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly source: string;
  readonly url: string;
  readonly retrieved: string;
  readonly status: FactStatus;
}

export interface DistanceSnapshot {
  readonly opportunityKm: number;
  readonly opportunityPeriod: string;
  readonly perseveranceKm: number | null;
  readonly perseveranceAsOf: string | null;
  readonly perseveranceMissionAge: string | null;
  readonly review: FactStatus;
}

/**
 * One fixed, dated snapshot: nothing is fetched on entry. NASA/JPL, "NASA's
 * Perseverance Sets Off-World Record for Total Distance Driven": 45.22 km on
 * 11 October 2026 (sol 2006), past Opportunity's 45.16 km, about five and a
 * half years after landing. Opportunity drove from 2004 to 2018.
 */
export const DISTANCE_SNAPSHOT: DistanceSnapshot = {
  opportunityKm: 45.16,
  opportunityPeriod: '2004 to 2018, nearly 15 years',
  perseveranceKm: 45.22,
  perseveranceAsOf: '11 October 2026',
  perseveranceMissionAge: 'about five and a half years',
  review: 'verified',
};

export const P07_FACTS: readonly FactRecord[] = [
  {
    id: 'oppy-distance',
    code: 'P07-OPPY-DISTANCE',
    title: 'Oppy, the long-distance rover',
    summary:
      'Oppy, short for Opportunity, drove about 45 kilometers on Mars between 2004 and 2018. That was the record for a vehicle on another world.',
    source: 'NASA/JPL: Perseverance Sets Off-World Record for Total Distance Driven',
    url: 'https://www.jpl.nasa.gov/news/nasas-perseverance-sets-off-world-record-for-total-distance-driven/',
    retrieved: '2026-11-15',
    status: 'verified',
  },
  {
    id: 'percy-distance',
    code: 'P07-PERCY-DISTANCE',
    title: "Percy's journey so far",
    summary:
      'On 11 October 2026 Percy had driven 45.22 kilometers, a little more than Oppy, about five and a half years after landing.',
    source: 'NASA/JPL: Perseverance Sets Off-World Record for Total Distance Driven',
    url: 'https://www.jpl.nasa.gov/news/nasas-perseverance-sets-off-world-record-for-total-distance-driven/',
    retrieved: '2026-11-15',
    status: 'verified',
  },
  {
    id: 'signal-latency',
    code: 'P07-SIGNAL-LATENCY',
    title: 'A message takes time',
    summary:
      'A message takes about 3 to 22 minutes to travel one way between Earth and Mars, depending on where the planets are. In this story we speed up the wait.',
    source: 'NASA: Mars Communications Disruption and Delay',
    url: 'https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf',
    retrieved: '2026-11-15',
    status: 'draft',
  },
  {
    id: 'autonav',
    code: 'P07-AUTONAV',
    title: 'Percy drives himself',
    summary:
      "The team on Earth plans where Percy should go. On the way, Percy makes a 3D map of the ground with his cameras, spots hazards and picks a safe route around them by himself. NASA calls it \"thinking while driving\".",
    source: "NASA/JPL: NASA's Self-Driving Perseverance Mars Rover 'Takes the Wheel'",
    url: 'https://www.jpl.nasa.gov/news/nasas-self-driving-perseverance-mars-rover-takes-the-wheel/',
    retrieved: '2026-11-15',
    status: 'verified',
  },
];

export function findFact(id: string): FactRecord | null {
  return P07_FACTS.find((fact) => fact.id === id) ?? null;
}

/** The reader-facing words for the phases the map shows. Encouraging, never failing. */
export const P07_COPY = {
  choose: 'Tap a clear patch of ground, then send the command.',
  blocked: 'Choose a clear patch of ground.',
  signalTitle: 'Waiting for the signal to reach Mars...',
  signalNote: "We'll speed up the wait in this story.",
  navigating: 'Percy is driving there by himself.',
  assessing: 'A rough patch ahead. Percy is checking a safer route.',
  rerouted: 'Found a safer way around!',
  routeError: 'Percy needs another safe destination.',
  arrived: 'Percy made it to the spot you picked!',
  arrivedWaiting: 'Finish reading Percy’s facts, then press Arrived!',
} as const;
