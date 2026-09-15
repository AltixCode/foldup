import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { TileBoard } from '@/components/game/TileBoard';
import { Button, Screen, Text } from '@/components/ui';
import { useLevel } from '@/hooks/useLevel';
import { t } from '@/i18n';
import {
  applyMerge,
  isCleared,
  isStuck,
  legalTargets,
  samePoint,
  tileAt,
  type Board,
  type Point,
} from '@/logic/board';
import { hintFor } from '@/logic/solve';
import { TOTAL_LEVELS } from '@/logic/stars';
import { shouldShowInterstitial } from '@/monetization/adPolicy';
import { showInterstitial } from '@/monetization/interstitial';
import { isRewardedReady, showRewarded } from '@/monetization/rewarded';
import { useLevelsStore } from '@/store/useLevelsStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme } from '@/theme';

const FREE_HINTS = 1;

export default function LevelRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const level = Math.max(1, Math.min(TOTAL_LEVELS, Number(params.id ?? 1) || 1));
  // Keyed so changing level REMOUNTS: resetting from an effect leaves one frame
  // showing the previous level's tiles.
  return <LevelSession key={level} level={level} />;
}

function LevelSession({ level }: { level: number }) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { board: initial, par } = useLevel(level);

  const [history, setHistory] = useState<Board[]>([initial]);
  const [lifted, setLifted] = useState<Point | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const recorded = useRef(false);

  const board = history[history.length - 1]!;
  const moves = history.length - 1;
  const cleared = isCleared(board);
  const stuck = !cleared && isStuck(board);

  const recordClear = useLevelsStore((s) => s.recordClear);
  const isPremium = usePremiumStore((s) => s.isPremium);

  useEffect(() => {
    if (!cleared || recorded.current) return;
    recorded.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    recordClear(level, moves, par);

    // After the win is on screen, behind its own pacing — never during play.
    if (
      shouldShowInterstitial({
        gamesPlayed: level,
        lastInterstitialAt: 0,
        now: Date.now(),
        adsRemoved: isPremium,
      })
    ) {
      showInterstitial();
    }
  }, [cleared, level, moves, par, recordClear, isPremium]);

  const select = useCallback(
    (at: Point) => {
      if (cleared) return;
      if (!tileAt(board, at)) return;

      if (lifted === null) {
        setLifted(at);
        return;
      }
      if (samePoint(lifted, at)) {
        setLifted(null);
        return;
      }
      if (legalTargets(board, lifted).some((p) => samePoint(p, at))) {
        setHistory((h) => [...h, applyMerge(board, lifted, at).board]);
        setLifted(null);
      } else {
        // Tapping another tile lifts THAT one rather than doing nothing, which
        // is what a player means when they change their mind mid-move.
        setLifted(at);
      }
    },
    [board, lifted, cleared],
  );

  const undo = useCallback(() => {
    setLifted(null);
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

  const restart = useCallback(() => {
    setLifted(null);
    setHistory([initial]);
  }, [initial]);

  const applyHint = useCallback(() => {
    const move = hintFor(board);
    if (!move) return false;
    setHistory((h) => [...h, applyMerge(board, move.from, move.to).board]);
    setLifted(null);
    return true;
  }, [board]);

  const onHint = useCallback(() => {
    const allowance = isPremium ? Number.POSITIVE_INFINITY : FREE_HINTS;
    if (hintsUsed < allowance) {
      if (applyHint()) setHintsUsed((n) => n + 1);
      return;
    }
    if (!isRewardedReady()) {
      Alert.alert(t('noHintsLeft'), t('adNotReady'));
      return;
    }
    void showRewarded().then((earned) => {
      if (earned && applyHint()) setHintsUsed((n) => n + 1);
    });
  }, [applyHint, hintsUsed, isPremium]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: spacing.base,
          }}
        >
          <Text variant="title">{t('levelLabel', { number: level })}</Text>
          <Text variant="caption" tone="muted">
            {t('movesLabel')} {moves} · {t('parLabel', { count: par })}
          </Text>
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {t('tapToFold')}
        </Text>

        <TileBoard board={board} lifted={lifted} onSelect={select} />

        {cleared ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm }}>
            <Text variant="heading" tone="accent">
              {t('solvedTitle')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('solvedInMoves', { count: moves })}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <Button
                label={t('nextLevel')}
                onPress={() => router.replace(`/level/${Math.min(TOTAL_LEVELS, level + 1)}`)}
              />
              <Button label={t('backToLevels')} variant="ghost" onPress={() => router.replace('/')} />
            </View>
          </View>
        ) : (
          <>
            {stuck ? (
              <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
                <Text variant="bodyStrong" tone="danger">
                  {t('stuckTitle')}
                </Text>
                <Text variant="caption" tone="muted" align="center" style={{ marginTop: 2 }}>
                  {t('stuckBody')}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
              <Button
                label={t('undo')}
                variant="secondary"
                disabled={history.length === 1}
                onPress={undo}
                style={{ flex: 1 }}
              />
              <Button label={t('hint')} variant="secondary" onPress={onHint} style={{ flex: 1 }} />
              <Button label={t('restart')} variant="ghost" onPress={restart} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </Screen>
      <BannerAdSlot />
    </View>
  );
}
