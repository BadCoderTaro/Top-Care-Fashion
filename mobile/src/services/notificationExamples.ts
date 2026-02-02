// 使用示例：如何在其他组件中触发notification

import { notificationService } from './notificationService';
import type { OrderStatus } from './ordersService';
import { ordersService } from './ordersService';

// 示例1: 当有人like了商品时
export const handleLikeListing = async (likerName: string, listingTitle: string, likerAvatar?: string) => {
  try {
    // 创建like notification
    const notification = notificationService.generateLikeNotification(
      likerName, 
      listingTitle, 
      likerAvatar
    );
    
    // 保存到后端
    await notificationService.createNotification(notification);
    
    console.log("✅ Like notification created");
  } catch (error) {
    console.error("❌ Error creating like notification:", error);
  }
};

// 示例2: 当有人follow了用户时
export const handleFollowUser = async (followerName: string, followerAvatar?: string) => {
  try {
    const notification = notificationService.generateFollowNotification(
      followerName, 
      followerAvatar
    );
    
    await notificationService.createNotification(notification);
    
    console.log("✅ Follow notification created");
  } catch (error) {
    console.error("❌ Error creating follow notification:", error);
  }
};

// 示例3: 当有人留下review时
export const handleLeaveReview = async (reviewerName: string, listingTitle: string, rating: number, reviewerAvatar?: string) => {
  try {
    const notification = notificationService.generateReviewNotification(
      reviewerName, 
      listingTitle, 
      rating, 
      reviewerAvatar
    );
    
    await notificationService.createNotification(notification);
    
    console.log("✅ Review notification created");
  } catch (error) {
    console.error("❌ Error creating review notification:", error);
  }
};

// 示例4: 当订单状态变化时
export const handleOrderStatusChange = async (orderData: any, isSeller: boolean) => {
  try {
    const notification = notificationService.generateOrderNotification(orderData, isSeller);
    
    if (notification) {
      await notificationService.createNotification(notification);
      console.log("✅ Order notification created:", notification.title);
    }
  } catch (error) {
    console.error("❌ Error creating order notification:", error);
  }
};

// 示例5: 具体的订单状态通知示例
export const orderStatusExamples = {
  // 买家付款
  buyerPaid: {
    orderData: {
      id: "ORD123",
      status: "IN_PROGRESS",
      buyer: { name: "alex", avatar: "https://i.pravatar.cc/100?img=12" }
    },
    isSeller: true
  },
  
  // 卖家发货
  sellerShipped: {
    orderData: {
      id: "ORD456", 
      status: "SHIPPED",
      seller: { name: "mike", avatar: "https://i.pravatar.cc/100?img=15" }
    },
    isSeller: false
  },
  
  // 订单到达 (买卖家都要)
  orderArrived: {
    orderData: {
      id: "ORD789",
      status: "DELIVERED"
    },
    isSeller: true // 或 false，都会收到通知
  },
  
  // 买家确认收货并完成
  orderCompleted: {
    orderData: {
      id: "ORD789",
      status: "RECEIVED", 
      buyer: { name: "alex", avatar: "https://i.pravatar.cc/100?img=12" }
    },
    isSeller: true
  },
  
  // 订单取消
  orderCancelled: {
    orderData: {
      id: "ORD999",
      status: "CANCELLED",
      buyer: { name: "sarah", avatar: "https://i.pravatar.cc/100?img=8" }
    },
    isSeller: true
  }
};

// 示例5: 在ChatScreen中集成notification
export const updateOrderStatus = async (orderId: number, newStatus: OrderStatus, isSeller: boolean) => {
  try {
    // 更新订单状态
    const updatedOrder = await ordersService.updateOrderStatus(orderId, { status: newStatus });
    
    // 创建notification
    const notification = notificationService.generateOrderNotification(updatedOrder, isSeller);
    if (notification) {
      await notificationService.createNotification(notification);
    }
    
    console.log("✅ Order updated and notification created");
  } catch (error) {
    console.error("❌ Error updating order:", error);
  }
};
