import { apiClient } from './api';
import { API_CONFIG } from '../config/api';

export interface ListingStats {
  listingId: string;
  stats: {
    views: number | null;
    likes: number;
    clicks: number | null;
    bag: number | null;
  };
  timeSeries: Array<{
    date: string;
    views: number;
    likes: number;
    clicks: number;
  }> | null;
  canViewFull: boolean;
}

export interface ListingStatsResponse {
  success: boolean;
  data: ListingStats;
}

class ListingStatsService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * 获取listing统计数据
   */
  async getListingStats(listingId: string): Promise<ListingStats> {
    try {
      const { data } = await apiClient.get<ListingStatsResponse>(
        `${API_CONFIG.ENDPOINTS.LISTINGS}/${listingId}/stats`
      );
      if (!data || !data.success) {
        throw new Error('Failed to fetch listing stats');
      }
      return data.data;
    } catch (error) {
      console.error('Error fetching listing stats:', error);
      throw error;
    }
  }

  /**
   * 记录listing查看
   */
  async recordView(listingId: string): Promise<void> {
    try {
      await apiClient.post(`${API_CONFIG.ENDPOINTS.LISTINGS}/${listingId}/view`, {});
    } catch (error) {
      // 静默失败，不影响用户体验
      console.warn('Failed to record view:', error);
    }
  }

  /**
   * 记录listing点击
   */
  async recordClick(listingId: string): Promise<void> {
    try {
      await apiClient.post(`${API_CONFIG.ENDPOINTS.LISTINGS}/${listingId}/click`, {});
    } catch (error) {
      // 静默失败，不影响用户体验
      console.warn('Failed to record click:', error);
    }
  }
}

export const listingStatsService = new ListingStatsService();

