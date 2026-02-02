// mobile/screens/main/HomeStack/FeedList.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl, FlatList,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { HomeStackParamList } from "./index";
import type { ListingItem } from "../../../types/shop";
import { useAuth } from "../../../contexts/AuthContext";
import { apiClient } from "../../../src/services/api";

type HomeFeedResponse = {
  items: Array<{
    id: number;
    title: string | null;
    image_url: string | null;
    image_urls?: unknown; // JSON array or null
    price_cents: number;
    brand: string | null;
    tags: string[];
    source: string;
  }>;
  meta?: Record<string, any>;
};

const PAGE_SIZE = 20;
const INT32_MAX = 2_147_483_647;

interface FeedListProps {
  mode: "foryou" | "trending";
  onScroll?: (offset: number) => void;
}

export interface FeedListRef {
  scrollToTop: () => void;
  refresh: () => void;
  getScrollOffset: () => number;
}

const FeedList = forwardRef<FeedListRef, FeedListProps>(({ mode, onScroll }, ref) => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const scrollRef = useRef<FlatList<ListingItem> | null>(null);
  const scrollOffsetRef = useRef(0);
  const seedRef = useRef<number>((Date.now() % INT32_MAX) | 0);
  const insets = useSafeAreaInsets();

  // Track which boosted items have been viewed (to avoid duplicate tracking)
  const viewedBoostedItemsRef = useRef<Set<string>>(new Set());

  const [featuredItems, setFeaturedItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const auth = useAuth() as any;
  const authReady: boolean = useMemo(() => {
    return (typeof auth?.initialized === "boolean" ? auth.initialized : undefined) ??
      (typeof auth?.isAuthenticated === "boolean");
  }, [auth?.initialized, auth?.isAuthenticated]);

  const mapApiItem = useCallback((x: any): ListingItem => {
    const idNum = typeof x.id === "number" ? x.id : Number(x.id);
    const cents = typeof x.price_cents === "number" ? x.price_cents : Number(x.price_cents ?? 0);
    const price = Number.isFinite(cents) ? cents / 100 : 0;
    
    // Extract images from image_urls (JSON array) or image_url (string)
    let images: string[] = [];
    if (x.image_urls) {
      // Try image_urls first (JSON array)
      if (Array.isArray(x.image_urls)) {
        images = x.image_urls
          .filter((item: any) => typeof item === "string" && item.length > 0)
          .map(String);
      } else if (typeof x.image_urls === "string") {
        try {
          const parsed = JSON.parse(x.image_urls);
          if (Array.isArray(parsed)) {
            images = parsed
              .filter((item: any) => typeof item === "string" && item.length > 0)
              .map(String);
          }
        } catch {
          // If parsing fails and it looks like a URL, treat as single URL
          if (x.image_urls.startsWith("http")) {
            images = [String(x.image_urls)];
          }
        }
      }
    }
    
    // Fallback to image_url if image_urls is empty
    if (images.length === 0 && x.image_url && typeof x.image_url === "string" && x.image_url.trim().length > 0) {
      images = [String(x.image_url)];
    }
    
    const title = String(x.title ?? "");
    const tags = Array.isArray(x.tags) ? x.tags.map(String) : [];

    return {
      id: String(idNum),
      title,
      price,
      images,
      size: x.size ?? null,
      material: x.material ?? null,
      tags,
      brand: x.brand ?? null,
      description: x.description ?? "",
      condition: x.condition ?? "Good",
      is_boosted: x.is_boosted ?? false,
      boost_weight: x.boost_weight ? Number(x.boost_weight) : undefined,
      seller: typeof x.seller === "object" && x.seller !== null
        ? {
            id: x.seller.id ?? 0,
            name: x.seller.name ?? "Seller",
            avatar: x.seller.avatar ?? "",
            rating: x.seller.rating ?? 5.0,
            sales: x.seller.sales ?? 0,
            isPremium: x.seller.isPremium ?? false,
          }
        : {
            id: 0,
            name: "Seller",
            avatar: "",
            rating: 5.0,
            sales: 0,
            isPremium: false,
          },
    };
  }, []);

  const dedupe = (arr: ListingItem[]) => {
    const seen = new Set<string>();
    return arr.filter((it) => {
      const id = String(it.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  // Track promotion events (view/click)
  const trackPromotion = useCallback(async (listingId: string, eventType: "view" | "click") => {
    try {
      await apiClient.post("/api/promotions/track", {
        listingId: Number(listingId),
        eventType,
      });
    } catch (error) {
      // Silently fail - tracking errors shouldn't disrupt user experience
      console.warn(`Failed to track ${eventType} for listing ${listingId}:`, error);
    }
  }, []);

  const fetchFeedPage = useCallback(
    async (pageToLoad: number, { bypassCache = false } = {}) => {
      const params: Record<string, any> = {
        mode,
        limit: PAGE_SIZE,
        page: pageToLoad,
        seedId: seedRef.current,
      };

      if (bypassCache) {
        params.noStore = "1";
        params.cacheBust = Date.now();
      }

      const response = await apiClient.get<HomeFeedResponse>("/api/feed/home", params);
      const items = Array.isArray(response.data?.items) ? response.data.items.map(mapApiItem) : [];
      return { items, hasMore: items.length === PAGE_SIZE };
    },
    [mode, mapApiItem]
  );

  const loadInitial = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    setError(null);
    try {
      const { items, hasMore } = await fetchFeedPage(1, { bypassCache: true });
      setFeaturedItems(dedupe(items));
      setHasMore(hasMore);
      setPage(1);
    } catch (e: any) {
      setError(e.message || "Failed to load");
      setFeaturedItems([]);
    } finally {
      setLoading(false);
    }
  }, [authReady, fetchFeedPage]);

  useEffect(() => {
    if (authReady) {
      loadInitial();
    }
  }, [authReady, loadInitial]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    seedRef.current = (Date.now() % INT32_MAX) | 0;
    viewedBoostedItemsRef.current.clear(); // Reset view tracking on refresh
    await loadInitial();
    setRefreshing(false);
  }, [loadInitial]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    refresh: () => {
      refresh();
    },
    getScrollOffset: () => scrollOffsetRef.current,
  }));

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { items } = await fetchFeedPage(nextPage);
      setFeaturedItems((prev) => dedupe([...prev, ...items]));
      setPage(nextPage);
      if (items.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loading, page, fetchFeedPage]);

  const handleListingPress = useCallback(
    (item: ListingItem) => {
      if (!item || !item.id) {
        console.warn("⚠️ Cannot navigate: invalid listing item");
        return;
      }

      // Track click for boosted items
      if (item.is_boosted) {
        trackPromotion(item.id, "click");
      }

      let rootNavigation: any = navigation;
      let current: any = navigation;
      while (current?.getParent?.()) {
        current = current.getParent();
        if (current) {
          rootNavigation = current;
        }
      }

      const listingId = String(item.id);
      requestAnimationFrame(() => {
        rootNavigation?.navigate("Buy", {
          screen: "ListingDetail",
          params: { listingId },
        });
      });
    },
    [navigation, trackPromotion]
  );

  // All hooks must be at the top, before any conditional returns
  const contentStyle = useMemo(
    () => ({
      ...styles.gridContainer,
      paddingTop: insets.top + (Platform.OS === "ios" ? 50 : 50), // Safe area top + top bar height (iOS: 52, Android: 60) + extra margin (16)
    }),
    [insets.top]
  );

  const emptyState = !loading && !error && featuredItems.length === 0 ? (
    <View style={{ padding: 32, alignItems: "center" }}>
      <Text style={{ fontSize: 15, color: "#666", textAlign: "center" }}>
        {mode === "foryou"
          ? "No suggestions yet. Try pulling to refresh."
          : "No trending items available."}
      </Text>
    </View>
  ) : null;

  // Viewability tracking for boosted items
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    viewableItems.forEach((viewableItem: any) => {
      const item = viewableItem.item as ListingItem;
      if (item.is_boosted && !viewedBoostedItemsRef.current.has(item.id)) {
        // Mark as viewed and track
        viewedBoostedItemsRef.current.add(item.id);
        trackPromotion(item.id, "view");
      }
    });
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // 50% of item must be visible
    minimumViewTime: 500, // Must be visible for at least 500ms
  }).current;

  // Premium Banner component - only for For You tab
  const isPremium = auth?.user?.isPremium ?? false;
  const listHeader = mode === "foryou" && !isPremium ? (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => {
        let rootNavigation: any = navigation;
        let current: any = navigation;
        while (current?.getParent?.()) {
          current = current.getParent();
          if (current) {
            rootNavigation = current;
          }
        }
        rootNavigation?.navigate("Premium", {
          screen: "PremiumPlans",
        });
      }}
      activeOpacity={0.8}
    >
      <Text style={styles.bannerTitle}>Style smarter with AI Mix & Match</Text>
      <Text style={styles.bannerSubtitle}>
        Unlimited styling, free boosts, lower fees
      </Text>
    </TouchableOpacity>
  ) : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading items...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={scrollRef}
      data={featuredItems}
      numColumns={2}
      keyExtractor={(item) => String(item.id)}
      columnWrapperStyle={styles.row}
      contentContainerStyle={contentStyle}
      style={{ backgroundColor: "transparent" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={emptyState}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      onScroll={(e) => {
        const offset = e.nativeEvent.contentOffset.y;
        scrollOffsetRef.current = offset;
        onScroll?.(offset);
      }}
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      ListFooterComponent={() => {
        if (isLoadingMore) {
          return (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
                Loading more...
              </Text>
            </View>
          );
        }

        if (!hasMore && featuredItems.length > 0) {
          const displayCount = featuredItems.length;
          return (
            <View style={styles.footerContainer}>
              <View style={styles.footerDivider} />
              <Text style={styles.footerText}>
                You've reached the end • {displayCount} {displayCount === 1 ? "item" : "items"} found
              </Text>
              <Text style={styles.footerSubtext}>
                {mode === "foryou"
                  ? "Pull to refresh for new suggestions"
                  : "Pull to refresh for more trending items"}
              </Text>
            </View>
          );
        }

        return null;
      }}
      extraData={`${seedRef.current}-${mode}-${featuredItems.length}`}
      renderItem={({ item }) => {
        const primaryImage =
          item.images?.[0] ??
          "https://via.placeholder.com/300x300/f4f4f4/999999?text=No+Image";
        const displayTags = item.tags && item.tags.length > 0 ? item.tags.slice(0, 2) : [];
        return (
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => handleListingPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.imageContainer}>
              <Image source={{ uri: primaryImage }} style={styles.gridImage} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              <View style={styles.bottomRow}>
                {displayTags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {displayTags.map((tag, index) => (
                      <View key={index} style={styles.tagChip}>
                        <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {item.is_boosted && (
                  <View style={styles.boostBadge}>
                    <Ionicons name="flash-outline" size={16} color="#FFD700" />
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
});

export default FeedList;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  bannerTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  bannerSubtitle: { fontSize: 14, color: "#555" },

  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 60,
  },
  row: { justifyContent: "space-between" },
  gridItem: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
  },
  gridImage: { width: "100%", height: "100%" },
  itemInfo: { padding: 10 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  tagsContainer: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    flex: 1,
    alignItems: "center",
    alignContent: "center",
  },
  boostBadge: {
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tagChip: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    maxWidth: "100%",
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 14, color: "#666" },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  errorText: { color: "#FF3B30" },
  footerContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    rowGap: 8,
  },
  footerDivider: {
    width: 60,
    height: 3,
    backgroundColor: "#e5e5e5",
    borderRadius: 999,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  footerSubtext: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },
});
