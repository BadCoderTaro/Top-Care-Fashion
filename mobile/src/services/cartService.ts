import { API_CONFIG } from '../config/api';
import { apiClient } from './api';

export interface CartItem {
  id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    listing_id?: string | number; // 🔥 添加 listing_id 字段，用于创建订单
    title: string;
    price: number;
    description: string;
    brand: string;
    size: string;
    condition: string;
    material?: string;
    gender?: string;
    tags?: string[];
    category?: string;
    images: string[];
    shippingOption?: string | null;
    shippingFee?: number | null;
    location?: string | null;
    availableQuantity?: number; // 🔥 库存数量
    seller: {
      id: number;
      name: string;
      avatar: string;
      rating: number;
      sales: number;
    };
  };
}

export interface CartResponse {
  items: CartItem[];
}

export interface AddToCartRequest {
  listingId: string;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

class CartService {
  private basePath = API_CONFIG.ENDPOINTS.CART;

  async getCartItems(): Promise<CartItem[]> {
    try {
      const { data } = await apiClient.get<CartResponse>(this.basePath);
      return data?.items || [];
    } catch (error) {
      console.error('Error fetching cart items:', error);
      throw error;
    }
  }

  async addToCart(listingId: string, quantity: number = 1): Promise<CartItem> {
    try {
      const { data } = await apiClient.post<CartItem>(this.basePath, { listingId, quantity });
      if (!data) throw new Error('Empty response');
      return data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async updateCartItem(cartItemId: number, quantity: number): Promise<CartItem> {
    try {
      const { data } = await apiClient.put<CartItem>(`${this.basePath}/${cartItemId}`, { quantity });
      if (!data) throw new Error('Empty response');
      return data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  async removeCartItem(cartItemId: number): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/${cartItemId}`);
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    }
  }

  async clearCart(): Promise<void> {
    try {
      await apiClient.delete(this.basePath);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();
