import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import Avatar from "../../../components/Avatar";
import type { MyTopStackParamList } from "./index";
import type { RootStackParamList } from "../../../App";
import { listingsService, type BoostedListingSummary } from "../../../src/services/listingsService";
import type { ListingItem } from "../../../types/shop";
import { DEFAULT_AVATAR } from "../../../constants/assetUrls";


const { width: WINDOW_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = Math.min(WINDOW_WIDTH - 48, 360);

const formatGenderLabel = (value?: string | null) => {
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower === "men" || lower === "male") return "Men";
  if (lower === "women" || lower === "female") return "Women";
  if (lower === "unisex") return "Unisex";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<MyTopStackParamList, "ActiveListingDetail">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ActiveListingDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MyTopStackParamList, "ActiveListingDetail">>();

  const [listing, setListing] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [boostInfo, setBoostInfo] = useState<BoostedListingSummary | null>(null);
  const [loadingBoostInfo, setLoadingBoostInfo] = useState(true);
  const genderLabel = useMemo(
    () => formatGenderLabel(listing?.gender),
    [listing?.gender],
  );
  const detailMetaCards = useMemo(() => {
    if (!listing) return [];

    const normalize = (value?: string | null) =>
      typeof value === "string" ? value.trim() : "";

    const cards: Array<{
      id: string;
      label: string;
      value: string;
      placeholder?: boolean;
    }> = [
      {
        id: "size",
        label: "Size",
        value: listing.size ? listing.size : "Not specified",
      },
      {
        id: "condition",
        label: "Condition",
        value:
          listing.condition && listing.condition !== "Select"
            ? listing.condition
            : "Not specified",
      },
      {
        id: "gender",
        label: "Gender",
        value: genderLabel || "Not specified",
      },
    ];

    const brandValue = normalize(listing.brand);
    const hasBrand = !!(brandValue && brandValue !== "Select");
    if (hasBrand) {
      cards.push({ id: "brand", label: "Brand", value: brandValue });
    }

    const materialValue = normalize(listing.material);
    const hasMaterial = !!(
      materialValue &&
      materialValue !== "Select" &&
      materialValue !== "Polyester"
    );
    if (hasMaterial) {
      cards.push({ id: "material", label: "Material", value: materialValue });
    }

    if (!hasBrand && !hasMaterial) {
      cards.push({
        id: "additional",
        label: "Additional Details",
        value: "Not provided by seller",
        placeholder: true,
      });
    }

    return cards;
  }, [listing, genderLabel]);

  const imageUris = useMemo(() => {
    if (!Array.isArray(listing?.images)) return [];
    return listing.images.filter(
      (uri): uri is string => typeof uri === "string" && uri.trim().length > 0,
    );
  }, [listing?.images]);

  useEffect(() => {
    if (previewIndex !== null && imageUris.length === 0) {
      setPreviewIndex(null);
    }
  }, [imageUris.length, previewIndex]);

  const previewActiveIndex =
    previewIndex !== null
      ? Math.min(previewIndex, Math.max(imageUris.length - 1, 0))
      : 0;
  const previewVisible = previewIndex !== null && imageUris.length > 0;

  // ✅ 获取listing数据
  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingId = route.params?.listingId;
        if (!listingId) {
          Alert.alert("Error", "No listing ID provided");
          navigation.goBack();
          return;
        }

        console.log("📖 Fetching listing:", listingId);
        const listingData = await listingsService.getListingById(listingId);
        
        if (listingData) {
          setListing(listingData);
          console.log("✅ Listing loaded:", listingData.title);
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
  }, [route.params?.listingId, navigation]);

  // ✅ 获取boost状态
  useFocusEffect(
    useCallback(() => {
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

  // ✅ 处理Manage Listing点击
  const handleManageListing = () => {
    if (listing) {
      navigation.navigate("ManageListing", { listingId: listing.id });
    }
  };

  // ✅ 处理Boost Listing点击
  const handleBoostListing = () => {
    if (!listing) return;

    // 如果已经boosted，导航到BoostedListingScreen
    if (boostInfo && (boostInfo.status === "ACTIVE" || boostInfo.status === "SCHEDULED")) {
      navigation.navigate("BoostedListing");
      return;
    }

    // 如果没有boosted，导航到PremiumStack的PromotionPlans（全屏模式）
    const rootNav = navigation.getParent();
    if (rootNav) {
      rootNav.navigate("Premium", {
        screen: "PromotionPlans",
        params: {
          selectedListingIds: [listing.id],
          selectedListings: [listing],
        },
      });
    }
  };

  // ✅ 检查是否已boosted
  const isBoosted = boostInfo && (boostInfo.status === "ACTIVE" || boostInfo.status === "SCHEDULED");
  const boostButtonText = isBoosted ? "Boosting..." : "Boost Listing";

  if (loading) {
    return (
      <View style={styles.screen}>
        <Header title="" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.screen}>
        <Header title="" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Listing not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* 顶部返回 + 右上角彩板按钮（仅展示，与 buyer 版一致） */}
      <Header title="" showBack />

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewIndex(null)}
      >
        <View style={styles.previewOverlay}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: previewActiveIndex * WINDOW_WIDTH, y: 0 }}
            style={styles.previewScroll}
          >
            {imageUris.map((uri, idx) => (
              <View key={`${listing.id}-preview-${idx}`} style={styles.previewImageContainer}>
                <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          <View style={styles.previewTopBar}>
            <Text style={styles.previewCounter}>
              {previewActiveIndex + 1} / {imageUris.length}
            </Text>
            <TouchableOpacity onPress={() => setPreviewIndex(null)} style={styles.previewCloseBtn}>
              <Icon name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.previewThumbRow}>
            {imageUris.map((uri, idx) => (
              <TouchableOpacity
                key={`${listing.id}-thumb-${idx}`}
                onPress={() => setPreviewIndex(idx)}
                style={[
                  styles.previewThumb,
                  previewActiveIndex === idx ? styles.previewThumbActive : undefined,
                ]}
              >
                <Image source={{ uri }} style={styles.previewThumbImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        {/* 图片轮播 */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageCarousel}
        >
          {imageUris.map((uri, idx) => (
            <TouchableOpacity
              key={`${listing.id}-${idx}`}
              activeOpacity={0.9}
              onPress={() => setPreviewIndex(idx)}
            >
              <Image source={{ uri }} style={styles.image} />
            </TouchableOpacity>
          ))}
          {imageUris.length === 0 && (
            <Image
              source={{ uri: "https://via.placeholder.com/300x300/f4f4f4/999999?text=No+Image" }}
              style={styles.image}
            />
          )}
        </ScrollView>

        {/* 主信息卡片 */}
        <View style={styles.sectionCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{listing.title}</Text>
              <Text style={styles.price}>${listing.price.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            {detailMetaCards.map((info) => (
              <View
                key={info.id}
                style={[
                  styles.metaPill,
                  info.placeholder ? styles.metaPillPlaceholder : undefined,
                ]}
              >
                <Text style={styles.metaLabel}>{info.label}</Text>
                <Text
                  style={[
                    styles.metaValue,
                    info.placeholder ? styles.metaValuePlaceholder : undefined,
                  ]}
                >
                  {info.value}
                </Text>
              </View>
            ))}
          </View>

          {/* 描述 */}
          <Text style={styles.description}>{listing.description}</Text>

          {/* Tags Section */}
          {listing.tags && listing.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsLabel}>Tags</Text>
              <View style={styles.tagsContainer}>
                {listing.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Seller（我自己的资料，不显示 Message 按钮） */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Seller</Text>
          <View style={styles.sellerRow}>
            <Avatar
              source={
                listing.seller?.avatar
                  ? { uri: listing.seller.avatar }
                  : DEFAULT_AVATAR
              }
              style={styles.sellerAvatar}
              self
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{listing.seller?.name || "Unknown"}</Text>
              <Text style={styles.sellerMeta}>
                {(listing.seller?.rating || 0).toFixed(1)} stars | {listing.seller?.sales || 0} sales
              </Text>
            </View>
            {/* 自己的 Listing，不展示 message */}
          </View>
        </View>

        {/* Shipping 信息（连接后端数据） */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Shipping</Text>
          <Text style={styles.description}>
            {(listing as any)?.shippingOption && (listing as any).shippingOption !== 'Select' ? (
              <>
                {(listing as any).shippingOption}
                {(listing as any).shippingFee && Number((listing as any).shippingFee) > 0 
                  ? ` • Shipping fee: $${Number((listing as any).shippingFee).toFixed(2)}` 
                  : ''}
                {(listing as any).shippingOption === "Meet-up" && (listing as any)?.location 
                  ? `\nLocation: ${(listing as any).location}` 
                  : ''}
              </>
            ) : (
              'Please contact seller for shipping options and rates.'
            )}
          </Text>
        </View>
      </ScrollView>

      {/* 底部按钮：Manage / Boost（符合你的要求） */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleManageListing}
        >
          <Icon name="settings-outline" size={20} color="#111" />
          <Text style={styles.secondaryText}>Manage Listing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleBoostListing}
        >
          <Text style={styles.primaryText}>{boostButtonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: { paddingBottom: 120, rowGap: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  imageCarousel: { columnGap: 12, paddingHorizontal: 16 },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
  },

  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    rowGap: 12,
  },

  titleRow: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  price: { fontSize: 18, fontWeight: "700", color: "#111" },


  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 12,
  },
  metaPill: {
    width: "48%",
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f6f6f6",
    alignItems: "center",
    justifyContent: "center",
  },
  metaLabel: {
    fontSize: 12,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginTop: 4,
    textAlign: "center",
  },
  metaPillPlaceholder: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",
    backgroundColor: "#fff",
  },
  metaValuePlaceholder: {
    color: "#999",
    fontStyle: "italic",
  },

  description: { fontSize: 14, color: "#333", lineHeight: 20 },


  // Tags
  tagsSection: {
    marginTop: 16,
  },
  tagsLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  tagText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },

  sectionHeading: { fontSize: 16, fontWeight: "700" },

  sellerRow: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e8e8e8",
  },
  sellerName: { fontSize: 15, fontWeight: "600" },
  sellerMeta: { fontSize: 13, color: "#666", marginTop: 2 },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#111",
    marginRight: 12,
  },
  secondaryText: { fontSize: 15, fontWeight: "700", color: "#111" },
  primaryButton: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  previewScroll: {
    flexGrow: 0,
  },
  previewImageContainer: {
    width: WINDOW_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  previewImage: {
    width: WINDOW_WIDTH - 32,
    height: WINDOW_WIDTH - 32,
  },
  previewTopBar: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewCounter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  previewCloseBtn: {
    padding: 8,
  },
  previewThumbRow: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 6,
  },
  previewThumbActive: {
    borderColor: "#FFFFFF",
  },
  previewThumbImage: {
    width: "100%",
    height: "100%",
  },
});
