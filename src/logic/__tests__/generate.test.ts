import { isStuck, tileCount } from '../board';
import { generateLevel, shapeForLevel } from '../generate';
import { isSolvable } from '../solve';

describe('shapeForLevel', () => {
  it('starts on a small board with few tiles', () => {
    const shape = shapeForLevel(1);
    expect(shape.rows).toBe(3);
    expect(shape.tiles).toBeLessThanOrEqual(8);
  });

  it('grows the board as levels go on', () => {
    expect(shapeForLevel(60).rows).toBeGreaterThan(shapeForLevel(1).rows);
  });

  it('never asks for more tiles than the board has cells', () => {
    for (const level of [1, 20, 60, 200, 500]) {
      const shape = shapeForLevel(level);
      expect(shape.tiles).toBeLessThan(shape.rows * shape.cols);
    }
  });
});

describe('generateLevel', () => {
  it('is deterministic for a seed', () => {
    expect(generateLevel(5, 909)).toEqual(generateLevel(5, 909));
  });

  it('gives different levels for different seeds', () => {
    expect(generateLevel(5, 1)).not.toEqual(generateLevel(5, 2));
  });

  it.each([1, 4, 10, 20, 45])('produces a clearable level %i', (level) => {
    // An unclearable level is indistinguishable, to the player, from one they
    // are simply failing.
    const { board } = generateLevel(level, level * 71 + 3);
    expect(isSolvable(board)).toBe(true);
  });

  it.each([1, 4, 10, 20, 45])('never hands out a dead level %i', (level) => {
    const { board } = generateLevel(level, level * 17 + 11);
    expect(isStuck(board)).toBe(false);
  });

  it('reports par as one merge per tile beyond the first', () => {
    const { board, par } = generateLevel(12, 404);
    expect(par).toBe(tileCount(board) - 1);
  });

  it('never places a tile below the starting value of two', () => {
    const { board } = generateLevel(30, 77);
    for (const row of board) {
      for (const cell of row) {
        if (cell) expect(cell.value).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('only ever places powers of two', () => {
    const { board } = generateLevel(25, 13);
    for (const row of board) {
      for (const cell of row) {
        if (cell) expect(Number.isInteger(Math.log2(cell.value))).toBe(true);
      }
    }
  });

  it('gives every tile a distinct id, so the UI can track one across a merge', () => {
    const { board } = generateLevel(20, 5);
    const ids = board.flat().filter(Boolean).map((t) => t!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holds up across many seeds', () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const { board } = generateLevel(8, seed);
      expect(isSolvable(board)).toBe(true);
      expect(isStuck(board)).toBe(false);
    }
  });
});
