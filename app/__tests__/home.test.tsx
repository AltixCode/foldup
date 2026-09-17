import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import Levels from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { FREE_LEVELS } from '@/logic/stars';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { useLevelsStore } from '@/store/useLevelsStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const realHydrate = useLevelsStore.getState().hydrate;

async function seed(results: Record<number, { moves: number; stars: number }>) {
  await AsyncStorage.setItem('foldup.levels.v1', JSON.stringify(results));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useLevelsStore.setState({ results: {}, isHydrated: false, hydrate: realHydrate });
});

// No jest.restoreAllMocks(): it restores every spy in the process, including
// ones the renderer relies on, and the next test's tree is torn down on render.

describe('Levels', () => {
  it('invites a new player to play level 1', async () => {
    const { getByText } = await renderWithProviders(<Levels />);
    expect(getByText(t('play'))).toBeTruthy();
    expect(getByText(t('levelLabel', { number: 1 }))).toBeTruthy();
  });

  it('offers to continue from the next unplayed level', async () => {
    await seed({ 1: { moves: 10, stars: 3 }, 2: { moves: 14, stars: 2 } });
    const { getByText } = await renderWithProviders(<Levels />);
    await waitFor(() => expect(getByText(t('continueLevel'))).toBeTruthy());
    expect(getByText(t('levelLabel', { number: 3 }))).toBeTruthy();
  });

  it('opens an unlocked level', async () => {
    const { getByLabelText } = await renderWithProviders(<Levels />);
    await fireEvent.press(getByLabelText(t('levelLabel', { number: 1 })));
    expect(testRouter.push).toHaveBeenCalledWith('/level/1');
  });

  // Rewritten. It used to press a level past the free run on a FRESH install and assert the
  // paywall opened, which passed for the wrong reason: every shut level sold,
  // including the 49 that the banner directly above the grid promises are
  // free. The contract is that only a level shut BY THE PURCHASE sells.
  it('sends a free player to the paywall once the free run is spent', async () => {
    const cleared = Object.fromEntries(
      Array.from({ length: FREE_LEVELS }, (_, i) => [i + 1, { moves: 10, stars: 3 }]),
    );
    await seed(cleared);
    const { getByLabelText } = await renderWithProviders(<Levels />);
    await waitFor(() =>
      expect(getByLabelText(t('levelLabel', { number: FREE_LEVELS + 1 }))).toBeTruthy(),
    );
    await fireEvent.press(getByLabelText(t('levelLabel', { number: FREE_LEVELS + 1 })));
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
  });

  it('does not sell a free level the player has simply not reached', async () => {
    const { getByLabelText } = await renderWithProviders(<Levels />);
    await fireEvent.press(getByLabelText(t('levelLabel', { number: 2 })));
    expect(testRouter.push).not.toHaveBeenCalledWith('/paywall');
    expect(testRouter.push).not.toHaveBeenCalledWith('/level/2');
  });

  it('tells a free player where the free run ends', async () => {
    const { getByText } = await renderWithProviders(<Levels />);
    expect(getByText(t('lockedTitle'))).toBeTruthy();
    expect(getByText(t('lockedBody', { count: FREE_LEVELS }))).toBeTruthy();
  });

  it('does not sell the levels to someone who already owns them', async () => {
    usePremiumStore.setState({ isPremium: true });
    const { queryByText } = await renderWithProviders(<Levels />);
    expect(queryByText(t('lockedTitle'))).toBeNull();
  });

  it('shows the stars earned', async () => {
    await seed({ 1: { moves: 10, stars: 3 }, 2: { moves: 30, stars: 1 } });
    const { getByText } = await renderWithProviders(<Levels />);
    await waitFor(() => expect(getByText(t('starsLabel', { count: 4 }))).toBeTruthy());
  });

  it('shows a banner to a free user and none to a premium one', async () => {
    const free = await renderWithProviders(<Levels />);
    expect(free.queryByTestId('banner-ad')).not.toBeNull();

    usePremiumStore.setState({ isPremium: true });
    const paid = await renderWithProviders(<Levels />);
    expect(paid.queryByTestId('banner-ad')).toBeNull();
  });
});
