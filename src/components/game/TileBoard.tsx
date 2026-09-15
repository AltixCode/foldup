import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui';
import { t } from '@/i18n';
import { legalTargets, samePoint, type Board, type Point } from '@/logic/board';
import { colourForValue, textOnValue } from '@/theme/tileColours';
import { useTheme } from '@/theme';

/**
 * The board: tap a tile to lift it, tap its twin to fold them together.
 *
 * Legal targets are highlighted while a tile is lifted. That is the whole
 * usability of the game — without it a player has to scan four neighbours after
 * every move, and the promise was that the next move is visible.
 */
export function TileBoard({
  board,
  lifted,
  onSelect,
}: {
  board: Board;
  lifted: Point | null;
  onSelect: (at: Point) => void;
}) {
  const { width, height } = useWindowDimensions();
  const { colors, spacing, radius } = useTheme();

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const gap = spacing.sm;
  const available = Math.min(width - spacing.base * 2, height * 0.5);
  const side = Math.floor((available - gap * (cols - 1)) / cols);

  const targets = lifted ? legalTargets(board, lifted) : [];
  const isTarget = (at: Point) => targets.some((p) => samePoint(p, at));

  return (
    <View style={{ alignSelf: 'center', gap, marginTop: spacing.lg }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {Array.from({ length: cols }, (_, c) => {
            const at = { r, c };
            const tile = board[r]?.[c] ?? null;
            const isLifted = lifted !== null && samePoint(lifted, at);
            const label = tile
              ? t('tileA11y', { row: r + 1, col: c + 1, value: tile.value })
              : `${t('tileA11y', { row: r + 1, col: c + 1, value: '' })} ${t('tileEmpty')}`;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={isLifted ? `${label}, ${t('tileSelected')}` : label}
                accessibilityState={{ selected: isLifted, disabled: !tile }}
                disabled={!tile}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onSelect(at);
                }}
                style={{
                  width: side,
                  height: side,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: tile ? colourForValue(tile.value) : colors.surfaceAlt,
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
            );
          })}
        </View>
      ))}
    </View>
  );
}
