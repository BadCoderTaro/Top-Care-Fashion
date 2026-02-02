import { notificationService } from './notificationService';

// 订单状态变化时自动创建notification的工具函数
export class NotificationHelper {
  // 当订单状态变化时创建notification
  static async createOrderStatusNotification(
    orderData: any, 
    isSeller: boolean, 
    targetUserId: number
  ): Promise<void> {
    try {
      const notification = notificationService.generateOrderNotification(orderData, isSeller);
      
      if (notification) {
        // 创建notification并指定目标用户
        await notificationService.createNotification({
          ...notification,
          userId: targetUserId.toString()
        });
        
        console.log("✅ Order status notification created for user:", targetUserId);
      }
    } catch (error) {
      console.error("❌ Error creating order status notification:", error);
    }
  }

  // 当有人like商品时创建notification
  static async createLikeNotification(
    likerId: number,
    likerName: string,
    likerAvatar: string | null,
    listingId: number,
    listingTitle: string,
    sellerId: number
  ): Promise<void> {
    try {
      const notification = notificationService.generateLikeNotification(
        likerName,
        listingTitle,
        likerAvatar ?? undefined,
        likerId.toString()
      );
      
      await notificationService.createNotification({
        ...notification,
        userId: sellerId.toString(),
        listingId: listingId.toString()
      });
      
      console.log("✅ Like notification created for seller:", sellerId);
    } catch (error) {
      console.error("❌ Error creating like notification:", error);
    }
  }

  // 当有人follow用户时创建notification
  static async createFollowNotification(
    followerId: number,
    followerName: string,
    followerAvatar: string | null,
    targetUserId: number
  ): Promise<void> {
    try {
      const notification = notificationService.generateFollowNotification(
        followerName,
        followerAvatar ?? undefined,
        followerId.toString()
      );
      
      await notificationService.createNotification({
        ...notification,
        userId: targetUserId.toString()
      });
      
      console.log("✅ Follow notification created for user:", targetUserId);
    } catch (error) {
      console.error("❌ Error creating follow notification:", error);
    }
  }

  // 当有人留下review时创建notification
  static async createReviewNotification(
    reviewerId: number,
    reviewerName: string,
    reviewerAvatar: string | null,
    listingId: number,
    listingTitle: string,
    rating: number,
    sellerId: number
  ): Promise<void> {
    try {
      const notification = notificationService.generateReviewNotification(
        reviewerName,
        listingTitle,
        rating,
        reviewerAvatar ?? undefined,
        reviewerId.toString()
      );
      
      await notificationService.createNotification({
        ...notification,
        userId: sellerId.toString(),
        listingId: listingId.toString()
      });
      
      console.log("✅ Review notification created for seller:", sellerId);
    } catch (error) {
      console.error("❌ Error creating review notification:", error);
    }
  }
}

// 导出工具函数
export const {
  createOrderStatusNotification,
  createLikeNotification,
  createFollowNotification,
  createReviewNotification
} = NotificationHelper;




