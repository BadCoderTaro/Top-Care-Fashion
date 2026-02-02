import React, { useMemo, useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, Modal, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import PaymentSelector from "../../../components/PaymentSelector";
import type { BuyStackParamList } from "./index";
import {
  DEFAULT_PAYMENT_METHOD,
  DEFAULT_SHIPPING_ADDRESS,
} from "../../../mocks/shop";
import { 
  ordersService, 
  paymentMethodsService, 
  addressService,
  cartService,
  type PaymentMethod,
  type ShippingAddress,
  type CreateAddressRequest,
} from "../../../src/services";
import { messagesService } from "../../../src/services/messagesService";
import { useAuth } from "../../../contexts/AuthContext";

function getDeliveryEstimate(): string {
  const today = new Date();
  const delivery = new Date(today);
  delivery.setDate(delivery.getDate() + 3); // 🔥 新加坡3天内配送
  return delivery.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyStackParamList>>();
  const {
    params: { items, subtotal, shipping, conversationId },
  } = useRoute<RouteProp<BuyStackParamList, "Checkout">>();
  const { user } = useAuth();

  // 🔥 状态管理 - 地址和付款方式
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // 🔥 地址管理状态
  const [defaultAddress, setDefaultAddress] = useState<ShippingAddress | null>(null);
  const [allAddresses, setAllAddresses] = useState<ShippingAddress[]>([]);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<CreateAddressRequest>({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    isDefault: false,
  });
  
  // 🔥 编辑状态管理
  const [editingField, setEditingField] = useState<'personal' | 'payment' | null>(null);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const normalizedItems = useMemo(
    () =>
      items.map((bagItem) => ({
        ...bagItem,
        quantity: Number(bagItem.quantity ?? 1),
      })),
    [items]
  );

  const totalQuantity = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    [normalizedItems]
  );

  const computedSubtotal = useMemo(
    () =>
      normalizedItems.reduce((sum, bagItem) => {
        const price =
          typeof bagItem.item.price === "number"
            ? bagItem.item.price
            : parseFloat(bagItem.item.price || "0");
        const quantity = bagItem.quantity ?? 1;
        return sum + price * quantity;
      }, 0),
    [normalizedItems]
  );

  const shippingTotal = useMemo(() => {
    if (typeof shipping === "number") return shipping;
    const parsed = Number(shipping || 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [shipping]);

  const total = useMemo(
    () => computedSubtotal + shippingTotal,
    [computedSubtotal, shippingTotal]
  );
  const deliveryEstimate = useMemo(() => getDeliveryEstimate(), []);

  // 🔥 加载所有地址
  const loadAllAddresses = async () => {
    try {
      const addresses = await addressService.getAddresses();
      setAllAddresses(addresses);
    } catch (err) {
      console.warn('Failed to load addresses', err);
    }
  };

  // 🔥 从后端加载用户默认支付方式和地址
  useEffect(() => {
    let mounted = true;
    
    const loadDefaults = async () => {
      try {
        // 加载默认支付方式
        const defPayment = await paymentMethodsService.getDefaultPaymentMethod();
        if (!mounted) return;
        if (defPayment) {
          setSelectedPaymentMethodId(defPayment.id);
          setPaymentMethod({
            label: defPayment.label,
            brand: defPayment.brand || 'Card',
            last4: defPayment.last4 || '0000',
          });
        }
        
        // 加载所有地址
        const addresses = await addressService.getAddresses();
        if (!mounted) return;
        setAllAddresses(addresses);
        
        // 加载默认地址
        const defAddress = addresses.find(addr => addr.isDefault) || null;
        if (defAddress) {
          setDefaultAddress(defAddress);
          setShippingAddress(defAddress);
        }
      } catch (err) {
        console.warn('Failed to load defaults', err);
      }
    };

    loadDefaults();
    return () => { mounted = false; };
  }, []);

  // 🔥 格式化地址函数
  const formatCurrentAddress = () => {
    if (!shippingAddress) return '';
    const parts = [shippingAddress.line1];
    if (shippingAddress.line2) parts.push(shippingAddress.line2);
    parts.push(
      `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`,
    );
    parts.push(shippingAddress.country);
    return parts.join("\n");
  };

  // 🔥 打开地址选择器
  const handleOpenAddressSelector = async () => {
    await loadAllAddresses();
    setShowAddressSelector(true);
  };

  // 🔥 选择地址
  const handleSelectAddress = (address: ShippingAddress) => {
    setDefaultAddress(address);
    setShippingAddress(address);
    setShowAddressSelector(false);
  };

  // 🔥 编辑地址
  const handleEditAddress = (address: ShippingAddress) => {
    setEditingAddress(address);
    setEditForm({
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    });
    setShowAddressSelector(false);
    setEditingField('personal');
  };

  // 🔥 删除地址
  const handleDeleteAddress = async (addressId: number) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await addressService.deleteAddress(addressId);
              await loadAllAddresses();
              
              // 如果删除的是当前选中的地址，清除选择
              if (defaultAddress?.id === addressId) {
                const remainingAddresses = allAddresses.filter(a => a.id !== addressId);
                const newDefault = remainingAddresses.find(a => a.isDefault) || remainingAddresses[0] || null;
                setDefaultAddress(newDefault);
                setShippingAddress(newDefault);
              }
            } catch (error) {
              console.error('Failed to delete address:', error);
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  // 🔥 编辑功能（仅用于支付方式）
  const handleEditField = (field: 'personal' | 'payment') => {
    if (field === 'personal') {
      handleOpenAddressSelector();
      return;
    }
    setEditingField(field);
  };

  const handleSaveEdit = async () => {
    if (editingField === 'personal' && editingAddress) {
      try {
        // 调用 API 更新地址
        const updatedAddress = await addressService.updateAddress(editingAddress.id, {
          name: editForm.name,
          phone: editForm.phone,
          line1: editForm.line1,
          line2: editForm.line2,
          city: editForm.city,
          state: editForm.state,
          postalCode: editForm.postalCode,
          country: editForm.country
        });
        
        // 更新地址列表
        await loadAllAddresses();
        
        // 如果更新的是当前选中的地址，更新状态
        if (defaultAddress?.id === editingAddress.id) {
          setDefaultAddress(updatedAddress);
          setShippingAddress(updatedAddress);
        }
        
        setEditingAddress(null);
        Alert.alert('Success', 'Address updated successfully');
      } catch (error) {
        console.error('Failed to update address:', error);
        Alert.alert('Error', 'Failed to update address');
        return;
      }
    }
    setEditingField(null);
    setEditingAddress(null);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingAddress(null);
  };

  // 🔥 处理添加地址
  const handleAddAddress = () => {
    setAddressForm({
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      isDefault: false,
    });
    setShowAddAddressForm(true);
  };

  const handleSaveNewAddress = async () => {
    // 验证必填字段
    if (!addressForm.name || !addressForm.phone || !addressForm.line1 || 
        !addressForm.city || !addressForm.state || !addressForm.country || 
        !addressForm.postalCode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const newAddress = await addressService.createAddress(addressForm);
      
      // 重新加载地址列表
      await loadAllAddresses();
      
      // 如果这是第一个地址或设置为默认，使用它
      if (!defaultAddress || addressForm.isDefault) {
        setDefaultAddress(newAddress);
        setShippingAddress(newAddress);
      }
      
      setShowAddAddressForm(false);
      Alert.alert('Success', 'Address added successfully');
    } catch (error) {
      console.error('Failed to save address:', error);
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleCancelAddAddress = () => {
    setShowAddAddressForm(false);
  };

  // 🔥 创建真实订单
  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in to place an order");
      return;
    }

    // 🔥 验证地址 - 必须要有真实地址
    if (!defaultAddress || !shippingAddress) {
      Alert.alert(
        "Missing Shipping Address", 
        "Please add a shipping address before placing an order",
        [
          {
            text: "Add Address",
            onPress: () => handleAddAddress(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    // 🔥 验证地址字段完整性
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.line1 || 
        !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode || 
        !shippingAddress.country) {
      Alert.alert(
        "Invalid Address", 
        "Please complete all required address fields",
        [
          {
            text: "Edit Address",
            onPress: () => handleEditField('personal'),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    // 🔥 验证支付方式
    if (!selectedPaymentMethodId) {
      Alert.alert("Missing Payment Method", "Please select a payment method");
      return;
    }

    try {
      setIsCreatingOrder(true);
      
      // 🔥 获取完整的支付方式数据
      const methods = await paymentMethodsService.getPaymentMethods();
      const fullPaymentMethod = methods.find(m => m.id === selectedPaymentMethodId);
      
      if (!fullPaymentMethod) {
        Alert.alert("Error", "Selected payment method not found");
        return;
      }
      
      // 🔥 为每个商品创建订单
      const createdOrders = [];
      for (const bagItem of normalizedItems) {
        console.log("🔍 Creating order for item:", bagItem.item.id);
        console.log("🔍 Item details:", {
          id: bagItem.item.id,
          title: bagItem.item.title,
          seller: bagItem.item.seller,
        });

        // 🔥 使用 id 作为 listing_id
        const listingId = bagItem.item.id;
        if (!listingId) {
          console.error("❌ Missing id in item:", bagItem.item);
          Alert.alert(
            "Error",
            `Cannot create order for "${bagItem.item.title}": missing listing information. Please try again.`
          );
          setIsCreatingOrder(false);
          return;
        }
        console.log("✅ Final listing_id to use:", listingId);

        const newOrder = await ordersService.createOrder({
          listing_id: Number(listingId),
          quantity: bagItem.quantity || 1, // 🔥 购买数量
          buyer_name: shippingAddress.name,
          buyer_phone: shippingAddress.phone,
          shipping_address: `${shippingAddress.line1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`,
          payment_method: fullPaymentMethod.brand || 'Card',
          payment_method_id: fullPaymentMethod.id, // 🔥 使用后端支付方式 ID
          payment_details: {
            brand: fullPaymentMethod.brand,
            last4: fullPaymentMethod.last4,
            expiry: fullPaymentMethod.expiryMonth && fullPaymentMethod.expiryYear 
              ? `${String(fullPaymentMethod.expiryMonth).padStart(2, '0')}/${fullPaymentMethod.expiryYear}` 
              : 'N/A',
          }
        });
        
        console.log("✅ Order created successfully:", newOrder);
        createdOrders.push(newOrder);
      }
      
      // 🔥 订单创建成功，删除购物车中对应的商品
      try {
        console.log("🛒 Removing items from cart after successful order...");
        const cartItems = await cartService.getCartItems();
        
        // 对于每个已下单的商品，查找并删除购物车中对应的商品
        for (const bagItem of normalizedItems) {
          const listingId = bagItem.item.id;
          if (!listingId) continue;
          
          // 查找购物车中匹配的商品（通过 listing_id）
          const matchingCartItem = cartItems.find(
            cartItem => cartItem.item.id === listingId.toString() || 
                       cartItem.item.id === listingId
          );
          
          if (matchingCartItem) {
            try {
              await cartService.removeCartItem(matchingCartItem.id);
              console.log(`✅ Removed cart item ${matchingCartItem.id} for listing ${listingId}`);
            } catch (error) {
              console.warn(`⚠️ Failed to remove cart item ${matchingCartItem.id}:`, error);
              // 继续处理其他商品，不因为单个删除失败而中断
            }
          }
        }
        console.log("✅ Cart cleanup completed");
      } catch (error) {
        console.warn("⚠️ Failed to remove items from cart:", error);
        // 即使删除购物车商品失败，也不影响订单创建成功的流程
      }
      
      // 🔥 订单创建成功，显示成功消息并跳转到 ChatScreen
      console.log("✅ Order created successfully:", createdOrders);
      
      // 🔥 使用第一个创建的订单信息
      const firstOrder = createdOrders[0];
      if (firstOrder && firstOrder.id) {
        Alert.alert(
          "Order Created", 
          "Your order has been placed successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                // 🔥 跳转到 Inbox -> Chat 显示新订单
                const rootNavigation = (navigation as any).getParent?.() || navigation;
                if (rootNavigation) {
                  try {
                    // 构造订单数据以便在 ChatScreen 显示
                    const primaryItem = normalizedItems[0];
                    const orderData = {
                      id: firstOrder.id.toString(),
                      product: {
                        title: primaryItem?.item.title || "Item",
                        price: primaryItem?.item.price || 0,
                        size: primaryItem?.item.size,
                        image: primaryItem?.item.images?.[0] || null,
                        shippingFee: shippingTotal,
                      },
                      seller: {
                        id: primaryItem?.item.seller?.id,
                        name: primaryItem?.item.seller?.name || "Seller",
                        avatar: primaryItem?.item.seller?.avatar || "",
                      },
                      buyer: {
                        id: user?.id,
                        name: user?.username || "Buyer",
                        avatar: user?.avatar_url || "",
                      },
                      status: "IN_PROGRESS",
                      listing_id: primaryItem?.item.id,
                      buyer_id: user?.id ? Number(user.id) : undefined,
                      seller_id: primaryItem?.item.seller?.id,
                    };
                    
                    console.log("🔍 Navigating to Chat with order data:", orderData);
                    
                    // 🔥 重置导航栈，确保不能返回到 CheckoutScreen
                    // 直接导航到 Inbox -> Chat，并重置导航历史
                    rootNavigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [
                          {
                            name: "Main",
                            state: {
                              routes: [
                                { name: "Home" },
                                { name: "Discover" },
                                { name: "Sell" },
                                {
                                  name: "Inbox",
                                  state: {
                                    routes: [
                                      { name: "InboxMain" },
                                      {
                                        name: "Chat",
                                        params: {
                                          sender: orderData.seller.name,
                                          kind: "order",
                                          order: orderData,
                                          conversationId: conversationId || null,
                                          autoSendPaidMessage: false
                                        }
                                      }
                                    ],
                                    index: 1
                                  }
                                },
                                { name: "My TOP" }
                              ],
                              index: 3
                            }
                          }
                        ]
                      })
                    );
                  } catch (error) {
                    console.error("❌ Error navigating to Chat:", error);
                    // 🔥 导航出错时，也重置到 Inbox，避免回到 CheckoutScreen
                    const rootNav = (navigation as any).getParent?.();
                    if (rootNav) {
                      rootNav.dispatch(
                        CommonActions.reset({
                          index: 0,
                          routes: [
                            {
                              name: "Main",
                              params: { screen: "Inbox" }
                            }
                          ]
                        })
                      );
                    }
                  }
                } else {
                  // 🔥 如果没有订单ID，也重置到 Inbox
                  const rootNav = (navigation as any).getParent?.();
                  if (rootNav) {
                    rootNav.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [
                          {
                            name: "Main",
                            params: { screen: "Inbox" }
                          }
                        ]
                      })
                    );
                  }
                }
              }
            }
          ]
        );
      } else {
        Alert.alert("Success", "Order created successfully!");
        // 🔥 重置到 Inbox，避免回到 CheckoutScreen
        const rootNav = (navigation as any).getParent?.();
        if (rootNav) {
          rootNav.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: "Main",
                  params: { screen: "Inbox" }
                }
              ]
            })
          );
        }
      }
      
    } catch (error) {
      console.error("❌ Error creating order:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack",
        error: error
      });
      Alert.alert(
        "Error", 
        error instanceof Error ? error.message : "Failed to create order. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="Checkout" showBack />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            {defaultAddress && (
              <TouchableOpacity accessibilityRole="button" onPress={() => handleEditField('personal')}>
                <Text style={styles.sectionAction}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {defaultAddress ? (
            <>
              {/* 显示默认地址 */}
              {shippingAddress && (
                <View style={styles.defaultAddressCard}>
                  <Text style={styles.addressName}>{shippingAddress.name}</Text>
                  <Text style={styles.addressPhone}>{shippingAddress.phone}</Text>
                  <Text style={styles.addressBody}>{formatCurrentAddress()}</Text>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                </View>
              )}
              
              {/* Add Address 按钮 */}
              <TouchableOpacity 
                style={styles.addAddressButton}
                onPress={handleAddAddress}
              >
                <Icon name="add-circle-outline" size={20} color="#0066FF" />
                <Text style={styles.addAddressText}>Add new address</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* 没有默认地址时显示提示和按钮 */}
              <Text style={styles.noAddressText}>No shipping address saved</Text>
              <TouchableOpacity 
                style={styles.addAddressButtonPrimary}
                onPress={handleAddAddress}
              >
                <Icon name="add-circle" size={20} color="#fff" />
                <Text style={styles.addAddressTextPrimary}>Add shipping address</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => handleEditField('payment')}>
              <Text style={styles.sectionAction}>Change</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paymentRow}>
            <Icon name="card" size={20} color="#111" />
            <Text style={styles.paymentText}>
              {paymentMethod.brand} ending in {paymentMethod.last4}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <Text style={styles.summaryItems}>
              {totalQuantity} item{totalQuantity !== 1 ? "s" : ""} ({normalizedItems.length} listing{normalizedItems.length !== 1 ? "s" : ""})
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${computedSubtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>${shippingTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Delivery</Text>
            <Text style={styles.summaryValue}>{deliveryEstimate}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total</Text>
            <Text style={styles.summaryTotal}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.primaryButton, 
            (isCreatingOrder || !defaultAddress || !shippingAddress) && styles.primaryButtonDisabled
          ]}
          onPress={handlePlaceOrder}
          disabled={isCreatingOrder || !defaultAddress || !shippingAddress}
        >
          <Text style={styles.primaryText}>
            {isCreatingOrder ? "Creating Order..." : "Place order"}
          </Text>
        </TouchableOpacity>
        {(!defaultAddress || !shippingAddress) && (
          <Text style={styles.helperText}>Please add a shipping address to continue</Text>
        )}
      </View>

      {/* 🔥 地址选择器模态框 */}
      <Modal
        visible={showAddressSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          edges={["top", "bottom"]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddressSelector(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Address</Text>
            <TouchableOpacity onPress={() => {
              setShowAddressSelector(false);
              handleAddAddress();
            }}>
              <Text style={styles.modalSave}>Add New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {allAddresses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No addresses saved</Text>
                <TouchableOpacity 
                  style={styles.addAddressButtonPrimary}
                  onPress={() => {
                    setShowAddressSelector(false);
                    handleAddAddress();
                  }}
                >
                  <Icon name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addAddressTextPrimary}>Add your first address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              allAddresses.map((address) => {
                const isSelected = defaultAddress?.id === address.id;
                const formatAddress = () => {
                  const parts = [address.line1];
                  if (address.line2) parts.push(address.line2);
                  parts.push(`${address.city}, ${address.state} ${address.postalCode}`);
                  parts.push(address.country);
                  return parts.join('\n');
                };

                return (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.addressCard,
                      isSelected && styles.addressCardSelected
                    ]}
                    onPress={() => handleSelectAddress(address)}
                  >
                    <View style={styles.addressCardHeader}>
                      <View style={styles.addressCardInfo}>
                        <Text style={styles.addressCardName}>{address.name}</Text>
                        {address.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <Icon name="checkmark-circle" size={24} color="#0066FF" />
                      )}
                    </View>
                    <Text style={styles.addressCardPhone}>{address.phone}</Text>
                    <Text style={styles.addressCardBody}>{formatAddress()}</Text>
                    <View style={styles.addressCardActions}>
                      <TouchableOpacity
                        style={styles.addressActionButton}
                        onPress={() => handleEditAddress(address)}
                      >
                        <Icon name="create-outline" size={18} color="#0066FF" />
                        <Text style={styles.addressActionText}>Edit</Text>
                      </TouchableOpacity>
                      {allAddresses.length > 1 && (
                        <TouchableOpacity
                          style={[styles.addressActionButton, styles.addressActionButtonDanger]}
                          onPress={() => handleDeleteAddress(address.id)}
                        >
                          <Icon name="trash-outline" size={18} color="#FF6B6B" />
                          <Text style={[styles.addressActionText, styles.addressActionTextDanger]}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 🔥 编辑模态框 */}
      <Modal
        visible={editingField !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          edges={["top", "bottom"]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancelEdit}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingField === 'personal' && 'Edit Personal Information'}
              {editingField === 'payment' && 'Edit Payment'}
            </Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {editingField === 'personal' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholder="Enter your full name"
                  textAlignVertical="center"
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  textAlignVertical="center"
                />

                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.line1}
                  onChangeText={(text) => setEditForm({ ...editForm, line1: text })}
                  placeholder="Enter your street address"
                  textAlignVertical="center"
                />

                <Text style={styles.inputLabel}>Apartment, suite, etc. (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.line2}
                  onChangeText={(text) => setEditForm({ ...editForm, line2: text })}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  textAlignVertical="center"
                />

                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.city}
                  onChangeText={(text) => setEditForm({ ...editForm, city: text })}
                  placeholder="City"
                  textAlignVertical="center"
                />

                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.state}
                  onChangeText={(text) => setEditForm({ ...editForm, state: text })}
                  placeholder="State"
                  textAlignVertical="center"
                />

                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.postalCode}
                  onChangeText={(text) => setEditForm({ ...editForm, postalCode: text })}
                  placeholder="Postal Code"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />

                <Text style={styles.inputLabel}>Country</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.country}
                  onChangeText={(text) => setEditForm({ ...editForm, country: text })}
                  placeholder="Country"
                  textAlignVertical="center"
                />
              </View>
            )}

            {editingField === 'payment' && (
              <PaymentSelector
                selectedPaymentMethodId={selectedPaymentMethodId}
                onSelect={(method) => {
                  setSelectedPaymentMethodId(method?.id ?? null);
                  if (method) {
                    setPaymentMethod({
                      label: method.label,
                      brand: method.brand || 'Card',
                      last4: method.last4 || '0000',
                    });
                  }
                }}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 🔥 添加新地址模态框 */}
      <Modal
        visible={showAddAddressForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          edges={["top", "bottom"]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancelAddAddress}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Address</Text>
            <TouchableOpacity onPress={handleSaveNewAddress}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.name}
                onChangeText={(text) => setAddressForm({ ...addressForm, name: text })}
                placeholder="Enter your full name"
            textAlignVertical="center"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.phone}
                onChangeText={(text) => setAddressForm({ ...addressForm, phone: text })}
                placeholder="+1 (555) 123-4567"
                keyboardType="phone-pad"
            textAlignVertical="center"
              />

              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.line1}
                onChangeText={(text) => setAddressForm({ ...addressForm, line1: text })}
                placeholder="Street Address"
            textAlignVertical="center"
              />

              <Text style={styles.inputLabel}>Apartment, suite, etc. (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.line2}
                onChangeText={(text) => setAddressForm({ ...addressForm, line2: text })}
                placeholder="Apt/Suite"
            textAlignVertical="center"
              />

              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.city}
                onChangeText={(text) => setAddressForm({ ...addressForm, city: text })}
                placeholder="City"
            textAlignVertical="center"
              />

              <Text style={styles.inputLabel}>State/Province</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.state}
                onChangeText={(text) => setAddressForm({ ...addressForm, state: text })}
                placeholder="State"
            textAlignVertical="center"
              />

              <Text style={styles.inputLabel}>Postal Code</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.postalCode}
                onChangeText={(text) => setAddressForm({ ...addressForm, postalCode: text })}
                placeholder="12345"
                keyboardType="numeric"
            textAlignVertical="center"
              />

              <Text style={styles.inputLabel}>Country</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.country}
                onChangeText={(text) => setAddressForm({ ...addressForm, country: text })}
                placeholder="Country"
            textAlignVertical="center"
              />

              <View style={styles.checkboxRow}>
                <Text style={styles.checkboxLabel}>Make this my default address</Text>
                <TouchableOpacity
                  style={[styles.checkbox, addressForm.isDefault && styles.checkboxActive]}
                  onPress={() => setAddressForm({ ...addressForm, isDefault: !addressForm.isDefault })}
                >
                  {addressForm.isDefault && (
                    <Icon name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: {
    padding: 16,
    rowGap: 16,
    paddingBottom: 120,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eee",
    rowGap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2A7BF4",
  },
  addressName: {
    fontSize: 15,
    fontWeight: "600",
  },
  addressPhone: {
    fontSize: 13,
    color: "#666",
  },
  addressBody: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginTop: 4,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryItems: {
    fontSize: 13,
    color: "#666",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginVertical: 8,
  },
  summaryTotal: { fontSize: 16, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  primaryButton: {
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#bbb",
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  // 🔥 编辑相关样式
  editableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // 🔥 模态框样式
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  modalCancel: {
    fontSize: 16,
    color: "#666",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSave: {
    fontSize: 16,
    color: "#2A7BF4",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    minHeight: 46,
    includeFontPadding: false,
  },
  // 🔥 地址编辑布局样式
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  addressColumn: {
    flex: 1,
    marginRight: 8,
  },
  // 🔥 支付选项样式
  paymentOptions: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  paymentOptionSelected: {
    borderColor: "#2A7BF4",
    backgroundColor: "#E6F0FF",
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  paymentNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  paymentNoteText: {
    fontSize: 12,
    color: "#856404",
    lineHeight: 16,
  },
  // 🔥 新增地址相关样式
  defaultAddressCard: {
    position: 'relative',
    paddingTop: 8,
  },
  defaultBadge: {
    position: 'absolute',
    top: 8,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066FF',
  },
  addAddressButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#0066FF',
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  addAddressTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  noAddressText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 12,
  },
  checkbox: {
    width: 50,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  helperText: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
  // 🔥 地址选择器样式
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressCardSelected: {
    borderColor: '#0066FF',
    borderWidth: 2,
    backgroundColor: '#F0F7FF',
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  addressCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addressCardPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addressCardBody: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 12,
  },
  addressCardActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addressActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressActionButtonDanger: {
    marginLeft: 'auto',
  },
  addressActionText: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '500',
  },
  addressActionTextDanger: {
    color: '#FF6B6B',
  },
});