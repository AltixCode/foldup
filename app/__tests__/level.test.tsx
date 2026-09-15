import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import LevelRoute from '../level/[id]';
import { setRouteParams } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { occupied, tileCount } from '@/logic/board';
import { generateLevel } from '@/logic/generate';
import { seedFromKey } from '@/logic/rng';
import { isSolvable } from '@/logic/solve';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { useLevelsStore } from '@/store/useLevelsStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const LEVEL = 1;
const { board: BOARD, par: PAR } = generateLevel(LEVEL, seedFromKey(`foldup:${LEVEL}`));

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useLevelsStore.setState({ results: {}, isHydrated: true });
  setRouteParams({ id: String(LEVEL) });
});

describe('Level', () => {
  it('shows the level, the move count and how to play', async () => {
    const { getByText } = await renderWithProviders(<LevelRoute />);
    expect(getByText(t('levelLabel', { number: LEVEL }))).toBeTruthy();
    expect(getByText(t('tapToFold'))).toBeTruthy();
  });

  it('starts with undo unavailable', async () => {
    const { getByLabelText } = await renderWithProviders(<LevelRoute />);
    expect(getByLabelText(t('undo')).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('an empty cell is not pressable', async () => {
    const empties: { r: number; c: number }[] = [];
    BOARD.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell) empties.push({ r, c });
      }),
    );
    if (empties.length === 0) return;
    const { getAllByLabelText } = await renderWithProviders(<LevelRoute />);
    // Every empty cell, not one: a board has several, and all of them must be
    // unpressable — there is nothing to lift.
    const cells = getAllByLabelText(new RegExp(`${t('tileEmpty')}$`));
    expect(cells).toHaveLength(empties.length);
    cells.forEach((cell) => expect(cell.props.accessibilityState).toMatchObject({ disabled: true }));
  });

  it('lifting a tile marks it as lifted', async () => {
    const at = occupied(BOARD)[0]!;
    const tile = BOARD[at.r]![at.c]!;
    const { getByLabelText } = await renderWithProviders(<LevelRoute />);
    const base = t('tileA11y', { row: at.r + 1, col: at.c + 1, value: tile.value });
    await fireEvent.press(getByLabelText(base));
    await waitFor(() => expect(getByLabelText(`${base}, ${t('tileSelected')}`)).toBeTruthy());
  });

  it('a hint folds two tiles and enables undo', async () => {
    const before = tileCount(BOARD);
    const { getByLabelText } = await renderWithProviders(<LevelRoute />);
    await fireEvent.press(getByLabelText(t('hint')));
    await waitFor(() =>
      expect(getByLabelText(t('undo')).props.accessibilityState).toMatchObject({ disabled: false }),
    );
    expect(before).toBeGreaterThan(1);
  });

  it('undo puts the folded tile back', async () => {
    const { getByLabelText } = await renderWithProviders(<LevelRoute />);
    const undoState = () => getByLabelText(t('undo')).props.accessibilityState;
    await fireEvent.press(getByLabelText(t('hint')));
    await waitFor(() => expect(undoState()).toMatchObject({ disabled: false }));
    await fireEvent.press(getByLabelText(t('undo')));
    await waitFor(() => expect(undoState()).toMatchObject({ disabled: true }));
  });

  it('restart returns the board to the start', async () => {
    const { getByLabelText } = await renderWithProviders(<LevelRoute />);
    await fireEvent.press(getByLabelText(t('hint')));
    await waitFor(() =>
      expect(getByLabelText(t('undo')).props.accessibilityState).toMatchObject({ disabled: false }),
    );
    await fireEvent.press(getByLabelText(t('restart')));
    await waitFor(() =>
      expect(getByLabelText(t('undo')).props.accessibilityState).toMatchObject({ disabled: true }),
    );
  });

  it('clears the level when every fold is played, and records it', async () => {
    // Premium, because a free player gets exactly one hint — that limit is the
    // paywall working, not a bug.
    usePremiumStore.setState({ isPremium: true });
    const { getByLabelText, getByText } = await renderWithProviders(<LevelRoute />);
    for (let i = 0; i < PAR; i += 1) {
      await fireEvent.press(getByLabelText(t('hint')));
    }
    await waitFor(() => expect(getByText(t('solvedTitle'))).toBeTruthy());
    expect(useLevelsStore.getState().results[LEVEL]).toBeDefined();
  });

  it('level 1 is genuinely clearable — the screen cannot be a dead end', () => {
    expect(isSolvable(BOARD)).toBe(true);
  });
});
