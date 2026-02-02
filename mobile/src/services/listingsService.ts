import { apiClient } from './api';
import { API_CONFIG } from '../config/api';
import type { ListingCategory, ListingItem } from '../../types/shop';
import { resolvePremiumFlag } from './utils/premium';

export interface BrandSummary {
  name: string;
  listingsCount: number;
}

// 用户listings查询参数
export interface UserListingsQueryParams {
  status?: 'active' | 'sold' | 'all' | 'unlisted';
  category?: string;
  condition?: string;
  gender?: "Men" | "Women" | "Unisex";
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'latest' | 'price_low_to_high' | 'price_high_to_low';
  limit?: number;
  offset?: number;
}

export interface ListingsQueryParams {
  category?: string;
  categoryId?: number; // 支持直接传递 categoryId
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  gender?: string;
  size?: string;
  sizes?: string[];
  condition?: string;
  sort?: string;
  seed?: number; // Seed for feed algorithm pagination consistency
  page?: number; // Page number for feed algorithm
}

// 分页响应类型
export interface ListingsResponse {
  items: ListingItem[];
  hasMore: boolean;
  total: number;
}

export interface BoostedListingSummary {
  id: number;
  listingId: number;
  title: string;
  size: string | null;
  price: number;
  images: string[];
  primaryImage: string | null;
  status: string;
  startedAt: string | null;
  endsAt: string | null;
  views: number;
  clicks: number;
  viewUpliftPercent: number;
  clickUpliftPercent: number;
  usedFreeCredit: boolean;
}

export interface BoostListingsResponse {
  createdCount: number;
  promotionIds: number[];
  freeCreditsUsed: number;
  paidBoostCount: number;
  totalCharge: number;
  pricePerBoost: number;
  currency: string;
  alreadyPromotedIds?: number[];
}

// 创建商品请求参数
export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  brand: string;
  size: string | null;
  condition: string;
  material?: string;
  tags?: string[];
  category: string;
  gender: string;
  images: string[];
  shippingOption?: string;
  shippingFee?: number;
  location?: string;
  listed?: boolean;
  sold?: boolean;
  quantity?: number; // 🔥 库存数量，默认为1
}

export interface DraftListingRequest {
  title?: string;
  description?: string;
  price?: number;
  brand?: string | null;
  size?: string | null;
  condition?: string | null;
  material?: string | null;
  tags?: string[];
  category?: string | null;
  gender?: string | null;
  images?: string[];
  shippingOption?: string | null;
  shippingFee?: number | null;
  location?: string | null;
  quantity?: number; // 🔥 库存数量
}

// 分类数据结构
export interface CategoryData {
  men: Record<string, { id: number; subcategories: string[] }>;
  women: Record<string, { id: number; subcategories: string[] }>;
  unisex: Record<string, { id: number; subcategories: string[] }>;
  categoryMap?: Record<string, number>; // 名称到ID的映射，方便查找
}

const VALID_LISTING_CATEGORIES: ListingCategory[] = [
  "Accessories",
  "Bottoms",
  "Footwear",
  "Outerwear",
  "Tops",
];

const PLACEHOLDER_STRING_TOKENS = new Set([
  "",
  "notavailable",
  "notapplicable",
  "none",
  "null",
  "undefined",
  "select",
  "selecta",
  "selectcategory",
  "selectacategory",
  "choose",
  "choosecategory",
]);

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s'"`~!@#$%^&*()_+\-={}\[\]\\|:;.,<>\/?]/g, "");

const sanitizeStringValue = (value?: string | null): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeToken(trimmed);
  if (PLACEHOLDER_STRING_TOKENS.has(normalized)) {
    return null;
  }

  return trimmed;
};

const toBoolean = (value: any): boolean =>
  value === true ||
  value === "true" ||
  value === 1 ||
  value === "1";

const extractAvatar = (source: any): string => {
  const candidates = [
    source?.avatar,
    source?.avatar_url,
    source?.avatar_path,
    source?.profile_image,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return "";
};

const normalizeSellerSummary = (seller: any): ListingItem["seller"] => {
  const rawId =
    seller?.id ?? seller?.user_id ?? seller?.seller_id ?? seller?.owner_id ?? seller?.participant_id;
  const id =
    typeof rawId === "number"
      ? rawId
      : rawId !== undefined
      ? Number(rawId)
      : undefined;

  const rawRating =
    seller?.rating ?? seller?.average_rating ?? seller?.avg_rating ?? seller?.rating_score ?? 0;
  const rating = Number(rawRating) || 0;

  const rawSales =
    seller?.sales ?? seller?.salesCount ?? seller?.sales_count ?? seller?.total_sales ?? seller?.completed_orders ?? 0;
  const sales = Number(rawSales) || 0;

  return {
    id,
    name: seller?.name ?? seller?.username ?? "Seller",
    avatar: extractAvatar(seller),
    rating,
    sales,
    isPremium: resolvePremiumFlag(seller),
  };
};

// 商品服务类
export class ListingsService {
  private async convertImageToBase64(imageUri: string): Promise<string> {
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    return globalThis.btoa(binaryString);
  }

  private extractFileName(uri: string): string {
    const segments = uri.split("/").filter(Boolean);
    return segments.length ? segments[segments.length - 1] : `listing-${Date.now()}.jpg`;
  }

  private buildDraftPayload(payload: DraftListingRequest): Partial<CreateListingRequest> {
    const draftData: Partial<CreateListingRequest> = {};

    if (payload.title !== undefined) {
      draftData.title = (payload.title ?? "").trim();
    }

    if (payload.description !== undefined) {
      draftData.description = payload.description ?? "";
    }

    if (payload.price !== undefined && payload.price !== null) {
      const numericPrice = Number(payload.price);
      if (!Number.isNaN(numericPrice)) {
        draftData.price = numericPrice;
      }
    }

    if (payload.brand !== undefined) {
      const cleanedBrand = sanitizeStringValue(payload.brand ?? null);
      draftData.brand = cleanedBrand ?? "";
    }

    if (payload.size !== undefined) {
      draftData.size = sanitizeStringValue(payload.size ?? null);
    }

    if (payload.condition !== undefined && payload.condition !== null) {
      draftData.condition = payload.condition;
    }

    if (payload.material !== undefined) {
      draftData.material = sanitizeStringValue(payload.material ?? null) ?? undefined;
    }

    if (payload.tags !== undefined) {
      draftData.tags = Array.isArray(payload.tags)
        ? payload.tags.filter((tag): tag is string => typeof tag === "string" && !!tag.trim())
        : undefined;
    }

    if (payload.category !== undefined && payload.category !== null) {
      draftData.category = payload.category;
    }

    if (payload.gender !== undefined && payload.gender !== null) {
      draftData.gender = payload.gender;
    }

    if (payload.images !== undefined) {
      draftData.images = Array.isArray(payload.images)
        ? payload.images.filter((uri): uri is string => typeof uri === "string" && !!uri.trim())
        : [];
    }

    if (payload.shippingOption !== undefined) {
      draftData.shippingOption = payload.shippingOption ?? undefined;
    }

    if (payload.shippingFee !== undefined) {
      if (payload.shippingFee === null) {
        draftData.shippingFee = undefined;
      } else {
        const numericFee = Number(payload.shippingFee);
        if (!Number.isNaN(numericFee)) {
          draftData.shippingFee = numericFee;
        }
      }
    }

    if (payload.location !== undefined) {
      const cleanedLocation = sanitizeStringValue(payload.location ?? null);
      draftData.location = cleanedLocation ?? undefined;
    }

    return draftData;
  }

  private sanitizeListingItem(listing: ListingItem): ListingItem {
    const sanitized: ListingItem = {
      ...listing,
      brand: sanitizeStringValue(listing.brand),
      size: sanitizeStringValue(listing.size),
      condition: sanitizeStringValue(listing.condition),
      material: sanitizeStringValue(listing.material),
      gender: listing.gender, // Gender is already typed correctly from API
      shippingOption: sanitizeStringValue(listing.shippingOption),
      location: sanitizeStringValue(listing.location),
      description:
        typeof listing.description === "string"
          ? listing.description.trim()
          : listing.description,
    };

    const rawListed = (listing as any).listed;
    if (typeof rawListed === "boolean") {
      sanitized.listed = rawListed;
    } else if (rawListed !== undefined && rawListed !== null) {
      sanitized.listed = Boolean(rawListed);
    }

    const rawSold = (listing as any).sold;
    if (typeof rawSold === "boolean") {
      sanitized.sold = rawSold;
    } else if (rawSold !== undefined && rawSold !== null) {
      sanitized.sold = Boolean(rawSold);
    }

    // 🔥 保留库存数量字段
    const rawAvailableQuantity = (listing as any).availableQuantity;
    if (typeof rawAvailableQuantity === "number") {
      sanitized.availableQuantity = rawAvailableQuantity;
    } else if (rawAvailableQuantity !== undefined && rawAvailableQuantity !== null) {
      const parsed = Number(rawAvailableQuantity);
      if (!Number.isNaN(parsed)) {
        sanitized.availableQuantity = parsed;
      }
    }

    if (Array.isArray(listing.tags)) {
      const cleanedTags = listing.tags
        .map((tag) => sanitizeStringValue(tag))
        .filter((tag): tag is string => Boolean(tag));
      sanitized.tags = cleanedTags;
    }

    const cleanedCategory = sanitizeStringValue(
      (listing.category as string | null) ?? null
    );
    if (cleanedCategory === null && listing.category !== undefined) {
      sanitized.category = null;
    } else if (
      cleanedCategory &&
      cleanedCategory !== listing.category &&
      VALID_LISTING_CATEGORIES.includes(cleanedCategory as ListingCategory)
    ) {
      sanitized.category = cleanedCategory as ListingCategory;
    }

    const rawSeller = (listing as any).seller ?? {};
    sanitized.seller = normalizeSellerSummary({
      ...rawSeller,
      // 保留之前可能已存在的字段
      ...sanitized.seller,
    });

    return sanitized;
  }

  async getBrandSummaries(params?: { limit?: number; search?: string }): Promise<BrandSummary[]> {
    try {
      const response = await apiClient.get<{
        success?: boolean;
        brands?: BrandSummary[];
        data?: BrandSummary[];
      }>('/api/listings/brands', params);

      const payload = response.data;
      if (!payload) {
        throw new Error('No brand data received');
      }

      if (payload.brands && Array.isArray(payload.brands)) {
        return payload.brands;
      }

      if (payload.data && Array.isArray(payload.data)) {
        return payload.data;
      }

      throw new Error('No brand data received');
    } catch (error) {
      console.error('Error fetching brand summaries:', error);
      throw error;
    }
  }

  // 获取分类数据
  async getCategories(): Promise<CategoryData> {
    try {
      const response = await apiClient.get<{ data: CategoryData }>('/api/categories');
      
      if (response.data?.data) {
        return response.data.data;
      }
      
      throw new Error('No categories data received');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // 创建商品
  async createListing(listingData: CreateListingRequest): Promise<ListingItem> {
    try {
      console.log("📝 Creating listing with data:", JSON.stringify(listingData, null, 2));
      console.log("📝 API endpoint:", '/api/listings/create');
      
      const payload: CreateListingRequest = {
        ...listingData,
        size: sanitizeStringValue(listingData.size),
      };
      
      const response = await apiClient.post<{ data: ListingItem }>('/api/listings/create', payload);
      
      console.log("📝 Create listing response:", response);
      
      if (response.data?.data) {
        console.log("✅ Listing created successfully:", response.data.data.id);
        return this.sanitizeListingItem(response.data.data);
      }
      
      throw new Error('No listing data received');
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }

  async uploadListingImage(imageUri: string): Promise<string> {
    try {
      const fileName = this.extractFileName(imageUri);
      
      // 优先尝试 FormData 二进制上传（更高效）
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: imageUri,
          name: fileName,
          type: "image/jpeg", // 默认 JPEG，因为 ImageManipulator 已转换为 JPEG
        } as any);

        console.log("👉 Trying FormData upload for listing image...");
        const response = await apiClient.post<{ imageUrl: string }>(
          '/api/listings/upload-image',
          formData
        );

        if (response.data?.imageUrl) {
          console.log("✅ FormData upload success");
          return response.data.imageUrl;
        }
      } catch (formDataError) {
        console.warn("⚠️ FormData upload failed, trying base64 fallback:", formDataError);
        
        // Fallback: base64 上传（向后兼容）
        const imageData = await this.convertImageToBase64(imageUri);
        const response = await apiClient.post<{ imageUrl: string }>(
          '/api/listings/upload-image',
          { imageData, fileName }
        );

        if (response.data?.imageUrl) {
          console.log("✅ Base64 upload success (fallback)");
          return response.data.imageUrl;
        }
      }

      throw new Error('Image upload failed');
    } catch (error) {
      console.error('Error uploading listing image:', error);
      throw error;
    }
  }

  // 获取商品列表（支持分页）
  async getListings(params?: ListingsQueryParams): Promise<ListingsResponse> {
    try {
      const queryParams: Record<string, any> = params ? { ...params } : {};

      if (Array.isArray(queryParams.sizes)) {
        const normalizedSizes = queryParams.sizes
          .map((value: unknown) =>
            typeof value === "string" ? value.trim() : value
          )
          .filter((value): value is string => typeof value === "string" && value.length > 0);

        if (normalizedSizes.length > 0) {
          queryParams.sizes = normalizedSizes.join(",");
        } else {
          delete queryParams.sizes;
        }
      }

      const response = await apiClient.get<{
        success: boolean;
        data: {
          items: ListingItem[];
          hasMore: boolean;
          total: number;
        }
      }>(
        API_CONFIG.ENDPOINTS.LISTINGS,
        queryParams
      );

      if (response.data?.success && response.data.data) {
        return {
          items: response.data.data.items.map((item) =>
            this.sanitizeListingItem(item)
          ),
          hasMore: response.data.data.hasMore,
          total: response.data.data.total,
        };
      }

      throw new Error('No listings data received');
    } catch (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }
  }

  // 根据 ID 获取单个商品
  async getListingById(id: string): Promise<ListingItem | null> {
    try {
      console.log("📖 Fetching listing by ID:", id);
      
      const response = await apiClient.get<{ listing: ListingItem }>(
        `${API_CONFIG.ENDPOINTS.LISTINGS}/${id}`
      );
      
      console.log("📖 Listing response:", response);
      
      if (response.data?.listing) {
        console.log("✅ Listing found:", response.data.listing.title);
        console.log("🔍 Raw listing data:", JSON.stringify(response.data.listing, null, 2));
        console.log("🔍 availableQuantity from API:", response.data.listing.availableQuantity);
        const sanitized = this.sanitizeListingItem(response.data.listing);
        console.log("🔍 Sanitized availableQuantity:", sanitized.availableQuantity);
        return sanitized;
      }
      
      console.log("❌ No listing data received");
      return null;
    } catch (error) {
      console.error('Error fetching listing by ID:', error);
      throw error;
    }
  }

  // 搜索商品（使用feed算法搜索端点，移动端默认启用）
  async searchListings(query: string, params?: Omit<ListingsQueryParams, 'search'> & { categoryId?: number }): Promise<ListingsResponse> {
    try {
      // 使用新的搜索端点，移动端默认启用feed算法（通过x-mobile-app头识别）
      const searchParams: Record<string, any> = {
        q: query,  // 搜索端点使用q参数
        limit: params?.limit,
        page: params?.page,
        offset: params?.offset,
        gender: params?.gender,
        seed: params?.seed, // Pass seed for consistent pagination
      };

      // 优先使用 categoryId（如果提供）
      if (params?.categoryId !== undefined && params.categoryId !== null) {
        searchParams.categoryId = params.categoryId;
        console.log('🔍 ListingsService: Using categoryId:', params.categoryId);
      } else if (params?.category) {
        // 如果有category，尝试转换为categoryId（如果category是数字）
        const categoryId = parseInt(params.category, 10);
        if (!isNaN(categoryId)) {
          searchParams.categoryId = categoryId;
          console.log('🔍 ListingsService: Parsed categoryId from category:', categoryId);
        } else {
          // 如果不是数字，保留category名称（fallback会处理）
          searchParams.category = params.category;
          console.log('🔍 ListingsService: Using category name:', params.category);
        }
      }
      
      console.log('🔍 ListingsService: searchListings params:', {
        query,
        searchParams,
        originalParams: params,
        categoryIdInSearchParams: searchParams.categoryId,
        categoryInSearchParams: searchParams.category,
      });

      const response = await apiClient.get<{
        success: boolean;
        data: {
          items: ListingItem[];
          hasMore: boolean;
          total: number;
          searchQuery?: string;
          useFeed?: boolean;
        }
      }>(
        API_CONFIG.ENDPOINTS.SEARCH,
        searchParams
      );

      if (response.data?.success && response.data.data) {
        return {
          items: response.data.data.items.map((item) =>
            this.sanitizeListingItem(item)
          ),
          hasMore: response.data.data.hasMore,
          total: response.data.data.total,
        };
      }

      // 如果搜索端点失败，fallback到传统搜索
      console.warn('Search endpoint failed, falling back to traditional search');
      return this.getListings({ ...params, search: query });
    } catch (error) {
      console.error('Error searching listings with feed algorithm:', error);
      // Fallback到传统搜索
      return this.getListings({ ...params, search: query });
    }
  }

  // 按分类获取商品
  async getListingsByCategory(category: string, params?: Omit<ListingsQueryParams, 'category'>): Promise<ListingsResponse> {
    return this.getListings({ ...params, category });
  }

  // 按价格范围获取商品
  async getListingsByPriceRange(minPrice: number, maxPrice: number, params?: Omit<ListingsQueryParams, 'minPrice' | 'maxPrice'>): Promise<ListingsResponse> {
    return this.getListings({ ...params, minPrice, maxPrice });
  }

  async getBoostedListings(): Promise<BoostedListingSummary[]> {
    try {
      const response = await apiClient.get<{ success?: boolean; data?: BoostedListingSummary[] }>(
        '/api/listings/boosted'
      );

      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data.map((item) => ({
          id: item.id,
          listingId: item.listingId,
          title: item.title,
          size: item.size ?? null,
          price: typeof item.price === 'number' ? item.price : Number(item.price) || 0,
          images: Array.isArray(item.images) ? item.images : [],
          primaryImage: item.primaryImage ?? null,
          status: item.status,
          startedAt: item.startedAt ?? null,
          endsAt: item.endsAt ?? null,
          views: typeof item.views === 'number' ? item.views : 0,
          clicks: typeof item.clicks === 'number' ? item.clicks : 0,
          viewUpliftPercent:
            typeof item.viewUpliftPercent === 'number' ? item.viewUpliftPercent : 0,
          clickUpliftPercent:
            typeof item.clickUpliftPercent === 'number' ? item.clickUpliftPercent : 0,
          usedFreeCredit: Boolean(item.usedFreeCredit),
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching boosted listings:', error);
      throw error;
    }
  }

  async boostListings(params: {
    listingIds: string[];
    plan: "free" | "premium";
    paymentMethodId?: number | null;
    useFreeCredits?: boolean;
  }): Promise<BoostListingsResponse> {
    try {
      const payloadIds = params.listingIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (payloadIds.length === 0) {
        throw new Error("No valid listing IDs provided for boosting");
      }

      const response = await apiClient.post<{
        success?: boolean;
        data?: BoostListingsResponse;
        error?: string;
      }>("/api/listings/boost", {
        listingIds: payloadIds,
        plan: params.plan,
        paymentMethodId: params.paymentMethodId ?? undefined,
        useFreeCredits:
          typeof params.useFreeCredits === "boolean"
            ? params.useFreeCredits
            : true,
      });

      if (response.data?.data) {
        return response.data.data;
      }

      throw new Error(response.data?.error || "Failed to boost listings");
    } catch (error) {
      console.error("Error creating listing boosts:", error);
      throw error;
    }
  }

  // 获取用户listings中实际使用的分类
  async getUserCategories(): Promise<{ id: number; name: string; description: string; count: number }[]> {
    try {
      console.log("📖 Fetching user categories");
      
      const response = await apiClient.get<{ success: boolean; categories: { id: number; name: string; description: string; count: number }[] }>(
        '/api/listings/my/categories'
      );
      
      console.log("📖 User categories response:", response);
      
      if (response.data?.success && response.data.categories) {
        console.log(`✅ Found ${response.data.categories.length} user categories`);
        return response.data.categories;
      }
      
      throw new Error('No categories data received');
    } catch (error) {
      console.error('Error fetching user categories:', error);
      throw error;
    }
  }

  // 获取用户自己的listings
  async getUserListings(params?: UserListingsQueryParams): Promise<{ listings: ListingItem[]; total: number }> {
    try {
      console.log("📖 Fetching user listings with params:", params);

      // 构建查询参数，过滤掉undefined值
      const queryParams: any = {};
      if (params?.status) queryParams.status = params.status;
      if (params?.category) queryParams.category = params.category;
      if (params?.condition) queryParams.condition = params.condition;
      if (params?.gender) queryParams.gender = params.gender;
      if (params?.minPrice !== undefined) queryParams.minPrice = params.minPrice;
      if (params?.maxPrice !== undefined) queryParams.maxPrice = params.maxPrice;
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.offset) queryParams.offset = params.offset;

      const response = await apiClient.get<{ listings: ListingItem[]; total?: number }>(
        '/api/listings/my',
        queryParams
      );

      console.log("📖 User listings response:", response);

      if (response.data?.listings) {
        const total = response.data.total ?? response.data.listings.length;
        console.log(`✅ Found ${response.data.listings.length} user listings`);
        console.log(`📊 Backend total: ${response.data.total} | Fallback total: ${total}`);
        if (!response.data.total) {
          console.warn('⚠️ Backend did not return total field! Using listings.length as fallback');
        }
        return {
          listings: response.data.listings.map((item) => this.sanitizeListingItem(item)),
          total,
        };
      }

      throw new Error('No listings data received');
    } catch (error) {
      console.error('Error fetching user listings:', error);
      throw error;
    }
  }

  // 更新listing
  async updateListing(id: string, updateData: Partial<CreateListingRequest>): Promise<ListingItem> {
    try {
      console.log("📝 Updating listing:", id, "with data:", JSON.stringify(updateData, null, 2));
      
      const payload: Partial<CreateListingRequest> = {
        ...updateData,
      };

      if (Object.prototype.hasOwnProperty.call(updateData, "size")) {
        payload.size = sanitizeStringValue(updateData.size ?? null);
      }
      
      const response = await apiClient.patch<{ listing: ListingItem }>(
        `/api/listings/${id}`,
        payload
      );
      
      console.log("📝 Update listing response:", response);
      
      if (response.data?.listing) {
        console.log("✅ Listing updated successfully:", response.data.listing.id);
        return this.sanitizeListingItem(response.data.listing);
      }
      
      throw new Error('No updated listing data received');
    } catch (error) {
      console.error('Error updating listing:', error);
      throw error;
    }
  }

  // 删除listing
  async deleteListing(id: string): Promise<void> {
    try {
      console.log("🗑️ Deleting listing:", id);
      
      const response = await apiClient.delete<{ success: boolean }>(
        `/api/listings/${id}`
      );
      
      console.log("🗑️ Delete listing response:", response);
      
      if (response.data?.success) {
        console.log("✅ Listing deleted successfully:", id);
        return;
      }
      
      throw new Error('Failed to delete listing');
    } catch (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
  }

  async getDrafts(): Promise<ListingItem[]> {
    try {
      console.log("📖 Fetching draft listings");

      const response = await apiClient.get<{ drafts?: ListingItem[] }>(
        '/api/listings/draft'
      );

      const drafts = response.data?.drafts ?? [];
      return drafts.map((draft) => this.sanitizeListingItem(draft));
    } catch (error) {
      console.error('Error fetching draft listings:', error);
      throw error;
    }
  }

  async createDraft(payload: DraftListingRequest): Promise<ListingItem> {
    try {
      const requestPayload = {
        ...this.buildDraftPayload(payload),
        listed: false,
        sold: false,
      };

      console.log("📝 Creating draft with data:", JSON.stringify(requestPayload, null, 2));

      const response = await apiClient.post<{ draft?: ListingItem }>(
        '/api/listings/draft',
        requestPayload
      );

      if (response.data?.draft) {
        console.log("✅ Draft listing created:", response.data.draft.id);
        return this.sanitizeListingItem(response.data.draft);
      }

      throw new Error('No draft data received');
    } catch (error) {
      console.error('Error creating draft listing:', error);
      throw error;
    }
  }

  async updateDraft(id: string, payload: DraftListingRequest): Promise<ListingItem> {
    const updatePayload = {
      ...this.buildDraftPayload(payload),
      listed: false,
      sold: false,
    };
    return this.updateListing(id, updatePayload);
  }
}

// 创建单例实例
export const listingsService = new ListingsService();


