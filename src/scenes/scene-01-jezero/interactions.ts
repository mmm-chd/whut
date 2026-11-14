export type RockId = 'rock-a' | 'rock-b' | 'rock-c';

export interface InteractionCard {
  id: string;              // 'rock-a' / 'rock-b' / 'rock-c'
  rockId: RockId;
  factId: 'FAKTA-2' | 'FAKTA-3' | 'FAKTA-4';
  title: string;
  body: string;
}

/**
 * P-01 rock → fact card mapping.
 *
 * Card copy is draft English from docs/facts.md and needs project-owner
 * approval before final. FAKTA values are verified (docs/facts.md).
 */
export const interactions: readonly InteractionCard[] = [
  {
    id: 'rock-a',
    rockId: 'rock-a',
    factId: 'FAKTA-2',
    title: 'Volcanic rock under Percy',
    body: "The ground under Percy's wheels is made of volcanic rock! Some of it formed deep underground, and some came from lava on the surface. Long ago, water changed these rocks.",
  },
  {
    id: 'rock-b',
    rockId: 'rock-b',
    factId: 'FAKTA-3',
    title: 'Long ago, Jezero had water',
    body: 'Long ago, Jezero Crater was not empty. A river flowed into a big lake here! Percy found rocks that show water was once part of this place.',
  },
  {
    id: 'rock-c',
    rockId: 'rock-c',
    factId: 'FAKTA-4',
    title: "Percy's big mission",
    body: "Percy is a space explorer with a big job: look for signs of ancient life, collect rock samples, and help scientists learn about Mars. One day, those samples might come back to Earth!",
  },
];

export function getInteractionForRock(rockId: RockId): InteractionCard | undefined {
  return interactions.find((interaction) => interaction.rockId === rockId);
}
