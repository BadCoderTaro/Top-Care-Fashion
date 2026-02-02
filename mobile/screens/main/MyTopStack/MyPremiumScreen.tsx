import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { IconProps } from "../../../components/Icon";
import Avatar from "../../../components/Avatar";
import type { PremiumStackParamList } from "../PremiumStack";
import { DEFAULT_AVATAR } from "../../../constants/assetUrls";
import { PREMIUM_BG } from "../../../constants/assetUrls";
import { useAuth } from "../../../contexts/AuthContext";
import { benefitsService, premiumService, type UserBenefitsPayload } from "../../../src/services";

const MEMBER_AVATAR = DEFAULT_AVATAR;

type BenefitItem = {
  id: string;
  icon: IconProps["name"];
  bgColor: string;
  iconColor: string;
  title: string;
  subtitle: string;
};

const DEFAULT_BENEFITS: BenefitItem[] = [
  {
    id: "commission",
    icon: "cash-outline",
    bgColor: "#E5F5FF",
    iconColor: "#2AB6B6",
    title: "Reduced commission",
    subtitle: "& Boost fee",
  },
  {
    id: "listing",
    icon: "albums-outline",
    bgColor: "#E7F4FF",
    iconColor: "#4A8CFF",
    title: "Unlimited",
    subtitle: "Listing",
  },
  {
    id: "advice",
    icon: "sparkles-outline",
    bgColor: "#F7F9D4",
    iconColor: "#8A6EFF",
    title: "Unlimited",
    subtitle: "Mix & Match Advice",
  },
];

export default function MyPremiumScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PremiumStackParamList>>();
  const { user, updateUser } = useAuth();
  const [syncing, setSyncing] = useState(false); // fetch status
  const [benefits, setBenefits] = useState<UserBenefitsPayload["benefits"] | null>(null);

  const handleRenew = () => {
    navigation.navigate("PremiumPlans");
  };

  const memberName = useMemo(() => user?.username ?? "Member", [user?.username]);
  const memberStatus = useMemo(() => (user?.isPremium ? "Active" : "Inactive"), [user?.isPremium]);
  const expireText = useMemo(() => {
    if (!user?.premiumUntil) return "(No active premium)";
    return `(Membership will expire on ${String(user.premiumUntil).slice(0, 10)})`;
  }, [user?.premiumUntil]);

  const benefitTiles = useMemo<BenefitItem[]>(() => {
    if (!benefits) {
      return DEFAULT_BENEFITS;
    }

    const commissionPercent = Math.round((benefits.commissionRate ?? 0) * 100);
    const listingTitle = benefits.listingLimit === null
      ? "Unlimited listings"
      : `${benefits.listingLimit} listing limit`;
    const listingSubtitle = benefits.listingLimit === null
      ? "No cap on active items"
      : "Active listings allowed";
    const boostPrice = benefits.promotionPricing?.price ?? benefits.promotionPrice ?? 0;
    const freeBoostSubtitle = benefits.isPremium
      ? benefits.freePromotionLimit === null
        ? "Unlimited free boosts"
        : `${benefits.freePromotionLimit} free/month`
      : "Upgrade for free boosts";

    return [
      {
        id: "commission",
        icon: "cash-outline" as const,
        bgColor: "#E5F5FF",
        iconColor: "#2AB6B6",
        title: `${commissionPercent}% commission`,
        subtitle: benefits.isPremium ? "Premium rate" : "Standard rate",
      },
      {
        id: "listing",
        icon: "albums-outline" as const,
        bgColor: "#E7F4FF",
        iconColor: "#4A8CFF",
        title: listingTitle,
        subtitle: listingSubtitle,
      },
      {
        id: "boost",
        icon: "sparkles-outline" as const,
        bgColor: "#F7F9D4",
        iconColor: "#8A6EFF",
        title: `$${boostPrice.toFixed(2)} boost`,
        subtitle: freeBoostSubtitle,
      },
    ];
  }, [benefits]);

  const usageRows = useMemo(() => {
    if (!benefits) return null;

    const listingValue = benefits.listingLimit === null
      ? `${benefits.activeListingsCount} / Unlimited`
      : `${benefits.activeListingsCount}/${benefits.listingLimit}`;
    const mixMatchValue = benefits.mixMatchLimit === null
      ? "Unlimited"
      : `${Math.min(benefits.mixMatchUsedCount, benefits.mixMatchLimit)}/${benefits.mixMatchLimit}`;
    const freeBoostValue = benefits.freePromotionLimit === null
      ? (benefits.isPremium ? "Unlimited" : "0")
      : `${Math.max(0, benefits.freePromotionsRemaining)}/${benefits.freePromotionLimit}`;
    const boostPriceValue = `$${(benefits.promotionPricing?.price ?? benefits.promotionPrice ?? 0).toFixed(2)}`;

    return [
      { id: "listings", label: "Active listings", value: listingValue },
      { id: "mixmatch", label: "Mix & Match uses", value: mixMatchValue },
      { id: "freeBoost", label: "Free boosts remaining", value: freeBoostValue },
      { id: "boostPrice", label: "Boost price (3 days)", value: boostPriceValue },
    ];
  }, [benefits]);

  const benefitsTitle = useMemo(() => {
    if (!benefits) {
      return "Premium User can enjoy :";
    }
    return benefits.isPremium ? "Your premium benefits" : "Free plan limits";
  }, [benefits]);

  // Sync premium status from backend when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      // if not logged in, skip
      if (!user) return () => { isActive = false; };

      const fetchStatus = async () => {
        try {
          setSyncing(true);
          const status = await premiumService.getStatus();
          if (!isActive) return;
          updateUser({ ...(user as any), isPremium: status.isPremium, premiumUntil: status.premiumUntil });

          try {
            const payload = await benefitsService.getUserBenefits();
            if (!isActive) return;
            setBenefits(payload.benefits);
            updateUser({
              ...(user as any),
              isPremium: payload.user.isPremium,
              premiumUntil: payload.user.premiumUntil,
            });
          } catch (err) {
            console.log("Fetch user benefits failed", err);
            if (isActive) {
              setBenefits(null);
            }
          }
        } catch (e) {
          console.error('Fetch premium status failed', e);
        } finally {
          if (isActive) setSyncing(false);
        }
      };

      fetchStatus();
      return () => { isActive = false; };
    }, [user?.id])
  );

  return (
    <View style={styles.container}>
      <Header title="My Premium" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.membershipCard}>
          <View style={styles.memberRow}>
            {/* 显示用户头像：优先使用远程 avatar_url，否则 fallback 到 DEFAULT_AVATAR */}
            <Avatar
              source={
                user?.avatar_url
                  ? { uri: String(user.avatar_url) }
                  : MEMBER_AVATAR
              }
              style={styles.avatar}
              isPremium={user?.isPremium}
              self
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberTitle}>Hi, {memberName}</Text>
              <Text style={styles.memberMeta}>Premium status: {memberStatus}</Text>
              <Text style={styles.expiryText}>{syncing ? 'Syncing membership…' : expireText}</Text>
            </View>
          </View>
        </View>

        {usageRows ? (
          <View style={styles.usageCard}>
            {usageRows.map((row) => (
              <View key={row.id} style={styles.usageRow}>
                <Text style={styles.usageLabel}>{row.label}</Text>
                <Text style={styles.usageValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>{benefitsTitle}</Text>
          <View style={styles.benefitRow}>
            {benefitTiles.map((benefit: BenefitItem) => (
              <View key={benefit.id} style={styles.benefitItem}>
                <View
                  style={[styles.benefitIconWrap, { backgroundColor: benefit.bgColor }]}
                >
                  <Icon name={benefit.icon} size={30} color={benefit.iconColor} />
                </View>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitSubtitle}>{benefit.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleRenew}>
            <Text style={styles.primaryText}>Renew Membership</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
    rowGap: 20,
  },
  membershipCard: {
    padding: 20,
    backgroundColor: "#DDEEFF",
    borderRadius: 18,
    rowGap: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 18,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
  },
  memberTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1E1E",
  },
  memberMeta: {
    fontSize: 14,
    color: "#2F3443",
    marginTop: 2,
  },
  expiryText: {
    fontSize: 13,
    color: "#2F3443",
  },
  usageCard: {
    padding: 18,
    backgroundColor: "#F6F8FF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1E6FF",
    rowGap: 4,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  usageLabel: {
    fontSize: 13,
    color: "#3F4354",
  },
  usageValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1E1E",
  },
  benefitsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1E1E",
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  benefitItem: {
    alignItems: "center",
    width: "30%",
  },
  benefitIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: "#1E1E1E",
  },
  benefitSubtitle: {
    fontSize: 13,
    textAlign: "center",
    color: "#3F4354",
    marginTop: 2,
  },
  actionRow: {
    // Single button container
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
