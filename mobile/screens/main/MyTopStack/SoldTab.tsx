import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MyTopStackParamList } from "./index";
import { listingsService, ordersService } from "../../../src/services";
import type { ListingItem } from "../../../types/shop";
import { SOLD_GRID_ITEMS } from "../../../mocks/shop";

// Ensure three-column grid alignment
function formatData(data: any[], numColumns: number) {
  const newData = [...data];
  const numberOfFullRows = Math.floor(newData.length / numColumns);
  let numberOfElementsLastRow = newData.length - numberOfFullRows * numColumns;
  while (
    numberOfElementsLastRow !== numColumns &&
    numberOfElementsLastRow !== 0
  ) {
    newData.push({ id: `blank-${numberOfElementsLastRow}`, empty: true });
    numberOfElementsLastRow++;
  }
  return newData;
}

type SoldFilter = "All" | "ToShip" | "InTransit" | "Completed" | "Cancelled";

export default function SoldTab() {
  const [filter, setFilter] = useState<SoldFilter>("All");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [soldListings, setSoldListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterLabels: Record<string, string> = {
    All: "All",
    ToShip: "To Ship",
    InTransit: "In Transit",
    Completed: "Completed",
    Cancelled: "Cancelled",
  };

  const navigation =
    useNavigation<NativeStackNavigationProp<MyTopStackParamList>>();

  // Load sold orders from API
  const loadSoldListings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 🔥 获取所有作为卖家的订单（而不是已售罄的商品）
      const { orders } = await ordersService.getSoldOrders();
      
      // 🔥 将订单转换为列表项格式
      const orderListings: ListingItem[] = orders.map(order => {
        // 🔥 解析 image_urls（可能是 JSON 字符串或数组）
        let images: string[] = [];
        if (order.listing?.image_urls) {
          if (typeof order.listing.image_urls === 'string') {
            try {
              images = JSON.parse(order.listing.image_urls);
            } catch (e) {
              console.error('Failed to parse image_urls:', e);
              images = [];
            }
          } else if (Array.isArray(order.listing.image_urls)) {
            images = order.listing.image_urls;
          }
        } else if (order.listing?.image_url) {
          images = [order.listing.image_url];
        }

        return {
          id: order.listing?.id?.toString() || order.id.toString(),
          orderId: order.id, // 保存订单 ID 用于导航
          title: order.listing?.name || 'Unknown Item',
          name: order.listing?.name || 'Unknown Item',
          description: `Order #${order.id}`,
          price: order.listing?.price || order.total_amount,
          images: images, // 🔥 使用解析后的图片数组
          brand: order.listing?.brand || null,
          size: order.listing?.size || null,
          condition: order.listing?.condition_type || null,
          orderStatus: order.status, // 订单状态
          conversationId: order.conversationId, // 对话 ID
          sold: true, // 有订单就算已售
          seller: {
            id: order.seller?.id,
            name: order.seller?.username || '',
            avatar: order.seller?.avatar_url || '',
            rating: 0,
            sales: 0,
            isPremium: false
          },
          buyerId: order.buyer?.id || null,
          sellerId: order.seller?.id || null
        } as unknown as ListingItem;
      });
      
      setSoldListings(orderListings);
    } catch (err) {
      console.error("Error loading sold orders:", err);
      setError(err instanceof Error ? err.message : "Failed to load orders");
      
      // Fallback to empty array instead of mock data
      setSoldListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSoldListings();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadSoldListings();
    } finally {
      setRefreshing(false);
    }
  };

  const normalizeOrderStatus = (status?: string | null) => {
    if (!status) return null;
    return status.toUpperCase();
  };

  const filterStatusMap: Record<Exclude<SoldFilter, "All">, string[]> = useMemo(() => ({
    ToShip: ["IN_PROGRESS", "TO_SHIP"],
    InTransit: ["SHIPPED", "IN_TRANSIT"],
    Completed: ["COMPLETED", "REVIEWED", "DELIVERED", "RECEIVED"],
    Cancelled: ["CANCELLED"],
  }), []);

  const getOverlayText = (status?: string | null) => {
    const normalized = normalizeOrderStatus(status);
    switch (normalized) {
      case "IN_PROGRESS":
      case "TO_SHIP":
        return "TO SHIP";
      case "SHIPPED":
      case "IN_TRANSIT":
        return "IN TRANSIT";
      case "DELIVERED":
        return "DELIVERED";
      case "RECEIVED":
        return "RECEIVED";
      case "COMPLETED":
        return "COMPLETED";
      case "REVIEWED":
        return "REVIEWED";
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "SOLD";
    }
  };

  // Filter data based on order status
  const filtered = soldListings.filter((listing) => {
    const status = normalizeOrderStatus(listing.orderStatus);

    if (filter === "All") {
      // "All" 包含所有状态（包括取消）
      return true;
    }

    if (!status) {
      return false;
    }

    const allowedStatuses = filterStatusMap[filter] ?? [];
    return allowedStatuses.includes(status);
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Filter button */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setDropdownOpen((v) => !v)}
        >
          <Text style={{ fontSize: 16, fontWeight: '500' }}>{filterLabels[filter] ?? filter} ▼</Text>
        </TouchableOpacity>

        {/* Floating dropdown anchored to the button */}
        {dropdownOpen && (
          <>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setDropdownOpen(false)}
              style={styles.backdrop}
            />
            <View style={styles.dropdownFloating}>
              {[
                { label: "All", value: "All" as SoldFilter },
                { label: "To Ship", value: "ToShip" as SoldFilter },
                { label: "In Transit", value: "InTransit" as SoldFilter },
                { label: "Completed", value: "Completed" as SoldFilter },
                { label: "Cancelled", value: "Cancelled" as SoldFilter },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFilter(opt.value);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 10 }}>Loading orders...</Text>
        </View>
      )}

      {/* Error state */}
      {error && !loading && (
        <View style={styles.centered}>
          <Text style={{ color: "red", textAlign: "center", marginBottom: 10 }}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(null);
              loadSoldListings();
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            You haven't sold anything yet.{"\n"}List items to start selling!
          </Text>
        </View>
      )}

      {/* Item grid */}
      {!loading && !error && filtered.length > 0 && (
        <FlatList
          data={formatData(filtered, 3)}
          keyExtractor={(item) => (item as any).empty ? `sold-blank-${(item as any).id}` : `sold-${String((item as any).orderId ?? item.id)}`}
          numColumns={3}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) =>
            item.empty ? (
              <View style={[styles.item, styles.itemInvisible]} />
            ) : (
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  if (!item.id) return;
                  // 🔥 导航到订单详情页面，根据订单状态显示不同的管理功能
                  const params = { 
                    id: item.orderId?.toString() || item.id, 
                    source: "sold" as const,
                    conversationId: item.conversationId || undefined
                  };
                  console.log("🔍 SoldTab navigating to OrderDetail with params:", params);
                  console.log("🔍 SoldTab conversationId:", item.conversationId);
                  navigation.navigate("OrderDetail", params);
                }}
              >
                <Image 
                  source={{ uri: item.images?.[0] || "https://via.placeholder.com/100x100" }} 
                  style={styles.image} 
                />
                <View style={styles.overlay}>
                  <Text
                    style={styles.overlayText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {getOverlayText(item.orderStatus)}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "relative",
    zIndex: 10,
  },
  filterBtn: {
    fontSize: 16,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: -16,
    right: -16,
    bottom: -8,
  },
  dropdownFloating: {
    position: "absolute",
    top: 44,
    left: 16,
    width: 200,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#111",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  retryBtn: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  overlayText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

