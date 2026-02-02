import { apiClient } from './api';
import type { ImageSourcePropType } from 'react-native';
import { resolvePremiumFlag } from './utils/premium';

const pickAvatar = (...candidates: Array<string | null | undefined>): string | null => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return null;
};

const toImageSource = (uri: string | null | undefined): ImageSourcePropType | null =>
  uri && typeof uri === "string" && uri.trim() ? { uri } : null;

type NormalizedUser = {
  id: number | null;
  username: string;
  name: string;
  avatar: string | null;
  isPremium: boolean;
};

const normalizeParticipant = (input: any): NormalizedUser => {
  if (!input) {
    return {
      id: null,
      username: "user",
      name: "user",
      avatar: null,
      isPremium: false,
    };
  }

  const rawId =
    input.id ?? input.user_id ?? input.participant_id ?? input.owner_id ?? input.member_id;
  const id =
    typeof rawId === "number"
      ? rawId
      : rawId !== undefined
      ? Number(rawId)
      : null;

  const username = input.username ?? input.handle ?? input.name ?? "user";
  const displayName = input.name ?? input.username ?? username;
  const avatar = pickAvatar(input.avatar, input.avatar_url, input.avatar_path, input.image_url);
  const isPremium = resolvePremiumFlag(input);

  return {
    id: Number.isFinite(id as number) ? (id as number) : null,
    username,
    name: displayName,
    avatar,
    isPremium,
  };
};

const normalizeOrderSummary = (order: any): Conversation["order"] => {
  if (!order) {
    return null;
  }

  const sellerInfo = normalizeParticipant(order.seller ?? order.seller_user ?? order.sellerInfo);
  const buyerInfo = normalizeParticipant(order.buyer ?? order.buyer_user ?? order.buyerInfo);
  const product = order.product ?? order.listing ?? {};

  const imageCandidate =
    product.image ??
    product.image_url ??
    (Array.isArray(product.image_urls) ? product.image_urls[0] : undefined);

  return {
    id: String(order.id ?? product.id ?? ""),
    product: {
      title: product.title ?? product.name ?? "Listing",
      price: Number(product.price ?? 0) || 0,
      size: product.size ?? undefined,
      image: imageCandidate ?? null,
    },
    seller: {
      name: sellerInfo.name,
      avatar: sellerInfo.avatar ?? undefined,
      isPremium: sellerInfo.isPremium || undefined,
    },
    buyer: buyerInfo.name
      ? {
          name: buyerInfo.name,
          avatar: buyerInfo.avatar ?? undefined,
          isPremium: buyerInfo.isPremium || undefined,
        }
      : undefined,
    status: order.status ?? "Inquiry",
  };
};

export interface Conversation {
  id: string;
  sender: string;
  message: string;
  time: string;
  last_message_at?: string;
  avatar: { uri: string } | null;
  kind: 'support' | 'order' | 'general';
  unread: boolean;
  lastFrom: 'support' | 'seller' | 'buyer' | 'me';
  isPremium?: boolean;
  order?: {
    id: string;
    product: {
      title: string;
      price: number;
      size?: string;
      image: string | null;
    };
    seller: { 
      name: string;
      avatar?: string | null;
      isPremium?: boolean;
    };
    buyer?: {
      name: string;
      avatar?: string | null;
      isPremium?: boolean;
    };
    status: string;
  } | null;
}

export interface Message {
  id: string;
  type: 'msg' | 'system' | 'orderCard';
  sender?: 'me' | 'other';
  text: string;
  time: string;
  sentByUser?: boolean; // 🔥 添加 sentByUser 字段
  senderInfo?: {
    id: number;
    username: string;
    avatar: string | null;
    isPremium?: boolean;
  };
  order?: {
    id: string;
    product: {
      title: string;
      price: number;
    };
    seller: { 
      name: string;
      avatar?: string | null;
    };
    status: string;
  };
}

export interface ConversationDetail {
  conversation: {
    id: number;
    type: string;
    initiator_id?: number; // 🔥 添加initiator_id字段
    participant_id?: number; // 🔥 添加participant_id字段
    otherUser: {
      id: number;
      username: string;
      avatar: string | null;
      isPremium?: boolean;
    };
  };
  messages: Message[];
  listing?: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
    image_urls?: string[];
    size?: string;
    description?: string;
    brand?: string;
    condition_type?: string;
  };
  order?: {
    id: string;
    product: {
      title: string;
      price: number;
      size?: string;
      image: string | null;
    };
    seller: { 
      name: string;
      avatar?: string;
      isPremium?: boolean;
    };
    buyer?: { 
      name: string;
      avatar?: string;
      isPremium?: boolean;
    };
    status: string;
    listing_id?: number; // 🔥 添加listing_id字段
  };
}

export interface CreateConversationParams {
  participant_id: number;
  listing_id?: number;
  type?: 'ORDER' | 'SUPPORT' | 'GENERAL';
}

export interface SendMessageParams {
  content: string;
  message_type?: 'TEXT' | 'IMAGE' | 'SYSTEM';
}

class MessagesService {
  // 获取所有对话
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await apiClient.get<{ conversations: Conversation[] }>('/api/conversations');
      return response.data?.conversations ?? [];
    } catch (error: any) {
      // 🔥 如果是 401 错误（未授权），静默处理（用户已登出）
      if (error?.status === 401 || error?.message?.includes('401')) {
        throw error; // 仍然抛出，但不记录错误日志
      }
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  // 获取特定对话的消息
  async getMessages(conversationId: string): Promise<ConversationDetail> {
    try {
      const response = await apiClient.get<ConversationDetail>(`/api/messages/${conversationId}`);
      if (!response.data) {
        throw new Error('Failed to fetch conversation: missing response data');
      }
      return response.data;
    } catch (error: any) {
      // 🔥 如果是 401 错误（未授权），静默处理（用户已登出）
      if (error?.status === 401 || error?.message?.includes('401')) {
        throw error; // 仍然抛出，但不记录错误日志
      }
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // 轻量级检查：只获取每个对话的最后一条消息ID和时间戳
  async checkConversationsForNewMessages(): Promise<Array<{
    conversationId: string;
    lastMessageId: string;
    lastMessageTime: string;
    isFromMe: boolean;
    isUnread: boolean;
    senderUsername: string;
  }>> {
    try {
      const response = await apiClient.get<{
        conversations: Array<{
          conversationId: string;
          lastMessageId: string;
          lastMessageTime: string;
          isFromMe: boolean;
          isUnread: boolean;
          senderUsername: string;
        }>;
      }>('/api/conversations/check');
      return response.data?.conversations ?? [];
    } catch (error: any) {
      // 🔥 如果是 401 错误（未授权），静默处理（用户已登出）
      if (error?.status === 401 || error?.message?.includes('401')) {
        throw error;
      }
      console.error('Error checking conversations:', error);
      throw error;
    }
  }

  // 创建新对话
  async createConversation(params: CreateConversationParams): Promise<any> {
    try {
      const response = await apiClient.post<{ conversation: any }>('/api/conversations', params);
      if (!response.data?.conversation) {
        throw new Error('Failed to create conversation: missing response data');
      }
      return response.data.conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // 发送消息
  async sendMessage(conversationId: string, params: SendMessageParams): Promise<Message> {
    try {
      const response = await apiClient.post<{ message: Message }>(`/api/messages/${conversationId}`, params);
      if (!response.data?.message) {
        throw new Error('Failed to send message: missing response data');
      }
      return response.data.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // 删除对话
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      console.log('🗑️ Frontend: Deleting conversation:', conversationId);
      console.log('🗑️ Frontend: ConversationId type:', typeof conversationId);
      
      const response = await apiClient.delete('/api/conversations', {
        data: { conversationId }
      });
      
      console.log('✅ Frontend: Delete response:', response);
    } catch (error) {
      console.error('❌ Frontend: Error deleting conversation:', error);
      throw error;
    }
  }

  // 获取或创建与卖家的对话（用于商品页面）
  async getOrCreateSellerConversation(sellerId: number, listingId?: number): Promise<Conversation> {
    try {
      // 先尝试获取现有对话
      const conversations = await this.getConversations();
      const existingConversation = conversations.find(conv => 
        conv.kind === 'order' && 
        conv.order?.seller.name && 
        conv.order.seller.name === sellerId.toString() &&
        (listingId ? conv.order?.id === listingId.toString() : true)
      );

      if (existingConversation) {
        return existingConversation;
      }

      // 创建新对话
      const newConversation = await this.createConversation({
        participant_id: sellerId,
        listing_id: listingId,
        type: 'ORDER'
      });

      console.log("✅ New conversation created:", newConversation);

      // 🔥 直接使用创建返回的对话数据，构建前端需要的格式
      const participantSummary = normalizeParticipant(newConversation.participant);

      const avatarSource =
        toImageSource(newConversation.avatar_url) ??
        toImageSource(participantSummary.avatar) ??
        (newConversation.avatar && typeof newConversation.avatar === "object" && "uri" in newConversation.avatar
          ? newConversation.avatar
          : null);

      const listing = newConversation.listing;
      const fallbackOrder = listing
        ? {
            id: listing.id,
            status: "Inquiry",
            seller: {
              id: participantSummary.id ?? undefined,
              name: participantSummary.name,
              avatar: participantSummary.avatar,
              isPremium: participantSummary.isPremium,
            },
            product: {
              id: listing.id,
              title: listing.name,
              price: listing.price,
              size: listing.size,
              image:
                listing.image_url ||
                (Array.isArray(listing.image_urls) ? listing.image_urls[0] : null),
            },
          }
        : {
            id: listingId ?? undefined,
            status: "Inquiry",
            seller: {
              id: participantSummary.id ?? undefined,
              name: participantSummary.name,
              avatar: participantSummary.avatar,
              isPremium: participantSummary.isPremium,
            },
          };

      const orderSummary = normalizeOrderSummary(newConversation.order ?? fallbackOrder);

      return {
        id: newConversation.id.toString(),
        sender: participantSummary.name ?? participantSummary.username,
        message: "No messages yet",
        time: "Now",
        avatar: avatarSource,
        kind: "order",
        unread: false,
        lastFrom: "seller",
        order: newConversation.listing ? {
          id: newConversation.listing.id.toString(),
          product: {
            title: newConversation.listing.name,
            price: Number(newConversation.listing.price),
            size: newConversation.listing.size,
            image: newConversation.listing.image_url || (newConversation.listing.image_urls as any)?.[0] || null
          },
          seller: { 
            name: participantSummary.username,
            avatar: participantSummary.avatar 
          },
          status: "Inquiry"
        } : {
          id: listingId?.toString() || "unknown",
          product: {
            title: "Item",
            price: 0,
            size: "Unknown",
            image: null
          },
          seller: { 
            name: participantSummary.username,
            avatar: participantSummary.avatar 
          },
          status: "Inquiry"
        }
      };
    } catch (error) {
      console.error('Error getting or creating seller conversation:', error);
      throw error;
    }
  }
}

export const messagesService = new MessagesService();
