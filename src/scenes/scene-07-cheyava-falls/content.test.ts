import { describe, expect, it } from 'vitest';
import {
  P06_CARDS,
  P06_CARD_IDS,
  P06_COPY,
  P06_COPY_SOURCE,
  P06_VIDEO_CARD_ID,
  P06_VIDEO_ID,
  findCard,
  isP06CardId,
} from './content';

describe('the P-06 deck', () => {
  it('holds exactly five cards in the authored order', () => {
    expect(P06_CARDS).toHaveLength(5);
    expect(P06_CARDS.map((card) => card.id)).toEqual([...P06_CARD_IDS]);
    expect(P06_CARDS.map((card) => card.order)).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses the supplied headings, unchanged', () => {
    expect(P06_CARDS.map((card) => card.heading)).toEqual([
      'A Different Kind of Rock',
      'Leopard Spots',
      'Traces of an Ancient River',
      'Sapphire Canyon Sample',
      'A Clue, Not Proof',
    ]);
  });

  it('keeps the supplied bodies verbatim, including their punctuation', () => {
    // A paraphrase is a content revision, so the exact sentences are pinned.
    expect(findCard('different-rock').body).toBe(
      'In Jezero Crater, Percy found a rock about one meter by sixty centimeters. It was named Cheyava Falls, after a waterfall in the Grand Canyon on Earth.',
    );
    expect(findCard('sapphire-canyon').body).toContain('“Sapphire Canyon,”');
    expect(findCard('life-clues').body).toContain('potential biosignature—a sign');
    expect(findCard('life-clues').body.endsWith('in a lab on Earth.')).toBe(true);
  });

  it('gives every card its own icon and a label for it', () => {
    const icons = P06_CARDS.map((card) => card.icon);
    expect(new Set(icons).size).toBe(5);
    for (const card of P06_CARDS) {
      expect(card.iconLabel.length).toBeGreaterThan(10);
    }
  });

  it('puts the video on card one and nowhere else', () => {
    expect(P06_VIDEO_CARD_ID).toBe('different-rock');
    expect(P06_VIDEO_ID).toBe('9bLhVJKoIOg');
    expect(P06_CARDS.filter((card) => card.id === P06_VIDEO_CARD_ID)).toHaveLength(1);
  });

  it('names the provenance without putting it in the reader copy', () => {
    expect(P06_COPY_SOURCE.source).toBe('user-supplied-comments');
    expect(P06_COPY_SOURCE.review).toBe('draft');
    const copy = P06_CARDS.map((card) => `${card.heading} ${card.body}`).join(' ');
    expect(copy).not.toContain('user-supplied');
    expect(copy).not.toContain('draft');
  });

  it('narrows unknown ids instead of trusting them', () => {
    expect(isP06CardId('leopard-spots')).toBe(true);
    expect(isP06CardId('video')).toBe(false);
    expect(isP06CardId(null)).toBe(false);
  });

  it('builds a reveal label that names the card and its topic', () => {
    expect(P06_COPY.revealLabel(findCard('leopard-spots'))).toBe(
      'Reveal card 2: Leopard Spots',
    );
  });
});
