import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { MyTopStackParamList } from "./index";
import { listingsService, type BoostedListingSummary } from "../../../src/services/listingsService";

type Nav = NativeStackNavigationProp<MyTopStackParamList, "BoostedListing">;

export default function BoostedListingScreen() {
  const navigation = useNavigation<Nav>();
  const [boosted, setBoosted] = useState<BoostedListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBoostedListings = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await listingsService.getBoostedListings();
      setBoosted(data);
    } catch (err) {
      console.error("Failed to load boosted listings", err);
      setError("Failed to load boosted listings.");
      setBoosted([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        if (cancelled) return;
        setLoading(true);
        setError(null);
        try {
          const data = await listingsService.getBoostedListings();
          if (!cancelled) {
            setBoosted(data);
          }
        } catch (err) {
          if (!cancelled) {
            console.error("Failed to load boosted listings", err);
            setError("Failed to load boosted listings.");
            setBoosted([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBoostedListings();
    } finally {
      setRefreshing(false);
    }
  }, [fetchBoostedListings]);

  const activeBoosts = useMemo(
    () => boosted.filter((item) => item.status === "ACTIVE"),
    [boosted]
  );

  const scheduledBoosts = useMemo(
    () => boosted.filter((item) => item.status === "SCHEDULED"),
    [boosted]
  );

  const expiredBoosts = useMemo(
    () => boosted.filter((item) => item.status === "EXPIRED"),
    [boosted]
  );

  const visibleBoosts = useMemo(
    () => [...activeBoosts, ...scheduledBoosts],
    [activeBoosts, scheduledBoosts]
  );

  const statsCard = useMemo(() => {
    const activeCount = activeBoosts.length;
    if (loading) {
      return "Fetching boost stats...";
    }

    if (activeCount === 0) {
      return "No active boosts right now. Turn boosts on to reach more buyers.";
    }

    return `${activeCount} active boost${activeCount > 1 ? "s" : ""} running. Keep an eye on performance below.`;
  }, [activeBoosts, loading]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color="#111" />
          <Text style={styles.emptyText}>Loading boosted listings…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          You have no active boosts right now. Boost a listing to see performance here.
        </Text>
      </View>
    );
  }, [error, handleRefresh, loading]);

  const formatRelative = (iso: string | null) => {
    if (!iso) {
      return "recently";
    }
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.max(Math.floor(diffMs / (1000 * 60)), 0);
      if (diffMinutes < 1) return "just now";
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
    } catch (_err) {
      return "recently";
    }
  };

  const getUpliftDisplay = (percent: number | null | undefined) => {
    if (percent === null || percent === undefined) {
      return {
        icon: "remove-outline" as const,
        pillStyle: styles.upliftPillNeutral,
        textStyle: styles.upliftTextNeutral,
        text: "No uplift data yet",
      };
    }

    if (percent > 0) {
      return {
        icon: "arrow-up" as const,
        pillStyle: styles.upliftPillPositive,
        textStyle: styles.upliftTextPositive,
        text: `+${percent}% vs baseline`,
      };
    }

    if (percent < 0) {
      return {
        icon: "arrow-down" as const,
        pillStyle: styles.upliftPillNegative,
        textStyle: styles.upliftTextNegative,
        text: `${percent}% vs baseline`,
      };
    }

    return {
      icon: "remove-outline" as const,
      pillStyle: styles.upliftPillNeutral,
      textStyle: styles.upliftTextNeutral,
      text: "No change vs baseline",
    };
  };

  const buildStatusSubtitle = (item: BoostedListingSummary, isExpiredSection?: boolean) => {
    if (item.status === "SCHEDULED") {
      return `Scheduled to start ${formatRelative(item.startedAt)}`;
    }

    if (item.status === "EXPIRED" || isExpiredSection) {
      const endedReference = item.endsAt ?? item.startedAt;
      return `Ended ${formatRelative(endedReference)}`;
    }

    return `Boosted ${formatRelative(item.startedAt)}`;
  };

  // ✅ 处理点击列表项，导航到ManageListing
  const handleListingPress = useCallback((listingId: string) => {
    navigation.navigate("ManageListing", { listingId });
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Boosted listings" showBack />

      {/* How stats work 卡片 */}
      <View style={styles.infoCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="information-circle-outline" size={18} color="#111" />
          <Text style={styles.infoTitle}>How stats work</Text>
        </View>
        <Text style={styles.infoText}>
          Numbers shown are total views and clicks, tracked from the time of
          boosting.
        </Text>
        <Text style={styles.learnMore}>{statsCard}</Text>
      </View>

      <FlatList
        data={visibleBoosts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#111" />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          expiredBoosts.length
            ? (
                <View style={styles.expiredSection}>
                  <Text style={styles.sectionHeader}>Expired boosts</Text>
                  {expiredBoosts.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.boostRow, styles.expiredRow]}
                      onPress={() => handleListingPress(String(item.listingId))}
                      activeOpacity={0.7}
                    >
                      {item.primaryImage ? (
                        <Image source={{ uri: item.primaryImage }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, styles.thumbPlaceholder]}>
                          <Icon name="image-outline" size={22} color="#999" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {(item.size || "One size")} • ${item.price.toFixed(2)}
                        </Text>
                        <Text style={[styles.rowSub, styles.expiredSub]}>{buildStatusSubtitle(item, true)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.boostRow}
            onPress={() => handleListingPress(String(item.listingId))}
            activeOpacity={0.7}
          >
            {item.primaryImage ? (
              <Image source={{ uri: item.primaryImage }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Icon name="image-outline" size={22} color="#999" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowMeta}>
                {(item.size || "One size")} • ${item.price.toFixed(2)}
              </Text>
              <Text style={styles.rowSub}>{buildStatusSubtitle(item)}</Text>

              {/* 统计 */}
              <View style={styles.metricRow}>
                <View style={styles.metricPill}>
                  <Icon name="eye-outline" size={16} color="#111" />
                  <Text style={styles.metricText}>{item.views} views</Text>
                </View>
                {(() => {
                  const viewUplift = getUpliftDisplay(item.viewUpliftPercent);
                  return (
                    <View style={[styles.upliftPillBase, viewUplift.pillStyle]}>
                      <Icon name={viewUplift.icon} size={14} color={viewUplift.textStyle.color ?? "#1f7a1f"} />
                      <Text style={[styles.upliftTextBase, viewUplift.textStyle]}>{viewUplift.text}</Text>
                    </View>
                  );
                })()}
              </View>
              <View style={[styles.metricRow, { marginTop: 6 }]}>
                <View style={styles.metricPill}>
                  <Icon name="push-outline" size={16} color="#111" />
                  <Text style={styles.metricText}>{item.clicks} clicks</Text>
                </View>
                {(() => {
                  const clickUplift = getUpliftDisplay(item.clickUpliftPercent);
                  return (
                    <View style={[styles.upliftPillBase, clickUplift.pillStyle]}>
                      <Icon name={clickUplift.icon} size={14} color={clickUplift.textStyle.color ?? "#1f7a1f"} />
                      <Text style={[styles.upliftTextBase, clickUplift.textStyle]}>{clickUplift.text}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    rowGap: 6,
  },
  infoTitle: { fontWeight: "700", fontSize: 15, color: "#111" },
  infoText: { color: "#444", lineHeight: 18 },
  learnMore: { color: "#555", fontSize: 12, marginTop: 4 },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 16,
  },

  boostRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    gap: 12,
  },
  expiredRow: {
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  thumb: { width: 66, height: 66, borderRadius: 10, backgroundColor: "#eee" },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontWeight: "700", color: "#111" },
  rowMeta: { color: "#111", marginTop: 2 },
  rowSub: { color: "#666", marginTop: 2, fontSize: 12 },
  expiredSub: { color: "#999" },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f6f6f6",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  metricText: { color: "#111" },
  upliftPillBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  upliftPillPositive: {
    backgroundColor: "#DDF6DD",
  },
  upliftPillNegative: {
    backgroundColor: "#FDEAEA",
  },
  upliftPillNeutral: {
    backgroundColor: "#F3F4F6",
  },
  upliftTextBase: {
    fontWeight: "700",
    fontSize: 12,
  },
  upliftTextPositive: {
    color: "#1f7a1f",
  },
  upliftTextNegative: {
    color: "#b00020",
  },
  upliftTextNeutral: {
    color: "#555",
  },
  expiredSection: {
    paddingTop: 24,
    paddingBottom: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    color: "#555",
    textAlign: "center",
    fontSize: 14,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#111",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});
