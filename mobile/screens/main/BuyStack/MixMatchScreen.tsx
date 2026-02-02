import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  InteractionManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import { API_BASE_URL } from "../../../src/config/api";
import type {
  ListingItem,
  BagItem,
  ListingCategory,
} from "../../../types/shop";
import { MOCK_LISTINGS } from "../../../mocks/shop";
import type { BuyStackParamList } from "./index";
// ✨ NEW: Import AI matching service
import { getAISuggestions, type ListingItem as AiListingItem } from "../../../services/aiMatchingService";
import { benefitsService } from "../../../src/services";
// ✨ NEW: Import dynamic category mapping
import { 
  mapCategoryToOutfitType, 
  filterItemsByOutfitType,
  type OutfitCategoryType 
} from "../../../src/utils/categoryMapper";

const { width } = Dimensions.get("window");
const GAP = 12; // gap between cards
const FRAME_W = Math.floor(width * 0.61);
const FRAME_H = Math.floor(FRAME_W);
// keep tops and bottoms close to a square
const TB_W = Math.floor(width * 0.61);
const TB_H = Math.floor(TB_W);
// shoes are shorter rectangles
const SH_W = Math.floor(width * 0.61);
const SH_H = Math.floor(SH_W * 0.75); // ⭐ INCREASED from 0.56 to 0.75 to show full shoe
const H_PADDING = 16;
const ACCESSORY_COLUMNS = 2;
const ACCESSORY_GAP = 12;
const ACC_W = Math.floor(
  (width - H_PADDING * 2 - ACCESSORY_GAP) / ACCESSORY_COLUMNS
);
const ACC_H = Math.floor(ACC_W * 1.08);

type MatchResult = {
  baseCategory: OutfitCategoryType;
  tops: ListingItem[];
  bottoms: ListingItem[];
  footwear: ListingItem[];
  accessories: ListingItem[];
  fallback: ListingItem[];
};

const clampIndex = (index: number, length: number) => {
  if (length <= 0) return 0;
  if (length === 1) return 0;
  if (index < 0) return 0;
  if (index > length - 1) return length - 1;
  return index;
};

/**
 * 将Outfit类型转换为ListingCategory（用于兼容旧代码）
 */
function outfitTypeToCategory(type: OutfitCategoryType): ListingCategory {
  const mapping: Record<OutfitCategoryType, ListingCategory> = {
    'tops': 'Tops',
    'bottoms': 'Bottoms',
    'shoes': 'Footwear',
    'accessories': 'Accessories',
    'dresses': 'Tops', // Dresses可以归类为Tops用于显示
    'other': 'Tops', // 默认
  };
  return mapping[type] || 'Tops';
}

// ✅ 使用动态category mapping，不再硬编码
function findMatches(base: ListingItem, allListings: ListingItem[]): MatchResult {
  const baseOutfitType = mapCategoryToOutfitType(base.category);
  const others = allListings.filter((item) => item.id !== base.id);
  const fallback = others.length ? others : [base];
  
  return {
    baseCategory: baseOutfitType,
    tops: filterItemsByOutfitType(others, 'tops'),
    bottoms: filterItemsByOutfitType(others, 'bottoms'),
    footwear: filterItemsByOutfitType(others, 'shoes'),
    accessories: filterItemsByOutfitType(others, 'accessories'),
    fallback,
  };
}

/**
 * 标准化category用于AI服务（保持兼容性）
 */
const normalizeCategoryForAI = (item: ListingItem): string => {
  const outfitType = mapCategoryToOutfitType(item.category);
  // 将outfit type转换回category名称用于AI
  const categoryMap: Record<OutfitCategoryType, string> = {
    'tops': 'tops',
    'bottoms': 'bottoms',
    'shoes': 'shoes',
    'accessories': 'accessories',
    'dresses': 'tops', // Dresses可以作为tops处理
    'other': item.category?.toLowerCase() || 'tops',
  };
  return categoryMap[outfitType] || 'tops';
};

const toAiListingItem = (item: ListingItem): AiListingItem => ({
  id: item.id,
  title: item.title,
  category: normalizeCategoryForAI(item),
  price: item.price ?? 0,
  images: Array.isArray(item.images) ? item.images : item.images ? [item.images] : [],
  tags: item.tags ?? [],
  color: item.material ?? undefined,
  material: item.material ?? undefined,
  style: item.gender ?? undefined,
});

const mapAiCategoryToListingCategory = (category?: string): ListingCategory | null => {
  if (!category) return null;
  const outfitType = mapCategoryToOutfitType(category);
  return outfitTypeToCategory(outfitType);
};

const createFallbackSeller = (image?: string) => ({
  id: undefined,
  name: "TOP Seller",
  avatar: image ?? "",
  rating: 0,
  sales: 0,
});

const enrichSuggestionFromSource = (
  suggestion: AiListingItem,
  source: ListingItem[]
): ListingItem => {
  const existing = source.find((item) => item.id === suggestion.id);
  if (existing) {
    return existing;
  }

  return {
    id: suggestion.id,
    title: suggestion.title,
    price: suggestion.price ?? 0,
    description: "",
    brand: null,
    size: null,
    condition: null,
    material: suggestion.material ?? null,
    gender: null,
    tags: suggestion.tags ?? [],
    images: suggestion.images ?? [],
    category: mapAiCategoryToListingCategory(suggestion.category),
    shippingOption: null,
    shippingFee: null,
    location: null,
    likesCount: 0,
    createdAt: undefined,
    updatedAt: undefined,
    listed: undefined,
    sold: undefined,
    quantity: null,
    availableQuantity: undefined,
    seller: createFallbackSeller(suggestion.images?.[0]),
    orderStatus: null,
    orderId: null,
    orderQuantity: null,
    buyerId: null,
    sellerId: null,
    conversationId: null,
  };
};

export default function MixMatchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyStackParamList>>();
  const route = useRoute<RouteProp<BuyStackParamList, "MixMatch">>();
  const baseItem = route.params.baseItem;
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const usageTrackedRef = useRef(false);
  const usageAlertShownRef = useRef(false);
  const [usageStatus, setUsageStatus] = useState<"pending" | "allowed" | "denied">("pending");
  const [usageMessage, setUsageMessage] = useState<string | null>(null);

  // ✅ Fetch real listings from API
  const [realListings, setRealListings] = useState<ListingItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // ✨ NEW: AI Suggestions state
  const [suggestedTops, setSuggestedTops] = useState<ListingItem[]>([]);
  const [suggestedBottoms, setSuggestedBottoms] = useState<ListingItem[]>([]);
  const [suggestedShoes, setSuggestedShoes] = useState<ListingItem[]>([]);
  const [suggestedAccessories, setSuggestedAccessories] = useState<ListingItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [aiSuggestionsReady, setAiSuggestionsReady] = useState(false);
  
  // ⭐ NEW: Store AI match scores for display
  const [topScores, setTopScores] = useState<Map<string, number>>(new Map());
  const [bottomScores, setBottomScores] = useState<Map<string, number>>(new Map());
  const [shoeScores, setShoeScores] = useState<Map<string, number>>(new Map());
  const [accessoryScores, setAccessoryScores] = useState<Map<string, number>>(new Map());

  // ✅ CRITICAL: All useState hooks MUST be before any conditional returns
  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [shoeIndex, setShoeIndex] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<string[]>([]);
  const [tipVisible, setTipVisible] = useState(true);
  const tipTranslateY = useRef(new Animated.Value(0)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const bounceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const fadeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Record usage as soon as the screen opens
  useEffect(() => {
    let cancelled = false;

    const recordUsage = async () => {
      try {
        const result = await benefitsService.useMixMatch();
        if (cancelled) return;

        if (result.status === "limit") {
          setUsageStatus("denied");
          setUsageMessage(result.message);
          if (!usageAlertShownRef.current) {
            usageAlertShownRef.current = true;
            Alert.alert(
              "Mix & Match limit reached",
              result.message,
              [
                {
                  text: "OK",
                  onPress: () => navigation.goBack(),
                },
              ],
              { cancelable: false }
            );
          } else {
            navigation.goBack();
          }
        } else {
          setUsageMessage(null);
          setUsageStatus("allowed");
        }
      } catch (err) {
        console.error("❌ Failed to record Mix & Match usage:", err);
        if (cancelled) return;

        const message = "Mix & Match is temporarily unavailable. Please try again later.";
        setUsageStatus("denied");
        setUsageMessage(message);
        if (!usageAlertShownRef.current) {
          usageAlertShownRef.current = true;
          Alert.alert(
            "Mix & Match unavailable",
            message,
            [
              {
                text: "OK",
                onPress: () => navigation.goBack(),
              },
            ],
            { cancelable: false }
          );
        } else {
          navigation.goBack();
        }
      }
    };

    if (!usageTrackedRef.current) {
      usageTrackedRef.current = true;
      recordUsage();
    }

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  // ✅ Fetch listings from API
  useEffect(() => {
    if (usageStatus !== "allowed") {
      return;
    }

    const fetchListings = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        console.log('🔍 Fetching all listings for Mix & Match...');
        
        const apiBaseUrl = API_BASE_URL.replace(/\/+$/, ''); // 移除末尾的斜杠
        const response = await fetch(
          `${apiBaseUrl}/api/listings?limit=100`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        const listings = result.data?.items || [];
        
        console.log('✅ Fetched', listings.length, 'listings for Mix & Match');

        // Convert to ListingItem format
        const formatted: ListingItem[] = listings.map((item: any) => {
          const images: string[] =
            item.images ??
            item.image_urls ??
            (item.image_url ? [item.image_url] : []);

          const seller =
            item.seller && typeof item.seller === "object"
              ? {
                  id: item.seller.id,
                  name: item.seller.name ?? "Seller",
                  avatar: item.seller.avatar ?? "",
                  rating: item.seller.rating ?? 0,
                  sales: item.seller.sales ?? 0,
                  isPremium: item.seller.isPremium,
                }
              : createFallbackSeller(images[0]);

          return {
            id: String(item.id),
            title: item.title || item.name || "Unknown Item",
            price: Number(item.price) || 0,
            description: item.description ?? "",
            brand: item.brand ?? null,
            size: item.size ?? null,
            condition: item.condition ?? null,
            material: item.material ?? null,
            gender: item.gender ?? null,
            tags: item.tags ?? [],
            images,
            category: (item.category as ListingCategory) ?? null,
            shippingOption: item.shippingOption ?? null,
            shippingFee: item.shippingFee ?? null,
            location: item.location ?? null,
            likesCount: item.likesCount ?? 0,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            listed: item.listed,
            sold: item.sold,
            quantity: item.quantity ?? null,
            availableQuantity: item.availableQuantity,
            seller,
            orderStatus: item.orderStatus ?? null,
            orderId: item.orderId ?? null,
            orderQuantity: item.orderQuantity ?? null,
            buyerId: item.buyerId ?? null,
            sellerId: item.sellerId ?? null,
            conversationId: item.conversationId ?? null,
          };
        });

        setRealListings(formatted);
      } catch (error) {
        console.error('❌ Failed to fetch listings for Mix & Match:', error);
        // Fallback to mock listings if API fails
        console.log('⚠️ Using MOCK_LISTINGS as fallback');
        setRealListings(MOCK_LISTINGS);
      } finally {
        setLoadingListings(false);
      }
    };

    fetchListings();
  }, [usageStatus]);

  // ✨ NEW: Fetch AI suggestions when baseItem and listings are ready
  const fetchAISuggestions = useCallback(async () => {
    if (!baseItem || realListings.length === 0 || loadingListings) return;

    setLoadingSuggestions(true);
    setAiSuggestionsReady(false);
    console.log('🤖 Getting AI suggestions for:', baseItem.title);

    try {
      const suggestions = await getAISuggestions(
        toAiListingItem(baseItem),
        realListings.map(toAiListingItem)
      );

      const convertSuggestions = (items: AiListingItem[]) =>
        items.map((item) => enrichSuggestionFromSource(item, realListings));

      setSuggestedTops(convertSuggestions(suggestions.tops));
      setSuggestedBottoms(convertSuggestions(suggestions.bottoms));
      setSuggestedShoes(convertSuggestions(suggestions.shoes));
      setSuggestedAccessories(convertSuggestions(suggestions.accessories));
      
      // ⭐ NEW: Save the match scores for display
      setTopScores(suggestions.topScores);
      setBottomScores(suggestions.bottomScores);
      setShoeScores(suggestions.shoeScores);
      setAccessoryScores(suggestions.accessoryScores);
      
      setAiSuggestionsReady(true);
      
      console.log('✅ AI suggestions loaded!');
      console.log('   - Tops:', suggestions.tops.length);
      console.log('   - Bottoms:', suggestions.bottoms.length);
      console.log('   - Shoes:', suggestions.shoes.length);
      console.log('   - Accessories:', suggestions.accessories.length);
    } catch (error) {
      console.error('❌ Failed to get AI suggestions:', error);
      setAiSuggestionsReady(false);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [baseItem, realListings, loadingListings]);

  // ✨ NEW: Trigger AI suggestions when listings are loaded
  useEffect(() => {
    if (baseItem && realListings.length > 0 && !loadingListings) {
      fetchAISuggestions();
    }
  }, [baseItem, realListings.length, loadingListings, fetchAISuggestions]);

  useEffect(() => {
    if (!tipVisible) return;
    tipTranslateY.setValue(0);
    tipOpacity.setValue(1);

    const startAnimations = () => {
      const bounce = Animated.sequence([
        Animated.timing(tipTranslateY, {
          toValue: -28,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tipTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      bounceAnimRef.current = bounce;
      bounce.start();

      // Schedule fade-out after short delay
      fadeTimeoutRef.current = setTimeout(() => {
        const fade = Animated.timing(tipOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        });
        fadeAnimRef.current = fade;
        fade.start(({ finished }) => {
          if (fadeAnimRef.current === fade) fadeAnimRef.current = null;
          if (finished) setTipVisible(false);
        });
      }, 2200);

      // Hard fallback to ensure dismissal even if animations are interrupted
      hardHideTimeoutRef.current = setTimeout(() => {
        setTipVisible(false);
      }, 4000);
    };

    // Start after JS interactions settle to avoid being canceled on mount
    const i = InteractionManager.runAfterInteractions(startAnimations);

    return () => {
      i.cancel?.();
      bounceAnimRef.current?.stop();
      bounceAnimRef.current = null;
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (hardHideTimeoutRef.current) {
        clearTimeout(hardHideTimeoutRef.current);
        hardHideTimeoutRef.current = null;
      }
      fadeAnimRef.current?.stop();
      fadeAnimRef.current = null;
    };
  }, [tipVisible, tipTranslateY, tipOpacity]);

  useEffect(() => {
    setTopIndex(0);
    setBottomIndex(0);
    setShoeIndex(0);
    setSelectedAccessoryIds([]);
    bounceAnimRef.current?.stop();
    bounceAnimRef.current = null;
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    fadeAnimRef.current?.stop();
    fadeAnimRef.current = null;
    tipTranslateY.setValue(0);
    tipOpacity.setValue(1);
    setTipVisible(true);
  }, [
    baseItem.id,
    tipTranslateY,
    tipOpacity,
  ]);

  // ✅ FIXED: Now uses realListings instead of MOCK_LISTINGS
  const matches = useMemo(
    () => findMatches(baseItem, realListings),
    [baseItem, realListings]
  );
  
  const { baseCategory, tops, bottoms, footwear, accessories, fallback } = matches;

  // ✨ NEW: Use AI-suggested items if ready, otherwise use regular matches
  const displayTops = aiSuggestionsReady && suggestedTops.length > 0 ? suggestedTops : tops;
  const displayBottoms = aiSuggestionsReady && suggestedBottoms.length > 0 ? suggestedBottoms : bottoms;
  const displayShoes = aiSuggestionsReady && suggestedShoes.length > 0 ? suggestedShoes : footwear;
  const displayAccessories = aiSuggestionsReady && suggestedAccessories.length > 0 ? suggestedAccessories : accessories;

  const ensurePool = (pool: ListingItem[]) => (pool.length ? pool : fallback);
  const topPool = ensurePool(displayTops);
  const bottomPool = ensurePool(displayBottoms);
  const shoePool = ensurePool(displayShoes);

  const pickFromPool = (pool: ListingItem[], index: number) => {
    if (!pool.length) return undefined;
    const safeIndex = clampIndex(index, pool.length);
    return pool[safeIndex];
  };

  const topPoolLength = topPool.length;
  const bottomPoolLength = bottomPool.length;
  const shoePoolLength = shoePool.length;

  useEffect(() => {
    setTopIndex((prev) => clampIndex(prev, topPoolLength));
  }, [topPoolLength]);

  useEffect(() => {
    setBottomIndex((prev) => clampIndex(prev, bottomPoolLength));
  }, [bottomPoolLength]);

  useEffect(() => {
    setShoeIndex((prev) => clampIndex(prev, shoePoolLength));
  }, [shoePoolLength]);

  const pickedTop =
    (baseCategory === "tops" || baseCategory === "dresses") ? baseItem : pickFromPool(topPool, topIndex);
  const pickedBottom =
    baseCategory === "bottoms"
      ? baseItem
      : pickFromPool(bottomPool, bottomIndex);
  const pickedShoe =
    baseCategory === "shoes" ? baseItem : pickFromPool(shoePool, shoeIndex);

  const baseOutfitItems = useMemo<ListingItem[]>(() => {
    const ordered = [pickedTop, pickedBottom, pickedShoe];
    if (!ordered.some((item) => item?.id === baseItem.id)) {
      ordered.unshift(baseItem);
    }
    const unique = new Map<string, ListingItem>();
    ordered.forEach((item) => {
      if (item) unique.set(item.id, item);
    });
    return Array.from(unique.values());
  }, [pickedTop, pickedBottom, pickedShoe, baseItem]);

  const accessoryOptions = useMemo(() => {
    const taken = new Set(baseOutfitItems.map((item) => item.id));
    const filtered = displayAccessories.filter(
      (item) => !taken.has(item.id)
    );
    if (filtered.length) return filtered;
    const fallbackFiltered = fallback.filter((item) => !taken.has(item.id));
    return fallbackFiltered.length ? fallbackFiltered : displayAccessories;
  }, [baseOutfitItems, displayAccessories, fallback]);

  useEffect(() => {
    setSelectedAccessoryIds((prev) =>
      prev.filter((id) => accessoryOptions.some((item) => item.id === id))
    );
  }, [accessoryOptions]);

  const selectedAccessoryItems = useMemo(() => {
    return accessoryOptions.filter((item) =>
      selectedAccessoryIds.includes(item.id)
    );
  }, [accessoryOptions, selectedAccessoryIds]);

  const viewTop: ListingItem | null =
    ((baseCategory === "tops" || baseCategory === "dresses") ? baseItem : pickedTop) ?? null;
  const viewBottom: ListingItem | null =
    (baseCategory === "bottoms" ? baseItem : pickedBottom) ?? null;
  const viewShoe: ListingItem | null =
    (baseCategory === "shoes" ? baseItem : pickedShoe) ?? null;

  const selection = useMemo<BagItem[]>(() => {
    const allItems = [...baseOutfitItems, ...selectedAccessoryItems];
    const unique = new Map<string, ListingItem>();
    allItems.forEach((item) => {
      if (item) unique.set(item.id, item);
    });
    return Array.from(unique.values()).map((item) => ({ item, quantity: 1 }));
  }, [baseOutfitItems, selectedAccessoryItems]);

  const navigateToViewOutfit = useCallback(() => {
    navigation.navigate("ViewOutfit", {
      baseItem,
      top: viewTop,
      bottom: viewBottom,
      shoe: viewShoe,
      accessories: selectedAccessoryItems,
      selection,
      // ⭐ NEW: Pass match scores for saving
    });
  }, [
    navigation,
    baseItem,
    viewTop,
    viewBottom,
    viewShoe,
    selectedAccessoryItems,
    selection,
    topScores,
    bottomScores,
    shoeScores,
    accessoryScores,
  ]);

  const getMatchScore = useCallback(
    (slot: "tops" | "bottoms" | "footwear" | "accessory", itemId: string) => {
      if (!aiSuggestionsReady) return 0;
      if (slot === "tops") return topScores.get(itemId) ?? 0;
      if (slot === "bottoms") return bottomScores.get(itemId) ?? 0;
      if (slot === "footwear") return shoeScores.get(itemId) ?? 0;
      return accessoryScores.get(itemId) ?? 0;
    },
    [aiSuggestionsReady, topScores, bottomScores, shoeScores, accessoryScores]
  );

  const isBaseTop = baseCategory === "tops" || baseCategory === "dresses";
  const isBaseBottom = baseCategory === "bottoms";
  const isBaseShoe = baseCategory === "shoes";

  const slotConfigs = [
    {
      key: "tops" as const,
      label: "TOP",
      hint: isBaseTop ? "Locked item" : "Swipe to switch",
      isBase: isBaseTop,
      pool: topPool,
      index: topIndex,
      setIndex: setTopIndex,
      picked: pickedTop,
      frameW: TB_W,
      frameH: TB_H,
      imageMode: "contain" as const,
      matchSlot: "tops" as const,
    },
    {
      key: "bottoms" as const,
      label: "BOTTOM",
      hint: isBaseBottom ? "Locked item" : "Swipe to switch",
      isBase: isBaseBottom,
      pool: bottomPool,
      index: bottomIndex,
      setIndex: setBottomIndex,
      picked: pickedBottom,
      frameW: TB_W,
      frameH: TB_H,
      imageMode: "contain" as const,
      matchSlot: "bottoms" as const,
    },
    {
      key: "footwear" as const,
      label: "SHOES",
      hint: isBaseShoe ? "Locked item" : "Swipe to switch",
      isBase: isBaseShoe,
      pool: shoePool,
      index: shoeIndex,
      setIndex: setShoeIndex,
      picked: pickedShoe,
      frameW: SH_W,
      frameH: SH_H,
      imageMode: "cover" as const,
      matchSlot: "footwear" as const,
    },
  ];

  const toggleLike = useCallback((id: string) => {
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openListing = useCallback(
    (item: ListingItem) => {
      // ✅ Use lazy loading: only pass listingId
      if (!item?.id) {
        console.warn("⚠️ Cannot navigate: invalid listing item");
        return;
      }
      navigation.navigate("ListingDetail", { listingId: String(item.id) });
    },
    [navigation]
  );

  const handleAccessoryToggle = useCallback((id: string) => {
    setSelectedAccessoryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const aiToastOpacity = useRef(new Animated.Value(0)).current;
  const aiToastTranslate = useRef(new Animated.Value(-16)).current;
  const [aiToast, setAiToast] = useState<{ message: string; loading?: boolean } | null>(null);
  const aiToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hideAiToast = useCallback(() => {
    if (aiToastTimerRef.current) {
      clearTimeout(aiToastTimerRef.current);
      aiToastTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(aiToastOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(aiToastTranslate, {
        toValue: -16,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAiToast((current) => (current ? null : current));
    });
  }, [aiToastOpacity, aiToastTranslate]);

  const showAiToast = useCallback(
    (message: string, { loading, autoHide }: { loading?: boolean; autoHide?: boolean } = {}) => {
      if (aiToastTimerRef.current) {
        clearTimeout(aiToastTimerRef.current);
        aiToastTimerRef.current = null;
      }
      setAiToast({ message, loading });
      aiToastTranslate.setValue(-16);
      Animated.parallel([
        Animated.timing(aiToastOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(aiToastTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
      ]).start();

      if (autoHide) {
        aiToastTimerRef.current = setTimeout(() => {
          hideAiToast();
        }, 2400);
      }
    },
    [aiToastOpacity, aiToastTranslate, hideAiToast]
  );

  useEffect(() => {
    return () => {
      if (aiToastTimerRef.current) {
        clearTimeout(aiToastTimerRef.current);
        aiToastTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (loadingSuggestions) {
      showAiToast("AI suggesting matches...", { loading: true, autoHide: false });
      return;
    }
    if (aiSuggestionsReady) {
      showAiToast("AI-curated suggestions ✨", { autoHide: true });
      return;
    }
    hideAiToast();
  }, [loadingSuggestions, aiSuggestionsReady, showAiToast, hideAiToast]);

  if (usageStatus !== "allowed") {
    const message =
      usageStatus === "pending"
        ? "Checking Mix & Match availability..."
        : usageMessage ?? "Mix & Match unavailable.";

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Mix & Match" showBack />
        <View style={styles.loadingContainer}>
          {usageStatus === "pending" && (
            <ActivityIndicator size="large" color="#000" />
          )}
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    );
  }

  if (loadingListings) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Mix & Match" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Mix & Match" showBack />
      {aiToast && (
        <Animated.View
          style={[
            styles.aiToast,
            {
              top: insets.top + 16,
              opacity: aiToastOpacity,
              transform: [{ translateY: aiToastTranslate }],
            },
          ]}
        >
          {aiToast.loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="sparkles" size={16} color="#FFD700" />
          )}
          <Text style={styles.aiToastText}>{aiToast.message}</Text>
        </Animated.View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {slotConfigs.map((slot) => (
          <View key={slot.key} style={styles.slotSection}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotLabel}>{slot.label}</Text>
              <Text style={styles.slotHint}>{slot.hint}</Text>
            </View>
            {slot.isBase && slot.picked ? (
              <View style={styles.fixedCardWrapper}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => openListing(slot.picked!)}
                >
                  <FrameCardContent
                    item={slot.picked}
                    frameW={slot.frameW}
                    frameH={slot.frameH}
                    liked={likedMap[slot.picked.id]}
                    onToggleLike={toggleLike}
                    imageMode={slot.imageMode}
                    badgeLabel="BASE"
                    isActive
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <FrameCarousel
                items={slot.pool}
                index={slot.index}
                onIndexChange={slot.setIndex}
                likedMap={likedMap}
                onToggleLike={toggleLike}
                onOpen={openListing}
                frameW={slot.frameW}
                frameH={slot.frameH}
                imageMode={slot.imageMode}
                getMatchScore={getMatchScore}
                matchSlot={slot.matchSlot}
              />
            )}
          </View>
        ))}

        <View style={styles.slotSection}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotLabel}>ACCESSORIES</Text>
            <Text style={styles.slotHint}>Complete the look</Text>
          </View>
          {accessoryOptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No accessories available</Text>
            </View>
          ) : (
            <View style={styles.accessoryGrid}>
              {accessoryOptions.map((item, index) => {
                const isSelected = selectedAccessoryIds.includes(item.id);
                const isLastInRow = (index + 1) % ACCESSORY_COLUMNS === 0;
                const score = getMatchScore("accessory", item.id);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.accessoryCardWrapper,
                      !isLastInRow && styles.accessoryCardSpacer,
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => handleAccessoryToggle(item.id)}
                    >
                      <FrameCardContent
                        item={item}
                        frameW={ACC_W}
                        frameH={ACC_H}
                        liked={likedMap[item.id]}
                        onToggleLike={toggleLike}
                        imageMode="cover"
                        selectable
                        selected={isSelected}
                        onSelectPress={() => handleAccessoryToggle(item.id)}
                        matchScore={score > 0 ? score : undefined}
                        matchPosition="bottomLeft"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {tipVisible && (
        <Animated.View
          style={[
            styles.swipeTip,
            {
              bottom: insets.bottom + 120,
              opacity: tipOpacity,
              transform: [{ translateY: tipTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.92)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tipGradient}
          >
            <View style={styles.tipContent}>
              <Icon name="arrow-back" size={18} color="#fff" />
              <Text style={styles.tipText}>Swipe to change items</Text>
              <Icon name="arrow-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={styles.viewOutfitButton}
          onPress={navigateToViewOutfit}
          activeOpacity={0.9}
        >
          <Text style={styles.viewOutfitButtonText}>View Outfit</Text>
          <Icon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FrameCardContent({
  item,
  frameW,
  frameH,
  liked,
  onToggleLike,
  imageMode,
  badgeLabel,
  isActive,
  selectable,
  selected,
  onSelectPress,
  matchScore,
  matchPosition = "topRight",
}: {
  item: ListingItem;
  frameW: number;
  frameH: number;
  liked?: boolean;
  onToggleLike: (id: string) => void;
  imageMode: "contain" | "cover";
  badgeLabel?: string;
  isActive?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectPress?: () => void;
  matchScore?: number;
  matchPosition?: "topRight" | "bottomLeft";
}) {
  const price =
    typeof item.price === "number"
      ? item.price
      : Number.parseFloat(item.price as any) || 0;

  return (
    <View
      style={[
        styles.frame,
        { width: frameW, height: frameH },
        (isActive || selected) && styles.frameActive,
      ]}
    >
      <Image
        source={{ uri: item.images[0] }}
        style={styles.frameImage}
        resizeMode={imageMode}
      />
      <View style={styles.priceTag}>
        <Text style={styles.priceTagText}>${price.toFixed(0)}</Text>
      </View>
      {badgeLabel ? (
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
      {typeof matchScore === "number" && matchScore > 0 && (
        <View
          style={[
            styles.matchBadge,
            matchPosition === "bottomLeft"
              ? styles.matchBadgeBottomLeft
              : styles.matchBadgeTopRight,
          ]}
        >
          <Icon name="star" size={12} color="#FFD700" />
          <Text style={styles.matchBadgeText}>{Math.round(matchScore)}%</Text>
        </View>
      )}
      {selectable ? (
        <TouchableOpacity
          style={[
            styles.selectTag,
            selected ? styles.selectTagActive : null,
          ]}
          onPress={onSelectPress}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.selectTagText,
              selected ? styles.selectTagTextActive : null,
            ]}
          >
            {selected ? "Selected" : "Select"}
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={() => onToggleLike(item.id)}
        style={styles.heartBtn}
        activeOpacity={0.85}
      >
        <Icon
          name={liked ? "heart" : "heart-outline"}
          size={22}
          color={liked ? "#F54B3D" : "#111"}
        />
      </TouchableOpacity>
    </View>
  );
}

function FrameCarousel({
  items,
  index,
  onIndexChange,
  likedMap,
  onToggleLike,
  onOpen,
  frameW,
  frameH,
  imageMode,
  getMatchScore,
  matchSlot,
}: {
  items: ListingItem[];
  index: number;
  onIndexChange: (value: number) => void;
  likedMap: Record<string, boolean>;
  onToggleLike: (id: string) => void;
  onOpen: (item: ListingItem) => void;
  frameW: number;
  frameH: number;
  imageMode: "contain" | "cover";
  getMatchScore: (slot: "tops" | "bottoms" | "footwear", itemId: string) => number;
  matchSlot: "tops" | "bottoms" | "footwear";
}) {
  const listRef = useRef<FlatList<ListingItem>>(null);
  const activeIndex = items.length ? Math.min(index, items.length - 1) : 0;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const page = Math.round(x / (frameW + GAP));
    if (page !== index) onIndexChange(page);
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems[0]?.index != null) {
        onIndexChange(viewableItems[0].index);
      }
    }
  ).current;

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < (items?.length ?? 0) - 1;
  const availableWidth = Math.max(frameW, width - H_PADDING * 2);
  const sidePadding = Math.max(0, Math.floor((availableWidth - frameW) / 2));

  const scrollTo = (i: number) => {
    try {
      listRef.current?.scrollToIndex({ index: i, animated: true });
    } catch {
      const offset = i * (frameW + GAP);
      listRef.current?.scrollToOffset({ offset, animated: true });
    }
  };

  const goPrev = () => {
    if (!canPrev) return;
    const nextIdx = activeIndex - 1;
    onIndexChange(nextIdx);
    scrollTo(nextIdx);
  };

  const goNext = () => {
    if (!canNext) return;
    const nextIdx = activeIndex + 1;
    onIndexChange(nextIdx);
    scrollTo(nextIdx);
  };

  return (
    <View style={styles.carouselWrap}>
      <FlatList
        ref={listRef}
        horizontal
        data={items}
        keyExtractor={(it) => it.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={frameW + GAP}
        decelerationRate="fast"
        bounces={false}
        initialScrollIndex={activeIndex}
        getItemLayout={(_, i) => ({
          length: frameW + GAP,
          offset: i * (frameW + GAP),
          index: i,
        })}
        contentContainerStyle={{
          paddingHorizontal: sidePadding,
          paddingVertical: 8,
        }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        onMomentumScrollEnd={onMomentumEnd}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item, index: itemIndex }) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onOpen(item)}>
            <FrameCardContent
              item={item}
              frameW={frameW}
              frameH={frameH}
              liked={likedMap[item.id]}
              onToggleLike={onToggleLike}
              imageMode={imageMode}
              matchScore={getMatchScore(matchSlot, item.id)}
              isActive={itemIndex === activeIndex}
            />
          </TouchableOpacity>
        )}
      />

      {canPrev && (
        <TouchableOpacity
          style={[styles.edgeMask, { left: 0 }]}
          activeOpacity={0.8}
          onPress={goPrev}
          hitSlop={{ left: 6, right: 6, top: 6, bottom: 6 }}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.98)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.edgeMaskBg}
          />
          <Icon name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>
      )}
      {canNext && (
        <TouchableOpacity
          style={[styles.edgeMask, { right: 0 }]}
          activeOpacity={0.8}
          onPress={goNext}
          hitSlop={{ left: 6, right: 6, top: 6, bottom: 6 }}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.98)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.edgeMaskBg}
          />
          <Icon name="chevron-forward" size={22} color="#111" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  aiToast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(17,17,17,0.95)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 30,
  },
  aiToastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  slotSection: {
    rowGap: 12,
    paddingHorizontal: H_PADDING,
    marginTop: 28,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  slotHint: {
    fontSize: 12,
    color: "#7a7a7a",
  },
  fixedCardWrapper: {
    alignItems: "center",
    width: "100%",
  },
  carouselWrap: {
    position: "relative",
    width: Math.max(FRAME_W, width - H_PADDING * 2),
    alignSelf: "center",
  },
  frame: {
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  frameActive: {
    borderColor: "#111",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  frameImage: {
    width: "100%",
    height: "100%",
  },
  priceTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  priceTagText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
  },
  badgePill: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.6,
  },
  matchBadge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(17,17,17,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeTopRight: {
    top: 10,
    right: 10,
  },
  matchBadgeBottomLeft: {
    bottom: 10,
    left: 10,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  selectTag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#d5d5d5",
  },
  selectTagActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  selectTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#111",
    letterSpacing: 0.4,
  },
  selectTagTextActive: {
    color: "#fff",
  },
  heartBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  edgeMask: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  edgeMaskBg: {
    ...StyleSheet.absoluteFillObject,
  },
  accessoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  accessoryCardWrapper: {
    width: ACC_W,
    marginBottom: ACCESSORY_GAP,
  },
  accessoryCardSpacer: {
    marginRight: ACCESSORY_GAP,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  viewOutfitButton: {
    backgroundColor: "#111",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  viewOutfitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  swipeTip: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  tipGradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
