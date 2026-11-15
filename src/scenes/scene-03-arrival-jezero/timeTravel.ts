/**
 * The P-03 game: a time slider. The reader drags Percy's marker from today back
 * to the day the lake was here, and every stop is one thing Perseverance found.
 *
 * Copy is short on purpose (children 8-12, no walls of text). Every date and
 * claim below is from a NASA or Science page, checked on 2026-11-15; `source`
 * is what each stop rests on. Nothing here is an estimate of ours.
 */
export interface TimeStop {
  readonly id: string;
  /** Under the slider. */
  readonly axis: string;
  /** In Percy's speech bubble. */
  readonly bubble: string;
  readonly title: string;
  readonly body: string;
  /** 0 = dry crater floor, 1 = the lake at its fullest. */
  readonly water: number;
  /** Where the pin sits on the top-view map, in 0..100 of the map box. */
  readonly pin: { readonly x: number; readonly y: number };
  readonly source: string;
}

export const TIME_STOPS: readonly TimeStop[] = [
  {
    id: 'today',
    axis: 'Today',
    bubble: 'Today!',
    title: 'Percy is still exploring',
    body: 'He keeps searching Jezero for clues about the past.',
    water: 0,
    pin: { x: 30, y: 72 },
    source: 'NASA Mars 2020 mission page',
  },
  {
    id: 'sep-2025',
    axis: 'Sep 2025',
    bubble: 'September 2025',
    title: 'A rock with a mystery',
    body: 'A sample called Sapphire Canyon has marks that might be signs of ancient life. Scientists are still checking!',
    water: 0,
    pin: { x: 22, y: 44 },
    source: 'NASA via CNN and NPR, 10 Sep 2025',
  },
  {
    id: 'jul-2024',
    axis: 'Jul 2024',
    bubble: 'July 2024',
    title: 'Leopard spots!',
    body: 'On a rock called Cheyava Falls, Percy spotted tiny spots. It sits in an old river valley.',
    water: 0,
    pin: { x: 12, y: 34 },
    source: 'NASA via CNN, 26 Jul 2024',
  },
  {
    id: 'sep-2022',
    axis: 'Sep 2022',
    bubble: 'September 2022',
    title: 'Clues in a lake rock',
    body: 'The rock Wildcat Ridge likely formed in a lake that was drying up. It holds organic molecules.',
    water: 0.3,
    pin: { x: 28, y: 52 },
    source: 'NASA/JPL, 15 Sep 2022',
  },
  {
    id: '2021',
    axis: '2021',
    bubble: '2021',
    title: 'A river built a delta',
    body: 'Percy’s rocks showed a river once poured into a lake and left a fan of mud and sand.',
    water: 0.6,
    pin: { x: 30, y: 58 },
    source: 'Science 374, 711 (2021)',
  },
  {
    id: 'ancient',
    axis: '3.5 billion years ago',
    bubble: 'Long, long ago',
    title: 'A lake filled Jezero!',
    body: 'Rivers spilled over the crater wall and made a lake. Mars really did have water!',
    water: 1,
    pin: { x: 50, y: 50 },
    source: 'NASA/JPL',
  },
];

export const LAST_STOP = TIME_STOPS.length - 1;
