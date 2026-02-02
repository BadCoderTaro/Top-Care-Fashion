import { apiClient } from './api';

export interface Notification {
  id: string;
  type: 'order' | 'like' | 'follow' | 'review' | 'system';
  title: string;
  message?: string;
  image?: string; // 用户头像
  listingImage?: string; // 商品图片
  time: string;
  isRead: boolean;
  orderId?: string;
  listingId?: string;
  userId?: string;
  username?: string;
  isPremiumUser?: boolean;
  conversationId?: string; // ✅ 对话ID（用于ORDER/REVIEW通知）
  related_user_id?: string; // ✅ 相关用户ID（用于FOLLOW通知）
}

export interface NotificationParams {
  type: 'order' | 'like' | 'follow' | 'review' | 'system';
  title: string;
  message?: string;
  image?: string;
  orderId?: string;
  listingId?: string;
  userId?: string;
  username?: string;
  isPremiumUser?: boolean;
}

class NotificationService {
  // ✅ 获取未读通知数量
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        notifications: Notification[];
        totalCount: number;
      }>('/api/notifications?unread_only=true');
      
      if (response.data?.success) {
        return response.data.totalCount || response.data.notifications.length;
      }
      
      return 0;
    } catch (error: any) {
      // 🔥 如果是 401 错误（未授权），静默处理（用户已登出）
      if (error?.status === 401 || error?.message?.includes('401')) {
        return 0;
      }
      console.error("❌ Error fetching unread count:", error);
      return 0;
    }
  }

  // 获取用户的所有通知
  async getNotifications(): Promise<Notification[]> {
    try {
      // console.log("🔔 Fetching notifications from API...");
      
      const response = await apiClient.get<{
        success: boolean;
        notifications: Notification[];
        totalCount: number;
        hasMore: boolean;
      }>('/api/notifications');
      
      if (response.data?.success) {
        // console.log("🔔 Loaded", response.data.notifications.length, "notifications from API");
        return response.data.notifications;
      }
      
      throw new Error('Failed to fetch notifications');
    } catch (error: any) {
      // 🔥 如果是 401 错误（未授权），静默处理（用户已登出），不显示错误和 mock 数据
      if (error?.status === 401 || error?.message?.includes('401')) {
        return [];
      }
      
      console.error("❌ Error fetching notifications:", error);
      
      // Fallback to mock data if API fails
      console.log("🔔 Falling back to mock data");
      const mockNotifications: Notification[] = [
        {
          id: "n1",
          type: "like",
          title: "@summer liked your listing",
          message: "Vintage Denim Jacket",
          image: "https://i.pravatar.cc/100?img=5",
          time: "2h ago",
          isRead: false,
          listingId: "listing-vintage-jacket",
          userId: "5",
          username: "summer"
        },
        {
          id: "n2",
          type: "order",
          title: "Buyer @alex has paid",
          message: "Please ship your item soon.",
          image: "https://i.pravatar.cc/100?img=12",
          time: "5h ago",
          isRead: false,
          orderId: "ORD123",
          userId: "12",
          username: "alex"
        },
        {
          id: "n3",
          type: "order",
          title: "Seller @mike has shipped your parcel",
          message: "Your order is on the way!",
          image: "https://i.pravatar.cc/100?img=15",
          time: "1d ago",
          isRead: true,
          orderId: "ORD456",
          userId: "15",
          username: "mike"
        },
        {
          id: "n4",
          type: "order",
          title: "Order arrived",
          message: "Parcel arrived. Please confirm you have received the item.",
          time: "2d ago",
          isRead: false,
          orderId: "ORD789"
        },
        {
          id: "n5",
          type: "order",
          title: "Order completed",
          message: "Buyer @alex confirmed received. Transaction completed.",
          image: "https://i.pravatar.cc/100?img=12",
          time: "3d ago",
          isRead: false,
          orderId: "ORD789",
          userId: "12",
          username: "alex"
        },
        {
          id: "n6",
          type: "order",
          title: "Order cancelled",
          message: "Order with @sarah has been cancelled.",
          image: "https://i.pravatar.cc/100?img=8",
          time: "4d ago",
          isRead: true,
          orderId: "ORD999",
          userId: "8",
          username: "sarah"
        },
        {
          id: "n7",
          type: "follow",
          title: "@sarah started following you",
          message: "You have a new follower!",
          image: "https://i.pravatar.cc/100?img=8",
          time: "5d ago",
          isRead: false,
          userId: "8",
          username: "sarah"
        },
        {
          id: "n8",
          type: "review",
          title: "@alex gave your listing a 5-star review",
          message: "Green Midi Dress",
          image: "https://i.pravatar.cc/100?img=12",
          time: "1w ago",
          isRead: false,
          listingId: "listing-green-dress",
          userId: "12",
          username: "alex"
        }
      ];
      
      return mockNotifications;
    }
  }

  // 标记通知为已读
  async markAsRead(notificationId: string): Promise<void> {
    try {
      console.log("🔔 Marking notification as read:", notificationId);
      
      await apiClient.patch(`/api/notifications/${notificationId}`, {});
      
      console.log("✅ Notification marked as read");
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      throw error;
    }
  }

  // 标记所有通知为已读
  async markAllAsRead(): Promise<void> {
    try {
      console.log("🔔 Marking all notifications as read");
      
      await apiClient.put('/api/notifications', {});
      
      console.log("✅ All notifications marked as read");
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      throw error;
    }
  }

  // 删除通知
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      console.log("🔔 Deleting notification:", notificationId);
      
      await apiClient.delete(`/api/notifications/${notificationId}`);
      
      console.log("✅ Notification deleted");
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
      throw error;
    }
  }

  // 创建通知（用于系统内部调用）
  async createNotification(params: NotificationParams): Promise<Notification> {
    try {
      console.log("🔔 Creating notification:", params);
      
      const response = await apiClient.post<{
        success: boolean;
        notification: Notification;
      }>('/api/notifications', {
        type: params.type,
        title: params.title,
        message: params.message,
        image_url: params.image,
        order_id: params.orderId,
        listing_id: params.listingId,
        userId: params.userId, // 目标用户ID
        related_user_id: params.userId // 相关用户ID（用于显示头像等）
      });
      
      if (response.data?.success) {
        console.log("✅ Notification created:", response.data.notification);
        return response.data.notification;
      }
      
      throw new Error('Failed to create notification');
    } catch (error) {
      console.error("❌ Error creating notification:", error);
      throw error;
    }
  }

  // 根据订单状态生成通知
  generateOrderNotification(orderData: any, isSeller: boolean): NotificationParams | null {
    const orderStatus = orderData.status;
    const orderId = orderData.id;
    
    switch (orderStatus) {
      case "IN_PROGRESS":
        if (isSeller) {
          return {
            type: "order",
            title: `Buyer @${orderData.buyer?.name || 'Buyer'} has paid`,
            message: "Please ship your item soon.",
            image: orderData.buyer?.avatar,
            orderId: orderId,
            userId: orderData.buyer?.id?.toString(),
            username: orderData.buyer?.name
          };
        } else {
          return {
            type: "order",
            title: "Payment confirmed",
            message: "Your payment has been processed.",
            orderId: orderId
          };
        }
        
      case "TO_SHIP":
        if (isSeller) {
          return {
            type: "order",
            title: "Order confirmed",
            message: "Please prepare the package and ship soon.",
            orderId: orderId
          };
        } else {
          return {
            type: "order",
            title: "Order confirmed",
            message: "Seller is preparing to ship.",
            orderId: orderId
          };
        }
        
      case "SHIPPED":
        if (isSeller) {
          return {
            type: "order",
            title: "Parcel shipped",
            message: "You have shipped the parcel.",
            orderId: orderId
          };
        } else {
          return {
            type: "order",
            title: `Seller @${orderData.seller?.name || 'Seller'} has shipped your parcel`,
            message: "Your order is on the way!",
            image: orderData.seller?.avatar,
            orderId: orderId,
            userId: orderData.seller?.id?.toString(),
            username: orderData.seller?.name
          };
        }
        
      case "DELIVERED":
        // 🔥 订单到达 - 买卖家都要收到通知
        if (isSeller) {
          return {
            type: "order",
            title: "Order arrived",
            message: "Parcel delivered. Waiting for buyer to confirm received.",
            orderId: orderId
          };
        } else {
          return {
            type: "order",
            title: "Order arrived",
            message: "Parcel arrived. Please confirm you have received the item.",
            orderId: orderId
          };
        }
        
      case "RECEIVED":
        // 🔥 买家确认收货并完成订单
        if (isSeller) {
          return {
            type: "order",
            title: "Order completed",
            message: `Buyer @${orderData.buyer?.name || 'Buyer'} confirmed received. Transaction completed.`,
            image: orderData.buyer?.avatar,
            orderId: orderId,
            userId: orderData.buyer?.id?.toString(),
            username: orderData.buyer?.name
          };
        } else {
          return {
            type: "order",
            title: "Order completed",
            message: "You confirmed received. Transaction completed successfully.",
            orderId: orderId
          };
        }
        
      case "COMPLETED":
        return {
          type: "order",
          title: "Order completed",
          message: "How was your experience? Leave a review to help others.",
          orderId: orderId
        };
        
      case "CANCELLED":
        // 🔥 订单取消
        if (isSeller) {
          return {
            type: "order",
            title: "Order cancelled",
            message: `Order with @${orderData.buyer?.name || 'Buyer'} has been cancelled.`,
            image: orderData.buyer?.avatar,
            orderId: orderId,
            userId: orderData.buyer?.id?.toString(),
            username: orderData.buyer?.name
          };
        } else {
          return {
            type: "order",
            title: "Order cancelled",
            message: `Order with @${orderData.seller?.name || 'Seller'} has been cancelled.`,
            image: orderData.seller?.avatar,
            orderId: orderId,
            userId: orderData.seller?.id?.toString(),
            username: orderData.seller?.name
          };
        }
        
      default:
        return null;
    }
  }

  // 生成like通知
  generateLikeNotification(likerName: string, listingTitle: string, likerAvatar?: string, likerId?: string): NotificationParams {
    return {
      type: "like",
      title: `@${likerName} liked your listing`,
      message: listingTitle,
      image: likerAvatar,
      userId: likerId,
      username: likerName
    };
  }

  // 生成follow通知
  generateFollowNotification(followerName: string, followerAvatar?: string, followerId?: string): NotificationParams {
    return {
      type: "follow",
      title: `@${followerName} started following you`,
      message: "You have a new follower!",
      image: followerAvatar,
      userId: followerId,
      username: followerName
    };
  }

  // 生成review通知
  generateReviewNotification(reviewerName: string, listingTitle: string, rating: number, reviewerAvatar?: string, reviewerId?: string): NotificationParams {
    return {
      type: "review",
      title: `@${reviewerName} gave your listing a ${rating}-star review`,
      message: listingTitle,
      image: reviewerAvatar,
      userId: reviewerId,
      username: reviewerName
    };
  }
}

export const notificationService = new NotificationService();
