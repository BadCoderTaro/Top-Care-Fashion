// mobile/screens/main/HomeStack/HomeScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
} from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp, type NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { TabView } from "react-native-tab-view";

import Icon from "../../../components/Icon";
import type { HomeStackParamList } from "./index";
import type { DiscoverStackParamList } from "../DiscoverStack/index";
import FeedList, { type FeedListRef } from "./FeedList";

type MainTabParamList = {
  Home: undefined;
  Discover: NavigatorScreenParams<DiscoverStackParamList> | undefined;
  Sell: undefined;
  Inbox: undefined;
  "My TOP": any;
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, "HomeMain">>();
  const layout = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "foryou", title: "For You" },
    { key: "trending", title: "Trending" },
  ]);

  const tabKeys = routes.map((route) => route.key);
  const tabAnimationsRef = useRef<Record<string, Animated.Value> | null>(null);
  if (!tabAnimationsRef.current) {
    tabAnimationsRef.current = tabKeys.reduce((acc, key, i) => {
      acc[key] = new Animated.Value(i === 0 ? 1 : 0);
      return acc;
    }, {} as Record<string, Animated.Value>);
  }
  const tabAnimations = tabAnimationsRef.current!;
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const [tabTextWidths, setTabTextWidths] = useState<Record<string, number>>({});
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  // Refs for both feed lists
  const forYouRef = useRef<FeedListRef>(null);
  const trendingRef = useRef<FeedListRef>(null);

  // Animation for hiding/showing top bar
  const scrollY = useRef(new Animated.Value(0)).current;
  const prevScrollY = useRef(0);
  const [topBarVisible, setTopBarVisible] = useState(true);

  // Handle scroll position changes
  const handleScroll = (offset: number) => {
    const diff = offset - prevScrollY.current;

    // Scrolling down - hide top bar
    if (diff > 0 && offset > 100 && topBarVisible) {
      setTopBarVisible(false);
      Animated.timing(scrollY, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    // Scrolling up - show top bar
    else if (diff < 0 && !topBarVisible) {
      setTopBarVisible(true);
      Animated.timing(scrollY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    // At top - always show
    else if (offset < 50 && !topBarVisible) {
      setTopBarVisible(true);
      Animated.timing(scrollY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    prevScrollY.current = offset;
  };

  // Calculate top bar height dynamically so the animation matches the actual size
  const DEFAULT_BAR_CONTENT_HEIGHT = 52;
  const [topBarHeight, setTopBarHeight] = useState(insets.top + DEFAULT_BAR_CONTENT_HEIGHT);

  useEffect(() => {
    const targetHeight = insets.top + DEFAULT_BAR_CONTENT_HEIGHT;
    setTopBarHeight((prev) => (Math.abs(prev - targetHeight) < 0.5 ? prev : targetHeight));
  }, [insets.top]);

  const handleTopBarLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const { height } = event.nativeEvent.layout;
    setTopBarHeight((prev) => (Math.abs(prev - height) < 0.5 ? prev : height));
  }, []);

  const TOTAL_HIDE_DISTANCE = topBarHeight; // Hide completely above notch

  const topBarTranslateY = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -TOTAL_HIDE_DISTANCE],
  });

  // Handle tab press: refresh if at top, scroll to top if not
  useEffect(() => {
    const tabPressTS = (route.params as any)?.tabPressTS;
    if (!tabPressTS) return;

    const currentRef = index === 0 ? forYouRef : trendingRef;
    const scrollOffset = currentRef.current?.getScrollOffset() ?? 0;
    const isAtTop = scrollOffset < 50;

    if (isAtTop) {
      // At top, refresh data
      currentRef.current?.refresh();
    } else {
      // Not at top, scroll to top
      currentRef.current?.scrollToTop();
    }
  }, [(route.params as any)?.tabPressTS]);

  const renderScene = ({ route }: any) => {
    switch (route.key) {
      case "foryou":
        return <FeedList ref={forYouRef} mode="foryou" onScroll={handleScroll} />;
      case "trending":
        return <FeedList ref={trendingRef} mode="trending" onScroll={handleScroll} />;
      default:
        return null;
    }
  };

  const updateIndicator = useCallback(() => {
    const key = routes[index]?.key;
    if (!key) return;
    const layout = tabLayouts[key];
    const textWidth = tabTextWidths[key];
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
  }, [index, routes, tabLayouts, tabTextWidths, indicatorLeft, indicatorWidth]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    routes.forEach((route, i) => {
      Animated.spring(tabAnimations[route.key], {
        toValue: i === index ? 1 : 0,
        stiffness: 300,
        damping: 26,
        mass: 0.9,
        useNativeDriver: false,
      }).start();
    });
  }, [index, routes, tabAnimations]);

  const handleTabLayout = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => {
        const current = prev[key];
        if (current && Math.abs(current.x - x) < 0.5 && Math.abs(current.width - width) < 0.5) {
          return prev;
        }
        return { ...prev, [key]: { x, width } };
      });
    },
    [],
  );

  const handleTabTextLayout = useCallback((key: string, event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTabTextWidths((prev) => {
      const current = prev[key];
      if (current && Math.abs(current - width) < 0.5) {
        return prev;
      }
      return { ...prev, [key]: width };
    });
  }, []);

  const handleIndexChange = useCallback(
    (nextIndex: number) => {
      setIndex(nextIndex);
      if (!topBarVisible) {
        setTopBarVisible(true);
      }
      Animated.timing(scrollY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [scrollY, topBarVisible],
  );

  const handleTabPress = useCallback(
    (targetIndex: number) => {
      if (targetIndex === index) {
        const currentRef = index === 0 ? forYouRef : trendingRef;
        currentRef.current?.scrollToTop?.();
        setTopBarVisible(true);
        Animated.timing(scrollY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        return;
      }
      handleIndexChange(targetIndex);
    },
    [index, forYouRef, trendingRef, handleIndexChange, scrollY],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        {/* Custom Tab Bar - Animated and absolute positioned, includes safe area */}
        <Animated.View
          style={[
            styles.topNav,
            {
              top: 0,
              paddingTop: insets.top,
              transform: [{ translateY: topBarTranslateY }],
            },
          ]}
          onLayout={handleTopBarLayout}
        >
          <View style={styles.tabsContainer}>
            {routes.map((route, i) => {
              const animation = tabAnimations[route.key];
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
                outputRange: ["#999999", "#000000"],
              });

              return (
                <TouchableOpacity
                  key={route.key}
                  style={styles.tabButton}
                  onPress={() => handleTabPress(i)}
                  activeOpacity={0.7}
                  onLayout={(event) => handleTabLayout(route.key, event)}
                >
                  <Animated.Text
                    onLayout={(event) => handleTabTextLayout(route.key, event)}
                    style={[
                      styles.tabText,
                      index === i && styles.tabTextActive,
                      {
                        transform: [{ translateY }, { scale }],
                        color,
                      },
                    ]}
                  >
                    {route.title}
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
          <View style={styles.rightButtons}>
            <TouchableOpacity
              style={styles.bagButton}
              onPress={() => {
                let rootNavigation: any = navigation;
                let current: any = navigation;
                while (current?.getParent?.()) {
                  current = current.getParent();
                  if (current) {
                    rootNavigation = current;
                  }
                }
                rootNavigation?.navigate("Buy", {
                  screen: "Bag",
                });
              }}
              activeOpacity={0.7}
            >
              <Icon name="bag-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => {
                const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
                parent?.navigate("Discover", {
                  screen: "DiscoverMain",
                  params: { focusSearch: Date.now() },
                });
              }}
              activeOpacity={0.7}
            >
              <Icon name="search-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Tab Content - No default tab bar */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={() => null}
          onIndexChange={handleIndexChange}
          initialLayout={{ width: layout.width }}
          swipeEnabled={true}
          lazy={true}
          lazyPreloadDistance={0}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topNav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  tabsContainer: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 0,
    position: "relative",
  },
  tabButton: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 6 : 12,
    paddingBottom: Platform.OS === "ios" ? 6 : 0,
  },
  tabText: {
    fontSize: 18,
    color: "#666",
  },
  tabTextActive: {
    fontWeight: "800",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: "#000",
    borderRadius: 1.5,
  },
  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    marginBottom: Platform.OS === "ios" ? 6 : 0,
    bottom: 0,
    right: 12,
    gap: 4,
  },
  bagButton: {
    padding: 8,
  },
  searchButton: {
    padding: 8,
  },
});
