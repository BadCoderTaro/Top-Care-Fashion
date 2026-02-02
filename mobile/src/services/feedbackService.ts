import { apiClient } from './api';
import { API_CONFIG } from '../config/api';

export type FeedbackType = 'bug' | 'feature' | 'general';
export type FeedbackPriority = 'low' | 'medium' | 'high';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type Feedback = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  title: string;
  description: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  tags: string[];
  rating: number | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackTestimonial = {
  id: number;
  user: string | null;
  text: string;
  rating: number;
  tags: string[];
  ts: number;
};

export type CreateFeedbackRequest = {
  type?: FeedbackType;
  title?: string;
  description: string;
  priority?: FeedbackPriority;
  tags?: string[];
  rating?: number;
};

export type FeedbackListResponse = {
  feedbacks: Feedback[];
  testimonials: FeedbackTestimonial[];
};

class FeedbackService {
  async getFeedbacks(): Promise<FeedbackListResponse> {
    try {
      const response = await apiClient.get<{
        feedbacks?: Feedback[];
        testimonials?: FeedbackTestimonial[];
      }>(API_CONFIG.ENDPOINTS.FEEDBACK);

      return {
        feedbacks: response.data?.feedbacks ?? [],
        testimonials: response.data?.testimonials ?? [],
      };
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      throw error;
    }
  }

  async createFeedback(feedbackData: CreateFeedbackRequest): Promise<Feedback> {
    try {
      const response = await apiClient.post<Feedback>(
        API_CONFIG.ENDPOINTS.FEEDBACK,
        feedbackData,
      );

      if (!response.data) {
        throw new Error('Feedback creation failed');
      }

      return response.data;
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  async getFeedbackTags(): Promise<string[]> {
    try {
      const response = await apiClient.get<{ tags?: string[] }>(
        `${API_CONFIG.ENDPOINTS.FEEDBACK}/tags`,
      );

      return response.data?.tags ?? [];
    } catch (error) {
      console.error('Error fetching feedback tags:', error);
      throw error;
    }
  }
}

export const feedbackService = new FeedbackService();
