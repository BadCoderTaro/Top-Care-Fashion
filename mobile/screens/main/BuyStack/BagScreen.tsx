import React, { useMemo, useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { BuyStackParamList } from "./index";
import type { BagItem, ListingItem, Gender } from "../../../types/shop";
import { DEFAULT_BAG_ITEMS } from "../../../mocks/shop";
import { cartService, CartItem } from "../../../src/services";

const BASE_DATE_ISO = new Date(0).toISOString();

// Helper to format size label
const formatSizeLabel = (value?: string | null) => {
  if (!value || value === "Select" || value === "null") return "Not specified";
  return value;
};

// Condition type mapping from database enum to display string
const CONDITION_TYPE_MAP: Record<string, string> = {
  "NEW": "Brand New",
  "BRAND_NEW": "Brand New",
  "LIKE_NEW": "Like New",
  "GOOD": "Good",
  "FAIR": "Fair",
  "POOR": "Poor",
};

// Helper to format condition label
const formatConditionLabel = (value?: string | null) => {
  if (!value) return "Not specified";
  return CONDITION_TYPE_MAP[value] || value;
};

// Helper to validate and convert gender string to Gender type
const normalizeGender = (gender: string | undefined | null): Gender | null | undefined => {
  if (!gender) return undefined;
  if (gender === "Men" || gender === "Women" || gender === "Unisex") {
    return gender as Gender;
  }
  return undefined;
};

const normalizeListingItem = (item: ListingItem): ListingItem => ({
  ...item,
  brand: item.brand ?? null,
  size: item.size ?? null,
  condition: item.condition ?? null,
  material: item.material ?? undefined,
  gender: item.gender ?? undefined,
  tags: item.tags ?? undefined,
  category: item.category ?? null,
  shippingOption: item.shippingOption ?? null,
  shippingFee: item.shippingFee ?? null,
  location: item.location ?? null,
  seller: {
    ...item.seller,
    id: item.seller.id,
  },
});

const cartItemToListingItem = (item: CartItem["item"]): ListingItem =>
  normalizeListingItem({
    id: item.id,
    title: item.title,
    price: item.price,
    description: item.description,
    brand: item.brand ?? null,
    size: item.size ?? null,
    condition: item.condition ?? null,
    material: item.material ?? undefined,
    gender: normalizeGender(item.gender),
    tags: item.tags ?? undefined,
    images: item.images ?? [],
    category: (item.category ?? null) as ListingItem["category"],
    shippingOption: item.shippingOption ?? null,
    shippingFee: item.shippingFee ?? null,
    location: item.location ?? null,
    availableQuantity: item.availableQuantity, // 🔥 保留库存数量
    seller: {
      id: item.seller.id,
      name: item.seller.name,
      avatar: item.seller.avatar,
      rating: item.seller.rating,
      sales: item.seller.sales,
    },
  });

const convertBagItemsToCartItems = (bagItems: BagItem[]): CartItem[] =>
  bagItems.map((bagItem, index) => ({
    id: -(index + 1),
    quantity: bagItem.quantity,
    created_at: BASE_DATE_ISO,
    updated_at: BASE_DATE_ISO,
    item: {
      id: bagItem.item.id,
      title: bagItem.item.title,
      price: typeof bagItem.item.price === "number"
        ? bagItem.item.price
        : Number(bagItem.item.price || 0),
      description: bagItem.item.description,
      brand: bagItem.item.brand ?? "",
      size: bagItem.item.size ?? "",
      condition: bagItem.item.condition ?? "",
      material: bagItem.item.material ?? undefined,
      gender: bagItem.item.gender ?? undefined,
      tags: bagItem.item.tags ?? undefined,
      category: bagItem.item.category ?? undefined,
      images: bagItem.item.images ?? [],
      shippingOption: bagItem.item.shippingOption ?? null,
      shippingFee: bagItem.item.shippingFee ?? null,
      location: bagItem.item.location ?? null,
      seller: {
        id: bagItem.item.seller.id ?? -(index + 1),
        name: bagItem.item.seller.name,
        avatar: bagItem.item.seller.avatar,
        rating: bagItem.item.seller.rating,
        sales: bagItem.item.seller.sales,
      },
    },
  }));

const cartItemsToBagItems = (cartItems: CartItem[]): BagItem[] =>
  cartItems.map((cartItem) => ({
    item: cartItemToListingItem(cartItem.item),
    quantity: cartItem.quantity,
  }));

const isCartItemEntry = (entry: CartItem | BagItem): entry is CartItem =>
  typeof (entry as CartItem).created_at === "string";

export default function BagScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyStackParamList>>();
  const route = useRoute<RouteProp<BuyStackParamList, "Bag">>();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 使用传入的items作为fallback，或者从API获取
  const isReadOnly = Array.isArray(route.params?.items);
  const displayItems: BagItem[] = useMemo(() => {
    if (route.params?.items) {
      return route.params.items.map((bagItem) => ({
        item: normalizeListingItem(bagItem.item),
        quantity: bagItem.quantity,
      }));
    }
    const bagItems = cartItemsToBagItems(cartItems);
    console.log('🛒 displayItems from cartItems:', bagItems.map(item => ({
      id: item.item.id,
      title: item.item.title,
      quantity: item.quantity,
    })));
    return bagItems;
  }, [route.params?.items, cartItems]);

  // 加载购物车数据
  useEffect(() => {
    const loadCartItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await cartService.getCartItems();
        setCartItems(items);
      } catch (err) {
        console.error('Error loading cart items:', err);
        setError('Failed to load cart items');
        // 如果API失败，使用默认数据
        setCartItems(convertBagItemsToCartItems(DEFAULT_BAG_ITEMS));
      } finally {
        setLoading(false);
      }
    };

    // 如果没有传入items参数，则从API加载
    if (!route.params?.items) {
      loadCartItems();
    } else {
      setLoading(false);
    }
  }, [route.params?.items]);

  const { subtotal, shipping, total } = useMemo(() => {
    const computedSubtotal = displayItems.reduce(
      (sum, current) => {
        const price = typeof current.item.price === 'number' ? current.item.price : parseFloat(current.item.price || '0');
        return sum + price * current.quantity;
      },
      0,
    );
    // 🔥 使用真实的 shipping fee 数据
    // 累加所有商品的 shipping fee（如果商品有运费的话）
    const shippingFee = displayItems.reduce((sum, current) => {
      const fee = current.item.shippingFee ? Number(current.item.shippingFee) : 0;
      return sum + fee;
    }, 0);
    return {
      subtotal: computedSubtotal,
      shipping: shippingFee,
      total: computedSubtotal + shippingFee,
    };
  }, [displayItems]);

  // 🔥 检查是否有库存问题（用于禁用 checkout 按钮）
  const hasStockIssues = useMemo(() => {
    return displayItems.some(bagItem => {
      const availableQty = bagItem.item.availableQuantity;
      if (availableQty === undefined || availableQty === null) {
        return false; // 如果库存字段不存在，允许继续（向后兼容）
      }
      return availableQty <= 0 || availableQty < bagItem.quantity;
    });
  }, [displayItems]);

  // 删除商品
  const removeItem = async (cartItemId: number | undefined) => {
    if (isReadOnly || cartItemId === undefined) {
      return;
    }
    try {
      await cartService.removeCartItem(cartItemId);
      // 更新本地状态
      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
    } catch (err) {
      console.error('Error removing item:', err);
      Alert.alert('Error', 'Failed to remove item');
    }
  };

  // 🔥 更新商品数量
  const updateQuantity = async (cartItemId: number | undefined, newQuantity: number) => {
    if (isReadOnly || cartItemId === undefined || newQuantity < 1) {
      return;
    }
    
    // 🔥 查找对应的购物车商品
    const cartItem = cartItems.find(item => item.id === cartItemId);
    if (!cartItem) {
      console.error('Cart item not found:', cartItemId);
      return;
    }
    
    // 🔥 检查库存限制
    const listingItem = cartItemToListingItem(cartItem.item);
    if (listingItem.availableQuantity !== undefined && listingItem.availableQuantity !== null) {
      if (listingItem.availableQuantity <= 0) {
        Alert.alert(
          'Out of Stock',
          'This item is currently out of stock.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (newQuantity > listingItem.availableQuantity) {
        Alert.alert(
          'Insufficient Stock',
          `Only ${listingItem.availableQuantity} item(s) available.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    try {
      console.log('🔄 Updating cart item:', { cartItemId, newQuantity });
      const updatedItem = await cartService.updateCartItem(cartItemId, newQuantity);
      console.log('✅ Cart item updated:', updatedItem);
      
      // 更新本地状态
      setCartItems(prev => {
        const updated = prev.map(item => 
          item.id === cartItemId 
            ? { ...item, quantity: newQuantity } 
            : item
        );
        console.log('🔄 Updated cartItems:', updated.map(i => ({ id: i.id, quantity: i.quantity })));
        return updated;
      });
    } catch (err) {
      console.error('Error updating quantity:', err);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Header title="My Bag" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </View>
    );
  }

  if (error && displayItems.length === 0) {
    return (
      <View style={styles.screen}>
        <Header title="My Bag" showBack />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              cartService.getCartItems()
                .then(setCartItems)
                .catch(() => setError('Failed to load cart items'))
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title="My Bag" showBack />

      {displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="bag-handle-outline" size={42} color="#bbb" />
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptySubtitle}>Add items to see them appear here.</Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => {
              const parent = (navigation as any).getParent?.();
              if (parent?.reset) {
                parent.reset({
                  index: 0,
                  routes: [
                    { name: "Main", params: { screen: "Home", params: { screen: "HomeMain" } } },
                  ],
                });
              } else {
                parent?.navigate?.("Main", { screen: "Home", params: { screen: "HomeMain" } });
              }
            }}
          >
            <Text style={styles.exploreText}>Explore listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.itemsCard}>
            {displayItems.map((bagItem, index) => {
              const linkedCartItem = cartItems.find(cart => cart.item.id === bagItem.item.id);
              const cartId = linkedCartItem?.id;
              const quantity = linkedCartItem?.quantity ?? bagItem.quantity;
              const listing = bagItem.item;
              const canModify = Boolean(linkedCartItem);
              
              console.log('🔍 BagScreen item:', {
                listingId: listing.id,
                title: listing.title,
                bagItemQuantity: bagItem.quantity,
                linkedCartQuantity: linkedCartItem?.quantity,
                finalQuantity: quantity,
                availableQuantity: listing.availableQuantity,
              });
              
              return (
                <View key={`${listing.id}-${index}`} style={styles.itemRow}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ListingDetail", { listingId: listing.id.toString() })}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: listing.images[0] }} style={styles.itemImage} />
                  </TouchableOpacity>

                  <View style={styles.itemContent}>
                    {/* 标题行 - 跨越整个宽度，可点击 */}
                    <TouchableOpacity
                      onPress={() => navigation.navigate("ListingDetail", { listingId: listing.id.toString() })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.itemTitle} numberOfLines={2}>{listing.title}</Text>
                    </TouchableOpacity>

                    {/* 底部信息行 */}
                    <View style={styles.bottomRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemMeta}>Size {formatSizeLabel(listing.size)}</Text>
                        <Text style={styles.itemMeta}>{formatConditionLabel(listing.condition)}</Text>
                        <Text style={styles.itemPrice}>${typeof listing.price === 'number' ? listing.price.toFixed(2) : parseFloat(listing.price || '0').toFixed(2)}</Text>
                      </View>

                      <View style={styles.itemActions}>
                        {/* 🔥 库存警告 */}
                        {listing.availableQuantity !== undefined && (
                          <>
                            {listing.availableQuantity <= 0 ? (
                              <Text style={styles.stockWarning}>Out of stock</Text>
                            ) : listing.availableQuantity < quantity ? (
                              <Text style={styles.stockWarning}>
                                Only {listing.availableQuantity} left
                              </Text>
                            ) : null}
                          </>
                        )}

                        {/* 🔥 数量选择器 + 删除按钮 */}
                        <View style={styles.actionsRow}>
                          <View style={styles.quantitySelector}>
                            <TouchableOpacity
                              style={[
                                styles.quantityBtn,
                                (!canModify || quantity <= 1) && styles.quantityBtnDisabled
                              ]}
                              disabled={!canModify || quantity <= 1}
                              onPress={() => updateQuantity(cartId, quantity - 1)}
                            >
                              <Text style={styles.quantityBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{quantity}</Text>
                            <TouchableOpacity
                              style={[
                                styles.quantityBtn,
                                (!canModify || (listing.availableQuantity !== undefined && quantity >= listing.availableQuantity)) && styles.quantityBtnDisabled
                              ]}
                              disabled={!canModify || (listing.availableQuantity !== undefined && quantity >= listing.availableQuantity)}
                              onPress={() => updateQuantity(cartId, quantity + 1)}
                            >
                              <Text style={styles.quantityBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={styles.removeBtn}
                            disabled={!canModify}
                            onPress={() => removeItem(cartId)}
                          >
                            <Icon name="trash-outline" size={16} color="#F54B3D" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={styles.summaryTotal}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {displayItems.length > 0 ? (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              const parent = (navigation as any).getParent?.();
              if (parent?.reset) {
                parent.reset({
                  index: 0,
                  routes: [
                    { name: "Main", params: { screen: "Home", params: { screen: "HomeMain" } } },
                  ],
                });
              } else {
                parent?.navigate?.("Main", { screen: "Home", params: { screen: "HomeMain" } });
              }
            }}
          >
            <Text style={styles.secondaryText}>Continue browsing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              hasStockIssues && styles.primaryButtonDisabled,
            ]}
            disabled={hasStockIssues}
            onPress={() => {
              // 🔥 验证库存（同时检查 undefined 和 null）
              const outOfStockItems = displayItems.filter(
                bagItem => bagItem.item.availableQuantity !== undefined && 
                           bagItem.item.availableQuantity !== null &&
                           bagItem.item.availableQuantity <= 0
              );
              
              const insufficientStockItems = displayItems.filter(
                bagItem => bagItem.item.availableQuantity !== undefined &&
                           bagItem.item.availableQuantity !== null &&
                           bagItem.item.availableQuantity > 0 &&
                           bagItem.item.availableQuantity < bagItem.quantity
              );
              
              if (outOfStockItems.length > 0) {
                const itemNames = outOfStockItems.map(b => b.item.title).join(', ');
                Alert.alert(
                  'Out of Stock',
                  `The following items are out of stock: ${itemNames}. Please remove them before proceeding.`,
                  [{ text: 'OK' }]
                );
                return;
              }
              
              if (insufficientStockItems.length > 0) {
                const itemNames = insufficientStockItems.map(b => b.item.title).join(', ');
                Alert.alert(
                  'Insufficient Stock',
                  `The following items have insufficient stock: ${itemNames}. Please update quantities.`,
                  [{ text: 'OK' }]
                );
                return;
              }
              
              console.log('🔍 BagScreen navigating to Checkout with:', {
                itemsCount: displayItems.length,
                items: displayItems.map(item => ({
                  id: item.item.id,
                  title: item.item.title,
                  quantity: item.quantity,
                })),
                subtotal,
                shipping,
              });
              
              navigation.navigate("Checkout", {
                items: displayItems,
                subtotal,
                shipping,
              });
            }}
          >
            <Text style={[
              styles.primaryText,
              hasStockIssues && styles.primaryTextDisabled,
            ]}>
              {hasStockIssues ? 'Check stock issues' : 'Proceed to checkout'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: {
    padding: 16,
    rowGap: 16,
    paddingBottom: 140,
  },
  itemsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    padding: 16,
    columnGap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  itemImage: {
    width: 76,
    height: 84,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
  },
  itemContent: {
    flex: 1,
    rowGap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  itemInfo: {
    flex: 1,
    rowGap: 2,
  },
  itemMeta: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  // 🔥 库存警告样式
  stockWarning: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F54B3D",
    marginBottom: 4,
    alignSelf: "flex-end",
  },
  itemActions: {
    alignItems: "flex-end",
    justifyContent: "center",
    rowGap: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnDisabled: {
    backgroundColor: "#e0e0e0",
    opacity: 0.5,
  },
  quantityBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  summaryCard: {
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    rowGap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: "#555" },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
  },
  summaryTotal: { fontSize: 16, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    columnGap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  secondaryText: { fontSize: 14, fontWeight: "600", color: "#111" },
  primaryButton: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  primaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  primaryTextDisabled: {
    color: "#999",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    rowGap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#222" },
  emptySubtitle: { fontSize: 14, color: "#666", textAlign: "center" },
  exploreBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#111",
  },
  exploreText: { color: "#fff", fontWeight: "700" },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F54B3D',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
