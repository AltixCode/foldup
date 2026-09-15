import { contrastRatio } from '../color';
import { TILE_LADDER, colourForValue, textOnValue } from '../tileColours';

describe('colourForValue', () => {
  it('gives 2 the first rung', () => {
    expect(colourForValue(2)).toBe(TILE_LADDER[0]);
  });

  it('moves one rung per doubling', () => {
    expect(colourForValue(4)).toBe(TILE_LADDER[1]);
    expect(colourForValue(8)).toBe(TILE_LADDER[2]);
  });

  it('clamps at the top rather than returning undefined', () => {
    expect(colourForValue(2 ** 30)).toBe(TILE_LADDER[TILE_LADDER.length - 1]);
  });

  it('never returns undefined for an odd or tiny value', () => {
    expect(colourForValue(1)).toBeDefined();
    expect(colourForValue(0)).toBeDefined();
  });
});

describe('the ladder', () => {
  it('has no duplicate rungs', () => {
    expect(new Set(TILE_LADDER).size).toBe(TILE_LADDER.length);
  });

  it('carries AA-readable text on every rung', () => {
    // The value is always printed on the tile, so this is not decoration — a
    // rung that fails here makes the tile's number unreadable. A single white
    // could not do it: on the yellow rung white sits at 1.9:1.
    for (let step = 0; step < TILE_LADDER.length; step += 1) {
      const value = 2 ** (step + 1);
      expect(contrastRatio(textOnValue(value), colourForValue(value))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
