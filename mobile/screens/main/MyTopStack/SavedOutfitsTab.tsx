import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../../components/Icon';
import { outfitService } from '../../../src/services/outfitService';
import { listingsService } from '../../../src/services/listingsService';
import type { SavedOutfit } from '../../../src/services/outfitService';
import type { ListingItem } from '../../../types/shop';

type OutfitWithItems = SavedOutfit & {
  base_item?: ListingItem;
  top_item?: ListingItem;
  bottom_item?: ListingItem;
  shoe_item?: ListingItem;
  accessory_items?: ListingItem[];
};

export default function SavedOutfitsTab() {
  const navigation = useNavigation();
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listingCache = useRef<Map<number, ListingItem | null>>(new Map());

  const fetchListingDetails = useCallback(async (listingId: number): Promise<ListingItem | null> => {
    if (listingCache.current.has(listingId)) {
      return listingCache.current.get(listingId) ?? null;
    }

    try {
      const listing = await listingsService.getListingById(String(listingId));
      listingCache.current.set(listingId, listing);
      return listing;
    } catch (error) {
      console.error('❌ Error fetching listing:', listingId, error);
      listingCache.current.set(listingId, null);
      return null;
    }
  }, []);

  const fetchSavedOutfits = useCallback(async (isRefresh = false, clearCache = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // ✅ 如果 clearCache 为 true，清空缓存以确保获取最新数据
      if (clearCache) {
        listingCache.current.clear();
      }

      const outfitsData = await outfitService.getSavedOutfits();
      console.log('📖 Fetched', outfitsData.length, 'outfits');

      const outfitsWithItems = await Promise.all(
        outfitsData.map(async (outfit) => {
          const [base_item, top_item, bottom_item, shoe_item] = await Promise.all([
            outfit.base_item_id ? fetchListingDetails(outfit.base_item_id) : null,
            outfit.top_item_id ? fetchListingDetails(outfit.top_item_id) : null,
            outfit.bottom_item_id ? fetchListingDetails(outfit.bottom_item_id) : null,
            outfit.shoe_item_id ? fetchListingDetails(outfit.shoe_item_id) : null,
          ]);

          const accessory_items = await Promise.all(
            outfit.accessory_ids.map(id => fetchListingDetails(id))
          );

          return {
            ...outfit,
            base_item: base_item || undefined,
            top_item: top_item || undefined,
            bottom_item: bottom_item || undefined,
            shoe_item: shoe_item || undefined,
            accessory_items: accessory_items.filter((item): item is ListingItem => item !== null),
          };
        })
      );

      setOutfits(outfitsWithItems);
      console.log('✅ Loaded outfits with item details');
    } catch (error) {
      console.error('❌ Error fetching saved outfits:', error);
      Alert.alert('Error', 'Failed to load saved outfits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchListingDetails]);

  // 组件挂载时加载数据（仅一次）
  useEffect(() => {
    fetchSavedOutfits(false, false);
  }, [fetchSavedOutfits]);

  // 下拉刷新处理
  const onRefresh = useCallback(() => {
    fetchSavedOutfits(true, true);
  }, [fetchSavedOutfits]);

  // ✅ 导航到 ViewOutfitScreen
  const handleViewOutfit = useCallback((outfit: OutfitWithItems) => {
    if (!outfit.base_item) {
      Alert.alert('Error', 'Cannot view outfit: base item not found');
      return;
    }

    // 准备 ViewOutfitScreen 需要的参数
    const baseItem = outfit.base_item;
    const top = outfit.top_item || null;
    const bottom = outfit.bottom_item || null;
    const shoe = outfit.shoe_item || null;
    const accessories = outfit.accessory_items || [];

    // 构建 selection（BagItem[]）
    const allItems: ListingItem[] = [];
    if (top) allItems.push(top);
    if (bottom) allItems.push(bottom);
    if (shoe) allItems.push(shoe);
    allItems.push(...accessories);

    const unique = new Map<string, ListingItem>();
    allItems.forEach((item) => {
      if (item) unique.set(item.id, item);
    });
    const selection = Array.from(unique.values()).map((item) => ({ item, quantity: 1 }));

    // 获取根导航器
    let rootNavigation: any = navigation;
    let current: any = navigation;
    while (current?.getParent?.()) {
      current = current.getParent();
      if (current) {
        rootNavigation = current;
      }
    }

    console.log('👁️ Navigating to ViewOutfit:', outfit.outfit_name);
    rootNavigation?.navigate('Buy', {
      screen: 'ViewOutfit',
      params: {
        baseItem,
        top,
        bottom,
        shoe,
        accessories,
        selection,
        outfitName: outfit.outfit_name, // ✅ 传入 outfit name
        outfitId: outfit.id, // ✅ 传入 outfit ID
        aiRating: outfit.ai_rating, // ✅ 传入已保存的 AI rating
        styleName: outfit.style_name, // ✅ 传入已保存的 style name
        colorHarmonyScore: outfit.color_harmony_score, // ✅ 传入 color harmony score
        colorHarmonyFeedback: outfit.color_harmony_feedback, // ✅ 传入 color harmony feedback
        styleTips: outfit.style_tips, // ✅ 传入 style tips
        vibe: outfit.vibe, // ✅ 传入 vibe
      },
    });
  }, [navigation]);

  const handleDeleteOutfit = async (outfitId: number) => {
    Alert.alert('Delete Outfit', 'Are you sure you want to delete this outfit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await outfitService.deleteOutfit(outfitId);
            setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
            Alert.alert('Success', 'Outfit deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete outfit');
          }
        },
      },
    ]);
  };

  // ✅ 处理点击 listing 图片，导航到详情页
  const handleListingPress = useCallback(
    (item: ListingItem) => {
      if (!item || !item.id) {
        console.warn('⚠️ Cannot navigate: invalid listing item');
        return;
      }

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
      const listingId = String(item.id);
      console.log('🔍 Navigating to ListingDetail with lazy loading, listingId:', listingId);
      requestAnimationFrame(() => {
        rootNavigation?.navigate('Buy', {
          screen: 'ListingDetail',
          params: { listingId },
        });
      });
    },
    [navigation]
  );

  // ⭐ NEW: Helper to render match percentage badge
  const getMatchBadge = (score: number | undefined) => {
    if (!score || score === 0) return null;
    
    let badgeColor = '#4CAF50'; // Green for high match
    let starColor = '#FFD700';  // Gold star
    
    if (score < 70) {
      badgeColor = '#FF9800'; // Orange for medium match
      starColor = '#FFA500';
    }
    if (score < 50) {
      badgeColor = '#9E9E9E'; // Gray for low match
      starColor = '#BDBDBD';
    }
    
    return (
      <View style={[styles.matchBadge, { backgroundColor: badgeColor }]}>
        <Icon name="star" size={10} color={starColor} />
        <Text style={styles.matchBadgeText}>{Math.round(score)}%</Text>
      </View>
    );
  };

  const renderItemImage = (item?: ListingItem, label?: string, matchScore?: number | null) => {
    if (!item) return null;

    const primaryImage = Array.isArray(item.images) && item.images.length > 0
      ? item.images[0]
      : 'https://via.placeholder.com/150';

    const displayScore = typeof matchScore === 'number' ? matchScore : undefined;

    return (
      <TouchableOpacity 
        style={styles.itemContainer}
        onPress={() => handleListingPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: primaryImage }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          {/* ⭐ NEW: Show match badge if score exists */}
          {displayScore && displayScore > 0 && (
            <View style={styles.badgeContainer}>
              {getMatchBadge(displayScore)}
            </View>
          )}
        </View>
        {label && <Text style={styles.itemLabel}>{label}</Text>}
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        {/* ⭐ NEW: Show price */}
        <Text style={styles.itemPrice}>${item.price.toFixed(0)}</Text>
      </TouchableOpacity>
    );
  };


  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={[styles.emptySubtext, { marginTop: 12 }]}>Loading your outfits...</Text>
      </View>
    );
  }

  if (outfits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No saved outfits yet</Text>
        <Text style={styles.emptySubtext}>
          Create your first outfit using Mix & Match!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={outfits}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
            colors={["#000"]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.outfitCard}
            onPress={() => handleViewOutfit(item)}
            activeOpacity={0.7}
          >
            <View style={styles.outfitHeader}>
              <View style={styles.outfitInfo}>
                <View style={styles.outfitNameRow}>
                <Text style={styles.outfitName}>
                    {item.outfit_name || 'Unnamed Outfit'}
                  </Text>
                  {/* ⭐ NEW: Show AI rating if available */}
                  {item.ai_rating && item.ai_rating > 0 && (
                    <View style={styles.ratingBadge}>
                      <Icon name="star" size={12} color="#FFD700" />
                      <Text style={styles.ratingText}>{item.ai_rating}/10</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.outfitDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteOutfit(item.id);
                }}
                style={styles.deleteButton}
              >
                <Icon name="trash-outline" size={20} color="#FF4D4D" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.itemsScroll}
            >
              {/* Don't show base_item since it's already included in top/bottom/shoe */}
              {item.top_item && renderItemImage(item.top_item, 'Top', item.top_match_score)}
              {item.bottom_item && renderItemImage(item.bottom_item, 'Bottom', item.bottom_match_score)}
              {item.shoe_item && renderItemImage(item.shoe_item, 'Shoes', item.shoe_match_score)}
              {item.accessory_items?.map((acc, idx) => (
                <View key={`accessory-${acc.id}-${idx}`}>
                  {renderItemImage(
                    acc,
                    `Accessory ${idx + 1}`,
                    item.accessory_match_scores?.[String(acc.id)]
                  )}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  outfitCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  outfitInfo: {
    flex: 1,
  },
  // ⭐ NEW: Row for outfit name + rating
  outfitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  outfitName: {
    fontSize: 18,
    fontWeight: '600',
  },
  // ⭐ NEW: Rating badge next to outfit name
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  outfitDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  itemsScroll: {
    marginTop: 8,
  },
  itemContainer: {
    marginRight: 12,
    width: 100,
    paddingBottom: 8,
  },
  // ⭐ NEW: Wrapper for image with badge positioning
  imageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  // ⭐ NEW: Badge container positioned on image
  badgeContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  // ⭐ NEW: Match badge style
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  itemLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  itemTitle: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  // ⭐ NEW: Item price style
  itemPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 2,
  },
  // ⭐ NEW: Total price section in modal
  totalPriceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  totalPriceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  totalPriceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
});
