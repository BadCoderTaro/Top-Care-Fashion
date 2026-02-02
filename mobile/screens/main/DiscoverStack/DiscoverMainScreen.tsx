import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../../../components/Icon";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BuyStackParamList } from "../BuyStack/index";

import type { MyTopStackParamList } from "../MyTopStack";
import type { DiscoverStackParamList } from "./index";
import { listingsService } from "../../../src/services/listingsService";
import type { BrandSummary } from "../../../src/services/listingsService";
import { userService } from "../../../src/services/userService";
import type { RouteProp } from "@react-navigation/native";

type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Sell: undefined;
  Inbox: undefined;
  "My TOP": NavigatorScreenParams<MyTopStackParamList> | undefined;
  Buy: NavigatorScreenParams<BuyStackParamList> | undefined;
};

type DiscoverNavigation = NativeStackNavigationProp<DiscoverStackParamList>;
type DiscoverRoute = RouteProp<DiscoverStackParamList, "DiscoverMain">;

const CATEGORY_OPTIONS: Array<{ label: string; value: "men" | "women" | "unisex" }> = [
  { label: "Men", value: "men" },
  { label: "Women", value: "women" },
  { label: "Unisex", value: "unisex" },
];

const DEFAULT_BRAND_NAMES = [
  "Nike",
  "Zara",
  "Adidas",
  "Dr. Martens",
  "Levi's",
  "Gucci",
  "Off-White",
  "ASOS",
  "Brandy Melville",
  "Chanel",
  "Prada",
  "The North Face",
  "Converse",
  "New Balance",
  "Puma",
  "Calvin Klein",
  "Uniqlo",
  "H&M",
  "Louis Vuitton",
  "Burberry",
  "Supreme",
  "Vans",
  "Reebok",
  "Forever 21",
];

const toBrandSummaries = (names: string[]): BrandSummary[] =>
  names
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((name): name is string => Boolean(name))
    .map((name) => ({ name, listingsCount: 0 }));

export default function DiscoverMainScreen() {
  const navigation = useNavigation<DiscoverNavigation>();
  const route = useRoute<DiscoverRoute>();
  const [searchText, setSearchText] = useState<string>("");
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [preferredBrands, setPreferredBrands] = useState<string[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  const loadBrands = useCallback(async () => {
    try {
      setBrandsLoading(true);
      setBrandsError(null);

      const fetched = await listingsService.getBrandSummaries({ limit: 24 });
      const summaries = fetched.filter((item) => item.name && item.name.trim().length > 0);

      if (summaries.length > 0) {
        setBrands(summaries);
      } else {
        setBrands(toBrandSummaries(DEFAULT_BRAND_NAMES));
      }
    } catch (error) {
      console.error("Error loading brands:", error);
      setBrandsError("Failed to load brands. Tap to retry.");
      setBrands(toBrandSummaries(DEFAULT_BRAND_NAMES));
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const loadPreferred = useCallback(async () => {
    try {
      const profile = await userService.getProfile();
      const arr = Array.isArray((profile as any)?.preferred_brands)
        ? ((profile as any).preferred_brands as unknown[])
        : [];
      const list = arr
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
      setPreferredBrands(list);
    } catch (e) {
      setPreferredBrands([]);
    }
  }, []);

  useEffect(() => {
    // 初次加载仅加载品牌，偏好在获得焦点时加载，避免重复
    loadBrands();
  }, [loadBrands]);

  useFocusEffect(
    useCallback(() => {
      loadPreferred();
      return () => {};
    }, [loadPreferred])
  );

  useEffect(() => {
    if ((route.params as any)?.refreshTS) {
      loadPreferred();
      loadBrands();
    }
  }, [route.params, loadPreferred, loadBrands]);

  // Focus search input when focusSearch param is passed
  useEffect(() => {
    if (route.params?.focusSearch) {
      // Small delay to ensure navigation is complete
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [route.params?.focusSearch]);

  const handleBrandPress = useCallback(
    (brand: string) => {
      if (!brand) return;
      const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
      parent?.navigate("Buy", {
        screen: "SearchResult",
        params: { query: brand },
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchBar}
          placeholder="Search for Anything"
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          textAlignVertical="center"
          onSubmitEditing={() => {
            // Navigate to SearchResult in Buy stack (allow empty string)
            // Use parent/root navigator to reach the Buy stack
            const parent = navigation.getParent();
            parent?.navigate("Buy", { screen: "SearchResult", params: { query: searchText || "" } });
          }}
        />
        <View style={styles.searchRightButtons}>
          <TouchableOpacity
            style={styles.searchIconButton}
            onPress={() => {
              const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
              parent?.navigate("My TOP", {
                screen: "MyTopMain",
                params: { initialTab: "Likes" },
              });
            }}
            activeOpacity={0.7}
          >
            <Icon name="heart-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchIconButton}
            onPress={() => {
              const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
              parent?.navigate("Buy", {
                screen: "Bag",
              });
            }}
            activeOpacity={0.7}
          >
            <Icon name="bag-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 分类 */}
      <Text style={styles.sectionTitle}>Shop by Category</Text>
      {CATEGORY_OPTIONS.map(({ label, value }) => (
        <TouchableOpacity
          key={value}
          style={styles.categoryRow}
          onPress={() =>
            navigation.navigate("DiscoverCategory", {
              gender: value,
            })
          }
        >
          <Text style={styles.categoryText}>{label}</Text>
          <Icon name="chevron-forward" size={18} color="#888" />
        </TouchableOpacity>
      ))}

      {/* 品牌 */}
      <View style={styles.brandHeader}>
        <Text style={styles.sectionTitle}>Brands</Text>
        <TouchableOpacity
          onPress={() => {
            const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
            const requestTs = Date.now();
            const available = brands.map((b) => b.name);

            parent?.navigate("My TOP", {
              screen: "MyTopMain",
              params: {
                brandPickerRequest: {
                  ts: requestTs,
                  source: "discover",
                  availableBrands: available,
                  selectedBrands: preferredBrands,
                },
              },
            });
          }}
        >
          <Text style={styles.selectBrands}>Select Brands</Text>
        </TouchableOpacity>
      </View>

      {brandsLoading ? (
        <View style={styles.brandStatus}>
          <ActivityIndicator size="small" color="#5B21B6" />
          <Text style={styles.brandStatusText}>Loading brands...</Text>
        </View>
      ) : (
        <>
          {brandsError && (
            <TouchableOpacity style={styles.brandErrorBox} onPress={() => loadBrands()}>
              <Text style={styles.brandErrorText}>{brandsError}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.brandWrap}>
            {(() => {
              const effective: BrandSummary[] = (() => {
                if (preferredBrands.length > 0) {
                  // 有偏好品牌：显示用户选择的品牌
                  return preferredBrands.map((name) => ({
                    name,
                    listingsCount: 0,
                  }));
                }
                // 无偏好品牌：直接显示默认品牌
                return toBrandSummaries(DEFAULT_BRAND_NAMES);
              })();

              return effective.length === 0 ? (
                <Text style={styles.brandEmptyText}>No brands available right now.</Text>
              ) : (
                effective.map((brand) => (
                  <TouchableOpacity
                    key={brand.name}
                    style={styles.brandTag}
                    onPress={() => handleBrandPress(brand.name)}
                  >
                    <Text style={styles.brandText}>{brand.name}</Text>
                  </TouchableOpacity>
                ))
              );
            })()}
          </View>
        </>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#f3f3f3",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "android" ? 0 : 12,
    fontSize: 15,
    includeFontPadding: false,
  },
  searchRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  searchIconButton: {
    padding: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  categoryText: { fontSize: 15, color: "#111" },

  brandHeader: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectBrands: { fontSize: 14, color: "#5B21B6", fontWeight: "600" },

  brandWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  brandStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  brandStatusText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#666",
  },
  brandErrorBox: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  brandErrorText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  brandEmptyText: {
    fontSize: 13,
    color: "#666",
  },
  brandTag: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  brandText: { color: "#fff", fontSize: 14, fontWeight: "500" },
});
