import { readableTextOn } from './color';

/**
 * Tile colours by value.
 *
 * Each power of two gets its own hue, warming as the numbers grow, so a board's
 * shape is readable at a glance. The value is ALWAYS printed on the tile — the
 * colour is a convenience, never the information, so the game is fully playable
 * without distinguishing any two hues.
 *
 * This is a palette file, which is the one place colours are allowed to be
 * written down.
 */
const LADDER = [
  '#7C5CFF',
  '#4F7BE8',
  '#0EA5E9',
  '#14B8A6',
  '#10B981',
  '#65A30D',
  '#EAB308',
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#A855F7',
] as const;

/**
 * The text colour for a tile, chosen per rung.
 *
 * A single white cannot serve the whole ladder: on the yellow rung white sits
 * at 1.9:1, which makes the tile's number — the only thing that matters —
 * unreadable. `readableTextOn` picks whichever of black or white actually wins
 * on that hue.
 */
export function textOnValue(value: number): string {
  return readableTextOn(colourForValue(value));
}

export function colourForValue(value: number): string {
  const step = Math.max(0, Math.round(Math.log2(value)) - 1);
  return LADDER[Math.min(step, LADDER.length - 1)] ?? LADDER[0];
}

export const TILE_LADDER = LADDER;
