import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { MyTopStackParamList } from "./index";
import type { RootStackParamList } from "../../../App";
import type { PremiumStackParamList } from "../PremiumStack";
import { benefitsService, type UserBenefitsPayload } from "../../../src/services";
import { listingsService, type BoostedListingSummary } from "../../../src/services/listingsService";
import type { ListingItem } from "../../../types/shop";
import { useAuth } from "../../../contexts/AuthContext";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MyTopStackParamList, "MyBoostListings">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function BoostListingScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [benefits, setBenefits] = useState<UserBenefitsPayload["benefits"] | null>(null);
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boostedCount, setBoostedCount] = useState(0);
  const [loadingBoosted, setLoadingBoosted] = useState(false);
  const [boostedListings, setBoostedListings] = useState<BoostedListingSummary[]>([]);

  const loadScreenData = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!user) {
        if (isCancelled?.()) {
          return;
        }
        setBenefits(null);
        setListings([]);
        setSelected({});
        setListingsError(null);
        setLoadingBenefits(false);
        setLoadingListings(false);
        setBoostedCount(0);
        setLoadingBoosted(false);
        setBoostedListings([]);
        return;
      }

      if (!isCancelled?.()) {
        setListingsError(null);
        setLoadingBenefits(true);
        setLoadingListings(true);
        setLoadingBoosted(true);
      }

      const [benefitsResult, listingsResult, boostedResult] = await Promise.allSettled([
        benefitsService.getUserBenefits(),
        listingsService.getUserListings({ status: "active" }),
        listingsService.getBoostedListings(),
      ]);

      if (isCancelled?.()) {
        return;
      }

      if (benefitsResult.status === "fulfilled") {
        setBenefits(benefitsResult.value.benefits);
      } else {
        console.warn(
          "Failed to load benefits for boost screen",
          benefitsResult.reason
        );
      }

      if (listingsResult.status === "fulfilled") {
        setListings(listingsResult.value.listings);
      } else {
        console.warn(
          "Failed to load listings for boost screen",
          listingsResult.reason
        );
        setListingsError("Failed to load your active listings.");
      }

      if (boostedResult.status === "fulfilled") {
        const boosted = boostedResult.value;
        setBoostedListings(boosted);
        const activeCount = boosted.filter(
          (item) => item.status === "ACTIVE" || item.status === "SCHEDULED"
        ).length;
        setBoostedCount(activeCount);
      } else {
        console.warn(
          "Failed to load boosted listings for boost screen",
          boostedResult.reason
        );
        setBoostedListings([]);
        setBoostedCount(0);
      }

      if (!isCancelled?.()) {
        setLoadingBenefits(false);
        setLoadingListings(false);
        setLoadingBoosted(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadScreenData(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [loadScreenData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScreenData();
    setRefreshing(false);
  }, [loadScreenData]);

  // ✅ 计算哪些 listings 已经被 boost (ACTIVE 或 SCHEDULED)
  const boostedListingIds = useMemo(() => {
    return new Set(
      boostedListings
        .filter((item) => item.status === "ACTIVE" || item.status === "SCHEDULED")
        .map((item) => String(item.listingId))
    );
  }, [boostedListings]);

  useEffect(() => {
    setSelected((prev) => {
      const retained: Record<string, boolean> = {};
      listings.forEach((listing) => {
        // ✅ 移除已 boost 的 listings 的选择
        if (prev[listing.id] && !boostedListingIds.has(listing.id)) {
          retained[listing.id] = true;
        }
      });
      const prevKeys = Object.keys(prev);
      const retainedKeys = Object.keys(retained);
      const isSame =
        prevKeys.length === retainedKeys.length &&
        prevKeys.every((key) => retained[key]);
      return isSame ? prev : retained;
    });
  }, [listings, boostedListingIds]);

  const selectedCount = useMemo(
    () => Object.keys(selected).length,
    [selected]
  );

  const selectedListings = useMemo(
    () => listings.filter((item) => selected[item.id]),
    [listings, selected]
  );

  const toggle = useCallback(
    (id: string) => {
      // ✅ 阻止选择已 boost 的 listings
      if (boostedListingIds.has(id)) {
        return;
      }
      setSelected((state) => {
        if (!listings.some((item) => item.id === id)) {
          return state;
        }
        const next = { ...state };
        if (next[id]) {
          delete next[id];
        } else {
          next[id] = true;
        }
        return next;
      });
    },
    [listings, boostedListingIds]
  );

  const renderEmptyComponent = useCallback(() => {
    if (loadingListings) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color="#111" />
          <Text style={styles.emptyStateText}>Loading your listings…</Text>
        </View>
      );
    }

    if (listingsError) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{listingsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          No active listings ready to boost yet.
        </Text>
      </View>
    );
  }, [handleRefresh, listingsError, loadingListings]);

  const pricingSummary = useMemo(() => {
    if (loadingBenefits) {
      return {
        headline: "Loading current pricing…",
        priceLine: "Price: ...",
        freeLine: "Free boosts: ...",
        discountLine: undefined as string | undefined,
      };
    }

    if (!benefits) {
      return {
        headline: "Boost pricing",
        priceLine: "Price: $2.90 per 3-day boost",
        freeLine: "Free boosts: 0",
        discountLine: "Discount: None",
      };
    }

    const price = benefits.promotionPricing?.price ?? benefits.promotionPrice ?? 0;
    const priceLine = `Price: $${price.toFixed(2)} per 3-day boost`;

    const freeLine = benefits.freePromotionLimit === null
      ? (benefits.isPremium ? "Free boosts: Unlimited" : "Free boosts: 0")
      : `Free boosts: ${Math.max(0, benefits.freePromotionsRemaining)}/${benefits.freePromotionLimit} left`;

    const discountLine = benefits.promotionPricing
      ? benefits.promotionPricing.discount > 0
        ? `Discount: ${benefits.promotionPricing.discount}% off base price`
        : benefits.isPremium ? "Discount: Member pricing" : "Discount: None"
      : undefined;

    return {
      headline: benefits.isPremium ? "Premium pricing active" : "Free plan pricing",
      priceLine,
      freeLine,
      discountLine,
    };
  }, [benefits, loadingBenefits]);

  const topCardText = loadingBoosted
    ? "Loading your boosted listings…"
    : `${boostedCount} boosted listing${boostedCount === 1 ? "" : "s"}`;
  const canSubmitBoost = selectedCount > 0 && !loadingListings;

  const handleSubmit = useCallback(() => {
    if (!canSubmitBoost) {
      return;
    }

    const listingIds = selectedListings.map((item) => item.id);
    navigation.navigate("Premium", {
      screen: "PromotionPlans",
      params: {
        selectedListingIds: listingIds,
        selectedListings,
        benefitsSnapshot: benefits,
      },
    });
  }, [benefits, canSubmitBoost, navigation, selectedListings]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Boost listings" showBack />

      {/* 顶部统计卡：点击进入已 Boost 列表页 */}
      <TouchableOpacity
        style={styles.topCard}
        onPress={() => navigation.navigate("BoostedListing")}
        activeOpacity={0.9}
      >
        <View style={styles.topCardTextGroup}>
          <View style={styles.rowCenter}>
            <Icon name="flash-outline" size={18} color="#111" />
            <Text style={styles.topCardTitle}>{`  ${topCardText}`}</Text>
          </View>
          <Text style={styles.topCardSubtitle}>Tap to view boosted listings</Text>
        </View>
        <Icon name="chevron-forward" size={18} color="#666" />
      </TouchableOpacity>

      <View style={styles.benefitBanner}>
        <Text style={styles.benefitBannerTitle}>{pricingSummary.headline}</Text>
        <Text style={styles.benefitBannerText}>{pricingSummary.priceLine}</Text>
        <Text style={styles.benefitBannerText}>{pricingSummary.freeLine}</Text>
        {pricingSummary.discountLine ? (
          <Text style={styles.benefitBannerText}>{pricingSummary.discountLine}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionHint}>Select listings to boost</Text>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#111"
          />
        }
        renderItem={({ item }) => {
          const isSelected = !!selected[item.id];
          const isBoosted = boostedListingIds.has(item.id);
          const price = Number(item.price ?? 0);
          const primaryImage = item.images?.[0] ?? null;
          const title = item.title || "Unnamed listing";
          
          // ✅ 获取 boost 状态信息
          const boostInfo = boostedListings.find(
            (boosted) => String(boosted.listingId) === item.id
          );
          const boostStatus = boostInfo?.status;
          
          return (
            <TouchableOpacity
              activeOpacity={isBoosted ? 1 : 0.9}
              onPress={() => toggle(item.id)}
              style={[
                styles.card,
                isBoosted && styles.cardBoosted,
              ]}
              disabled={isBoosted}
            >
              {primaryImage ? (
                <Image
                  source={{ uri: primaryImage }}
                  style={[
                    styles.cardImg,
                    isBoosted && styles.cardImgBoosted,
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[
                  styles.cardPlaceholder,
                  isBoosted && styles.cardPlaceholderBoosted,
                ]}>
                  <Icon name="image-outline" size={20} color="#999" />
                </View>
              )}
              
              {/* ✅ Boost Badge */}
              {isBoosted && (
                <View style={styles.boostBadge}>
                  <Icon name="flash-outline" size={10} color="#111" />
                  <Text style={styles.boostBadgeText}>
                    {boostStatus === "SCHEDULED" ? "Scheduled" : "Boosted"}
                  </Text>
                </View>
              )}
              
              {/* 右上角选择圆点 - 只在未 boost 时显示 */}
              {!isBoosted && (
                <View
                  style={[
                    styles.checkDot,
                    isSelected && { borderColor: "#111" },
                  ]}
                >
                  {isSelected ? <View style={styles.checkDotInner} /> : null}
                </View>
              )}
              
              <View style={styles.cardBody}>
                <Text 
                  numberOfLines={1} 
                  style={[
                    styles.cardTitle,
                    isBoosted && styles.cardTitleBoosted,
                  ]}
                >
                  {title}
                </Text>
                <Text style={[
                  styles.priceText,
                  isBoosted && styles.priceTextBoosted,
                ]}>
                  ${price.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* 底部按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            !canSubmitBoost && { opacity: 0.4 },
          ]}
          disabled={!canSubmitBoost}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryText}>
            Boost selected ({selectedCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  benefitBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
  },
  benefitBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  benefitBannerText: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  topCardTextGroup: { flex: 1 },
  topCardTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  topCardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
  sectionHint: {
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
    color: "#666",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
    flexGrow: 1,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    aspectRatio: 0.78,
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardBoosted: {
    opacity: 0.7,
  },
  cardImg: { width: "100%", height: "70%", backgroundColor: "#eaeaea" },
  cardImgBoosted: {
    opacity: 0.8,
  },
  cardPlaceholder: {
    width: "100%",
    height: "70%",
    backgroundColor: "#eaeaea",
    alignItems: "center",
    justifyContent: "center",
  },
  cardPlaceholderBoosted: {
    opacity: 0.8,
  },
  checkDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#111",
  },
  boostBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  boostBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#111",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 6,
  },
  cardTitle: {
    fontSize: 12,
    color: "#555",
    marginBottom: 2,
  },
  cardTitleBoosted: {
    color: "#999",
  },
  priceText: { fontWeight: "700", color: "#111", fontSize: 13 },
  priceTextBoosted: {
    color: "#999",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#111",
  },
  retryText: { color: "#fff", fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  primaryBtn: {
    backgroundColor: "#111",
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
