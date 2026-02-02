import { API_CONFIG, ApiError } from '../config/api';
import { apiClient } from './api';
import { resolvePremiumFlag } from './utils/premium';

export interface LikedListing {
  id: number;
  listing: {
    id: number;
    name?: string;
    title?: string;
    price: number;
    size?: string;
    condition_type?: string;
    description?: string;
    image_url?: string;
    image_urls?: string[] | string | null;
    images?: string[];
    tags?: string[] | string | null;
    inventory_count?: number; // 🔥 库存数量
    seller: {
      id: number;
      username: string;
      avatar_url?: string;
      average_rating?: number;
      total_reviews?: number;
      isPremium?: boolean;
    };
    created_at: string;
    updated_at: string;
  };
  created_at: string;
}

export interface LikeStatus {
  liked: boolean;
}

const ensureIsoString = (value: unknown): string => {
  if (!value) {
    return new Date().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return new Date(numeric).toISOString();
  }

  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const coerceNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
};

const parseStringArray = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return uniqueStrings(value.filter((entry): entry is string => typeof entry === 'string'));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return uniqueStrings(parsed.filter((entry): entry is string => typeof entry === 'string'));
      }
    } catch (error) {
      if (/^https?:\/\//i.test(trimmed)) {
        return [trimmed];
      }
    }

    return trimmed.includes(',')
      ? uniqueStrings(trimmed.split(',').map((item) => item.trim()))
      : [trimmed];
  }

  return [];
};

const normalizeImages = (listing: any): string[] => {
  const imagesFromField = Array.isArray(listing?.images)
    ? listing.images.filter((entry: unknown): entry is string => typeof entry === 'string')
    : [];

  const imagesFromImageUrls = parseStringArray(listing?.image_urls);
  const imagesFromImageUrl = typeof listing?.image_url === 'string' ? [listing.image_url] : [];

  return uniqueStrings([...imagesFromField, ...imagesFromImageUrls, ...imagesFromImageUrl]);
};

const normalizeSeller = (seller: any) => {
  if (!seller) {
    return seller;
  }

  const id = coerceNumber(seller.id ?? seller.user_id ?? seller.seller_id, 0);
  const usernameCandidate = seller.username ?? seller.handle ?? seller.name ?? `user-${id || '0'}`;
  const displayName = seller.name ?? usernameCandidate;

  return {
    ...seller,
    id,
    username: usernameCandidate,
    name: displayName,
    isPremium: resolvePremiumFlag(seller),
  };
};

const normalizeListing = (listing: any): LikedListing['listing'] => {
  if (!listing) {
    return listing;
  }

  const createdAt = ensureIsoString(listing.created_at);
  const updatedAt = ensureIsoString(listing.updated_at ?? createdAt);
  const images = normalizeImages(listing);
  const tags = parseStringArray(listing?.tags);
  const name = typeof listing.name === 'string' && listing.name.trim() ? listing.name : listing.title;
  const title = typeof listing.title === 'string' && listing.title.trim() ? listing.title : listing.name;

  const result: any = {
    ...listing,
    id: coerceNumber(listing.id ?? listing.listing_id, 0),
    name,
    title,
    price: coerceNumber(listing.price, 0),
    created_at: createdAt,
    updated_at: updatedAt,
    images,
    image_urls: images.length ? images : listing.image_urls,
    tags,
    seller: listing.seller ? normalizeSeller(listing.seller) : listing.seller,
  };
  
  // 🔥 只在 inventory_count 存在时才设置
  if (listing.inventory_count !== undefined && listing.inventory_count !== null) {
    result.inventory_count = coerceNumber(listing.inventory_count, 0);
  }
  
  return result;
};

const normalizePrivateLike = (entry: any): LikedListing => {
  const listing = normalizeListing(entry.listing) ?? entry.listing;
  const createdAt = ensureIsoString(entry.created_at ?? listing?.created_at);
  const updatedAt = ensureIsoString(listing?.updated_at ?? entry.updated_at ?? createdAt);

  return {
    id: coerceNumber(entry.id ?? listing?.id, 0),
    listing: listing
      ? { ...listing, created_at: createdAt, updated_at: updatedAt }
      : listing,
    created_at: createdAt,
  } as LikedListing;
};

const normalizePublicLike = (entry: any): LikedListing => {
  const listingSource = entry.item ?? entry.listing ?? {};
  const listing = normalizeListing(listingSource) ?? listingSource;
  const createdAt = ensureIsoString(entry.created_at ?? listingSource.created_at);
  const updatedAt = ensureIsoString(entry.updated_at ?? listingSource.updated_at ?? createdAt);

  return {
    id: coerceNumber(entry.id ?? listing?.id, 0),
    listing: listing
      ? { ...listing, created_at: createdAt, updated_at: updatedAt }
      : listing,
    created_at: createdAt,
  } as LikedListing;
};

class LikesService {
  private baseUrl = API_CONFIG.BASE_URL;

  // Get user's liked listings
  async getLikedListings(): Promise<LikedListing[]> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: any[] }>(API_CONFIG.ENDPOINTS.LIKES);
      if (!data) throw new Error('Empty response');
      if (!data.success) throw new Error((data as any).error || 'Failed to get liked listings');
      return Array.isArray(data.data) ? data.data.map(normalizePrivateLike) : [];
    } catch (error) {
      console.error('Error getting liked listings:', error);
      throw error;
    }
  }

  // Like a listing
  async likeListing(listingId: number): Promise<boolean> {
    try {
      const { data } = await apiClient.post<{ success: boolean; data: { liked: boolean } }>(
        API_CONFIG.ENDPOINTS.LIKES,
        { listing_id: listingId, action: 'like' }
      );
      if (!data) throw new Error('Empty response');
      if (!data.success) throw new Error((data as any).error || 'Failed to like listing');
      console.log("🔔 Like notification will be created by backend");
      return Boolean((data as any).data?.liked);
    } catch (error) {
      console.error('Error liking listing:', error);
      throw error;
    }
  }

  // Unlike a listing
  async unlikeListing(listingId: number): Promise<boolean> {
    try {
      const { data } = await apiClient.post<{ success: boolean; data: { liked: boolean } }>(
        API_CONFIG.ENDPOINTS.LIKES,
        { listing_id: listingId, action: 'unlike' }
      );
      if (!data) throw new Error('Empty response');
      if (!data.success) throw new Error((data as any).error || 'Failed to unlike listing');
      return Boolean((data as any).data?.liked);
    } catch (error) {
      console.error('Error unliking listing:', error);
      throw error;
    }
  }

  // Check if user has liked a specific listing
  async getLikeStatus(listingId: number): Promise<boolean> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: { liked: boolean } }>(
        `${API_CONFIG.ENDPOINTS.LIKES}/${listingId}`
      );
      if (!data) throw new Error('Empty response');
      if (!data.success) throw new Error((data as any).error || 'Failed to get like status');
      return Boolean((data as any).data?.liked);
    } catch (error) {
      console.error('Error getting like status:', error);
      throw error;
    }
  }

  // Toggle like status (like if not liked, unlike if liked)
  async toggleLike(listingId: number, currentStatus: boolean): Promise<boolean> {
    if (currentStatus) {
      return await this.unlikeListing(listingId);
    } else {
      return await this.likeListing(listingId);
    }
  }

  // Get public liked listings for a specific user
  async getPublicLikedListings(username: string): Promise<LikedListing[]> {
    try {
      const { data } = await apiClient.get<{ items?: any[] }>(`/api/users/${username}/likes`);
      const items = Array.isArray(data?.items) ? data!.items : [];
      return items.map(normalizePublicLike);
    } catch (error) {
      console.error('Error fetching public liked listings:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw error;
    }
  }
}

export const likesService = new LikesService();

