import { apiClient } from './api';

export interface CategoryInfo {
  name: string;
  displayName?: string;
}

export interface CategoriesResponse {
  success: boolean;
  data?: {
    men: Record<string, string[]>;
    women: Record<string, string[]>;
    unisex: Record<string, string[]>;
  };
  error?: string;
}

/**
 * Category Service - 动态获取和管理分类
 */
class CategoryService {
  private categories: CategoryInfo[] = [];
  private categoriesLoaded = false;
  private loadPromise: Promise<CategoryInfo[]> | null = null;

  /**
   * 从后端获取所有分类
   */
  async getCategories(): Promise<CategoryInfo[]> {
    // 如果已经加载过，直接返回
    if (this.categoriesLoaded && this.categories.length > 0) {
      return this.categories;
    }

    // 如果正在加载，等待加载完成
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // 开始加载
    this.loadPromise = this.fetchCategories();
    try {
      const categories = await this.loadPromise;
      this.categories = categories;
      this.categoriesLoaded = true;
      return categories;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * 获取分类名称列表
   */
  async getCategoryNames(): Promise<string[]> {
    const categories = await this.getCategories();
    return categories.map(cat => cat.name);
  }

  /**
   * 检查分类是否存在
   */
  async hasCategory(categoryName: string): Promise<boolean> {
    const categories = await this.getCategories();
    const normalized = categoryName.toLowerCase();
    return categories.some(cat => cat.name.toLowerCase() === normalized);
  }

  /**
   * 刷新分类列表（强制重新从后端获取）
   */
  async refreshCategories(): Promise<CategoryInfo[]> {
    this.categoriesLoaded = false;
    this.categories = [];
    return this.getCategories();
  }

  /**
   * 从后端API获取分类
   */
  private async fetchCategories(): Promise<CategoryInfo[]> {
    try {
      const response = await apiClient.get<CategoriesResponse>('/api/categories');
      
      if (!response.data?.success || !response.data.data) {
        console.warn('⚠️ Failed to fetch categories from API, using fallback');
        return this.getFallbackCategories();
      }

      // 从返回的数据中提取所有唯一的分类名称
      const categorySet = new Set<string>();
      const { men, women, unisex } = response.data.data;

      // 收集所有分类名称
      Object.keys(men || {}).forEach(name => categorySet.add(name));
      Object.keys(women || {}).forEach(name => categorySet.add(name));
      Object.keys(unisex || {}).forEach(name => categorySet.add(name));

      const categories: CategoryInfo[] = Array.from(categorySet).map(name => ({
        name,
        displayName: name,
      }));

      console.log('✅ Loaded categories from API:', categories.length);
      return categories;
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      console.log('⚠️ Using fallback categories');
      return this.getFallbackCategories();
    }
  }

  /**
   * 获取fallback分类（当API失败时使用）
   */
  private getFallbackCategories(): CategoryInfo[] {
    return [
      { name: 'Tops', displayName: 'Tops' },
      { name: 'Bottoms', displayName: 'Bottoms' },
      { name: 'Footwear', displayName: 'Footwear' },
      { name: 'Accessories', displayName: 'Accessories' },
      { name: 'Outerwear', displayName: 'Outerwear' },
      { name: 'Dresses', displayName: 'Dresses' },
    ];
  }
}

export const categoryService = new CategoryService();

