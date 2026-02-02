import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import Icon from "../../../components/Icon";
import { likesService, LikedListing } from "../../../src/services";
import { useNavigation } from "@react-navigation/native";

// 保证三列对齐
function formatData(data: any[], numColumns: number) {
  const numberOfFullRows = Math.floor(data.length / numColumns);
  let numberOfElementsLastRow = data.length - numberOfFullRows * numColumns;

  while (
    numberOfElementsLastRow !== numColumns &&
    numberOfElementsLastRow !== 0
  ) {
    data.push({ id: `blank-${numberOfElementsLastRow}`, empty: true });
    numberOfElementsLastRow++;
  }
  return data;
}

export default function LikesTab() {
  const navigation = useNavigation();
  const [likedListings, setLikedListings] = useState<LikedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLikedListings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await likesService.getLikedListings();
      setLikedListings(data);
    } catch (err) {
      console.error('Error loading liked listings:', err);
      setError('Failed to load liked listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 组件挂载时加载数据（仅一次）
  useEffect(() => {
    loadLikedListings(false);
  }, [loadLikedListings]);

  // 下拉刷新处理
  const onRefresh = useCallback(() => {
    loadLikedListings(true);
  }, [loadLikedListings]);

  // 重试按钮处理
  const handleRetry = useCallback(() => {
    loadLikedListings(false);
  }, [loadLikedListings]);

  const handleItemPress = (likedListing: LikedListing) => {
    if (!likedListing?.listing?.id) {
      console.warn('⚠️ Cannot navigate: invalid listing item');
      return;
    }

    // 导航到ListingDetailScreen
    // 向上查找根导航，保证可以跳转到 Buy 栈
    let rootNavigation: any = navigation;
    let current: any = navigation;
    while (current?.getParent?.()) {
      current = current.getParent();
      if (current) {
        rootNavigation = current;
      }
    }

    // ✅ Use lazy loading: only pass listingId, let ListingDetailScreen fetch full data
    // This ensures we get complete, up-to-date data from the API
    const listingId = String(likedListing.listing.id);
    console.log('🔍 Navigating to ListingDetail with lazy loading, listingId:', listingId);
    requestAnimationFrame(() => {
      rootNavigation?.navigate("Buy", {
        screen: "ListingDetail",
        params: { listingId },
      });
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>
        You haven't liked anything yet.{"\n"}Start exploring and heart the items you love!
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (item.empty) {
      return <View style={[styles.item, styles.itemInvisible]} />;
    }

    const likedListing = item as LikedListing;
    const listing = likedListing.listing;
    
    // 处理图片URL - image_urls可能是JSON字符串
    let firstImage = listing?.image_url;
    if (!firstImage && listing?.image_urls) {
      try {
        const imageUrls = typeof listing.image_urls === 'string' 
          ? JSON.parse(listing.image_urls) 
          : listing.image_urls;
        firstImage = Array.isArray(imageUrls) ? imageUrls[0] : undefined;
      } catch (e) {
        console.log('Error parsing image_urls:', e);
        firstImage = undefined;
      }
    }
    
    // 确保有有效的图片URL
    const imageUri = firstImage && firstImage.trim() !== '' ? firstImage : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop';


    return (
      <TouchableOpacity 
        style={styles.item}
        onPress={() => handleItemPress(likedListing)}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image} 
          onError={() => console.log('Image failed to load:', imageUri)}
        />
        {/* ❤️ 喜欢标记 */}
        <View style={styles.heartIcon}>
          <Icon name="heart" size={20} color="#F54B3D" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading your likes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (likedListings.length === 0) {
    return renderEmptyState();
  }


  return (
    <View style={{ flex: 1 }}>
      {/* 图片网格 */}
      <FlatList
        data={formatData([...likedListings], 3)}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
            colors={["#000"]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    position: "relative",
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  heartIcon: {
    position: "absolute",
    right: 6,
    bottom: 6,
  },
  // 新增样式
  listContainer: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyBox: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#E6F0FF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { 
    textAlign: "center", 
    color: "#555",
    fontSize: 16,
    lineHeight: 22,
  },
});
