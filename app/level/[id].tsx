import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";

import { BannerAdSlot } from "@/components/BannerAdSlot";
import { TileBoard } from "@/components/game/TileBoard";
import { Button, Screen, Text } from "@/components/ui";
import { useLevel } from "@/hooks/useLevel";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { t } from "@/i18n";
import {
  applyMerge,
  isCleared,
  isStuck,
  legalTargets,
  samePoint,
  swipeTarget,
  tileAt,
  type Board,
  type Point,
  type SwipeDirection,
} from "@/logic/board";
import { hintFor } from "@/logic/solve";
import { TOTAL_LEVELS } from "@/logic/stars";
import { shouldShowInterstitial } from "@/monetization/adPolicy";
import { showInterstitial } from "@/monetization/interstitial";
import { isRewardedReady, showRewarded } from "@/monetization/rewarded";
import { useLevelsStore } from "@/store/useLevelsStore";
import { usePremiumStore } from "@/store/usePremiumStore";
import { useTheme } from "@/theme";

const FREE_HINTS = 1;

export default function LevelRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const level = Math.max(
    1,
    Math.min(TOTAL_LEVELS, Number(params.id ?? 1) || 1),
  );
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
  const playSound = useSoundEffects();

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

  // Shared by every way of folding a tile — tap-then-tap, swipe and hint —
  // so the sound, the history entry and the "lifted" reset happen exactly
  // once, in one place, no matter how the fold was triggered.
  const foldTiles = useCallback(
    (from: Point, to: Point) => {
      setHistory((h) => [...h, applyMerge(board, from, to).board]);
      setLifted(null);
      playSound("pop");
    },
    [board, playSound],
  );

  const attemptFold = useCallback(
    (from: Point, to: Point) => {
      if (cleared) return false;
      if (!legalTargets(board, from).some((p) => samePoint(p, to)))
        return false;
      foldTiles(from, to);
      return true;
    },
    [board, cleared, foldTiles],
  );

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
      if (!attemptFold(lifted, at)) {
        // Tapping another tile lifts THAT one rather than doing nothing, which
        // is what a player means when they change their mind mid-move.
        setLifted(at);
      }
    },
    [board, lifted, cleared, attemptFold],
  );

  // Swipe: the direction plus the tile it started on is the whole move — a
  // fling right off tile (0,0) is the same "lift, then drop on the neighbour"
  // as tapping it and then tapping (0,1). When the swipe does not land on a
  // legal target, the tile lifts instead of the gesture doing nothing, which
  // is the same recovery tapping a non-target tile already gives.
  const swipeFold = useCallback(
    (from: Point, direction: SwipeDirection) => {
      if (cleared) return;
      if (!tileAt(board, from)) return;
      if (!attemptFold(from, swipeTarget(from, direction))) {
        setLifted(from);
      }
    },
    [board, cleared, attemptFold],
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
    foldTiles(move.from, move.to);
    return true;
  }, [board, foldTiles]);

  const onHint = useCallback(() => {
    const allowance = isPremium ? Number.POSITIVE_INFINITY : FREE_HINTS;
    if (hintsUsed < allowance) {
      if (applyHint()) setHintsUsed((n) => n + 1);
      return;
    }
    if (!isRewardedReady()) {
      Alert.alert(t("noHintsLeft"), t("adNotReady"));
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
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: spacing.base,
          }}
        >
          <Text variant="title">{t("levelLabel", { number: level })}</Text>
          <Text variant="caption" tone="muted">
            {t("movesLabel")} {moves} · {t("parLabel", { count: par })}
          </Text>
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {t("howToFold")}
        </Text>

        <TileBoard
          board={board}
          lifted={lifted}
          onSelect={select}
          onSwipe={swipeFold}
        />

        {cleared ? (
          <View
            style={{
              alignItems: "center",
              marginTop: spacing.xl,
              gap: spacing.sm,
            }}
          >
            <Text variant="heading" tone="accent">
              {t("solvedTitle")}
            </Text>
            <Text variant="caption" tone="muted">
              {t("solvedInMoves", { count: moves })}
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <Button
                label={t("nextLevel")}
                onPress={() =>
                  router.replace(`/level/${Math.min(TOTAL_LEVELS, level + 1)}`)
                }
              />
              <Button
                label={t("backToLevels")}
                variant="ghost"
                onPress={() => router.replace("/")}
              />
            </View>
          </View>
        ) : (
          <>
            {stuck ? (
              <View style={{ alignItems: "center", marginTop: spacing.lg }}>
                <Text variant="bodyStrong" tone="danger">
                  {t("stuckTitle")}
                </Text>
                <Text
                  variant="caption"
                  tone="muted"
                  align="center"
                  style={{ marginTop: 2 }}
                >
                  {t("stuckBody")}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginTop: spacing.xl,
              }}
            >
              <Button
                label={t("undo")}
                variant="secondary"
                disabled={history.length === 1}
                onPress={undo}
                style={{ flex: 1 }}
              />
              <Button
                label={t("hint")}
                variant="secondary"
                onPress={onHint}
                style={{ flex: 1 }}
              />
              <Button
                label={t("restart")}
                variant="ghost"
                onPress={restart}
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </Screen>
      <BannerAdSlot />
    </View>
  );
}
