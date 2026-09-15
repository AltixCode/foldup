import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Screen, Text } from '@/components/ui';
import { t } from '@/i18n';
import { FREE_LEVELS, TOTAL_LEVELS, isLevelUnlocked } from '@/logic/stars';
import { useLevelsStore } from '@/store/useLevelsStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme } from '@/theme';

/** Enough to fill a few screens without generating four hundred tiles up front. */
const VISIBLE = 60;

export default function Levels() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const results = useLevelsStore((s) => s.results);
  const hydrate = useLevelsStore((s) => s.hydrate);
  const highest = useLevelsStore((s) => s.highestCleared)();
  const stars = useLevelsStore((s) => s.totalStars)();
  const isPremium = usePremiumStore((s) => s.isPremium);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const next = Math.min(TOTAL_LEVELS, highest + 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: spacing['2xl'],
          }}
        >
          <Text variant="display">{t('levelsTitle')}</Text>
          <Text variant="bodyStrong" tone="accent">
            {t('starsLabel', { count: stars })}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('continueLevel')} — ${t('levelLabel', { number: next })}`}
          onPress={() => router.push(`/level/${next}`)}
          style={{
            marginTop: spacing.lg,
            minHeight: 64,
            paddingHorizontal: spacing.lg,
            justifyContent: 'center',
            borderRadius: radius.lg,
            backgroundColor: colors.inverse,
          }}
        >
          <Text variant="bodyStrong" color={colors.onInverse}>
            {highest === 0 ? t('play') : t('continueLevel')}
          </Text>
          <Text variant="caption" color={colors.onInverse} style={{ opacity: 0.8 }}>
            {t('levelLabel', { number: next })}
          </Text>
        </Pressable>

        {!isPremium ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('lockedTitle')}
            onPress={() => router.push('/paywall')}
            style={{
              marginTop: spacing.base,
              padding: spacing.base,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="callout" tone="accent">
              {t('lockedTitle')}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {t('lockedBody', { count: FREE_LEVELS })}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl }}>
          {Array.from({ length: VISIBLE }, (_, i) => i + 1).map((level) => {
            const result = results[level];
            const unlocked = isLevelUnlocked(level, highest, isPremium);
            return (
              <Pressable
                key={level}
                accessibilityRole="button"
                accessibilityLabel={
                  result
                    ? `${t('levelLabel', { number: level })}, ${t('starsLabel', { count: result.stars })}`
                    : t('levelLabel', { number: level })
                }
                accessibilityState={{ disabled: !unlocked }}
                onPress={() => (unlocked ? router.push(`/level/${level}`) : router.push('/paywall'))}
                style={{
                  width: 56,
                  height: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: result ? colors.surface : colors.surfaceAlt,
                  borderWidth: result ? 1 : 0,
                  borderColor: colors.accent,
                  opacity: unlocked ? 1 : 0.4,
                }}
              >
                <Text variant="callout">{String(level)}</Text>
                {result ? (
                  <Text variant="micro" tone="accent">
                    {'★'.repeat(result.stars)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settingsTitle')}
          onPress={() => router.push('/settings')}
          style={{
            marginTop: spacing.xl,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.md,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Text variant="callout">{t('settingsTitle')}</Text>
        </Pressable>
      </Screen>
      <BannerAdSlot />
    </View>
  );
}
