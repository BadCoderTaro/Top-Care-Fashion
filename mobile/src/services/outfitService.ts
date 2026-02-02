import { apiClient } from './api';
import type { ListingItem, BagItem } from '../../types/shop';

export interface SavedOutfit {
  id: number;
  user_id: number;
  outfit_name: string | null;
  base_item_id: number | null;
  top_item_id: number | null;
  bottom_item_id: number | null;
  shoe_item_id: number | null;
  accessory_ids: number[];
  created_at: string;
  updated_at: string;
  ai_rating?: number | null;
  style_name?: string | null;
  color_harmony_score?: number | null;
  color_harmony_feedback?: string | null;
  style_tips?: string | null;
  vibe?: string | null;
  base_category?: string | null;
  top_match_score?: number | null;
  bottom_match_score?: number | null;
  shoe_match_score?: number | null;
  accessory_match_scores?: Record<string, number> | null;
  total_price?: number | null;
  base_item?: ListingItem;
  top_item?: ListingItem;
  bottom_item?: ListingItem;
  shoe_item?: ListingItem;
  accessory_items?: ListingItem[];
}

export interface CreateOutfitPayload {
  outfit_name?: string;
  base_item_id: number | string | null;
  top_item_id: number | string | null;
  bottom_item_id: number | string | null;
  shoe_item_id: number | string | null;
  accessory_ids: Array<number | string>;
  ai_rating?: number | null;
  style_name?: string | null;
  color_harmony_score?: number | null;
  color_harmony_feedback?: string | null;
  style_tips?: string | null;
  vibe?: string | null;
}

export interface UpdateOutfitPayload {
  outfit_name?: string;
  ai_rating?: number | null;
  style_name?: string | null;
  color_harmony_score?: number | null;
  color_harmony_feedback?: string | null;
  style_tips?: string | null;
  vibe?: string | null;
}

class OutfitService {
  /**
   * Get all saved outfits for the current user
   */
  async getSavedOutfits(): Promise<SavedOutfit[]> {
    try {
      console.log("📦 Fetching saved outfits...");
      const response = await apiClient.get<{ data: SavedOutfit[] }>(
        '/api/outfits'
      );

      const payload = response.data?.data ?? response.data;
      if (Array.isArray(payload)) {
        console.log(`✅ Loaded ${payload.length} saved outfits`);
        return payload;
      }

      console.warn("⚠️ Unexpected response format:", response);
      return [];
    } catch (error) {
      console.error("❌ Error fetching saved outfits:", error);
      throw error;
    }
  }

  /**
   * Get a specific saved outfit by ID
   */
  async getSavedOutfitById(outfitId: string | number): Promise<SavedOutfit> {
    try {
      console.log(`📦 Fetching outfit: ${outfitId}`);
      const response = await apiClient.get<{ data: SavedOutfit }>(
        `/api/outfits/${outfitId}`
      );

      const outfit = response.data?.data ?? (response.data as unknown as SavedOutfit | undefined);
      if (outfit) {
        console.log(`✅ Loaded outfit: ${outfitId}`);
        return outfit;
      }

      throw new Error('Outfit not found');
    } catch (error) {
      console.error(`❌ Error fetching outfit ${outfitId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new saved outfit
   */
  async createOutfit(payload: CreateOutfitPayload): Promise<SavedOutfit> {
    try {
      console.log("📦 Creating new outfit...", payload);

      const response = await apiClient.post<{ data: SavedOutfit }>(
        '/api/outfits',
        payload
      );

      const outfit = response.data?.data ?? (response.data as unknown as SavedOutfit | undefined);
      if (outfit) {
        console.log(`✅ Outfit created: ${outfit.id}`);
        return outfit;
      }

      throw new Error('Failed to create outfit');
    } catch (error) {
      console.error("❌ Error creating outfit:", error);
      throw error;
    }
  }

  /**
   * Update a saved outfit (mainly for renaming)
   */
  async updateOutfit(
    outfitId: string | number,
    payload: UpdateOutfitPayload
  ): Promise<SavedOutfit> {
    try {
      console.log(`📦 Updating outfit: ${outfitId}`, payload);

      const response = await apiClient.put<{ data: SavedOutfit }>(
        `/api/outfits/${outfitId}`,
        payload
      );

      const outfit = response.data?.data ?? (response.data as unknown as SavedOutfit | undefined);
      if (outfit) {
        console.log(`✅ Outfit updated: ${outfitId}`);
        return outfit;
      }

      throw new Error('Failed to update outfit');
    } catch (error) {
      console.error(`❌ Error updating outfit ${outfitId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a saved outfit
   */
  async deleteOutfit(outfitId: string | number): Promise<void> {
    try {
      console.log(`📦 Deleting outfit: ${outfitId}`);

      await apiClient.delete(`/api/outfits/${outfitId}`);

      console.log(`✅ Outfit deleted: ${outfitId}`);
    } catch (error) {
      console.error(`❌ Error deleting outfit ${outfitId}:`, error);
      throw error;
    }
  }

  /**
   * Convert a SavedOutfit to BagItems for adding to cart
   */
  convertOutfitToBagItems(outfit: SavedOutfit): BagItem[] {
    const items: BagItem[] = [];

    if (outfit.base_item) {
      items.push({ item: outfit.base_item, quantity: 1 });
    }
    if (outfit.top_item) {
      items.push({ item: outfit.top_item, quantity: 1 });
    }
    if (outfit.bottom_item) {
      items.push({ item: outfit.bottom_item, quantity: 1 });
    }
    if (outfit.shoe_item) {
      items.push({ item: outfit.shoe_item, quantity: 1 });
    }
    if (outfit.accessory_items && outfit.accessory_items.length > 0) {
      outfit.accessory_items.forEach((item) => {
        items.push({ item, quantity: 1 });
      });
    }

    return items;
  }

  /**
   * Get total price of an outfit
   */
  getOutfitTotalPrice(outfit: SavedOutfit): number {
    let total = 0;

    if (outfit.base_item) total += outfit.base_item.price;
    if (outfit.top_item) total += outfit.top_item.price;
    if (outfit.bottom_item) total += outfit.bottom_item.price;
    if (outfit.shoe_item) total += outfit.shoe_item.price;
    if (outfit.accessory_items) {
      outfit.accessory_items.forEach((item) => {
        total += item.price;
      });
    }

    return total;
  }

  /**
   * Get item count in outfit
   */
  getOutfitItemCount(outfit: SavedOutfit): number {
    let count = 0;

    if (outfit.base_item) count++;
    if (outfit.top_item) count++;
    if (outfit.bottom_item) count++;
    if (outfit.shoe_item) count++;
    if (outfit.accessory_items) {
      count += outfit.accessory_items.length;
    }

    return count;
  }
}

export const outfitService = new OutfitService();