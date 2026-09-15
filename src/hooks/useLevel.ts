import { useMemo } from 'react';

import { generateLevel, type GeneratedLevel } from '@/logic/generate';
import { seedFromKey } from '@/logic/rng';

/**
 * The level's board.
 *
 * Deterministic from the level number, so every player gets the same level 37
 * with nothing shipped or fetched. Memoised because generation does real work
 * and regenerating each render would stutter the board.
 */
export function useLevel(level: number): GeneratedLevel {
  return useMemo(() => generateLevel(level, seedFromKey(`foldup:${level}`)), [level]);
}
