import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type {
  CompositeNavigationProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { MyTopStackParamList } from "./index";
import type { RootStackParamList } from "../../../App";
import type { PremiumStackParamList } from "../PremiumStack";
import { listingsService, type BoostedListingSummary } from "../../../src/services/listingsService";
import { listingStatsService } from "../../../src/services/listingStatsService";
import type { ListingItem } from "../../../types/shop";

export default function ManageListingScreen() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      NativeStackNavigationProp<MyTopStackParamList, "ManageListing">,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const route = useRoute<RouteProp<MyTopStackParamList, "ManageListing">>();

  const [listing, setListing] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [boostInfo, setBoostInfo] = useState<BoostedListingSummary | null>(null);
  const [loadingBoostInfo, setLoadingBoostInfo] = useState(true);
  const [updatingListed, setUpdatingListed] = useState(false);
  const [performance, setPerformance] = useState({
    bag: 0,
    likes: 0,
    views: 0,
    clicks: 0,
  });
  const [loadingPerformance, setLoadingPerformance] = useState(true);

  // ✅ 获取listing数据 - 使用 useFocusEffect 以便在返回时刷新
  useFocusEffect(
    React.useCallback(() => {
      const fetchListing = async () => {
        try {
          const listingId = route.params?.listingId;
          if (!listingId) {
            Alert.alert("Error", "No listing ID provided");
            navigation.goBack();
            return;
          }

          setLoading(true);
          console.log("📖 Fetching listing for management:", listingId);
          const listingData = await listingsService.getListingById(listingId);
          
          if (listingData) {
            setListing(listingData);
            console.log("✅ Listing loaded for management:", listingData.title);
            console.log("📦 Current stock:", listingData.availableQuantity);
          } else {
            Alert.alert("Error", "Listing not found");
            navigation.goBack();
          }
        } catch (error) {
          console.error("❌ Error fetching listing:", error);
          Alert.alert("Error", "Failed to load listing");
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      };

      fetchListing();
    }, [route.params?.listingId, navigation])
  );

  // ✅ 获取 boost 信息 - 使用 useFocusEffect 以便在返回时刷新
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const listingId = route.params?.listingId;
      if (!listingId) {
        setBoostInfo(null);
        setLoadingBoostInfo(false);
        return;
      }

      const loadBoostInfo = async () => {
        try {
          setLoadingBoostInfo(true);
          const boostedListings = await listingsService.getBoostedListings();
          if (!isMounted) return;
          const matched = boostedListings.find(
            (item) => String(item.listingId) === String(listingId)
          );
          setBoostInfo(matched ?? null);
        } catch (error) {
          if (isMounted) {
            console.error("❌ Error fetching boost status:", error);
            setBoostInfo(null);
          }
        } finally {
          if (isMounted) {
            setLoadingBoostInfo(false);
          }
        }
      };

      loadBoostInfo();

      return () => {
        isMounted = false;
      };
    }, [route.params?.listingId])
  );

  // ✅ 获取性能统计数据 - 使用 useFocusEffect 以便在返回时刷新
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const listingId = route.params?.listingId;
      if (!listingId) {
        setPerformance({ bag: 0, likes: 0, views: 0, clicks: 0 });
        setLoadingPerformance(false);
        return;
      }

      const loadPerformanceStats = async () => {
        try {
          setLoadingPerformance(true);
          console.log("📊 Fetching performance stats for listing:", listingId);
          const stats = await listingStatsService.getListingStats(String(listingId));
          
          if (!isMounted) return;
          
          console.log("✅ Performance stats loaded:", stats);
          setPerformance({
            bag: stats.stats.bag ?? 0,
            likes: stats.stats.likes ?? 0,
            views: stats.stats.views ?? 0,
            clicks: stats.stats.clicks ?? 0,
          });
        } catch (error) {
          if (isMounted) {
            console.error("❌ Error fetching performance stats:", error);
            // Keep default values on error
            setPerformance({ bag: 0, likes: 0, views: 0, clicks: 0 });
          }
        } finally {
          if (isMounted) {
            setLoadingPerformance(false);
          }
        }
      };

      loadPerformanceStats();

      return () => {
        isMounted = false;
      };
    }, [route.params?.listingId])
  );

  const formatBoostDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return null;
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toLocaleDateString();
  };

  const formatBoostStatus = (status: string | null | undefined) => {
    if (!status) return "Active";
    return status
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  // ✅ 处理编辑listing
  const handleEditListing = () => {
    if (listing) {
      navigation.navigate("EditListing", { listingId: listing.id });
    }
  };

  // ✅ 处理标记为已售
  const handleMarkAsSold = () => {};

  // ✅ 处理删除listing
  const handleDeleteListing = () => {
    if (!listing) return;
    
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await listingsService.deleteListing(listing.id);
              Alert.alert("Success", "Listing deleted successfully");
              navigation.goBack();
            } catch (error) {
              console.error("❌ Error deleting listing:", error);
              Alert.alert("Error", "Failed to delete listing");
            }
          },
        },
      ]
    );
  };

  const handleToggleListingVisibility = async () => {
    if (!listing || updatingListed) return;

    const nextListed = listing.listed === false;

    try {
      setUpdatingListed(true);
      const updatedListing = await listingsService.updateListing(String(listing.id), {
        listed: nextListed,
      });
      setListing(updatedListing);
      Alert.alert(
        "Success",
        nextListed
          ? "Your listing is now visible to shoppers."
          : "Your listing has been hidden from shoppers."
      );
    } catch (error) {
      console.error("❌ Error updating listing visibility:", error);
      Alert.alert("Error", "Failed to update listing visibility");
    } finally {
      setUpdatingListed(false);
    }
  };

  // ✅ 处理预览listing
  const handlePreviewListing = () => {
    if (listing) {
      navigation.navigate("ActiveListingDetail", { listingId: listing.id });
    }
  };

  const handleOpenPromotionPlans = () => {
    if (!listing) {
      return;
    }

    // ✅ 检查是否已经boosted
    if (boostInfo && (boostInfo.status === "ACTIVE" || boostInfo.status === "SCHEDULED")) {
      Alert.alert(
        "Already Boosted",
        `This listing is currently being boosted${boostInfo.endsAt ? ` until ${new Date(boostInfo.endsAt).toLocaleDateString()}` : ""}. Please wait for the current boost to expire before boosting again.`,
        [
          {
            text: "View Boost Status",
            onPress: () => {
              // Navigate to BoostedListingScreen
              navigation.navigate("BoostedListing");
            },
          },
          { text: "OK", style: "cancel" },
        ]
      );
      return;
    }

    navigation.navigate("Premium", {
      screen: "PromotionPlans",
      params: {
        selectedListingIds: [listing.id],
        selectedListings: [listing],
      },
    });
  };


  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Listing" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Listing" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Listing not found</Text>
        </View>
      </View>
    );
  }

  const statusLabel = listing.listed === false ? "Unlisted" : "Listed";
  const statusBadgeStyle = listing.listed === false ? styles.statusBadgeUnlisted : styles.statusBadgeListed;
  const statusTextStyle = listing.listed === false ? styles.statusBadgeTextUnlisted : styles.statusBadgeTextListed;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Listing" showBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* 顶部卡片：缩略图 + 价格 + Preview 文案 */}
        <TouchableOpacity
          style={styles.topCard}
          activeOpacity={0.8}
          onPress={handlePreviewListing}
        >
          <Image 
            source={{ 
              uri: listing.images && listing.images.length > 0 
                ? listing.images[0] 
                : "https://via.placeholder.com/300x300/f4f4f4/999999?text=No+Image"
            }} 
            style={styles.thumb} 
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Text style={[styles.topTitle, { flex: 1, marginRight: 8 }]} numberOfLines={2} ellipsizeMode="tail">
                {listing.title}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, statusBadgeStyle]}>
                  <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusLabel}</Text>
                </View>
                {updatingListed && (
                  <ActivityIndicator
                    size="small"
                    color="#6b6b6b"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <Text style={styles.topPrice}>${listing.price}</Text>
              <Icon name="create-outline" size={16} color="#6b6b6b" />
            </View>
            {/* 🔥 显示库存数量 */}
            {listing.availableQuantity !== undefined && (
              <Text style={styles.stockText}>
                Stock: {listing.availableQuantity}
              </Text>
            )}
            <Text style={styles.previewText}>Preview listing</Text>
          </View>
        </TouchableOpacity>

        {/* Boost 卡片 */}
        <View style={styles.promoCard}>
          <View style={styles.promoHeader}>
            <Icon name="gift-outline" size={20} color="#111" />
            <View style={{ flex: 1 }}>
              <View style={styles.promoTitleRow}>
                <Text style={styles.promoTitle}>
                  {boostInfo && boostInfo.status === 'ACTIVE'
                    ? "Your listing is currently boosted"
                    : "Want more shoppers to see your listing?"}
                </Text>
                {boostInfo && boostInfo.status === 'ACTIVE' && (
                  <View style={[styles.statusBadge, styles.boostBadge]}>
                    <Text style={[styles.statusBadgeText, styles.boostBadgeText]}>Boosted</Text>
                  </View>
                )}
              </View>
              {boostInfo && (
                <Text style={styles.promoSubtitle}>
                  {formatBoostStatus(boostInfo.status)}
                  {formatBoostDate(boostInfo.endsAt)
                    ? ` • Ends ${formatBoostDate(boostInfo.endsAt)}`
                    : ""}
                </Text>
              )}
            </View>
          </View>

          {loadingBoostInfo ? (
            <Text style={styles.promoLoadingText}>Checking boost status…</Text>
          ) : boostInfo ? (
            <View>
              <View style={styles.boostMetaRow}>
                <View style={styles.boostMetaLeft}>
                  {typeof boostInfo.views === "number" && boostInfo.views > 0 && (
                    <Text style={styles.boostMetaText}>Views {boostInfo.views}</Text>
                  )}
                  {typeof boostInfo.clicks === "number" && boostInfo.clicks > 0 && (
                    <Text style={styles.boostMetaText}>Clicks {boostInfo.clicks}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={handleOpenPromotionPlans}>
                  <Text style={styles.promoLink}>Manage Boost</Text>
                </TouchableOpacity>
              </View>

              {/* Uplift Stats */}
              {boostInfo.status === 'ACTIVE' && (
                boostInfo.viewUpliftPercent !== undefined ||
                boostInfo.clickUpliftPercent !== undefined
              ) && (
                <View style={styles.upliftContainer}>
                  <Text style={styles.upliftTitle}>Performance vs Baseline</Text>
                  <View style={styles.upliftRow}>
                    {typeof boostInfo.viewUpliftPercent === "number" && (
                      <View style={styles.upliftCell}>
                        <Icon
                          name={boostInfo.viewUpliftPercent >= 0 ? "trending-up-outline" : "trending-down-outline"}
                          size={18}
                          color={boostInfo.viewUpliftPercent >= 0 ? "#16a34a" : "#dc2626"}
                        />
                        <Text style={[
                          styles.upliftValue,
                          boostInfo.viewUpliftPercent >= 0 ? styles.upliftPositive : styles.upliftNegative
                        ]}>
                          {boostInfo.viewUpliftPercent >= 0 ? '+' : ''}{boostInfo.viewUpliftPercent}%
                        </Text>
                        <Text style={styles.upliftLabel}>Views</Text>
                      </View>
                    )}
                    {typeof boostInfo.clickUpliftPercent === "number" && (
                      <View style={styles.upliftCell}>
                        <Icon
                          name={boostInfo.clickUpliftPercent >= 0 ? "trending-up-outline" : "trending-down-outline"}
                          size={18}
                          color={boostInfo.clickUpliftPercent >= 0 ? "#16a34a" : "#dc2626"}
                        />
                        <Text style={[
                          styles.upliftValue,
                          boostInfo.clickUpliftPercent >= 0 ? styles.upliftPositive : styles.upliftNegative
                        ]}>
                          {boostInfo.clickUpliftPercent >= 0 ? '+' : ''}{boostInfo.clickUpliftPercent}%
                        </Text>
                        <Text style={styles.upliftLabel}>Click Rate</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.promoSubtitle}>
                Boost to push your listing to more shoppers and increase visibility.
              </Text>
              <TouchableOpacity
                style={styles.promoLinkWrapper}
                onPress={handleOpenPromotionPlans}
              >
                <Text style={styles.promoLink}>Click To Get Boost</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Performance */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Icon name="bag-outline" size={22} color="#111" />
            {loadingPerformance ? (
              <ActivityIndicator size="small" color="#999" style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.metricNumber}>{performance.bag}</Text>
            )}
            <Text style={styles.metricLabel}>Bag</Text>
          </View>

          <View style={styles.metricCell}>
            <Icon name="heart-outline" size={22} color="#111" />
            {loadingPerformance ? (
              <ActivityIndicator size="small" color="#999" style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.metricNumber}>{performance.likes}</Text>
            )}
            <Text style={styles.metricLabel}>Likes</Text>
          </View>

          <View style={styles.metricCell}>
            <Icon name="eye-outline" size={22} color="#111" />
            {loadingPerformance ? (
              <ActivityIndicator size="small" color="#999" style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.metricNumber}>{performance.views}</Text>
            )}
            <Text style={styles.metricLabel}>Views</Text>
          </View>

          <View style={styles.metricCell}>
            <Icon name="sparkles-outline" size={22} color="#111" />
            {loadingPerformance ? (
              <ActivityIndicator size="small" color="#999" style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.metricNumber}>{performance.clicks}</Text>
            )}
            <Text style={styles.metricLabel}>Clicks</Text>
          </View>
        </View>

        {/* Manage your listing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage your listing</Text>

          <TouchableOpacity
            style={styles.rowItem}
            onPress={handleEditListing}
          >
            <Text style={styles.rowText}>Edit Listing</Text>
            <Icon name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.rowItem,
              updatingListed && styles.rowItemDisabled,
            ]}
            onPress={handleToggleListingVisibility}
            disabled={updatingListed}
          >
            <Text
              style={[
                styles.rowText,
                listing.listed === false ? styles.rowTextAccent : null,
                updatingListed ? styles.rowTextMuted : null,
              ]}
            >
              {listing.listed === false ? "List Item" : "Unlist Item"}
            </Text>
            {updatingListed ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Icon
                name={
                  listing.listed === false
                    ? "arrow-up-circle-outline"
                    : "eye-off-outline"
                }
                size={18}
                color="#999"
              />
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* 底部删除 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteListing}>
          <Text style={styles.deleteText}>Delete Listing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  topCard: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#eee" },
  topTitle: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 2 },
  topPrice: { fontSize: 18, fontWeight: "700", color: "#111", marginRight: 6 },
  stockText: { 
    marginTop: 4, 
    fontSize: 13, 
    color: "#555",
    fontWeight: "600"
  }, // 🔥 库存文本样式
  previewText: { marginTop: 4, color: "#6b6b6b" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeListed: { backgroundColor: "#DCFCE7" },
  statusBadgeUnlisted: { backgroundColor: "#FEE2E2" },
  statusBadgeSold: { backgroundColor: "#EDE9FE" },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  statusBadgeTextListed: { color: "#166534" },
  statusBadgeTextUnlisted: { color: "#991B1B" },
  statusBadgeTextSold: { color: "#5B21B6" },

  promoCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    rowGap: 6,
  },
  promoHeader: { flexDirection: "row", alignItems: "flex-start", columnGap: 8 },
  promoTitleRow: { flexDirection: "row", alignItems: "flex-start", columnGap: 8, flex: 1 },
  promoLinkWrapper: { alignSelf: "flex-start", marginLeft: 28 },
  promoTitle: { fontSize: 14, fontWeight: "700", color: "#111", flex: 1, flexWrap: "wrap" },
  promoSubtitle: { marginTop: 2, color: "#555", fontSize: 13 },
  promoLoadingText: { marginTop: 6, color: "#666", fontSize: 13 },
  boostMetaRow: {
    marginTop: 6,
    marginLeft: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 12,
  },
  boostMetaLeft: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 4,
  },
  boostMetaText: { color: "#333", fontSize: 13 },
  promoLink: { color: "#2563eb", fontWeight: "600", marginTop: 0 },
  boostBadge: { backgroundColor: "#DBEAFE" },
  boostBadgeText: { color: "#1D4ED8" },

  upliftContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e6e6e6",
  },
  upliftTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  upliftRow: {
    flexDirection: "row",
    gap: 16,
  },
  upliftCell: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  upliftValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  upliftPositive: {
    color: "#16a34a",
  },
  upliftNegative: {
    color: "#dc2626",
  },
  upliftLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },

  metricsRow: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  metricNumber: { marginTop: 6, fontSize: 16, fontWeight: "700", color: "#111" },
  metricLabel: { marginTop: 2, color: "#777", fontSize: 12 },

  section: { marginTop: 18, marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },

  rowItem: {
    height: 48,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6e6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowItemDisabled: { opacity: 0.6 },
  rowText: { fontSize: 15, color: "#111" },
  rowTextMuted: { color: "#888" },
  rowTextAccent: { color: "#2563eb", fontWeight: "600" },

  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e6e6e6",
    backgroundColor: "#fff",
  },
  deleteBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
