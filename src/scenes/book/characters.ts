import { CHARACTER_MODELS, CHARACTER_PORTRAITS } from './assets';

/**
 * The two explorer spreads of the adventure journal (concept sections 9-10).
 * One character per spread: the left page introduces the explorer, the right
 * page holds the passive 3D preview and the two entry buttons. Content stays
 * plain data so pages, the inspector, and tests share one source of truth.
 */

export interface CharacterNode {
  id: string;
  /** Short tag on the hotspot itself. */
  label: string;
  title: string;
  body: string;
  /** Hotspot position over the inspector viewer, in percent. */
  x: number;
  y: number;
}

export interface CharacterSpread {
  id: 'percy' | 'ginny';
  /** Bookmark tab label on the book edge. */
  tab: string;
  name: string;
  headline: string;
  intro: string;
  facts: readonly { label: string; value: string }[];
  /** Handwritten line at the bottom of the left page. */
  quote: string;
  /** Sticky-note copy on the left page. */
  sticky: string;
  /** Opening line of the right page. */
  discover: string;
  portrait: string;
  model: string;
  /** Scrapbook accent for this spread. */
  accent: string;
  /** Whether the story mode for this explorer exists yet. */
  storyReady: boolean;
  nodes: readonly CharacterNode[];
}

const PERCY_NODES: readonly CharacterNode[] = [
  {
    id: 'percy-cameras',
    label: 'CAMERAS',
    title: 'Mastcam-Z',
    body: "Twin zoom cameras study rocks from afar and take the mission's photos.",
    x: 52,
    y: 28,
  },
  {
    id: 'percy-laser',
    label: 'LASER',
    title: 'SuperCam',
    body: 'Zaps a rock with a laser and reads the vapor to learn what it is made of.',
    x: 24,
    y: 40,
  },
  {
    id: 'percy-oxygen',
    label: 'OXYGEN',
    title: 'MOXIE',
    body: 'An experiment that turns the thin Martian air into breathable oxygen.',
    x: 22,
    y: 57,
  },
  {
    id: 'percy-arm',
    label: 'ARM',
    title: 'Robotic Arm',
    body: 'Drills into rocks and seals the samples inside small tubes.',
    x: 77,
    y: 52,
  },
  {
    id: 'percy-wheels',
    label: 'WHEELS',
    title: 'Wheels',
    body: 'Six sturdy wheels climb over rocks without getting stuck.',
    x: 55,
    y: 72,
  },
];

const GINNY_NODES: readonly CharacterNode[] = [
  {
    id: 'ginny-rotors',
    label: 'ROTORS',
    title: 'Rotor Blades',
    body: 'Four blades spin fast enough to lift a helicopter in very thin air.',
    x: 30,
    y: 38,
  },
  {
    id: 'ginny-solar',
    label: 'SOLAR',
    title: 'Solar Panel',
    body: 'The solar panel charges the battery before every flight.',
    x: 53,
    y: 26,
  },
  {
    id: 'ginny-camera',
    label: 'CAMERA',
    title: 'Navigation Camera',
    body: 'A small camera looks down to find a safe place to land.',
    x: 52,
    y: 62,
  },
  {
    id: 'ginny-legs',
    label: 'LEGS',
    title: 'Landing Legs',
    body: 'Springy legs soften every landing on the dusty surface.',
    x: 30,
    y: 70,
  },
];

export const characterSpreads: readonly CharacterSpread[] = [
  {
    id: 'percy',
    tab: 'PERCY',
    name: 'Percy',
    headline: 'The Mars Rover',
    intro: 'Your curious little explorer on the Red Planet.',
    facts: [
      { label: 'Type', value: 'Mars rover' },
      { label: 'Destination', value: 'Jezero Crater' },
      { label: 'Mission', value: 'Explore, investigate, and collect samples' },
    ],
    quote: 'Every rock has a story to tell!',
    sticky: 'Look for the rocks with stripes. They remember the water!',
    discover: "There's so much more to discover about this little explorer.",
    portrait: CHARACTER_PORTRAITS.percy,
    model: CHARACTER_MODELS.perseverance,
    accent: '#B95E43',
    storyReady: true,
    nodes: PERCY_NODES,
  },
  {
    id: 'ginny',
    tab: 'GINNY',
    name: 'Ginny',
    headline: 'The Mars Helicopter',
    intro: 'A little helicopter that made history flying on another planet.',
    facts: [
      { label: 'Type', value: 'Experimental helicopter' },
      { label: 'First flight', value: 'April 2021' },
      { label: 'Mission', value: 'Show that powered flight works on Mars' },
    ],
    quote: 'Up, up, and away!',
    sticky: 'The air on Mars is very thin, so the blades must spin extra fast.',
    discover: 'There is more to this record-breaking flyer than meets the eye.',
    portrait: CHARACTER_PORTRAITS.ginny,
    model: CHARACTER_MODELS.ingenuity,
    accent: '#274766',
    storyReady: false,
    nodes: GINNY_NODES,
  },
];

export function getSpread(index: number): CharacterSpread {
  return characterSpreads[Math.min(characterSpreads.length - 1, Math.max(0, index))];
}

export function spreadTitle(spread: CharacterSpread): string {
  return `${spread.name}, ${spread.headline}`;
}
