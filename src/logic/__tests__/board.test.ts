import {
  applyMerge,
  boardKey,
  emptyBoard,
  isCleared,
  isStuck,
  legalTargets,
  occupied,
  tileAt,
  tileCount,
  type Board,
} from '../board';

/** Builds a board from a grid of values; 0 means empty. */
function make(values: number[][]): Board {
  let id = 1;
  return values.map((row) => row.map((v) => (v === 0 ? null : { value: v, id: id++ })));
}

describe('tileAt / occupied / tileCount', () => {
  it('reads a tile and reports empties as null', () => {
    const board = make([[2, 0], [0, 4]]);
    expect(tileAt(board, { r: 0, c: 0 })?.value).toBe(2);
    expect(tileAt(board, { r: 0, c: 1 })).toBeNull();
  });

  it('treats an out-of-range cell as empty rather than throwing', () => {
    expect(tileAt(make([[2]]), { r: 9, c: 9 })).toBeNull();
  });

  it('lists occupied cells in reading order', () => {
    expect(occupied(make([[2, 0], [0, 4]]))).toEqual([{ r: 0, c: 0 }, { r: 1, c: 1 }]);
    expect(tileCount(make([[2, 2], [2, 0]]))).toBe(3);
  });
});

describe('legalTargets', () => {
  it('finds an equal neighbour', () => {
    expect(legalTargets(make([[2, 2]]), { r: 0, c: 0 })).toEqual([{ r: 0, c: 1 }]);
  });

  it('ignores a neighbour of a different value', () => {
    expect(legalTargets(make([[2, 4]]), { r: 0, c: 0 })).toEqual([]);
  });

  it('ignores an empty neighbour', () => {
    expect(legalTargets(make([[2, 0]]), { r: 0, c: 0 })).toEqual([]);
  });

  it('does not reach past an adjacent cell — the next move must be visible', () => {
    expect(legalTargets(make([[2, 0, 2]]), { r: 0, c: 0 })).toEqual([]);
  });

  it('does not count diagonals', () => {
    expect(legalTargets(make([[2, 0], [0, 2]]), { r: 0, c: 0 })).toEqual([]);
  });

  it('finds every direction', () => {
    const board = make([[0, 2, 0], [2, 2, 2], [0, 2, 0]]);
    expect(legalTargets(board, { r: 1, c: 1 })).toHaveLength(4);
  });

  it('returns nothing for an empty cell', () => {
    expect(legalTargets(make([[0, 2]]), { r: 0, c: 0 })).toEqual([]);
  });
});

describe('applyMerge', () => {
  it('doubles the target, clears the source and scores the new value', () => {
    const result = applyMerge(make([[2, 2]]), { r: 0, c: 0 }, { r: 0, c: 1 });
    expect(result.board[0]![1]?.value).toBe(4);
    expect(result.board[0]![0]).toBeNull();
    expect(result.gained).toBe(4);
  });

  it('keeps the target tile id, so the UI animates a tile and not a cell', () => {
    const board = make([[2, 2]]);
    const targetId = board[0]![1]!.id;
    const result = applyMerge(board, { r: 0, c: 0 }, { r: 0, c: 1 });
    expect(result.board[0]![1]?.id).toBe(targetId);
  });

  it('does not mutate the board it was given', () => {
    const board = make([[2, 2]]);
    applyMerge(board, { r: 0, c: 0 }, { r: 0, c: 1 });
    expect(board[0]![0]?.value).toBe(2);
    expect(board[0]![1]?.value).toBe(2);
  });

  it('refuses unequal values, an empty source and a self-merge', () => {
    const unequal = make([[2, 4]]);
    expect(applyMerge(unequal, { r: 0, c: 0 }, { r: 0, c: 1 }).gained).toBe(0);
    const empty = make([[0, 4]]);
    expect(applyMerge(empty, { r: 0, c: 0 }, { r: 0, c: 1 }).gained).toBe(0);
    const self = make([[2, 2]]);
    expect(applyMerge(self, { r: 0, c: 0 }, { r: 0, c: 0 }).gained).toBe(0);
  });
});

describe('isCleared / isStuck', () => {
  it('clears at exactly one tile', () => {
    expect(isCleared(make([[4, 0]]))).toBe(true);
    expect(isCleared(make([[2, 2]]))).toBe(false);
    expect(isCleared(emptyBoard(2, 2))).toBe(false);
  });

  it('is stuck when nothing can merge', () => {
    expect(isStuck(make([[2, 4], [8, 16]]))).toBe(true);
  });

  it('is not stuck when a merge exists', () => {
    expect(isStuck(make([[2, 2], [8, 16]]))).toBe(false);
  });

  it('is not stuck on a cleared board — that is a win, not a dead end', () => {
    expect(isStuck(make([[4, 0]]))).toBe(false);
  });
});

describe('boardKey', () => {
  it('ignores tile ids, which are not part of a position', () => {
    const a = make([[2, 4]]);
    const b = make([[2, 4]]);
    b[0]![0]!.id = 999;
    expect(boardKey(a)).toBe(boardKey(b));
  });

  it('distinguishes different layouts', () => {
    expect(boardKey(make([[2, 4]]))).not.toBe(boardKey(make([[4, 2]])));
  });
});
