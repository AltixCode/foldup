import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { Text } from "@/components/ui";
import { t } from "@/i18n";
import {
  directionFromTranslation,
  legalTargets,
  samePoint,
  type Board,
  type Point,
  type SwipeDirection,
} from "@/logic/board";
import { colourForValue, textOnValue } from "@/theme/tileColours";
import { useTheme } from "@/theme";

/** Below this many points of travel a drag is a tap that wandered, not a swipe. */
const SWIPE_THRESHOLD = 24;

/**
 * The board: tap a tile to lift it, tap its twin to fold them together — or
 * swipe a tile straight at its twin to do both in one gesture.
 *
 * Legal targets are highlighted while a tile is lifted. That is the whole
 * usability of the game — without it a player has to scan four neighbours after
 * every move, and the promise was that the next move is visible. A swipe that
 * does not land on a legal target lifts the tile instead of doing nothing, so
 * the same highlight explains why.
 */
export function TileBoard({
  board,
  lifted,
  onSelect,
  onSwipe,
}: {
  board: Board;
  lifted: Point | null;
  onSelect: (at: Point) => void;
  onSwipe: (at: Point, direction: SwipeDirection) => void;
}) {
  const { width, height } = useWindowDimensions();
  const { colors, spacing, radius } = useTheme();

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const gap = spacing.sm;
  // Sized from the space there is. A flat cap set against a small phone leaves
  // the board in the top third of a 6.9" screen with the rest empty, and a 13"
  // iPad worse — which reads as an app nobody has opened on a modern device.
  const cap = width >= 700 ? 690 : 552;
  const available = Math.min(width - spacing.base * 2, height * 0.58, cap);
  const side = Math.floor((available - gap * (cols - 1)) / cols);

  const targets = lifted ? legalTargets(board, lifted) : [];
  const isTarget = (at: Point) => targets.some((p) => samePoint(p, at));

  return (
    <View style={{ alignSelf: "center", gap, marginTop: spacing.lg }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: "row", gap }}>
          {Array.from({ length: cols }, (_, c) => {
            const at = { r, c };
            const tile = board[r]?.[c] ?? null;
            const isLifted = lifted !== null && samePoint(lifted, at);
            const label = tile
              ? t("tileA11y", { row: r + 1, col: c + 1, value: tile.value })
              : `${t("tileA11y", { row: r + 1, col: c + 1, value: "" })} ${t("tileEmpty")}`;

            // A pan that never travels SWIPE_THRESHOLD points is left alone —
            // that is what makes a plain tap on the same tile still reach the
            // Pressable underneath rather than being swallowed here.
            const swipe = Gesture.Pan()
              .enabled(Boolean(tile))
              .maxPointers(1)
              .onEnd((event, success) => {
                "worklet";
                if (!success) return;
                const direction = directionFromTranslation(
                  event.translationX,
                  event.translationY,
                  SWIPE_THRESHOLD,
                );
                if (direction) runOnJS(onSwipe)(at, direction);
              });

            return (
              <GestureDetector key={c} gesture={swipe}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isLifted ? `${label}, ${t("tileSelected")}` : label
                  }
                  accessibilityState={{ selected: isLifted, disabled: !tile }}
                  disabled={!tile}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onSelect(at);
                  }}
                  style={{
                    width: side,
                    height: side,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radius.md,
                    backgroundColor: tile
                      ? colourForValue(tile.value)
                      : colors.surfaceAlt,
                    borderWidth: isLifted || isTarget(at) ? 3 : 0,
                    borderColor: isLifted ? colors.text : colors.accent,
                    transform: [{ scale: isLifted ? 0.94 : 1 }],
                  }}
                >
                  {tile ? (
                    <Text variant="bodyStrong" color={textOnValue(tile.value)}>
                      {String(tile.value)}
                    </Text>
                  ) : null}
                </Pressable>
              </GestureDetector>
            );
          })}
        </View>
      ))}
    </View>
  );
}
