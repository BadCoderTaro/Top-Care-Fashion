import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import Header from "../../../components/Header";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MyTopStackParamList } from "./index";
import { userService } from "../../../src/services/userService";
import { listingsService } from "../../../src/services/listingsService";
import { useAuth } from "../../../contexts/AuthContext";

const ALL_BRANDS = [
  "Nike",
  "Adidas",
  "Zara",
  "H&M",
  "Uniqlo",
  "Levi's",
  "Converse",
  "Calvin Klein",
  "New Balance",
  "Puma",
  "Under Armour",
  "Gucci",
  "Prada",
  "Chanel",
  "The North Face",
  "Dr. Martens",
  "Brandy Melville",
  "Off-White",
  // 奢侈品牌
  "Louis Vuitton",
  "Hermès",
  "Dior",
  "Versace",
  "Burberry",
  "Balenciaga",
  "Saint Laurent",
  "Fendi",
  "Givenchy",
  "Valentino",
  "Bottega Veneta",
  "Celine",
  "Loewe",
  "Miu Miu",
  "Alexander McQueen",
  "Tom Ford",
  "Dolce & Gabbana",
  "Armani",
  "Ralph Lauren",
  // 快时尚品牌
  "Forever 21",
  "ASOS",
  "Topshop",
  "Mango",
  "Pull & Bear",
  "Bershka",
  "Stradivarius",
  "COS",
  "Arket",
  "Weekday",
  "Monki",
  "& Other Stories",
  "Urban Outfitters",
  "American Eagle",
  "Abercrombie & Fitch",
  "Hollister",
  "Gap",
  "Old Navy",
  "Banana Republic",
  "Aritzia",
  // 运动品牌
  "Reebok",
  "Vans",
  "Fila",
  "ASICS",
  "Mizuno",
  "Salomon",
  "Columbia",
  "Patagonia",
  "Arc'teryx",
  "Lululemon",
  "Athleta",
  "Gymshark",
  "Alo Yoga",
  "On Running",
  "Allbirds",
  "Veja",
  // 街头/潮牌
  "Supreme",
  "Bape",
  "Stussy",
  "Palace",
  "Kith",
  "Fear of God",
  "Yeezy",
  "Travis Scott",
  "Vlone",
  "Anti Social Social Club",
  "Noah",
  "Carhartt WIP",
  "Dickies",
  "Champion",
  "Kappa",
  "Ellesse",
  // 设计师品牌
  "Acne Studios",
  "Issey Miyake",
  "Comme des Garçons",
  "Maison Margiela",
  "Rick Owens",
  "Yohji Yamamoto",
  "Vivienne Westwood",
  "Kenzo",
  "Moschino",
  "Marni",
  "Jil Sander",
  "Stella McCartney",
  // 其他知名品牌
  "Tommy Hilfiger",
  "Lacoste",
  "Polo Ralph Lauren",
  "Hugo Boss",
  "Diesel",
  "Guess",
  "Michael Kors",
  "Coach",
  "Kate Spade",
  "Tory Burch",
  "Longchamp",
  "Furla",
  "MCM",
  "Goyard",
  "Mansur Gavriel",
  "Staud",
  "Reformation",
  "Everlane",
  "Madewell",
  "Free People",
  "Anthropologie",
  "J.Crew",
  "Club Monaco",
  "Vince",
  "Theory",
  "Equipment",
  "Eileen Fisher",
  "AllSaints",
  "The Kooples",
  "Sandro",
  "Maje",
  "Ba&sh",
  "Sezane",
  "Rouje",
  "Realisation Par",
  "With Jéan",
  "Ganni",
  "Stine Goya",
  "Rotate",
  "Nanushka",
  "Totême",
];

const mergeBrandLists = (brands: string[]): string[] => {
  const seen = new Set<string>();
  return brands
    .map((brand) => (typeof brand === "string" ? brand.trim() : ""))
    .filter((brand) => {
      if (!brand) return false;
      const key = brand.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

type EditBrandNav = NativeStackNavigationProp<MyTopStackParamList, "EditBrand">;
type EditBrandRoute = RouteProp<MyTopStackParamList, "EditBrand">;

export default function EditBrandScreen() {
  const navigation = useNavigation<EditBrandNav>();
  const route = useRoute<EditBrandRoute>();
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const initialRouteBrands = Array.isArray(route.params?.availableBrands)
    ? mergeBrandLists(route.params?.availableBrands ?? [])
    : [];
  const [brandOptions, setBrandOptions] = useState<string[]>(
    mergeBrandLists([...ALL_BRANDS, ...initialRouteBrands])
  );
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const computeInitialSelection = () => {
    if (Array.isArray(route.params?.selectedBrands) && route.params?.selectedBrands.length > 0) {
      return mergeBrandLists(route.params?.selectedBrands ?? []);
    }
    if (Array.isArray(user?.preferred_brands) && user?.preferred_brands.length > 0) {
      return mergeBrandLists(user?.preferred_brands ?? []);
    }
    return [];
  };

  const [selectedBrands, setSelectedBrands] = useState<string[]>(computeInitialSelection());
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedBrands(computeInitialSelection());
  }, [route.params?.selectedBrands, user]);

  useEffect(() => {
    let isMounted = true;

    const fetchBrands = async () => {
      setLoadingBrands(true);
      setLoadError(null);
      try {
        const summaries = await listingsService.getBrandSummaries({ limit: 60 });
        if (!isMounted) return;
        const backendBrands = summaries
          .map((brand) => (typeof brand.name === "string" ? brand.name.trim() : ""))
          .filter(Boolean);
        if (backendBrands.length > 0) {
          setBrandOptions((prev) => mergeBrandLists([...prev, ...backendBrands]));
        }
      } catch (e) {
        if (isMounted) {
          console.error("Failed to fetch brands:", e);
          setLoadError("Failed to load latest brands. Showing saved list.");
        }
      } finally {
        if (isMounted) {
          setLoadingBrands(false);
        }
      }
    };

    fetchBrands();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBrands = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return brandOptions;
    }
    return brandOptions.filter((brand) =>
      brand.toLowerCase().includes(query)
    );
  }, [brandOptions, searchText]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const updatedUser = await userService.updateProfile({ preferredBrands: selectedBrands });
      updateUser(updatedUser);
      const source = route.params?.source ?? "mytop";
      if (source === "discover") {
        navigation
          .getParent()
          ?.navigate("Discover", {
            screen: "DiscoverMain",
            params: { refreshTS: Date.now() },
          });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      console.error("Failed to save brands:", e);
      setError("Failed to save brands. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Show these brands in search" showBack />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 选中计数 */}
        <View style={styles.selectedBox}>
          <Text style={styles.selectedText}>
            You've selected {selectedBrands.length} brand
            {selectedBrands.length !== 1 ? "s" : ""}
          </Text>

          {/* 选中品牌 chip */}
          <View style={styles.selectedChips}>
            {selectedBrands.map((brand) => (
              <TouchableOpacity
                key={brand}
                style={styles.selectedChip}
                onPress={() => toggleBrand(brand)}
              >
                <Text style={styles.selectedChipText}>{brand}</Text>
                <Text style={styles.chipClose}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 搜索框 */}
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search brands"
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            autoCapitalize="none"
            textAlignVertical="center"
          />
        </View>

        {loadingBrands && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#111" />
            <Text style={styles.loadingText}>Loading more brands...</Text>
          </View>
        )}
        {loadError && <Text style={styles.errorText}>{loadError}</Text>}

        {/* 推荐品牌 */}
        <Text style={styles.sectionTitle}>SUGGESTED</Text>
        <View style={styles.brandGrid}>
          {filteredBrands.map((brand) => {
            const isSelected = selectedBrands.includes(brand);
            return (
              <TouchableOpacity
                key={brand}
                style={[
                  styles.brandChip,
                  isSelected && styles.brandChipSelected,
                ]}
                onPress={() => toggleBrand(brand)}
              >
                <Text
                  style={[
                    styles.brandChipText,
                    isSelected && styles.brandChipTextSelected,
                  ]}
                >
                  {brand}
                </Text>
                <Text
                  style={[
                    styles.plusIcon,
                    isSelected && { color: "#fff" },
                  ]}
                >
                  {isSelected ? "×" : "+"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 底部 Save 按钮 */}
      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: saving ? "#ccc" : "#000",
            },
          ]}
          disabled={saving}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectedBox: {
    backgroundColor: "#f7f7f7",
    padding: 12,
    paddingTop: 16,
  },
  selectedText: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 8,
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedChip: {
    flexDirection: "row",
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  selectedChipText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: 4,
  },
  chipClose: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 2,
  },
  searchBox: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    paddingHorizontal: 12,
    fontSize: 15,
    minHeight: 44,
    includeFontPadding: false,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: "#555",
    fontSize: 13,
  },
  errorText: {
    color: "#B91C1C",
    paddingHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  brandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
  },
  brandChip: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brandChipSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  brandChipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  brandChipTextSelected: {
    color: "#fff",
  },
  plusIcon: {
    color: "#000",
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopColor: "#eee",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
