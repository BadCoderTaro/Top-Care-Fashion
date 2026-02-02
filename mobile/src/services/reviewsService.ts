import { apiClient } from './api';

export interface Review {
  id: number;
  order_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment: string | null;
  images?: string[];
  created_at: string;
  reviewer: {
    id: number;
    username: string;
    avatar_url?: string;
    avatar_path?: string;
  };
  reviewee: {
    id: number;
    username: string;
    avatar_url?: string;
    avatar_path?: string;
  };
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
  images?: string[];
}

class ReviewsService {
  // 获取订单的评论
  async getOrderReviews(orderId: number): Promise<Review[]> {
    try {
      const response = await apiClient.get<Review[]>(`/api/orders/${orderId}/reviews`);
      return response.data ?? [];
    } catch (error) {
      console.error('Error fetching order reviews:', error);
      throw error;
    }
  }

  // 创建评论
  async createReview(orderId: number, reviewData: CreateReviewRequest): Promise<Review> {
    try {
      const response = await apiClient.post<Review>(`/api/orders/${orderId}/reviews`, reviewData);
      if (!response.data) {
        throw new Error('Failed to create review');
      }
      return response.data;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // 检查订单的评论状态（用于显示 Review CTA）
  async check(orderId: number): Promise<{
    userRole: 'buyer' | 'seller';
    hasUserReviewed: boolean;
    hasOtherReviewed: boolean;
    reviewsCount: number;
    userReview: Review | null;
    otherReview: Review | null;
  }> {
    try {
      const response = await apiClient.get<{
        userRole: 'buyer' | 'seller';
        hasUserReviewed: boolean;
        hasOtherReviewed: boolean;
        reviewsCount: number;
        userReview: Review | null;
        otherReview: Review | null;
      }>(`/api/orders/${orderId}/reviews/check`);
      if (!response.data) {
        throw new Error('No data returned from reviews check');
      }
      return response.data;
    } catch (error) {
      console.error('Error checking review status:', error);
      throw error;
    }
  }
}

export const reviewsService = new ReviewsService();
