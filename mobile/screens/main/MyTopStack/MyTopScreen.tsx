import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  useWindowDimensions,
} from "react-native";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView as ScrollViewType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_AVATAR } from "../../../constants/assetUrls";
import Icon from "../../../components/Icon";
import Avatar from "../../../components/Avatar";
import FilterModal from "../../../components/FilterModal";
import { useFocusEffect, useNavigation, useRoute, useScrollToTop } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { MyTopStackParamList } from "./index";
import SoldTab from "./SoldTab";
import PurchasesTab from "./PurchasesTab";
import LikesTabs from "./LikesTabs";
import { useAuth } from "../../../contexts/AuthContext";
import { listingsService, premiumService } from "../../../src/services";
import { userService } from "../../../src/services/userService";
import type { ListingItem } from "../../../types/shop";
import type { UserListingsQueryParams } from "../../../src/services/listingsService";

const SORT_OPTIONS = ["Latest", "Price Low to High", "Price High to Low"] as const;
const SHOP_CONDITIONS = ["All", "Brand New", "Like New", "Good", "Fair"] as const;
const GENDER_OPTIONS = ["All", "Men", "Women", "Unisex"] as const;

const TAB_KEYS = ["Shop", "Sold", "Purchases", "Likes"] as const;
type TabKey = typeof TAB_KEYS[number];

const mapGenderOptionToApiParam = (
  value: string,
): "Men" | "Women" | "Unisex" | undefined => {
  const lower = value.toLowerCase();
  if (lower === "men") return "Men";
  if (lower === "women") return "Women";
  if (lower === "unisex") return "Unisex";
  return undefined;
};

// --- 保证 3 列对齐 ---
function formatData(data: any[], numColumns: number) {
  const newData = [...data];
  const numberOfFullRows = Math.floor(newData.length / numColumns);
  let numberOfElementsLastRow = newData.length - numberOfFullRows * numColumns;

  while (numberOfElementsLastRow !== 0 && numberOfElementsLastRow !== numColumns) {
    newData.push({ id: `blank-${numberOfElementsLastRow}`, empty: true });
    numberOfElementsLastRow++;
  }

  return newData;
}

export default function MyTopScreen() {
  const { user, updateUser } = useAuth(); // ✅ 使用全局用户状态 + 更新方法
  const navigation =
    useNavigation<NativeStackNavigationProp<MyTopStackParamList>>();
  const route = useRoute<RouteProp<MyTopStackParamList, "MyTopMain">>();
  const lastRefreshRef = useRef<number | null>(null);
  const brandPickerHandledTsRef = useRef<number | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>("Shop");
  const { width: screenWidth } = useWindowDimensions();
  const pagerRef = useRef<ScrollViewType>(null);
  const didInitialLoadRef = useRef<boolean>(false);

  const tabAnimationsRef = useRef<Record<TabKey, Animated.Value> | null>(null);
  if (!tabAnimationsRef.current) {
    tabAnimationsRef.current = TAB_KEYS.reduce(
      (acc, key) => {
        acc[key] = new Animated.Value(key === "Shop" ? 1 : 0);
        return acc;
      },
      {} as Record<TabKey, Animated.Value>,
    );
  }
  const tabAnimations = tabAnimationsRef.current as Record<TabKey, Animated.Value>;

  const [tabLayouts, setTabLayouts] = useState<Partial<Record<TabKey, { x: number; width: number }>>>({});
  const [tabTextWidths, setTabTextWidths] = useState<Partial<Record<TabKey, number>>>({});
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<any>>(null);
  const listOffsetRef = useRef(0);

  const updateIndicator = useCallback(() => {
    const layout = tabLayouts[activeTab];
    const textWidth = tabTextWidths[activeTab];
    if (!layout || !textWidth) return;

    const left = layout.x + layout.width / 2 - textWidth / 2;

    Animated.spring(indicatorLeft, {
      toValue: left,
      stiffness: 260,
      damping: 24,
      mass: 0.9,
      useNativeDriver: false,
    }).start();

    Animated.spring(indicatorWidth, {
      toValue: textWidth,
      stiffness: 260,
      damping: 24,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [activeTab, tabLayouts, tabTextWidths, indicatorLeft, indicatorWidth]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    TAB_KEYS.forEach((tab) => {
      Animated.spring(tabAnimations[tab], {
        toValue: tab === activeTab ? 1 : 0,
        stiffness: 300,
        damping: 26,
        mass: 0.9,
        useNativeDriver: false,
      }).start();
    });
  }, [activeTab, tabAnimations]);

  const handleTabLayout = useCallback((tab: TabKey, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => {
      const current = prev[tab];
      if (current && Math.abs(current.x - x) < 0.5 && Math.abs(current.width - width) < 0.5) {
        return prev;
      }
      return { ...prev, [tab]: { x, width } };
    });
  }, []);

  const handleTabTextLayout = useCallback((tab: TabKey, event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTabTextWidths((prev) => {
      const current = prev[tab];
      if (current && Math.abs(current - width) < 0.5) {
        return prev;
      }
      return { ...prev, [tab]: width };
    });
  }, []);

  const handleTabPress = useCallback(
    (tab: TabKey) => {
      if (tab === activeTab) {
        if (tab === "Shop") {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
          });
          listOffsetRef.current = 0;
        }
        return;
      }
      setActiveTab(tab);
    },
    [activeTab],
  );

  useEffect(() => {
    const index = TAB_KEYS.indexOf(activeTab);
    if (index < 0) return;

    pagerRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });

    // Do not auto scroll to top on tab change; only do so on explicit tab re-press
  }, [activeTab, screenWidth]);

  const handlePagerMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const pageIndex = Math.round(offsetX / screenWidth);
      const targetTab = TAB_KEYS[pageIndex] ?? "Shop";

      if (targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
    },
    [activeTab, screenWidth],
  );

  // ✅ 添加真实数据状态
  const [activeListingsState, setActiveListingsState] = useState<ListingItem[]>([]);
  const [inactiveListingsState, setInactiveListingsState] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ 分页状态
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTotalCount, setActiveTotalCount] = useState(0);
  const [inactiveTotalCount, setInactiveTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // ✅ 添加follow统计状态
  const [followStats, setFollowStats] = useState({
    followersCount: 0,
    followingCount: 0,
    reviewsCount: 0,
  });

  // ✅ 添加用户分类状态
  const [userCategories, setUserCategories] = useState<{ id: number; name: string; description: string; count: number }[]>([]);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]>("Latest");

  const [tempMinPrice, setTempMinPrice] = useState<string>("");
  const [tempMaxPrice, setTempMaxPrice] = useState<string>("");
  const [tempSortBy, setTempSortBy] = useState<typeof SORT_OPTIONS[number]>("Latest");

  // Category and Condition filters
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedCondition, setSelectedCondition] = useState<string>("All");
  const [tempCategory, setTempCategory] = useState<string>("All");
  const [tempCondition, setTempCondition] = useState<string>("All");
  const [selectedGender, setSelectedGender] = useState<string>("All");
  const [tempGender, setTempGender] = useState<string>("All");

  // ✅ 获取用户分类
  const fetchUserCategories = async () => {
    try {
      console.log("📖 Fetching user categories");
      const categories = await listingsService.getUserCategories();
      setUserCategories(categories);
      console.log(`✅ Loaded ${categories.length} user categories`);
    } catch (error) {
      console.error("❌ Error fetching user categories:", error);
      // 保持空数组，不显示错误
    }
  };

  // ✅ 获取用户follow统计
  const fetchFollowStats = async () => {
    try {
      console.log("👥 Fetching follow stats");
      const stats = await userService.getMyFollowStats();
      setFollowStats(stats);
      console.log(
        `✅ Loaded follow stats: ${stats.followersCount} followers, ${stats.followingCount} following, ${stats.reviewsCount} reviews`,
      );
    } catch (error) {
      console.error("❌ Error fetching follow stats:", error);
      // 保持默认值0，不显示错误
    }
  };

  // ✅ 获取并刷新当前用户资料（用于进入页面或手动刷新时同步头像/简介等）
  const refreshCurrentUser = async () => {
    try {
      const latest = await userService.getProfile();
      if (latest) {
        // 彻底避免覆盖 premium 字段：只更新非会员相关字段
        const {
          isPremium: _ip,
          is_premium: _ip2,
          premiumUntil: _pu,
          premium_until: _pu2,
          ...safeLatest
        } = (latest as any) ?? {};

        updateUser({
          ...(user as any),
          ...safeLatest,
          // 留下原有的 premium 状态不变
          isPremium: user?.isPremium ?? false,
          premiumUntil: user?.premiumUntil ?? null,
        } as any);
      }
    } catch (e) {
      // 静默失败，不打断其它刷新任务
      console.log("❌ Error refreshing current user:", e);
    }
  };

  // ✅ 获取用户listings（支持分页）
  const fetchUserListings = async (
    status: 'active' | 'sold' | 'all' | 'unlisted' = 'all',
    filters?: Partial<UserListingsQueryParams>,
    isLoadMore?: boolean
  ) => {
    try {
      console.log("📖 Fetching user listings with status:", status, "filters:", filters, "isLoadMore:", isLoadMore);

      const currentOffset = isLoadMore ? offset : 0;

      const params: UserListingsQueryParams = {
        status,
        limit: PAGE_SIZE,
        offset: currentOffset,
        ...filters,
      };

      console.log("📖 Final API params:", params);

      // When requesting "all" and it's NOT a load-more call, fetch active and unlisted separately
      // so the Inactive section has real items even if the backend doesn't return them in "all".
      if (status === 'all' && !isLoadMore) {
        const [activeRes, inactiveRes] = await Promise.all([
          listingsService.getUserListings({ ...params, status: 'active' }),
          listingsService.getUserListings({ ...params, status: 'unlisted', offset: 0 }), // no pagination for inactive
        ]);
        const activeList = activeRes.listings ?? [];
        const inactiveList = inactiveRes.listings ?? [];
        // Combine for local filtering; UI splits them again by listed flag
        setActiveListingsState(activeList);
        setInactiveListingsState(inactiveList);
        // Update totals from responses to avoid relying on default PAGE_SIZE behavior
        if (typeof activeRes.total === 'number') setActiveTotalCount(activeRes.total);
        if (typeof inactiveRes.total === 'number') setInactiveTotalCount(inactiveRes.total);
        // Pagination only applies to active items
        setHasMore(activeList.length === PAGE_SIZE);
        setOffset(PAGE_SIZE);
        console.log(`✅ Loaded ${activeList.length} active and ${inactiveList.length} inactive listings`);
        return;
      }

      const { listings, total } = await listingsService.getUserListings(params);

      if (status === 'active' || status === 'all') {
        if (isLoadMore) {
          setActiveListingsState(prev => [...prev, ...listings]);
          setOffset(currentOffset + PAGE_SIZE);
        } else {
          setActiveListingsState(listings);
          setOffset(PAGE_SIZE);
        }
        setHasMore(listings.length === PAGE_SIZE);
      } else if (status === 'unlisted') {
        // Unlisted listings are not paginated in the UI
        setInactiveListingsState(listings);
      }

      console.log(`✅ Loaded ${listings.length} ${status} listings, total: ${total}`);
      console.log("📖 Sample listing:", listings[0]);
    } catch (error) {
      console.error("❌ Error fetching user listings:", error);
      Alert.alert("Error", "Failed to load listings. Please try again.");
    }
  };

  // ✅ 获取 active 和 inactive 的总数
  const fetchListingCounts = async (filters?: Partial<UserListingsQueryParams>) => {
    try {
      // Fetch active count (use PAGE_SIZE to get correct total from backend)
      const activeResult = await listingsService.getUserListings({
        status: 'active',
        limit: 1,
        offset: 0,
        ...filters,
      });
      setActiveTotalCount(activeResult.total);

      // Fetch inactive count (use PAGE_SIZE to get correct total from backend)
      const inactiveResult = await listingsService.getUserListings({
        status: 'unlisted',
        limit: 1,
        offset: 0,
        ...filters,
      });
      setInactiveTotalCount(inactiveResult.total);

      console.log(`✅ Counts: ${activeResult.total} active, ${inactiveResult.total} inactive`);
    } catch (error) {
      console.error("❌ Error fetching listing counts:", error);
    }
  };

  // ✅ 使用指定值应用filter（避免状态更新延迟）
  const applyFiltersWithValues = async (
    category: string,
    condition: string,
    genderValue: string,
    minPriceValue: string,
    maxPriceValue: string,
    sortByValue: string
  ) => {
    setLoading(true);

    try {
      const filters: Partial<UserListingsQueryParams> = {};
      
      if (category !== "All") {
        filters.category = category;
      }
      
      if (condition !== "All") {
        filters.condition = condition;
      }

      const apiGender = mapGenderOptionToApiParam(genderValue);
      if (apiGender) {
        filters.gender = apiGender;
      }

      if (minPriceValue) {
        filters.minPrice = parseFloat(minPriceValue);
      }

      if (maxPriceValue) {
        filters.maxPrice = parseFloat(maxPriceValue);
      }
      
      // 转换sortBy到API格式
      if (sortByValue === "Latest") {
        filters.sortBy = "latest";
      } else if (sortByValue === "Price Low to High") {
        filters.sortBy = "price_low_to_high";
      } else if (sortByValue === "Price High to Low") {
        filters.sortBy = "price_high_to_low";
      }
      
      console.log("🔍 Applying filters with values:", filters);

      // Reset pagination
      setOffset(0);
      setHasMore(true);

      // 重新获取active listings 和 counts
      await Promise.all([
        fetchUserListings('all', filters),
        fetchListingCounts(filters),
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 应用filter并重新获取数据
  const applyFilters = async () => {
    setLoading(true);
    
    try {
      const filters: Partial<UserListingsQueryParams> = {};
      
      if (selectedCategory !== "All") {
        filters.category = selectedCategory;
      }
      
      if (selectedCondition !== "All") {
        filters.condition = selectedCondition;
      }

      const apiGender = mapGenderOptionToApiParam(selectedGender);
      if (apiGender) {
        filters.gender = apiGender;
      }

      if (minPrice) {
        filters.minPrice = parseFloat(minPrice);
      }

      if (maxPrice) {
        filters.maxPrice = parseFloat(maxPrice);
      }
      
      // 转换sortBy到API格式
      if (sortBy === "Latest") {
        filters.sortBy = "latest";
      } else if (sortBy === "Price Low to High") {
        filters.sortBy = "price_low_to_high";
      } else if (sortBy === "Price High to Low") {
        filters.sortBy = "price_high_to_low";
      }
      
      console.log("🔍 Applying filters:", filters);

      // Reset pagination
      setOffset(0);
      setHasMore(true);

      // 重新获取active listings 和 counts
      await Promise.all([
        fetchUserListings('all', filters),
        fetchListingCounts(filters),
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 加载更多listings（无限滚动）
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading || refreshing) {
      console.log('🔍 MyTopScreen: Skip load more', { hasMore, isLoadingMore, loading, refreshing });
      return;
    }

    try {
      setIsLoadingMore(true);
      console.log('🔍 MyTopScreen: Loading more listings at offset:', offset);

      // 构建当前的 filter 参数
      const filters: Partial<UserListingsQueryParams> = {};

      if (selectedCategory !== "All") {
        filters.category = selectedCategory;
      }

      if (selectedCondition !== "All") {
        filters.condition = selectedCondition;
      }

      const apiGender = mapGenderOptionToApiParam(selectedGender);
      if (apiGender) {
        filters.gender = apiGender;
      }

      if (minPrice) {
        filters.minPrice = parseFloat(minPrice);
      }

      if (maxPrice) {
        filters.maxPrice = parseFloat(maxPrice);
      }

      if (sortBy === "Latest") {
        filters.sortBy = "latest";
      } else if (sortBy === "Price Low to High") {
        filters.sortBy = "price_low_to_high";
      } else if (sortBy === "Price High to Low") {
        filters.sortBy = "price_high_to_low";
      }

      await fetchUserListings('active', filters, true);
    } catch (error) {
      console.error('Error loading more listings:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loading, refreshing, offset, selectedCategory, selectedCondition, selectedGender, minPrice, maxPrice, sortBy]);

  // ✅ 统一的刷新逻辑；支持静默刷新避免触发下拉形态
  const refreshAll = useCallback(
    async (opts?: { useSpinner?: boolean }) => {
      const useSpinner = !!opts?.useSpinner;
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      if (useSpinner) setRefreshing(true); else setLoading(true);
      try {
        // Reset pagination state
        setOffset(0);
        setHasMore(true);

        await Promise.all([
          refreshCurrentUser(), // ✅ 同步最新用户资料（头像/简介等）
          fetchUserListings('all'),
          fetchFollowStats(),
          fetchUserCategories(),
          fetchListingCounts(), // ✅ 获取总数
        ]);
      } finally {
        if (useSpinner) setRefreshing(false);
        setLoading(false);
        isRefreshingRef.current = false;
      }
    },
    []
  );

  // 用于下拉手势或显式请求时的刷新（展示下拉刷新指示器）
  const onRefresh = useCallback(() => refreshAll({ useSpinner: true }), [refreshAll]);

  // （移除初次挂载时的重复加载，统一在获得焦点时刷新）
  // 首次挂载时，采用与 refresh 相同的加载路径（但不显示下拉指示器）
  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    refreshAll({ useSpinner: false });
  }, [refreshAll]);

  // 为 Tab 单击滚动到顶部提供支持
  useScrollToTop(listRef);

  // 监听 refreshTS 参数变化（用于在已聚焦状态下通过双击 Tab 触发显式刷新）
  const refreshTrigger = route.params?.refreshTS;
  const scrollToTopTrigger = route.params?.scrollToTopTS;
  const tabPressTrigger = route.params?.tabPressTS;
  useEffect(() => {
    if (refreshTrigger && lastRefreshRef.current !== refreshTrigger) {
      lastRefreshRef.current = refreshTrigger;
      // 显式触发刷新：保留下拉指示器以提供反馈
      refreshAll({ useSpinner: true });
      // 处理完即清理，避免残留参数引发误判
      navigation.setParams({ refreshTS: undefined });
    }
  }, [refreshTrigger, refreshAll, navigation]);

  // 丝滑回到顶部（仅在 Shop 标签时才滚动）
  useEffect(() => {
    if (scrollToTopTrigger && activeTab === "Shop") {
      // 轻微延时，避免与其他动画或参数清理竞争
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      });
      listOffsetRef.current = 0;
      navigation.setParams({ scrollToTopTS: undefined });
    }
  }, [scrollToTopTrigger, activeTab, navigation]);

  // 单击 Tab：若在顶部则刷新，否则丝滑回顶（仅 Shop 列表）
  useEffect(() => {
    if (tabPressTrigger && activeTab === "Shop") {
      const atTop = (listOffsetRef.current || 0) <= 2;
      if (atTop) {
        // 在顶部时进行带指示器的刷新（符合用户期望）
        refreshAll({ useSpinner: true });
      } else {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
        listOffsetRef.current = 0;
      }
      navigation.setParams({ tabPressTS: undefined });
    }
  }, [tabPressTrigger, activeTab, navigation, refreshAll]);

  // ✅ 当屏幕获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      // Sync premium status (same logic as MyPremiumScreen)
      let isActive = true;
      if (user?.id) {
        (async () => {
          try {
            const status = await premiumService.getStatus();
            if (!isActive) return;
            updateUser({ ...(user as any), isPremium: status.isPremium, premiumUntil: status.premiumUntil });
          } catch (e) {
            // ignore
          }
        })();
      }

      const params = route.params;

      if (params?.initialTab) {
        setActiveTab(params.initialTab);
        // 立即清除 initialTab 参数，避免重复触发
        navigation.setParams({ initialTab: undefined });
      }

      let didRefresh = false;
      if (params?.refreshTS && lastRefreshRef.current !== params.refreshTS) {
        lastRefreshRef.current = params.refreshTS;
        // 显式请求：展示下拉指示器
        refreshAll({ useSpinner: true });
        didRefresh = true;
        // 清除 refreshTS 参数
        navigation.setParams({ refreshTS: undefined });
      }

      // 不进行静默刷新：避免从其他 Tab 聚焦回来时自动刷新
      return () => { isActive = false; };
    }, [navigation, refreshAll, route.params])
  );

  useEffect(() => {
    const request = route.params?.brandPickerRequest;
    if (!request) return;
    if (brandPickerHandledTsRef.current === request.ts) return;
    brandPickerHandledTsRef.current = request.ts;

    navigation.navigate("EditBrand", {
      source: request.source === "discover" ? "discover" : "mytop",
      availableBrands: request.availableBrands ?? [],
      selectedBrands: request.selectedBrands ?? [],
    });

    navigation.setParams({ brandPickerRequest: undefined });
  }, [navigation, route.params?.brandPickerRequest]);

  // ✅ 使用真实用户数据，提供默认值以防用户数据为空
  const activeListings = useMemo(() => activeListingsState, [activeListingsState]);
  const inactiveListings = useMemo(() => inactiveListingsState, [inactiveListingsState]);

  // Use backend total count instead of loaded count
  const listedCount = activeTotalCount > 0 ? activeTotalCount : activeListings.length;

  const displayUser = {
    username: user?.username || "User",
    followers: followStats.followersCount, // ✅ 使用真实的follow统计
    following: followStats.followingCount, // ✅ 使用真实的follow统计
    reviews: followStats.reviewsCount,
    bio: user?.bio || "Welcome to my profile!",
    avatar: user?.avatar_url || DEFAULT_AVATAR,
    activeListings, // ✅ 使用真实的listings
  };

  // ✅ 处理listing点击
  const handleListingPress = (listing: ListingItem) => {
    navigation.navigate("ActiveListingDetail", { listingId: listing.id });
  };

  const handleOpenFollowList = (type: "followers" | "following") => {
    navigation.navigate("FollowList", { type });
  };

  const handleOpenReviews = () => {
    navigation.navigate("MyReviews");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      {/* 顶部 Header */}
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.username}>{displayUser.username}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Icon name="settings-outline" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TAB_KEYS.map((tab) => {
          const animation = tabAnimations[tab];
          const translateY = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -6],
          });
          const scale = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.05],
          });
          const color = animation.interpolate({
            inputRange: [0, 1],
            outputRange: ["#666666", "#000000"],
          });

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.85}
              style={styles.tabPressable}
              onLayout={(event) => handleTabLayout(tab, event)}
            >
              <Animated.Text
                onLayout={(event) => handleTabTextLayout(tab, event)}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab,
                  {
                    transform: [{ translateY }, { scale }],
                    color,
                  },
                ]}
              >
                {tab}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabIndicator,
            {
              width: indicatorWidth,
              transform: [{ translateX: indicatorLeft }],
            },
          ]}
        />
      </View>

      {/* 内容区 */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePagerMomentumEnd}
        scrollEventThrottle={16}
        style={styles.pager}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {TAB_KEYS.map((tab) => (
          <View key={tab} style={[styles.tabPage, { width: screenWidth }]}>
            {tab === "Shop" ? (
              <FlatList
                ref={listRef}
                style={styles.shopList}
                data={
                  displayUser.activeListings.length
                    ? formatData(displayUser.activeListings, 3)
                    : []
                }
                keyExtractor={(item) => (item as any).empty ? `active-blank-${(item as any).id}` : `active-${String((item as ListingItem).id)}`}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onScroll={(e) => {
                  listOffsetRef.current = e.nativeEvent.contentOffset.y;
                }}
                nestedScrollEnabled
                scrollEventThrottle={16}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={
                  <View style={styles.headerContent}>
                    {/* Profile 区 */}
                    <View style={styles.profileRow}>
                      <Avatar
                        source={
                          user?.avatar_url && typeof user.avatar_url === "string" && user.avatar_url.startsWith("http")
                            ? { uri: user.avatar_url }
                            : DEFAULT_AVATAR
                        }
                        style={styles.avatar}
                        isPremium={user?.isPremium}
                        self
                      />
                      <View style={styles.statsRow}>
                        <TouchableOpacity
                          onPress={() => handleOpenFollowList("followers")}
                          hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                        >
                          <Text style={styles.stats}>{displayUser.followers} followers</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleOpenFollowList("following")}
                          hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                        >
                          <Text style={styles.stats}>{displayUser.following} following</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleOpenReviews}
                          hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                        >
                          <Text style={styles.stats}>{displayUser.reviews} reviews</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Bio */}
                    <View style={styles.bioRow}>
                      <Text style={styles.bio}>{displayUser.bio}</Text>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate("EditProfile")}
                      >
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Active Title */}
                    <View style={styles.activeRow}>
                      <Text style={styles.activeTitle}>
                        Active ({listedCount})
                      </Text>
                      <TouchableOpacity 
                        onPress={() => {
                          setTempCategory(selectedCategory);
                          setTempCondition(selectedCondition);
                          setTempGender(selectedGender);
                          setTempMinPrice(minPrice);
                          setTempMaxPrice(maxPrice);
                          setTempSortBy(sortBy);
                          setFilterModalVisible(true);
                        }}
                        style={styles.filterButtonContainer}
                      >
                        <Icon name="filter" size={24} color="#111" />
                        {(selectedCategory !== "All" || selectedCondition !== "All" || selectedGender !== "All" || minPrice || maxPrice || sortBy !== "Latest") && (
                          <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>
                              {(selectedCategory !== "All" ? 1 : 0) +
                                (selectedCondition !== "All" ? 1 : 0) +
                                (selectedGender !== "All" ? 1 : 0) +
                                (minPrice ? 1 : 0) +
                                (maxPrice ? 1 : 0) +
                                (sortBy !== "Latest" ? 1 : 0)}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                }
                ListHeaderComponentStyle={{ paddingHorizontal: 0 }} // ✅ 防止默认 padding
                contentContainerStyle={{
                  paddingBottom: 60,
                }}
                renderItem={({ item }) => {
                  if (item.empty) {
                    return <View style={[styles.itemBox, styles.itemInvisible]} />;
                  }

                  const listing = item as ListingItem;
                  const imageUri = listing.images && listing.images.length > 0
                    ? listing.images[0]
                    : "https://via.placeholder.com/300x300/f4f4f4/999999?text=No+Image";

                  return (
                    <TouchableOpacity
                      style={styles.itemBox}
                      onPress={() => handleListingPress(listing)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: imageUri }} style={styles.itemImage} />
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  <>
                    {inactiveListings.length > 0 && (
                      <View style={styles.inactiveSection}>
                        <Text style={styles.inactiveTitle}>
                          Inactive ({inactiveTotalCount > 0 ? inactiveTotalCount : inactiveListings.length})
                        </Text>
                        <FlatList
                          data={formatData(inactiveListings, 3)}
                          keyExtractor={(item) => (item as any).empty ? `inactive-blank-${(item as any).id}` : `inactive-${String((item as ListingItem).id)}`}
                          numColumns={3}
                          scrollEnabled={false}
                          contentContainerStyle={styles.inactiveListContent}
                          renderItem={({ item: footerItem }) => {
                            if ((footerItem as any).empty) {
                              return <View style={[styles.itemBox, styles.itemInvisible]} />;
                            }
                            const listing = footerItem as ListingItem;
                            const imageUri = listing.images && listing.images.length > 0
                              ? listing.images[0]
                              : "https://via.placeholder.com/300x300/f4f4f4/999999?text=No+Image";
                            return (
                              <TouchableOpacity
                                style={styles.itemBox}
                                onPress={() => handleListingPress(listing)}
                                activeOpacity={0.85}
                              >
                                <Image source={{ uri: imageUri }} style={styles.itemImage} />
                                <View style={styles.unlistedOverlay}>
                                  <Text
                                    style={styles.unlistedOverlayText}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.6}
                                  >
                                    UNLISTED
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          }}
                        />
                      </View>
                    )}
                    {isLoadingMore && (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#111" />
                      </View>
                    )}
                    {!hasMore && !isLoadingMore && listedCount > 0 && (
                      <View style={styles.footerContainer}>
                        <View style={styles.footerDivider} />
                        <Text style={styles.footerText}>
                          You've reached the end • {listedCount} {listedCount === 1 ? 'item' : 'items'} found
                        </Text>
                        <Text style={styles.footerSubtext}>
                          All your active listings are shown above
                        </Text>
                      </View>
                    )}
                  </>
                }
                ListEmptyComponent={
                  loading ? (
                    <View style={[styles.emptyBox]}>
                      <Text style={styles.emptyText}>Loading...</Text>
                    </View>
                  ) : (
                    <View style={[styles.emptyBox]}>
                      <Text style={styles.emptyText}>
                        You haven't listed anything for sale yet.{"\n"}Tap + below to get started.
                      </Text>
                    </View>
                  )
                }
              />
            ) : tab === "Sold" ? (
              <SoldTab />
            ) : tab === "Purchases" ? (
              <PurchasesTab />
            ) : (
              <LikesTabs />
            )}
          </View>
        ))}
      </ScrollView>

      <FilterModal
        visible={filterModalVisible}
        title="My Listings Filters"
        sections={[
          {
            key: "category",
            title: "Category",
            options: [
              { label: "All", value: "All" },
              ...userCategories.map(category => ({
                label: `${category.name} (${category.count})`,
                value: category.name,
              })),
            ],
            selectedValue: tempCategory,
            onSelect: (value) => setTempCategory(String(value)),
          },
          {
            key: "condition",
            title: "Condition",
            options: SHOP_CONDITIONS.map((condition) => ({
              label: condition,
              value: condition,
            })),
            selectedValue: tempCondition,
            onSelect: (value) => setTempCondition(String(value)),
          },
          {
            key: "gender",
            title: "Gender",
            options: GENDER_OPTIONS.map((gender) => ({
              label: gender,
              value: gender,
            })),
            selectedValue: tempGender,
            onSelect: (value) => setTempGender(String(value)),
          },
          {
            key: "priceRange",
            title: "Price Range",
            type: "range",
            minValue: parseFloat(tempMinPrice) || 0,
            maxValue: parseFloat(tempMaxPrice) || 0,
            minPlaceholder: "$0",
            maxPlaceholder: "$1000+",
            onMinChange: setTempMinPrice,
            onMaxChange: setTempMaxPrice,
          },
          {
            key: "sortBy",
            title: "Sort By",
            options: SORT_OPTIONS.map((option) => ({
              label: option,
              value: option,
            })),
            selectedValue: tempSortBy,
            onSelect: (value) => setTempSortBy(String(value) as typeof SORT_OPTIONS[number]),
          },
        ]}
        onClose={() => setFilterModalVisible(false)}
        onApply={() => {
          setSelectedCategory(tempCategory);
          setSelectedCondition(tempCondition);
          setSelectedGender(tempGender);
          setMinPrice(tempMinPrice);
          setMaxPrice(tempMaxPrice);
          setSortBy(tempSortBy);
          setFilterModalVisible(false);

          // 立即应用filter，使用临时值
          applyFiltersWithValues(tempCategory, tempCondition, tempGender, tempMinPrice, tempMaxPrice, tempSortBy);
        }}
        onClear={() => {
          setTempCategory("All");
          setTempCondition("All");
          setTempGender("All");
          setTempMinPrice("");
          setTempMaxPrice("");
          setTempSortBy("Latest");

          // 立即清除filter
          setSelectedCategory("All");
          setSelectedCondition("All");
          setSelectedGender("All");
          setMinPrice("");
          setMaxPrice("");
          setSortBy("Latest");
          applyFiltersWithValues("All", "All", "All", "", "", "Latest");
        }}
        applyButtonLabel="Apply Filters"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 48,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },

  // Tabs
  tabs: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    position: "relative",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
  },
  tabPressable: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tab: { fontSize: 18, color: "#666" },
  activeTab: { fontWeight: "800" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#000",
  },
  pager: {
    flex: 1,
  },
  tabPage: {
    flex: 1,
  },
  shopList: {
    flex: 1,
  },

  // Header 内容
  headerContent: {
    rowGap: 12,
    paddingBottom: 8,
  },
  profileRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 16,
    paddingHorizontal: 12, // ✅ 改为与 grid 对齐
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#eee" },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stats: { color: "#333", fontSize: 14 },
  bioRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: 12,
    paddingHorizontal: 12, // ✅ 对齐
  },
  bio: { flex: 1, fontSize: 15, lineHeight: 20 },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    alignSelf: "flex-start",
  },
  editBtnText: { fontWeight: "600" },
  activeRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  activeTitle: { fontSize: 17, fontWeight: "700" },
  filterButtonContainer: {
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF4D4D",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Empty 状态
  emptyBox: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#E6F0FF",
    borderRadius: 12,
    padding: 20,
  },
  emptyText: { textAlign: "center", color: "#555" },

  // Grid
  itemBox: {
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f8f8f8",
  },
  itemImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  inactiveSection: {
    marginTop: 16,
    paddingHorizontal: 0,
  },
  inactiveTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  inactiveListContent: {
    paddingBottom: 16,
  },
  unlistedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  unlistedOverlayText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
    fontSize: 16,
    textTransform: "uppercase",
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
  // Footer styles
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
