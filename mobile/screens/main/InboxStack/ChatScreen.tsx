import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, BackHandler } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import Icon from "../../../components/Icon";
import Header from "../../../components/Header";
import ASSETS from "../../../constants/assetUrls";
import { messagesService, ordersService, reviewsService, pollingService, type Message, type ConversationDetail } from "../../../src/services";
import { useAuth } from "../../../contexts/AuthContext";
import { premiumService } from "../../../src/services";
import Avatar from "../../../components/Avatar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Order = {
  id: string;
  product: {
    title: string;
    price: number;
    size?: string;
    image: string | null;
    shippingFee?: number; // 🔥 添加运费字段
  };
  seller: { 
    name: string;
    avatar?: string;
    id?: number | string;
    user_id?: number | string;
  };
  buyer?: {
    name: string;
    avatar?: string;
    id?: number | string;
    user_id?: number | string;
  };
  status: string;
  // 🔥 添加listing_id字段用于BuyNow功能
  listing_id?: number;
  seller_id?: number | string;
  buyer_id?: number | string;
};

type UserSummary = {
  id: number;
  username: string;
  avatar: string | null;
  isPremium?: boolean;
};

type ChatItem =
  | { 
      id: string; 
      type: "msg"; 
      sender: "me" | "other"; 
      text: string; 
      time?: string;
      senderInfo?: UserSummary;
    }
  | {
      id: string;
      type: "system";
      text: string;
      time?: string;
      sentByUser?: boolean;
      avatar?: string;
      orderId?: string;
      senderInfo?: UserSummary;
    }
  | { 
      id: string; 
      type: "orderCard"; 
      order: Order;
    }
  | { 
      id: string; 
      type: "reviewCta"; 
      text: string; 
      orderId: string;
      reviewType?: "buyer" | "seller";
    }
  | { 
      id: string; 
      type: "reviewReplyCta"; 
      text: string; 
      orderId: string;
      reviewType?: "buyer" | "seller";
    }
  | { 
      id: string; 
      type: "mutualReviewCta"; 
      text: string; 
      orderId: string;
    };

type OrderCardItem = Extract<ChatItem, { type: "orderCard" }>;
type MessageItem = Extract<ChatItem, { type: "msg" }>;
type SystemMessageItem = Extract<ChatItem, { type: "system" }>;
type ReviewReplyCtaItem = Extract<ChatItem, { type: "reviewReplyCta" }>;
type MutualReviewCtaItem = Extract<ChatItem, { type: "mutualReviewCta" }>;

const isOrderCardItem = (item: ChatItem): item is OrderCardItem => item.type === "orderCard";
const isMessageItem = (item: ChatItem): item is MessageItem => item.type === "msg";
const isSystemItem = (item: ChatItem): item is SystemMessageItem => item.type === "system";
const isReviewReplyItem = (item: ChatItem): item is ReviewReplyCtaItem => item.type === "reviewReplyCta";
const isMutualReviewItem = (item: ChatItem): item is MutualReviewCtaItem => item.type === "mutualReviewCta";

// 🔥 状态转换函数 - 与OrderDetailScreen保持一致
const getDisplayStatus = (status: string): string => {
  switch (status) {
    case "IN_PROGRESS": return "In Progress";
    case "TO_SHIP": return "To Ship";
    case "SHIPPED": return "Shipped";
    case "DELIVERED": return "Delivered";
    case "RECEIVED": return "Received";
    case "COMPLETED": return "Completed";
    case "REVIEWED": return "Reviewed";
    case "CANCELLED": return "Cancelled";
    case "Inquiry": return "Inquiry";
    default: return status;
  }
    };

    const resolveOrderId = (raw: any, fallback?: string): string => {
      const candidate =
        raw?.id ??
        raw?.order_id ??
        raw?.orderId ??
        raw?.listing_id ??
        raw?.listingId ??
        fallback ??
        null;

      if (candidate === null || candidate === undefined) {
        return `order-${Date.now()}`;
      }

      return String(candidate);
    };

    const normalizeOrder = (raw: any): Order => {
      const sellerId = raw?.seller?.id ?? raw?.seller_id ?? raw?.sellerId ?? raw?.seller_user_id;
      const buyerId = raw?.buyer?.id ?? raw?.buyer_id ?? raw?.buyerId ?? raw?.buyer_user_id;
      const listingIdRaw = raw?.listing_id ?? raw?.product?.listing_id ?? raw?.listingId;
      const priceRaw = raw?.product?.price ?? raw?.price ?? raw?.product_price ?? 0;
      const shippingRaw =
        raw?.product?.shippingFee ??
        raw?.product?.shipping_fee ??
        raw?.shippingFee ??
        raw?.shipping_fee;

      const statusRaw = raw?.status ?? raw?.order_status ?? "Inquiry";
      const normalizedStatus = statusRaw === "Active" ? "COMPLETED" : statusRaw;

      return {
        id: resolveOrderId(raw),
        product: {
          title: raw?.product?.title ?? raw?.title ?? "",
          price: Number(priceRaw) || 0,
          size: raw?.product?.size ?? raw?.size,
          image:
            raw?.product?.image ??
            raw?.product?.image_url ??
            raw?.image ??
            null,
          shippingFee: shippingRaw !== undefined ? Number(shippingRaw) || 0 : undefined,
        },
        seller: {
          name: raw?.seller?.name ?? raw?.seller_name ?? "Seller",
          avatar: raw?.seller?.avatar ?? raw?.seller?.avatar_url ?? raw?.seller_avatar ?? undefined,
          id: sellerId,
          user_id: raw?.seller?.user_id ?? raw?.seller_user_id ?? undefined,
        },
        buyer:
          raw?.buyer || raw?.buyer_name || buyerId !== undefined
            ? {
                name: raw?.buyer?.name ?? raw?.buyer_name ?? "Buyer",
                avatar: raw?.buyer?.avatar ?? raw?.buyer?.avatar_url ?? raw?.buyer_avatar ?? undefined,
                id: buyerId,
                user_id: raw?.buyer?.user_id ?? raw?.buyer_user_id ?? undefined,
              }
            : undefined,
        listing_id:
          listingIdRaw !== undefined && listingIdRaw !== null
            ? Number(listingIdRaw) || undefined
            : undefined,
        seller_id: sellerId,
        buyer_id: buyerId,
        status: normalizedStatus,
      };

    };

const getErrorStatusCode = (error: unknown): number | undefined => {
  if (error && typeof error === "object") {
    const withResponse = error as { response?: { status?: number } }; // API client error shape
    const directStatus = (error as { status?: number }).status;
    return withResponse.response?.status ?? directStatus;
  }
  return undefined;
};

// 🔥 Helper function to merge messages and remove duplicates by id
function mergeMessages(prev: ChatItem[], incoming: ChatItem[]): ChatItem[] {
  const merged = [...prev];
  
  for (const newMsg of incoming) {
    // Check if message already exists by id
    const exists = merged.some(m => m.id === newMsg.id);
    if (!exists) {
      merged.push(newMsg);
    }
  }
  
  return merged;
}

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<any>();
  const { sender = "TOP Support", kind = "support", order = null, conversationId = null, autoSendPaidMessage = false } = route.params || {};
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  // 状态管理
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [lastOrderStatus, setLastOrderStatus] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatItem>>(null);

  // 🔥 设置/清除当前对话ID（用于轮询服务，避免在当前对话中显示通知）
  useFocusEffect(
    React.useCallback(() => {
      // 进入聊天页面时设置当前对话ID
      if (conversationId) {
        pollingService.setCurrentConversationId(conversationId);
        console.log('✅ Set current conversation ID:', conversationId);
      }

      return () => {
        // 离开聊天页面时清除当前对话ID
        pollingService.setCurrentConversationId(null);
        console.log('✅ Cleared current conversation ID');
      };
    }, [conversationId])
  );

  // 🔥 移除重复的 useEffect，只保留 focus listener 中的逻辑

  // 🔥 监听路由参数变化，处理从CheckoutScreen返回的订单信息
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Sync premium status on focus (reuse MyPremiumScreen logic)
      if (user?.id) {
        premiumService.getStatus()
          .then((status) => updateUser({ ...(user as any), isPremium: status.isPremium, premiumUntil: status.premiumUntil }))
          .catch(() => {});
      }
      console.log("🔍 ChatScreen focused, checking for new order data");
      console.log("🔍 Route params:", route.params);
      console.log("🔍 ConversationId:", conversationId);
      console.log("🔍 Order:", order);
      console.log("🔍 AutoSendPaidMessage:", autoSendPaidMessage);
      
      // 🔥 重新加载对话数据，获取最新的订单信息
      const reloadData = async () => {
        if (conversationId) {
          await loadConversationData();
        } else {
          // 🔥 如果没有conversationId，也重新加载数据（可能显示订单卡片）
          await loadConversationData();
        }
        
        // ✅ 后端会自动创建订单状态相关的系统消息
        // 前端只需要重新加载对话数据即可
        console.log("✅ Conversation data reloaded, backend system messages will be displayed automatically");
      };
      
      reloadData();
    });

    return unsubscribe;
  }, [navigation, route.params, conversationId, order, items]);

  // 🔥 获取正确的对话对象名称（从 conversation 数据中获取，避免使用默认的 "TOP Support"）
  const displayName = conversation?.conversation?.otherUser?.username || sender;

  // 🔥 获取评论状态（通过 API 检查 - 单一数据源）
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, {
    userRole: 'buyer' | 'seller';
    hasUserReviewed: boolean;
    hasOtherReviewed: boolean;
    userReview: any | null;
    otherReview: any | null;
  }>>({});

  // 🔥 刷新订单的评论状态（守则 #4：状态变更后即时刷新）
  const refreshReviewStatus = async (orderId: string) => {
    try {
      const status = await reviewsService.check(parseInt(orderId));
      console.log("🔍 API returned review status for order", orderId, "hasUserReviewed:", status.hasUserReviewed, "hasOtherReviewed:", status.hasOtherReviewed);
      setReviewStatuses(prev => ({
        ...prev,
        [orderId]: {
          userRole: status.userRole,
          hasUserReviewed: status.hasUserReviewed,
          hasOtherReviewed: status.hasOtherReviewed,
          userReview: status.userReview,
          otherReview: status.otherReview,
        }
      }));
      console.log("⭐ Review status refreshed for order", orderId);
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      if (statusCode === 403) {
        console.log("⚠️ Review status check skipped for order", orderId, "due to 403 (forbidden).");
        return;
      }
      console.error("❌ Error refreshing review status:", error);
    }
  };

  // 🔥 检查订单的评论状态（初始加载）
  const checkOrderReviewStatus = async (orderId: string) => {
    await refreshReviewStatus(orderId);
  };

  // 🔥 获取评论状态类型
  const getReviewStatusType = (orderId: string, currentUserId: number, orderData: any): string => {
    const status = reviewStatuses[orderId];
    
    if (!status) {
      // 如果没有检查过状态，返回默认值
      return "unknown";
    }

    if (status.hasUserReviewed && status.hasOtherReviewed) {
      return "mutualComplete";
    } else if (status.hasUserReviewed && !status.hasOtherReviewed) {
      return "waitingForOther";
    } else if (!status.hasUserReviewed && status.hasOtherReviewed) {
      return "canReply";
    } else {
      return "canReview";
    }
  };

  // ❌ 已删除 generateOrderSystemMessages - 完全依赖后端生成的系统消息
  // 不再由前端生成任何系统消息，避免重复和视角混乱

  // ❌ 已删除 sendOrderCreatedMessage - 订单创建消息由后端自动生成

  // —— MOCK 数据：保留作为 UI 参考和学习 —— //
  const mockItemsInit: ChatItem[] = useMemo(() => {
    if (kind === "order" && order) {
      const o: Order = {
        id: order?.id ?? "1",
        product: {
          title: order?.product?.title ?? "Adidas jumper",
          price: order?.product?.price ?? 50,
          size: order?.product?.size ?? "M",
          image: order?.product?.image ?? "https://via.placeholder.com/64x64/f0f0f0/999999?text=Adidas",
        },
        seller: {
          name: order?.seller?.name ?? "Cathy",
          avatar: order?.seller?.avatar,
        },
        buyer: {
          name: order?.buyer?.name ?? "Cindy",
          avatar: order?.buyer?.avatar,
        },
        status: order?.status ?? "CANCELLED",
        listing_id: order?.listing_id ?? 41, // 🔥 确保有listing_id
      };

      if (sender === "seller111") {
        return [
          { id: "t0", type: "system", text: "Sep 20, 2025 18:30" },
          { id: "card0", type: "orderCard", order: o },
          { id: "t1", type: "system", text: "Sep 20, 2025 18:32" },
          { id: "m1", type: "msg", sender: "me", text: "Hi! Is this jeans still available?" },
          { id: "m2", type: "msg", sender: "other", text: "Yes! It's in good condition and ready to ship 😊" },
          { id: "t2", type: "system", text: "Sep 20, 2025 18:36" },
          { id: "m3", type: "msg", sender: "me", text: "Great! I'll place the order now." },
          {
            id: "sysPay",
            type: "system",
            text: "I've paid, waiting for you to ship\nPlease pack the item and ship to the address I provided on TOP.",
            sentByUser: true,
          },
          { id: "sys1", type: "system", text: "Seller has shipped your parcel.", time: "Sep 20, 2025 18:37" },
          { id: "sys2", type: "system", text: "Parcel is in transit.", time: "Sep 23, 2025 13:40" },
          {
            id: "sys3",
            type: "system",
            text: "Parcel arrived. Waiting for buyer to confirm received.",
            time: "Sep 24, 2025 08:00",
          },
          {
            id: "sys4",
            type: "system",
            text: "Order confirmed received. Transaction completed.",
            time: "Sep 25, 2025 12:50",
          },
          {
            id: "cta1",
            type: "reviewCta",
            text: "How was your experience? Leave a review to help others discover great items.",
            orderId: o.id,
          },
        ];
      }

      if (sender === "buyer002") {
        return [
          { id: "t0", type: "system", text: "Sep 26, 2025 15:00" },
          { id: "card0", type: "orderCard", order: o },
          {
            id: "cardPay",
            type: "system",
            text: "buyer002 has paid for the order.\nPlease prepare the package and ship soon.",
            sentByUser: false,
            avatar: o.buyer?.avatar,
          },
          { id: "m1", type: "msg", sender: "me", text: "Ok, I'll ship the hoodie in 3 days." },
          { id: "m2", type: "msg", sender: "other", text: "Thank you! Looking forward to receiving it." },
          { id: "t2", type: "system", text: "Sep 29, 2025 10:15" },
          { id: "sys1", type: "system", text: "Seller has shipped your parcel.", time: "Sep 29, 2025 10:15" },
          { id: "sys2", type: "system", text: "Parcel is in transit.", time: "Oct 1, 2025 14:20" },
          {
            id: "sys3",
            type: "system",
            text: "Parcel arrived. Waiting for buyer to confirm received.",
            time: "Oct 3, 2025 09:30",
          },
          {
            id: "cta1",
            type: "reviewCta",
            text: "How was your experience? Leave a review to help others discover great items.",
            orderId: o.id,
          },
        ];
      }
    }

    if (sender === "TOP Support") {
      return [
        { id: "t0", type: "system", text: "Sep 20, 2025 18:30" },
        { id: "m1", type: "msg", sender: "other", text: "Hey @ccc446981, Welcome to TOP! 👋" },
        { id: "m2", type: "msg", sender: "me", text: "Thanks! How do I start selling?" },
        { id: "m3", type: "msg", sender: "other", text: "Great question! Here's how to get started:\n\n1. Take clear photos of your items\n2. Write detailed descriptions\n3. Set fair prices\n4. Respond quickly to buyers\n\nNeed help with anything specific?" },
        { id: "m4", type: "msg", sender: "me", text: "Perfect! I'll start with some clothes I don't wear anymore." },
        { id: "m5", type: "msg", sender: "other", text: "That's a great start! Remember to check our community guidelines and always be honest about item condition. Happy selling! 🎉" },
      ];
    }

    return [];
  }, [kind, order, sender]);

  // 🔥 Focus事件监听 - 当用户从其他页面返回时重新加载数据
  useFocusEffect(
    React.useCallback(() => {
      const syncOnFocus = async () => {
        if (!conversationId) return;
        
        try {
          console.log("🔄 Reloading conversation on focus...");
          // ✅ 完全重新加载对话数据（包括消息的 sender 字段）
          await loadConversationData();
        } catch (error) {
          console.error("❌ Error reloading conversation on focus:", error);
        }
      };
      
      syncOnFocus();
    }, [conversationId])
  );

  // ❌ 已删除 generateSystemMessage - 系统消息由后端生成

  const loadConversationData = async () => {
    if (!conversationId) {
      // 如果没有 conversationId，但有订单信息，显示订单卡片
      if (kind === "order" && order) {
        console.log("🔍 No conversationId but have order, showing order card");
        const normalizedOrder = normalizeOrder(order);
        const orderCard: ChatItem = {
          id: `order-card-${normalizedOrder.id}`,
          type: "orderCard",
          order: normalizedOrder
        };
        
        // ✅ 只显示订单卡片，系统消息由后端在创建订单时生成
        setItems(mergeMessages([], [orderCard]));
        
        // 延迟重新加载对话数据，获取后端生成的系统消息
        setTimeout(() => {
            if (order && order.seller) {
              const sellerId = order.seller.id || order.seller.user_id;
              const listingId = order.listing_id || order.product?.listing_id;
            console.log("🔄 Attempting to reload conversation data after order creation...");
            // 这里可以尝试查找conversation并重新加载
          }
        }, 2000);
        return;
      }
      
      // 如果没有 conversationId，只显示欢迎消息（不显示完整的 mock 数据）
      console.log("🔍 No conversationId, showing welcome message only");
      if (sender === "TOP Support") {
        const welcomeMessage: ChatItem = {
          id: "welcome-1",
          type: "msg",
          sender: "other",
          text: `Hey @${user?.username || 'user'}, Welcome to TOP! 👋`,
          time: new Date().toLocaleString()
        };
        setItems([welcomeMessage]);
      } else {
        setItems([]); // 其他情况显示空对话
      }
      return;
    }

    // 如果是普通聊天（general），不显示商品卡片
    if (kind === "general") {
      console.log("🔍 General chat, loading messages without order card");
    }

    try {
      setIsLoading(true);
      console.log("🔍 Loading conversation:", conversationId);
      
      const conversationData = await messagesService.getMessages(conversationId);
      setConversation(conversationData);
      console.log("🔍 Conversation payload:", {
        conversation: conversationData?.conversation,
        order: conversationData?.order,
        listing: (conversationData as any)?.listing,
        messagesCount: conversationData?.messages?.length,
      });
      
      const conversationInitiatorId = Number(conversationData?.conversation?.initiator_id ?? NaN);
      const conversationParticipantId = Number(conversationData?.conversation?.participant_id ?? NaN);
      const otherUserInfo = conversationData?.conversation?.otherUser;
      const currentUserId = Number(user?.id ?? NaN);
      const currentUserAvatar = (user as any)?.avatar_url ?? (user as any)?.avatar ?? undefined;
      const isCurrentSeller = Number.isFinite(conversationParticipantId) && conversationParticipantId === currentUserId;

      const sanitizeOrderForConversation = (rawOrder: any | null): { order: Order | null; matches: boolean } => {
        if (!rawOrder) {
          return { order: null, matches: false };
        }

        const normalized = normalizeOrder(rawOrder);
        const buyerIdRaw = normalized?.buyer_id;
        const sellerIdRaw = normalized?.seller_id;
        const buyerIdNum = buyerIdRaw !== undefined ? Number(buyerIdRaw) : NaN;
        const sellerIdNum = sellerIdRaw !== undefined ? Number(sellerIdRaw) : NaN;
        const hasConversationParticipants =
          Number.isFinite(conversationInitiatorId) && Number.isFinite(conversationParticipantId);
        const matches =
          hasConversationParticipants &&
          Number.isFinite(buyerIdNum) &&
          Number.isFinite(sellerIdNum) &&
          ((buyerIdNum === conversationInitiatorId && sellerIdNum === conversationParticipantId) ||
            (buyerIdNum === conversationParticipantId && sellerIdNum === conversationInitiatorId));

        if (matches) {
          return { order: normalized, matches: true };
        }

        console.log("⚠️ sanitizeOrderForConversation: order does not match participants", {
          orderId: normalized.id,
          buyerId: buyerIdNum,
          sellerId: sellerIdNum,
          conversationInitiatorId,
          conversationParticipantId,
        });

        const sanitized: Order = {
          ...normalized,
          status: "Inquiry",
        };

        const fallbackBuyerId = isCurrentSeller ? otherUserInfo?.id : currentUserId;
        const fallbackSellerId = isCurrentSeller ? currentUserId : otherUserInfo?.id;

        if (fallbackBuyerId !== undefined && fallbackBuyerId !== null && !Number.isNaN(Number(fallbackBuyerId))) {
          sanitized.buyer_id = fallbackBuyerId;
          sanitized.buyer = {
            name: isCurrentSeller
              ? otherUserInfo?.username ?? sanitized.buyer?.name ?? "Buyer"
              : user?.username ?? sanitized.buyer?.name ?? "Buyer",
            avatar: isCurrentSeller
              ? otherUserInfo?.avatar ?? sanitized.buyer?.avatar ?? undefined
              : currentUserAvatar ?? sanitized.buyer?.avatar ?? undefined,
            id: fallbackBuyerId,
            user_id: fallbackBuyerId,
          };
        } else if (!sanitized.buyer) {
          sanitized.buyer = {
            name: "Buyer",
            avatar: undefined,
          } as any;
        }

        if (fallbackSellerId !== undefined && fallbackSellerId !== null && !Number.isNaN(Number(fallbackSellerId))) {
          sanitized.seller_id = fallbackSellerId;
          sanitized.seller = {
            name: isCurrentSeller
              ? user?.username ?? sanitized.seller?.name ?? "Seller"
              : otherUserInfo?.username ?? sanitized.seller?.name ?? "Seller",
            avatar: isCurrentSeller
              ? currentUserAvatar ?? sanitized.seller?.avatar ?? undefined
              : otherUserInfo?.avatar ?? sanitized.seller?.avatar ?? undefined,
            id: fallbackSellerId,
            user_id: fallbackSellerId,
          } as any;
        } else if (!sanitized.seller) {
          sanitized.seller = {
            name: "Seller",
            avatar: undefined,
          } as any;
        }

        return { order: sanitized, matches: false };
      };

      // 🔥 安全地输出日志，避免包含换行符导致崩溃
      console.log("🔍 API 返回的消息数量:", conversationData.messages?.length || 0);
      console.log("🔍 Conversation ID:", conversationData.conversation?.id);
      console.log("🔍 Other User (对话对象):", conversationData.conversation?.otherUser?.username);
 
      let backendHasValidOrderCard = false;
      const mappedItems = (conversationData.messages || []).map<ChatItem | null>((msg) => {
        const normalizeSender = (rawSender: any): MessageItem["sender"] =>
          rawSender === "me" ? "me" : "other";

        if (msg.type === "msg") {
          const messageItem: MessageItem = {
            id: msg.id,
            type: "msg",
            sender: normalizeSender(msg.sender),
            text: msg.text,
            time: msg.time,
            senderInfo: msg.senderInfo,
          };
          return messageItem;
        }

        if (msg.type === "system") {
          const systemItem: SystemMessageItem = {
            id: msg.id,
            type: "system",
            text: msg.text,
            time: msg.time,
            sentByUser: msg.sentByUser,
            senderInfo: msg.senderInfo,
          };
          return systemItem;
        }

        if (msg.type === "orderCard" && msg.order) {
          const { order: sanitizedOrder } = sanitizeOrderForConversation(msg.order);
          if (!sanitizedOrder) {
            console.log("⚠️ Dropping backend order card due to missing sanitized order", msg.id);
            return null;
          }
          backendHasValidOrderCard = true;
          const orderCardItem: OrderCardItem = {
            id: msg.id,
            type: "orderCard",
            order: sanitizedOrder,
          };
          return orderCardItem;
        }

        // Fallback for unknown types - 确保所有消息都显示
        const fallbackItem: MessageItem = {
          id: msg.id,
          type: "msg",
          sender: normalizeSender(msg.sender),
          text: msg.text,
          time: msg.time,
          senderInfo: msg.senderInfo,
        };
        return fallbackItem;
      });

      const apiItems = mappedItems.filter((item): item is ChatItem => item !== null);

      // 🔥 安全地输出日志
      console.log("🔍 转换后的消息数量:", apiItems.length);
      console.log("🔍 转换后的消息类型:", apiItems.map((item, idx) => `${idx}:${item.type}`).join(", "));

      // 处理不同类型的聊天
      let finalItems = apiItems;
      
      if (kind === "general") {
        // 普通聊天：过滤掉商品卡片
        finalItems = apiItems.filter(item => item.type !== "orderCard");
        console.log("🔍 普通聊天，过滤后的消息数量:", finalItems.length);
      } else if (kind === "order") {
        // 订单聊天：在开头添加商品卡片和系统消息
        console.log("🔍 订单聊天，添加商品卡片和系统消息");
        
        // 优先使用最新加载的数据（conversationData.order），再回退到 state 或 route params
        const { order: sanitizedConversationOrder } = sanitizeOrderForConversation(conversationData?.order ?? null);
        const { order: sanitizedRouteOrder } = sanitizeOrderForConversation(order ?? null);
        const latestConversationOrder = sanitizedConversationOrder;
        const hasConversationOrder = Boolean(latestConversationOrder);
        const rawOrderData = latestConversationOrder ?? sanitizedRouteOrder ?? null;
        console.log("🔍 Order 数据来源:", hasConversationOrder ? "conversation" : sanitizedRouteOrder ? "route.params" : "conversation");
        
        console.log("🔍 Order ID:", rawOrderData?.id, "Status:", rawOrderData?.status);
        
        if (rawOrderData) {
          const orderData = normalizeOrder(rawOrderData);

          const participantId = conversationParticipantId ?? (conversation?.conversation as any)?.participant_id;
          const isSeller = Number(participantId) === Number(user?.id); // ✅ 使用 Number() 转换

          const orderCard: ChatItem = {
            id: "order-card-" + orderData.id,
            type: "orderCard",
            order: orderData
          };
   
          console.log("🔍 创建的商品卡片 ID:", orderCard.id);
   
          // 检查是否已经有商品卡片，避免重复
          const hasOrderCard = backendHasValidOrderCard || apiItems.some(item => item.type === "orderCard");
          if (!hasOrderCard) {
            // ✅ 只添加商品卡片，系统消息由后端生成（已在 apiItems 中）
            finalItems = [orderCard, ...apiItems];
            console.log("🔍 添加了商品卡片，总消息数量:", finalItems.length);
          } else {
            console.log("🔍 商品卡片已存在，不重复添加");
          }

          setLastOrderStatus(orderData.status);
        } else {
          console.log("⚠️ 订单聊天但没有找到商品数据");
        }
      }

      // 如果是 TOP Support 对话且没有消息，添加欢迎消息
      if (sender === "TOP Support" && finalItems.length === 0) {
        const welcomeMessage: ChatItem = {
          id: "welcome-1",
          type: "msg",
          sender: "other",
          text: `Hey @${user?.username || 'user'}, Welcome to TOP! 👋`,
          time: new Date().toLocaleString()
        };
        setItems(mergeMessages([], [welcomeMessage]));
        console.log("🔍 Added welcome message for new user");
      } else {
        // 🔥 安全地输出日志，避免包含换行符的文本导致 LogBox 崩溃
        console.log("🔍 Final items length:", finalItems.length);
        console.log("🔍 Final items types:", finalItems.map((item, idx) => `${idx}:${item.type}`).join(", "));
        
        setItems(mergeMessages([], finalItems));
        console.log("🔍 Loaded", finalItems.length, "messages from API");
        
        // 🔥 记录当前订单状态
        const loadedOrderCard = finalItems.find(isOrderCardItem);
        if (loadedOrderCard) {
          setLastOrderStatus(loadedOrderCard.order.status);
          console.log("🔍 Recorded order status:", loadedOrderCard.order.status);
          
          // 🔥 只在 COMPLETED/RECEIVED/REVIEWED 状态时检查评论状态
          const normalizedOrderId = resolveOrderId(loadedOrderCard.order);
          const orderStatus = loadedOrderCard.order.status;
          if (normalizedOrderId && (orderStatus === "COMPLETED" || orderStatus === "RECEIVED" || orderStatus === "REVIEWED")) {
            checkOrderReviewStatus(normalizedOrderId);
            console.log("✅ Checking review status for order:", normalizedOrderId, "status:", orderStatus);
          } else {
            console.log("⏭️ Skipping review check - order status:", orderStatus);
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Error loading conversation:", error);
      // Fallback 到欢迎消息（不显示完整 mock 数据）
      console.log("🔍 Falling back to welcome message only");
      if (sender === "TOP Support") {
        const welcomeMessage: ChatItem = {
          id: "welcome-1",
          type: "msg",
          sender: "other",
          text: `Hey @${user?.username || 'user'}, Welcome to TOP! 👋`,
          time: new Date().toLocaleString()
        };
        setItems(mergeMessages([], [welcomeMessage]));
      } else {
        setItems(mergeMessages([], []));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversationData();
  }, [conversationId, sender, kind, order]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 如果没有 conversationId，只更新本地状态（不发送到后端）
    if (!conversationId) {
      setItems((prev) => [
        ...prev,
        { id: String(Date.now()), type: "msg", sender: "me", text: input, time: "Now" },
      ]);
      setInput("");
      return;
    }

    try {
      // 发送到后端 API
      const newMessage = await messagesService.sendMessage(conversationId, {
        content: input.trim(),
        message_type: "TEXT"
      });

      // 添加到本地状态
      const chatItem: ChatItem = {
        id: newMessage.id,
        type: "msg",
        sender: newMessage.sender || "me",
        text: newMessage.text,
        time: newMessage.time,
        senderInfo: newMessage.senderInfo
      };

      setItems((prev) => mergeMessages(prev, [chatItem]));
      setInput("");
      
      console.log("🔍 Message sent successfully");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      // 即使发送失败，也添加到本地状态
      setItems((prev) => mergeMessages(prev, [
        { id: String(Date.now()), type: "msg", sender: "me", text: input, time: "Now" },
      ]));
      setInput("");
    }
  };

  // —— 头像点击处理 —— //
  const handleAvatarPress = (avatarUserId?: number | string, avatarUsername?: string) => {
    console.log("🔍 Avatar pressed - userId:", avatarUserId, "username:", avatarUsername);
    console.log("🔍 Current user:", user?.id, user?.username);
    
    // 判断是否是当前用户
    const isCurrentUser = avatarUserId && user?.id && Number(avatarUserId) === Number(user.id);
    
    if (isCurrentUser) {
      // 🔥 点击自己的头像 -> 跳转到 MyTop
      console.log("🔍 Navigating to MyTop (own profile)");
      const rootNavigation = (navigation as any).getParent?.();
      if (rootNavigation) {
        rootNavigation.navigate("Main", {
          screen: "MyTop",
          params: {
            screen: "MyTopMain"
          }
        });
      }
    } else {
      // 🔥 点击对方头像 -> 跳转到 UserProfile
      console.log("🔍 Navigating to UserProfile:", avatarUsername);
      
      // 如果没有 username，尝试从 sender 或 conversation 获取
      let targetUsername = avatarUsername;
      if (!targetUsername) {
        // 从对话中获取对方用户名
        const otherUser = conversation?.conversation?.otherUser;
        targetUsername = otherUser?.username || sender;
      }
      
      if (!targetUsername) {
        Alert.alert("Error", "Unable to find user information");
        return;
      }
      
      const rootNavigation = (navigation as any).getParent?.();
      if (rootNavigation) {
        rootNavigation.navigate("Buy", {
          screen: "UserProfile",
          params: {
            username: targetUsername
          }
        });
      }
    }
  };

  // —— UI 组件 —— //
  const renderOrderCard = (o: Order) => {
    // 🔥 正确判断当前用户是否为卖家 - 使用订单中的 seller_id 和 buyer_id
    const currentUserId = user?.id;
    const orderSellerId = o.seller_id || o.seller?.id || o.seller?.user_id;
    const orderBuyerId = o.buyer_id || o.buyer?.id || o.buyer?.user_id;
    
    // 🔥 根据订单的 seller_id 判断，而不是 conversation 的 participant_id
    const isSeller = Number(currentUserId) === Number(orderSellerId);
    
    console.log("🔍 Order card - isSeller:", isSeller);
    console.log("🔍 Order card - current user id:", currentUserId);
    console.log("🔍 Order card - current user username:", user?.username);
    console.log("🔍 Order card - order seller_id:", orderSellerId);
    console.log("🔍 Order card - order buyer_id:", orderBuyerId);
    console.log("🔍 Order card - order seller name:", o.seller.name);
    console.log("🔍 Order card - order buyer name:", o.buyer?.name);

    const handleBuyNow = () => {
      // 🔥 使用正确的listing_id，如果没有则从conversation中获取
      let listingId = o.listing_id;
      
      // 如果没有listing_id，尝试从conversation中获取
      if (!listingId && conversation?.listing?.id) {
        listingId = conversation.listing.id;
      }
      
      // 如果还是没有，使用Adidas jumper的ID
      if (!listingId) {
        console.warn("⚠️ No listing_id found, using Adidas jumper ID");
        listingId = 41; // 使用Adidas jumper的ID
      }
      
      console.log("🛒 Buy Now clicked for listing:", listingId);
      console.log("🛒 Order listing_id:", o.listing_id);
      console.log("🛒 Conversation listing_id:", (conversation as any)?.listing?.id);
      
      // 🔥 跳转到CheckoutScreen而不是直接创建订单
      // 获取根导航器（Main Tab Navigator）
      let rootNavigation: any = navigation;
      while (rootNavigation.getParent && typeof rootNavigation.getParent === 'function') {
        const parent = rootNavigation.getParent();
        if (!parent) break;
        rootNavigation = parent;
      }
      
      if (rootNavigation) {
        // 构造单个商品的购物车项目格式
        const singleItem = {
          item: {
            id: listingId.toString(), // 🔥 使用listing_id
            title: o.product.title, // 🔥 修复：使用title而不是name
            name: o.product.title, // 保持兼容性
            price: o.product.price,
            image: o.product.image,
            size: o.product.size,
            seller: o.seller
          },
          quantity: 1
        };
        
        console.log("🔍 Navigating to Checkout with listing ID:", listingId);
        console.log("🔍 Navigation structure:", { 
          currentRoute: navigation.getState().routes[navigation.getState().index]?.name,
          rootNav: !!rootNavigation
        });
        
        try {
          // 🔥 BuyStack在根级别，直接导航
          rootNavigation.navigate("Buy", {
            screen: "Checkout",
            params: {
              items: [singleItem],
              subtotal: o.product.price,
              shipping: o.product.shippingFee || 0, // 使用商品的真实运费
              conversationId: conversationId // 🔥 传递 conversationId
            }
          });
        } catch (error) {
          console.error("❌ Navigation error:", error);
          Alert.alert("Error", "Unable to navigate to checkout. Please try again.");
        }
      } else {
        console.error("❌ Root navigation not found");
        Alert.alert("Error", "Navigation error. Please return to listing and try again.");
      }
    };

    // 🔥 买家操作函数
    const handleCancelOrder = async () => {
      console.log("🚫 Cancel Order button pressed for order:", o.id);
      try {
        Alert.alert(
          "Cancel Order",
          "Are you sure you want to cancel this order?",
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await ordersService.updateOrderStatus(parseInt(o.id), { status: "CANCELLED" });
                  
                  // 更新聊天中的订单状态
                  const updatedItems = items.map(item => {
                    if (item.type === "orderCard" && item.order.id === o.id) {
                      return {
                        ...item,
                        order: { ...item.order, status: "CANCELLED" }
                      };
                    }
                    return item;
                  });
                  setItems(updatedItems);
                  
                  // ✅ 后端会自动创建系统消息，重新加载对话获取最新消息
                  if (conversationId) {
                    try {
                      await loadConversationData();
                      console.log("✅ Reloaded conversation with backend system message");
                    } catch (error) {
                      console.error("❌ Failed to reload conversation:", error);
                    }
                  }
                  
                  Alert.alert("Success", "Order has been cancelled.");
                } catch (error) {
                  console.error("Error cancelling order:", error);
                  Alert.alert("Error", "Failed to cancel order. Please try again.");
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error("Error in cancel order:", error);
      }
    };

    const handleOrderReceived = async () => {
      console.log("📦 Order Received button pressed for order:", o.id);
      try {
        // 🔥 更新订单状态为COMPLETED（买家确认收货）
        await ordersService.updateOrderStatus(parseInt(o.id), { status: "COMPLETED" });
        
        // 更新聊天中的订单状态
        const updatedItems = items.map(item => {
          if (item.type === "orderCard" && item.order.id === o.id) {
            return {
              ...item,
              order: { ...item.order, status: "COMPLETED" }
            };
          }
          return item;
        });
        setItems(updatedItems);
        
        // ✅ 后端会自动创建系统消息，前端只需重新加载对话数据
        await loadConversationData();
        
        Alert.alert("Success", "Order has been marked as received.");
      } catch (error) {
        console.error("Error marking order as received:", error);
        Alert.alert("Error", "Failed to update order status. Please try again.");
      }
    };

    const handleLeaveReview = () => {
      console.log("⭐ Leave Review button pressed for order:", o.id);
      console.log("⭐ Order ID:", o.id);
      
      try {
        // 获取 root navigation (需要通过多层 getParent)
        let rootNav = navigation;
        while ((rootNav as any).getParent) {
          const parent = (rootNav as any).getParent();
          if (parent) {
            rootNav = parent;
          } else {
            break;
          }
        }
        
        console.log("⭐ Root navigation found, navigating to Review screen");
        (rootNav as any).navigate("Review", { 
          orderId: o.id,
          reviewType: "buyer" // 买家视角
        });
      } catch (error) {
        console.error("❌ Error navigating to Review:", error);
        Alert.alert("Error", "Failed to navigate to review screen");
      }
    };

    // 🔥 卖家操作函数
    const handleMarkShipped = async () => {
      console.log("📦 Mark as Shipped button pressed for order:", o.id);
      try {
        await ordersService.updateOrderStatus(parseInt(o.id), { status: "SHIPPED" });
        
        // 更新聊天中的订单状态
        const updatedItems = items.map(item => {
          if (item.type === "orderCard" && item.order.id === o.id) {
            return {
              ...item,
              order: { ...item.order, status: "SHIPPED" }
            };
          }
          return item;
        });
        setItems(updatedItems);
        
        // ✅ 后端会自动创建系统消息，重新加载对话获取最新消息
        if (conversationId) {
          try {
            await loadConversationData();
            console.log("✅ Reloaded conversation with backend system message");
          } catch (error) {
            console.error("❌ Failed to reload conversation:", error);
          }
        }
        
        Alert.alert("Success", "Order has been marked as shipped.");
      } catch (error) {
        console.error("Error marking order as shipped:", error);
        Alert.alert("Error", "Failed to update order status. Please try again.");
      }
    };

    const handleCancelSold = async () => {
      console.log("🚫 Cancel Sold Order button pressed for order:", o.id);
      try {
        Alert.alert(
          "Cancel Order",
          "Are you sure you want to cancel this order?",
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await ordersService.updateOrderStatus(parseInt(o.id), { status: "CANCELLED" });
                  
                  // 更新聊天中的订单状态
                  const updatedItems = items.map(item => {
                    if (item.type === "orderCard" && item.order.id === o.id) {
                      return {
                        ...item,
                        order: { ...item.order, status: "CANCELLED" }
                      };
                    }
                    return item;
                  });
                  setItems(updatedItems);
                  
                  // ✅ 后端会自动创建系统消息，重新加载对话获取最新消息
                  if (conversationId) {
                    try {
                      await loadConversationData();
                      console.log("✅ Reloaded conversation with backend system message");
                    } catch (error) {
                      console.error("❌ Failed to reload conversation:", error);
                    }
                  }
                  
                  Alert.alert("Success", "Order has been cancelled.");
                } catch (error) {
                  console.error("Error cancelling sold order:", error);
                  Alert.alert("Error", "Failed to cancel order. Please try again.");
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error("Error in cancel sold order:", error);
      }
    };

    const handleViewMutualReview = () => {
      console.log("👀 View Review button pressed for order:", o.id);
      // 直接在InboxStack中导航到MutualReview
      navigation.navigate("MutualReview" as any, { orderId: parseInt(o.id) });
    };

    const handleCardPress = async () => {
      console.log("🔍 Order card pressed");
      console.log("🔍 Order ID:", o.id);
      console.log("🔍 Order Status:", o.status);
      console.log("🔍 Current user is seller:", isSeller);
      
      // 🔥 逻辑：
      // - Inquiry 状态（只是咨询，没下单）→ ListingDetail（显示商品详情，可购买）
      // - 其他状态（已下单）→ OrderDetail（显示订单详情）
      
      if (o.status === "Inquiry") {
        // 🔥 咨询状态：跳转到 ListingDetail
        console.log("🔍 Inquiry status, navigating to ListingDetail");
        
        // 获取 listing ID
        let listingId = o.listing_id;
        if (!listingId && conversation?.listing?.id) {
          listingId = conversation.listing.id;
        }
        
        if (!listingId) {
          console.error("❌ No listing ID found");
          Alert.alert("Error", "Listing information not available");
          return;
        }
        
        // ✅ Use lazy loading: only pass listingId, let ListingDetailScreen fetch full data
        // This ensures we get complete, up-to-date data from the API
        // The ListingDetailScreen will handle checking if item is sold/delisted
        const listingIdStr = String(listingId);
        console.log("🔍 Navigating to ListingDetail with lazy loading, listingId:", listingIdStr);
        
        // 🔥 获取根导航器
        let rootNavigation: any = navigation;
        let currentNav: any = navigation;
        while (currentNav?.getParent?.()) {
          const parent = currentNav.getParent();
          if (!parent) break;
          currentNav = parent;
        }
        rootNavigation = currentNav ?? navigation;
        
        requestAnimationFrame(() => {
          rootNavigation.navigate("Buy", {
            screen: "ListingDetail",
            params: {
              listingId: listingIdStr
            }
          });
        });
      } else {
        // 🔥 已下单：跳转到 OrderDetail
        console.log("🔍 Order placed, navigating to OrderDetail");
        
        // 🔥 获取根导航器
        let rootNavigation: any = navigation;
        let currentNav: any = navigation;
        while (currentNav?.getParent?.()) {
          const parent = currentNav.getParent();
          if (!parent) break;
          currentNav = parent;
        }
        rootNavigation = currentNav ?? navigation;
        
        try {
          // 🔥 导航路径：Root -> Main (Tabs) -> My TOP (Tab) -> OrderDetail (Screen)
          rootNavigation.navigate("Main", {
            screen: "My TOP",
            params: {
              screen: "OrderDetail",
              params: {
                id: o.id,
                source: isSeller ? "sold" : "purchase",
                conversationId: conversation?.conversation?.id?.toString()
              }
            }
          });
        } catch (error) {
          console.error("❌ Failed to navigate to OrderDetail:", error);
          Alert.alert("Error", "Failed to open order details");
        }
      }
    };

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={handleCardPress}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: o.product.image || "https://via.placeholder.com/64x64/f0f0f0/999999?text=No+Image" }} 
          style={styles.orderThumb} 
        />
        <View style={styles.orderContent}>
          <Text style={styles.orderTitle} numberOfLines={2}>
            {o.product.title}
          </Text>
          <Text style={styles.orderPrice}>
            ${o.product.price}
            {o.product.size ? ` · Size ${o.product.size}` : ""}
          </Text>
          <Text style={styles.orderMeta}>
            {isSeller
              ? `Inquiry from ${o?.buyer?.name ?? "Buyer"}`
              : `Sold by ${o?.seller?.name ?? "Seller"}`}
          </Text>
          <Text style={styles.orderStatus}>
            Status: {isSeller && o.status === "IN_PROGRESS" ? "To Ship" : getDisplayStatus(o.status)}
          </Text>
        </View>
        <View style={styles.orderActions}>
          {/* 🔥 买家按钮逻辑 - 与OrderDetailScreen一致 */}
          {!isSeller && (
            <>
              {/* Inquiry状态 - Buy Now按钮 */}
              {o.status === "Inquiry" && (
            <TouchableOpacity 
              style={styles.buyButton}
              onPress={handleBuyNow}
              activeOpacity={0.8}
            >
              <Text style={styles.buyButtonText}>Buy Now</Text>
            </TouchableOpacity>
              )}
              
              {/* IN_PROGRESS状态 - Cancel Order按钮 */}
              {o.status === "IN_PROGRESS" && (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: "#F54B3D" }]}
                  onPress={handleCancelOrder}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
              
              {/* DELIVERED状态 - Order Received按钮 */}
              {o.status === "DELIVERED" && (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: "#000" }]}
                  onPress={handleOrderReceived}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>Order Received</Text>
                </TouchableOpacity>
              )}
              
              {/* RECEIVED/COMPLETED/REVIEWED状态 - 根据评论状态显示不同按钮 */}
              {["RECEIVED", "COMPLETED", "REVIEWED"].includes(o.status) && (() => {
                const reviewStatus = reviewStatuses[o.id];
                
                // 双方都评论了 - View Review
                if (reviewStatus?.hasUserReviewed && reviewStatus?.hasOtherReviewed) {
                  return (
                    <TouchableOpacity 
                      style={[styles.actionButton, { 
                        backgroundColor: "#fff", 
                        borderWidth: 1, 
                        borderColor: "#000" 
                      }]}
                      onPress={handleViewMutualReview}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionButtonText, { color: "#000" }]}>View Review</Text>
                    </TouchableOpacity>
                  );
                }
                
                // 只有我评论了 - View Your Review
                if (reviewStatus?.hasUserReviewed) {
                  return (
                    <TouchableOpacity 
                      style={[styles.actionButton, { 
                        backgroundColor: "#fff", 
                        borderWidth: 1, 
                        borderColor: "#000" 
                      }]}
                      onPress={() => {
                        // ViewYourReview 在同一个 InboxStack 中，直接使用 navigation
                        navigation.navigate("ViewYourReview" as any, { 
                          orderId: parseInt(o.id),
                          reviewId: reviewStatus.userReview?.id 
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionButtonText, { color: "#000" }]}>View Your Review</Text>
                    </TouchableOpacity>
                  );
                }
                
                // 还没评论 - Leave Review
                return (
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleLeaveReview}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonText}>Leave Review</Text>
                  </TouchableOpacity>
                );
              })()}
              
              {/* CANCELLED状态 - Buy Now按钮 */}
              {o.status === "CANCELLED" && (
                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={handleBuyNow}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buyButtonText}>Buy Now</Text>
                </TouchableOpacity>
              )}

              {/* 其他状态 - 显示状态徽章 */}
              {!["Inquiry", "IN_PROGRESS", "DELIVERED", "RECEIVED", "COMPLETED", "REVIEWED", "CANCELLED"].includes(o.status) && (
            <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{getDisplayStatus(o.status)}</Text>
            </View>
          )}
            </>
          )}
          
          {/* 🔥 卖家按钮逻辑 - 与OrderDetailScreen一致 */}
          {isSeller && (
            <>
              {/* IN_PROGRESS/TO_SHIP状态 - Cancel Order按钮（Mark as Shipped移到SoldTab管理） */}
              {["IN_PROGRESS", "TO_SHIP"].includes(o.status) && (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: "#F54B3D" }]}
                  onPress={handleCancelSold}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
              
              {/* COMPLETED/REVIEWED状态 - 根据评论状态显示不同按钮 */}
              {["COMPLETED", "REVIEWED"].includes(o.status) && (() => {
                const reviewStatus = reviewStatuses[o.id];
                
                // 双方都评论了 - View Review
                if (reviewStatus?.hasUserReviewed && reviewStatus?.hasOtherReviewed) {
                  return (
                    <TouchableOpacity 
                      style={[styles.actionButton, { 
                        backgroundColor: "#fff", 
                        borderWidth: 1, 
                        borderColor: "#000" 
                      }]}
                      onPress={handleViewMutualReview}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionButtonText, { color: "#000" }]}>View Review</Text>
                    </TouchableOpacity>
                  );
                }
                
                // 只有我评论了 - View Your Review
                if (reviewStatus?.hasUserReviewed) {
                  return (
                    <TouchableOpacity 
                      style={[styles.actionButton, { 
                        backgroundColor: "#fff", 
                        borderWidth: 1, 
                        borderColor: "#000" 
                      }]}
                      onPress={() => {
                        // ViewYourReview 在同一个 InboxStack 中，直接使用 navigation
                        navigation.navigate("ViewYourReview" as any, { 
                          orderId: parseInt(o.id),
                          reviewId: reviewStatus.userReview?.id 
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionButtonText, { color: "#000" }]}>View Your Review</Text>
                    </TouchableOpacity>
                  );
                }
                
                // 还没评论 - Leave Review
                return (
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleLeaveReview}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonText}>Leave Review</Text>
                  </TouchableOpacity>
                );
              })()}
              
              {/* 其他状态 - 显示状态徽章 */}
              {!["IN_PROGRESS", "TO_SHIP", "COMPLETED", "REVIEWED"].includes(o.status) && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{getDisplayStatus(o.status)}</Text>
      </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  type SystemItem = Extract<ChatItem, { type: "system" }>;

  const renderSystem = (item: SystemItem) => {
    try {
      const { id, text, time, sentByUser, avatar, senderInfo } = item;
      
      // 🔥 通用调试日志（避免输出包含换行符的文本）
      console.log("🔍 renderSystem called:", {
        textPreview: text.substring(0, 50).replace(/\n/g, "\\n"), // 转义换行符
        senderInfoId: senderInfo?.id,
        senderInfoUsername: senderInfo?.username,
        userId: user?.id,
        userUsername: user?.username,
        sentByUser
      });
    
    // 判断是不是时间格式（更严格）：匹配像 "Sep 20, 2025" 或 "Jul 13, 2025" 的开头
    const isDateLike = /^\w{3}\s\d{1,2},\s\d{4}/.test(text);

    if (isDateLike) {
      // 只显示居中时间文字（无灰底）
      return <Text style={styles.timeOnly}>{text}</Text>;
    }

    // 🔥 动态转换系统消息内容（在渲染之前）
    let displayText = text;
    
    // PAID 消息的动态转换
    if (text.includes("has paid for the order") || text.includes("I've paid, waiting for you to ship")) {
      const isCurrentUserSender = senderInfo?.id === user?.id || Number(senderInfo?.id) === Number(user?.id);
      
      console.log("🔍 PAID message debug:", {
        textPreview: text.substring(0, 30).replace(/\n/g, "\\n"),
        senderInfoId: senderInfo?.id,
        senderInfoIdType: typeof senderInfo?.id,
        userId: user?.id,
        userIdType: typeof user?.id,
        isCurrentUserSender,
        username: user?.username
      });
      
      if (isCurrentUserSender) {
        displayText = "I've paid, waiting for you to ship\nPlease pack the item and ship to the address I provided on TOP.";
      } else {
        displayText = "Buyer has paid for the order\nPlease pack the item and ship to the address provided on TOP.";
      }
    }
    
    // SHIPPED 消息的动态转换
    else if (text === "Seller has shipped your parcel." || text.includes("has shipped")) {
      const isCurrentUserSender = senderInfo?.id === user?.id || Number(senderInfo?.id) === Number(user?.id);
      
      console.log("🔍 SHIPPED message debug:", {
        textPreview: text.substring(0, 30).replace(/\n/g, "\\n"),
        senderInfoId: senderInfo?.id,
        userId: user?.id,
        isCurrentUserSender,
        username: user?.username
      });
      
      displayText = isCurrentUserSender ? "You have shipped the parcel." : "Seller has shipped your parcel.";
    }
    
    // DELIVERED 消息的动态转换
    else if (text.includes("Parcel arrived")) {
      const isCurrentUserSender = senderInfo?.id === user?.id || Number(senderInfo?.id) === Number(user?.id);
      
      console.log("🔍 DELIVERED message debug:", {
        textPreview: text.substring(0, 30).replace(/\n/g, "\\n"),
        senderInfoId: senderInfo?.id,
        userId: user?.id,
        isCurrentUserSender,
        username: user?.username
      });
      
      displayText = isCurrentUserSender 
        ? "Parcel arrived. Waiting for buyer to confirm received." 
        : "Parcel arrived. Please confirm received.";
    }
    
    // COMPLETED 消息的动态转换
    else if (text.includes("Order confirmed received") || text.includes("Transaction completed")) {
      const isCurrentUserSender = senderInfo?.id === user?.id || Number(senderInfo?.id) === Number(user?.id);
      
      console.log("🔍 COMPLETED message debug:", {
        textPreview: text.substring(0, 30).replace(/\n/g, "\\n"),
        senderInfoId: senderInfo?.id,
        userId: user?.id,
        isCurrentUserSender,
        username: user?.username
      });
      
      displayText = isCurrentUserSender 
        ? "I've confirmed received. Transaction completed." 
        : "Buyer confirmed received. Transaction completed.";
    }
    
    // CANCELLED 消息的动态转换
    else if (text.includes("cancelled")) {
      const isCurrentUserSender = senderInfo?.id === user?.id || Number(senderInfo?.id) === Number(user?.id);
      
      console.log("🔍 CANCELLED message debug:", {
        textPreview: text.substring(0, 30).replace(/\n/g, "\\n"),
        senderInfoId: senderInfo?.id,
        userId: user?.id,
        isCurrentUserSender,
        username: user?.username
      });
      
      if (isCurrentUserSender) {
        displayText = "I've cancelled this order.";
      } else {
        const orderCard = items.find(isOrderCardItem);
        if (orderCard) {
          const isSenderBuyer = Number(senderInfo?.id) === Number(orderCard.order.buyer_id);
          displayText = isSenderBuyer 
            ? "Buyer has cancelled the order." 
            : "Seller has cancelled the order.";
        } else {
          displayText = text; // 保持原文
        }
      }
    }

    // 如果文本包含换行，渲染为系统卡片（两行：标题 + 副标题）
    if (displayText.includes("\n")) {
      const [title, ...rest] = displayText.split("\n");
      const subtitle = rest.join("\n");
      const isMine = Number(senderInfo?.id) === Number(user?.id); // ✅ 使用 Number() 转换
      
      console.log("🔍 renderSystem debug:", {
        textPreview: text.substring(0, 20).replace(/\n/g, "\\n") + "...",
        sentByUser,
        isMine,
        senderInfoId: senderInfo?.id,
        senderInfoIdType: typeof senderInfo?.id,
        currentUserId: user?.id,
        currentUserIdType: typeof user?.id,
        senderInfoAvatar: senderInfo?.avatar,
        avatar: avatar,
        senderInfo: senderInfo?.avatar ? "has avatar" : "no avatar"
      });

      const bubbleStyle = isMine ? styles.userCardBubble : styles.userCardBubbleBuyer;
      
      // 🔥 改进头像逻辑：优先使用 senderInfo.avatar，然后是 conversation.otherUser.avatar
      const avatarSource = senderInfo?.avatar 
        ? { uri: senderInfo.avatar }
        : avatar
        ? { uri: avatar }
        : !isMine && conversation?.conversation?.otherUser?.avatar
        ? { uri: conversation.conversation.otherUser.avatar }
        : ASSETS.avatars.default;

      return (
        <>
          {time ? <Text style={styles.time}>{time}</Text> : null}
          <View style={[
            styles.systemMessageRow,
            { 
              justifyContent: isMine ? "flex-end" : "flex-start",
              alignItems: "flex-start" // 🔥 改为顶部对齐
            }
          ]}>
            {/* 🔥 如果不是我的消息，在左侧显示发送者头像 */}
            {!isMine && (
              <TouchableOpacity
                onPress={() => handleAvatarPress(senderInfo?.id, senderInfo?.username)}
                activeOpacity={0.7}
              >
                <Avatar
                  source={avatarSource}
                  style={[styles.avatar, { marginRight: 6 }]}
                  showBadge={false}
                />
              </TouchableOpacity>
            )}
            <View style={bubbleStyle}>
              <Text style={styles.userCardTitle}>{title}</Text>
              <View style={styles.userCardDivider} />
              <Text style={styles.userCardSubtitle}>{subtitle}</Text>
            </View>
            {/* 🔥 如果是我的消息，在右侧显示我的头像 */}
            {isMine && (
              <TouchableOpacity
                onPress={() => handleAvatarPress(user?.id, user?.username)}
                activeOpacity={0.7}
              >
                <Avatar
                  source={avatarSource}
                  style={[styles.avatar, { marginLeft: 6 }]}
                  self
                  showBadge={false}
                />
              </TouchableOpacity>
            )}
          </View>
        </>
      );
    }

    // 其他系统提示（物流状态等）维持灰框样式，居中显示
    return (
      <>
        {time ? <Text style={styles.time}>{time}</Text> : null}
        <View style={styles.systemMessageRow}>
          <View style={styles.systemBox}>
            <Text style={styles.systemText}>{displayText}</Text>
          </View>
        </View>
      </>
    );
    } catch (error) {
      console.error("❌ Error in renderSystem:", error);
      console.error("❌ Item id:", item.id, "type:", item.type);
      // 🔥 兜底：返回一个安全的错误提示
      return (
        <View style={{ marginBottom: 12 }}>
          <View style={styles.systemBox}>
            <Text style={styles.systemText}>[System message render error]</Text>
          </View>
        </View>
      );
    }
  };

  const renderReviewCTA = (orderId: string, text: string, reviewType?: "buyer" | "seller") => {
    const status = reviewStatuses[orderId];
    
    // 🔍 调试日志（简化输出避免 LogBox 崩溃）
    console.log("🔍 renderReviewCTA - orderId:", orderId, "hasUserReviewed:", status?.hasUserReviewed, "hasOtherReviewed:", status?.hasOtherReviewed);
    
    // 状态 4: 双评状态 - 显示 "View Mutual Review"
    if (status?.hasUserReviewed && status?.hasOtherReviewed) {
      console.log("✅ Showing View Mutual Review CTA (both reviewed)");
      return (
        <View style={styles.reviewBox}>
          <Text style={styles.reviewHint}>Both reviewed this transaction</Text>
          <TouchableOpacity 
            style={[styles.reviewBtnCenter, { 
              backgroundColor: "#fff", // 白色背景
              borderWidth: 1,
              borderColor: "#000" // 黑色边框
            }]}
            onPress={() => {
              console.log("⭐ View Mutual Review pressed for order:", orderId);
              navigation.navigate("MutualReview" as any, { orderId: parseInt(orderId) });
            }}
          >
            <Text style={[styles.reviewBtnText, { color: "#000" }]}>View Mutual Review</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // 状态 2: 我已评/他未评 - "View Your Review"
    if (status?.hasUserReviewed) {
      return (
        <View style={styles.reviewBox}>
          <Text style={styles.reviewHint}>You already reviewed this transaction</Text>
          <TouchableOpacity 
            style={[styles.reviewBtnCenter, { 
              backgroundColor: "#fff", 
              borderWidth: 1, 
              borderColor: "#000" 
            }]}
            onPress={() => {
              console.log("⭐ View Your Review pressed for order:", orderId);
              // 🔥 导航到 ViewYourReviewScreen（在 InboxStack 中）
              navigation.navigate("ViewYourReview" as any, { 
                orderId: parseInt(orderId),
                reviewId: status.userReview?.id 
              });
            }}
          >
            <Text style={[styles.reviewBtnText, { color: "#000" }]}>View Your Review</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // 状态 3: 他已评/我未评 - "Leave Review (isReply)"
    if (status?.hasOtherReviewed) {
    const orderCard = items.find((item): item is OrderCardItem => isOrderCardItem(item) && item.order.id === orderId);
      let otherPersonName = "The other person";
      
      if (orderCard) {
        const isBuyer = user?.username === orderCard.order.buyer?.name;
        if (isBuyer) {
          otherPersonName = orderCard.order.seller?.name || "The seller";
        } else {
          otherPersonName = orderCard.order.buyer?.name || "The buyer";
        }
      }
      
      return (
        <View style={styles.reviewBox}>
          <Text style={styles.reviewHint}>{otherPersonName} has reviewed this transaction</Text>
          <TouchableOpacity 
            style={styles.reviewBtnCenter}
            onPress={async () => {
              console.log("⭐ Reply to Review button pressed for order:", orderId);
              const rootNavigation = (navigation as any).getParent?.();
              if (rootNavigation) {
                rootNavigation.navigate("Review", { 
                  orderId: orderId,
                  reviewType: reviewType || "buyer",
                  isReply: true
                });
              } else {
                (navigation as any).navigate("Review", { 
                  orderId: orderId,
                  reviewType: reviewType || "buyer",
                  isReply: true
                });
              }
              // 守则 #4: 返回后刷新状态
              await refreshReviewStatus(orderId);
            }}
          >
            <Text style={styles.reviewBtnText}>Leave Review</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // 状态 1: 双未评 - "Leave Review"
    return (
      <View style={styles.reviewBox}>
        <Text style={styles.reviewHint}>{text}</Text>
        <TouchableOpacity 
          style={styles.reviewBtnCenter}
          onPress={async () => {
            console.log("⭐ Leave Review button pressed for order:", orderId);
            const rootNavigation = (navigation as any).getParent?.();
            if (rootNavigation) {
              rootNavigation.navigate("Review", { 
                orderId: orderId,
                reviewType: reviewType || "buyer"
              });
            } else {
              (navigation as any).navigate("Review", { 
                orderId: orderId,
                reviewType: reviewType || "buyer"
              });
            }
            // 守则 #4: 返回后刷新状态
            await refreshReviewStatus(orderId);
          }}
        >
          <Text style={styles.reviewBtnText}>Leave Review</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 🔥 守则 #2: 固定位置渲染 Review CTA（ListFooterComponent）
  const renderReviewCtaFooter = () => {
    try {
      // 找到 orderCard
      const orderCard = items.find(isOrderCardItem);
      if (!orderCard) {
        return null;
      }

    const order = orderCard.order;
    const orderId = order.id;

    // 守则 #5: 只在 COMPLETED/RECEIVED/REVIEWED 状态显示
    if (order.status !== "COMPLETED" && order.status !== "RECEIVED" && order.status !== "REVIEWED") {
      console.log("⏭️ Skipping Review CTA - order status:", order.status);
      return null;
    }
    
    console.log("✅ Rendering Review CTA for order:", orderId, "status:", order.status);

    // 获取状态
    const status = reviewStatuses[orderId];
    
    // 如果还未加载状态，触发加载
    if (!status) {
      checkOrderReviewStatus(orderId);
      return null; // 等待下次渲染
    }

    // 判断用户角色
    const isBuyer = user?.username === order.buyer?.name;
    const reviewType = isBuyer ? "buyer" : "seller";

    // 根据状态显示不同的文案
    let ctaText = "How was your experience? Leave a review to help others discover great items.";
    if (!isBuyer) {
      ctaText = "How was your experience with the buyer? Leave a review to help others.";
    }

    // 守则 #3: 使用稳定的 key
    const reviewNode = renderReviewCTA(orderId, ctaText, reviewType);

    // 🔥 检查是否为原始类型（字符串、数字等）
    if (typeof reviewNode === 'string' || typeof reviewNode === 'number' || typeof reviewNode === 'boolean') {
      console.warn('⚠️ renderReviewCTA returned a primitive value, wrapping in <Text>:', reviewNode);
      return (
        <View key={`cta-review-${orderId}`} style={{ marginBottom: 12, paddingHorizontal: 12 }}>
          <Text style={styles.reviewHint}>{String(reviewNode)}</Text>
        </View>
      );
    }

    // 🔥 检查是否为 null 或 undefined
    if (reviewNode === null || reviewNode === undefined) {
      return null;
    }

    return (
      <View key={`cta-review-${orderId}`} style={{ marginBottom: 12, paddingHorizontal: 12 }}>
        {renderReviewCTA(orderId, ctaText, reviewType)}
      </View>
    );
    } catch (error) {
      console.error("❌ Error in renderReviewCtaFooter:", error);
      console.error("❌ Error stack:", (error as Error).stack);
      return null;
    }
  };

  // 🔥 渲染评论回复邀请卡片
  const renderReviewReplyCTA = (orderId: string, text: string, reviewType?: "buyer" | "seller") => (
    <View style={styles.reviewBox}>
      <Text style={styles.reviewHint}>{text}</Text>
      <TouchableOpacity 
        style={styles.reviewBtnCenter}
        onPress={() => {
          console.log("⭐ Reply to Review button pressed for order:", orderId);
          const rootNavigation = (navigation as any).getParent?.();
          if (rootNavigation) {
            rootNavigation.navigate("Main", {
              screen: "MyTop",
              params: {
                screen: "Review",
                params: { 
                  orderId: orderId,
                  reviewType: reviewType || "buyer",
                  isReply: true
                }
              }
            });
          }
        }}
      >
        <Text style={styles.reviewBtnText}>Reply to Review</Text>
      </TouchableOpacity>
    </View>
  );

  // 🔥 渲染互评查看卡片
  const renderMutualReviewCTA = (orderId: string, text: string) => (
    <View style={styles.reviewBox}>
      <Text style={styles.reviewHint}>{text}</Text>
      <TouchableOpacity 
        style={styles.reviewBtnCenter}
        onPress={() => {
          console.log("⭐ View Mutual Review button pressed for order:", orderId);
          const rootNavigation = (navigation as any).getParent?.();
          if (rootNavigation) {
            rootNavigation.navigate("Main", {
              screen: "MyTop",
              params: {
                screen: "MutualReview",
                params: { 
                  orderId: orderId
                }
              }
            });
          }
        }}
      >
        <Text style={styles.reviewBtnText}>View Mutual Review</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header 
        title={displayName} 
        showBack 
        onBackPress={() => {
          console.log("🔙 Back button pressed in ChatScreen");

          // 🔍 调试：检查当前导航状态
          const state = navigation.getState();
          console.log("🔍 Current route name:", state.routes[state.index]?.name);
          console.log("🔍 Routes count:", state.routes.length);
          console.log("🔍 Can go back:", navigation.canGoBack());
          
          // 🔥 兜底逻辑：确保能正确返回到 InboxScreen
          if (navigation.canGoBack()) {
            console.log("🔙 Going back via navigation.goBack()");
            navigation.goBack(); // ✅ 正常返回到 InboxScreen
          } else {
            console.log("🔙 Cannot go back, navigating to InboxMain");
            (navigation as any).replace("InboxMain"); // ✅ 兜底：替换为 InboxMain，避免历史栈残留
          }
        }}
      />

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 12 }}
        ListFooterComponent={renderReviewCtaFooter}
        renderItem={({ item, index }) => {
          try {
            // 兜底：如果运行时拿到的是裸字符串/数字，包一层 <Text>
            if (typeof (item as any) === "string" || typeof (item as any) === "number") {
              return <View style={{ marginBottom: 12 }}><Text style={styles.textLeft}>{String(item)}</Text></View>;
            }

          if (isOrderCardItem(item)) {
            // 🔥 判断订单卡片应该显示在左侧还是右侧
            // 根据订单中的 buyer_id 判断当前用户是否为买家
            const currentUserId = user?.id;
            const orderBuyerId = item.order.buyer_id || item.order.buyer?.id || item.order.buyer?.user_id;
            const orderSellerId = item.order.seller_id || item.order.seller?.id || item.order.seller?.user_id;
            const isBuyer = Number(currentUserId) === Number(orderBuyerId);
            const cardPosition = isBuyer ? "flex-end" : "flex-start"; // 买家显示右侧，卖家显示左侧
            
            console.log("🔍 Order card position - isBuyer:", isBuyer);
            console.log("🔍 Order card position - current user id:", currentUserId);
            console.log("🔍 Order card position - current user username:", user?.username);
            console.log("🔍 Order card position - order buyer_id:", orderBuyerId);
            console.log("🔍 Order card position - order seller_id:", orderSellerId);
            console.log("🔍 Order card position - order buyer name:", item.order.buyer?.name);
            console.log("🔍 Order card position - order seller name:", item.order.seller?.name);
            
            return (
              <View style={{ 
                marginBottom: 12, 
                alignItems: cardPosition,
                paddingHorizontal: 8
              }}>
                {renderOrderCard(item.order)}
              </View>
            );
          }
          if (isSystemItem(item)) {
            return <View style={{ marginBottom: 12 }}>{renderSystem(item)}</View>;
          }
          // 🔥 reviewCta 已移至 ListFooterComponent，不再混入 items
          if (isReviewReplyItem(item))
            return <View style={{ marginBottom: 12 }}>{renderReviewReplyCTA(item.orderId, item.text, item.reviewType)}</View>;
          if (isMutualReviewItem(item))
            return <View style={{ marginBottom: 12 }}>{renderMutualReviewCTA(item.orderId, item.text)}</View>;

          // 普通消息（显式类型检查）
          if (isMessageItem(item)) {
          return (
            <View style={{ marginBottom: 12 }}>
              {item.time ? <Text style={styles.time}>{item.time}</Text> : null}
              <View style={[styles.messageRow, item.sender === "me" && { justifyContent: "flex-end" }]}>
                {/* 🔥 对方头像：优先使用 senderInfo.avatar，否则使用默认头像 */}
                {item.sender !== "me" && (
                  <TouchableOpacity
                    onPress={() => handleAvatarPress(item.senderInfo?.id, item.senderInfo?.username)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      source={
                        // 🔥 检查实际的用户名而不是 sender 参数
                        item.senderInfo?.username?.toLowerCase() === "top support" || 
                        item.senderInfo?.username?.toLowerCase() === "topsupport"
                          ? ASSETS.avatars.top
                          : item.senderInfo?.avatar 
                          ? { uri: item.senderInfo.avatar }
                          : conversation?.conversation?.otherUser?.avatar
                          ? { uri: conversation.conversation.otherUser.avatar }
                          : ASSETS.avatars.default
                      }
                      style={[styles.avatar, { marginRight: 6 }]}
                      showBadge={false}
                    />
                  </TouchableOpacity>
                )}
                <View
                  style={[
                    item.sender === "me" ? styles.bubbleRight : styles.bubbleLeft,
                    item.sender === "me" && { marginLeft: "auto" },
                  ]}
                >
                  <Text style={item.sender === "me" ? styles.textRight : styles.textLeft}>
                    {item.text}
                  </Text>
                </View>
                {/* 我的头像 */}
                {item.sender === "me" && (
                  <TouchableOpacity
                    onPress={() => handleAvatarPress(user?.id, user?.username)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      source={
                        item.senderInfo?.avatar
                          ? { uri: item.senderInfo.avatar }
                          : ASSETS.avatars.default
                      }
                      style={[styles.avatar, { marginLeft: 6 }]}
                      self
                      showBadge={false}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
          }

          // 🔥 未知类型，安全地包装为 Text（兜底逻辑）
          console.warn("ChatScreen: Unknown item type:", (item as any)?.type, "id:", (item as any)?.id);
          // 🔥 确保任何内容都被包裹在 <Text> 中
          const itemContent = (item as any)?.text ?? (item as any)?.content ?? String(item ?? "Unknown item");
          return (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.textLeft}>{String(itemContent)}</Text>
            </View>
          );
          } catch (error) {
            console.error("❌ Error rendering item", index, ":", error);
            console.error("❌ Item type:", (item as any)?.type, "id:", (item as any)?.id);
            console.error("❌ Error stack:", (error as Error).stack);
            return (
              <View style={{ marginBottom: 12 }}>
                <View style={styles.systemBox}>
                  <Text style={styles.systemText}>[Item render error at index {index}]</Text>
                </View>
              </View>
            );
          }
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={-20}
      >
          <View style={[styles.inputBar, { marginBottom: bottomInset - 12 }]}> {/* 修复缺少右括号 */}
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            textAlignVertical="center"
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Icon name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  // avatars & bubbles
  avatar: { width: 32, height: 32, borderRadius: 16 },
  messageRow: { flexDirection: "row", alignItems: "flex-start" },
  systemMessageRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  bubbleLeft: {
    backgroundColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginHorizontal: 6,
    maxWidth: "72%",
  },
  bubbleRight: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginHorizontal: 6,
    maxWidth: "72%",
  },
  textLeft: { color: "#000", fontSize: 15 },
  textRight: { color: "#fff", fontSize: 15 },
  time: { fontSize: 11, color: "#888", alignSelf: "center", marginBottom: 4 },

  timeOnly: {
    fontSize: 11,
    color: "#888",
    alignSelf: "center",
    marginVertical: 6,
  },

  // system rows
  systemBox: {
    alignSelf: "center",
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 8,
    maxWidth: "92%",
  },
  systemText: { color: "#333", fontSize: 14, textAlign: "center", lineHeight: 20 },

  // unified system cards for buyer/seller
  userCardBubble: {
    backgroundColor: "#FFF6D8",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    maxWidth: "72%",
    minWidth: "60%",
  },
  userCardBubbleBuyer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    maxWidth: "72%",
    minWidth: "60%",
  },
  userCardTitle: {
    fontWeight: "700",
    color: "#111",
    fontSize: 15,
    marginBottom: 6,
  },
  userCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginHorizontal: -14,
    marginBottom: 6,
  },
  userCardSubtitle: {
    color: "#444",
    fontSize: 13,
    lineHeight: 18,
  },
  userCardBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    marginTop: 8,
  },
  userCardBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },

  // order card
  orderCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
    alignItems: "center",
  },
  orderThumb: { 
    width: 64, 
    height: 64, 
    borderRadius: 8, 
    marginRight: 12, 
    backgroundColor: "#eee" 
  },
  orderContent: {
    flex: 1,
    marginRight: 12,
  },
  orderTitle: { 
    fontWeight: "700", 
    fontSize: 16, 
    marginBottom: 6,
    color: "#111"
  },
  orderPrice: { 
    color: "#e11d48", 
    fontWeight: "800", 
    marginBottom: 6,
    fontSize: 16
  },
  orderMeta: { 
    color: "#555", 
    marginBottom: 2,
    fontSize: 13
  },
  orderStatus: { 
    color: "#666",
    fontSize: 13
  },
  orderActions: {
    alignItems: "center",
    justifyContent: "center",
  },
  buyButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    borderWidth: 1,
    borderColor: "#000",
  },
  buyButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 13,
  },
  actionButton: {
    backgroundColor: "#000",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  sellerActions: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },

  // review CTA
  reviewBox: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHint: { color: "#555", fontSize: 14, marginBottom: 12, lineHeight: 20, textAlign: "center" },
  reviewBtnCenter: {
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  reviewBtnText: { fontSize: 14, color: "#111", fontWeight: "700" },

  // input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === "android" ? 0 : 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    fontSize: 15,
    marginRight: 8,
    minHeight: 42,
    includeFontPadding: false,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
