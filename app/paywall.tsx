import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Text } from "@/components/ui";
import { t } from "@/i18n";
import { PRIVACY_POLICY_URL, TERMS_URL } from "@/monetization/config";
import { usePremiumStore } from "@/store/usePremiumStore";
import { useTheme } from "@/theme";
import { useTabletColumn } from "../src/theme/useTabletColumn";

/**
 * The one purchase this app sells: a lifetime non-consumable that removes the ads and unlocks
 * everything. There is deliberately no plan picker — a second option would be a subscription,
 * and the portfolio does not sell those.
 */
const BENEFIT_KEYS = [
  { title: "feat1Title", desc: "feat1Desc", icon: "layers" },
  { title: "feat2Title", desc: "feat2Desc", icon: "tool" },
  { title: "feat3Title", desc: "feat3Desc", icon: "sliders" },
  { title: "feat4Title", desc: "feat4Desc", icon: "box" },
] as const;

/**
 * A staggered two-column masonry, not a symmetric grid.
 *
 * 29 of 44 apps in this portfolio shipped one paywall file byte for byte, and
 * Apple rejected under 4.3(a) naming "multiple similar apps using a
 * repackaged app template". This shape puts the second column half a tile
 * lower than the first, so the claims read as two independent stacks rather
 * than rows of a table — and it keeps the purchase action pinned in its own
 * footer below the scrolling tiles rather than inline with them, which is
 * the other structural break from this batch's other four apps.
 */
function Tile({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Card style={{ aspectRatio: 0.92, justifyContent: "space-between" }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={18} color={colors.accent} />
      </View>
      <View>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          {desc}
        </Text>
      </View>
    </Card>
  );
}

export default function Paywall() {
  /**
   * Only the claims this app can actually make.
   *
   * Four slots is what this template offers, not a quota to fill. An app whose
   * purchase removes the ads and nothing else has one honest thing to say about
   * it, and padding to four is how "Everything unlocked -- every level, every
   * mode and the full archive" ends up on a paywall for an app with no levels,
   * no modes and no archive.
   *
   * A benefit whose title is blank is dropped, so cutting a claim is a one-line
   * edit in `i18n` rather than a component change. Computed per render, not at
   * module load, so it follows the active locale.
   */
  const benefits = BENEFIT_KEYS.filter((b) => t(b.title).trim().length > 0);
  // Two independent column stacks rather than a wrapping row: column B is the
  // one that gets the downward offset, so the pair reads as staggered masonry.
  const columnA = benefits.filter((_, index) => index % 2 === 0);
  const columnB = benefits.filter((_, index) => index % 2 === 1);

  const router = useRouter();
  const tabletColumn = useTabletColumn(640);
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();

  const lifetime = usePremiumStore((s) => s.lifetime);
  const offeringsResolved = usePremiumStore((s) => s.offeringsResolved);
  const isPremium = usePremiumStore((s) => s.isPremium);
  const isPurchasing = usePremiumStore((s) => s.isPurchasing);
  const error = usePremiumStore((s) => s.error);
  const purchase = usePremiumStore((s) => s.purchase);
  const restore = usePremiumStore((s) => s.restore);
  // A restore that finds nothing must SAY so.
  // `restore()` returned 'none' and the screen rendered nothing at all, so
  // the button read as broken -- and App Review taps Restore on every
  // submission. The string already existed in all fourteen locales; it was
  // simply never shown on this paywall shape.
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const refreshOfferings = usePremiumStore((s) => s.refreshOfferings);

  useEffect(() => {
    void refreshOfferings();
  }, [refreshOfferings]);

  // A user who already owns it must never be left staring at a buy button.
  useEffect(() => {
    if (isPremium) router.back();
  }, [isPremium, router]);

  const price = lifetime?.product.priceString;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <View style={{ alignItems: "flex-end", padding: spacing.base }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("close")}
          hitSlop={12}
          onPress={() => router.back()}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <Text variant="body" tone="muted">
            {t("close")}
          </Text>
        </Pressable>
      </View>

      {/* The tile grid scrolls on its own; the purchase action lives in a
          detached footer below, outside this ScrollView, so it never moves
          off screen while the claims scroll underneath it. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing["2xl"],
          ...tabletColumn,
        }}
      >
        <Text variant="micro" tone="accent">
          {t("antiSubTitle")}
        </Text>
        <Text variant="display" style={{ marginTop: spacing.xs }}>
          {t("paywallTitle")}
        </Text>
        <Text variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
          {t("antiSubHeadline")}
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: spacing.base,
            marginTop: spacing["2xl"],
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, gap: spacing.base }}>
            {columnA.map((benefit) => (
              <Tile
                key={benefit.title}
                icon={benefit.icon}
                title={t(benefit.title)}
                desc={t(benefit.desc)}
              />
            ))}
          </View>
          {columnB.length > 0 ? (
            <View style={{ flex: 1, gap: spacing.base, marginTop: spacing.xl }}>
              {columnB.map((benefit) => (
                <Tile
                  key={benefit.title}
                  icon={benefit.icon}
                  title={t(benefit.title)}
                  desc={t(benefit.desc)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          padding: spacing.xl,
          paddingBottom: spacing.xl + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          ...tabletColumn,
        }}
      >
        {lifetime ? (
          <Button
            label={
              price ? t("lifetimeAccess", { price }) : t("lifetimeAccessPlain")
            }
            size="lg"
            fullWidth
            loading={isPurchasing}
            onPress={() => void purchase(lifetime)}
          />
        ) : offeringsResolved ? (
          // Resolved, with no package: the store is genuinely unreachable or carries no
          // product yet. Say that, and keep Restore reachable below — a user who already
          // paid must still be able to get their purchase back.
          <View style={{ padding: spacing.md, alignItems: "center" }}>
            <Text variant="caption" tone="muted" align="center">
              {t("storeUnavailable")}
            </Text>
          </View>
        ) : (
          <View style={{ padding: spacing.md, alignItems: "center" }}>
            <ActivityIndicator color={colors.textMuted} />
            <Text
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.md }}
            >
              {t("loadingPrice")}
            </Text>
          </View>
        )}
        <Text
          variant="caption"
          tone="muted"
          align="center"
          style={{ marginTop: spacing.md }}
        >
          {t("oneTimePayment")}
        </Text>

        {error ? (
          <Text
            variant="caption"
            tone="danger"
            align="center"
            style={{ marginTop: spacing.base }}
          >
            {error}
          </Text>
        ) : null}

        {restoreNotice ? (
          <Text
            accessibilityRole="alert"
            variant="caption"
            tone="muted"
            align="center"
            style={{ marginTop: spacing.base }}
          >
            {restoreNotice}
          </Text>
        ) : null}

        <Button
          label={t("restorePurchases")}
          variant="ghost"
          fullWidth
          onPress={() => {
            setRestoreNotice(null);
            void restore().then((outcome) => {
              if (outcome === "none") setRestoreNotice(t("noPriorPurchases"));
            });
          }}
          style={{ marginTop: spacing.lg }}
        />

        <Text
          variant="micro"
          tone="faint"
          align="center"
          style={{ marginTop: spacing.base }}
        >
          {t("adsDisclosure")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.lg,
            marginTop: spacing.md,
          }}
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("termsOfUse")}
            hitSlop={12}
            onPress={() => void Linking.openURL(TERMS_URL)}
          >
            <Text variant="micro" tone="faint">
              {t("termsOfUse")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("privacyPolicy")}
            hitSlop={12}
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text variant="micro" tone="faint">
              {t("privacyPolicy")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
