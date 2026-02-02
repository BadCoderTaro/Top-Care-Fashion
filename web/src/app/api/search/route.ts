// web/src/app/api/search/route.ts
// Search API with feed algorithm integration
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies as nextCookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

type SearchRow = {
  id: number;
  title: string | null;
  image_url: string | null;
  price_cents: number | null;
  brand: string | null;
  tags: string[] | null;
  source: string;
  fair_score: number | null;
  final_score: number | null;
  is_boosted?: boolean;
  boost_weight?: number;
  search_relevance: number | null;
};

// Helper function to extract image URLs
function extractImageUrls(imageUrls: unknown, imageUrl: string | null): string[] {
  if (imageUrls) {
    if (Array.isArray(imageUrls)) {
      const urls = imageUrls.filter((item): item is string => typeof item === "string" && item.length > 0);
      if (urls.length > 0) return urls;
    } else if (typeof imageUrls === "string") {
      try {
        const parsed = JSON.parse(imageUrls);
        if (Array.isArray(parsed)) {
          const urls = parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
          if (urls.length > 0) return urls;
        }
      } catch {
        if (imageUrls.startsWith("http")) {
          return [imageUrls];
        }
      }
    }
  }
  
  if (imageUrl && typeof imageUrl === "string" && imageUrl.trim().length > 0) {
    return [imageUrl];
  }
  
  return [];
}

const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    } catch {
      if (value.startsWith("[")) {
        try {
          const parsed = JSON.parse(value.replace(/'/g, '"'));
          if (Array.isArray(parsed)) {
            return parsed as string[];
          }
        } catch {
          /* noop */
        }
      }
      if (value.trim().length > 0) {
        return [value];
      }
    }
  }
  return [];
};

const mapConditionToDisplay = (conditionEnum: string | null | undefined): string | null => {
  if (!conditionEnum) return null;
  const conditionMap: Record<string, string> = {
    NEW: "Brand New",
    LIKE_NEW: "Like New",
    GOOD: "Good",
    FAIR: "Fair",
    POOR: "Poor",
  };
  return conditionMap[conditionEnum] || conditionEnum;
};

const mapSizeToDisplay = (sizeValue: string | null | undefined): string | null => {
  if (!sizeValue) return null;
  const value = sizeValue.trim();

  // Preserve "N/A" exactly, do not split into "N"
  if (/^n\/a$/i.test(value)) {
    return "N/A";
  }

  if (value.includes("/")) {
    const firstPart = value.split("/")[0].trim();
    if (["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(firstPart)) {
      return firstPart;
    }
    const numberMatch = firstPart.match(/\d+/);
    if (numberMatch) {
      return numberMatch[0];
    }
    return firstPart;
  }

  const sizeMap: Record<string, string> = {
    "28": "28",
    "29": "29",
    "30": "30",
    "31": "31",
    "32": "32",
    "33": "33",
    "34": "34",
    "35": "35",
    "36": "36",
    "37": "37",
    "38": "38",
    "39": "39",
    "40": "40",
    "41": "41",
    "42": "42",
    "43": "43",
    "44": "44",
    "45": "45",
    "46": "46",
    "47": "47",
    "48": "48",
    "49": "49",
    "50": "50",
    XXS: "XXS",
    XS: "XS",
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
    XXL: "XXL",
    XXXL: "XXXL",
    "Free Size": "Free Size",
    "One Size": "One Size",
    Small: "Small",
    Medium: "Medium",
    Large: "Large",
    "Extra Large": "Extra Large",
    Other: "Other",
  };

  return sizeMap[value] || value;
};

const toNumber = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object") {
    const maybeDecimal = value as { toNumber?: () => number; toString?: () => string };
    if (typeof maybeDecimal.toNumber === "function") {
      const result = maybeDecimal.toNumber();
      return Number.isFinite(result) ? result : 0;
    }
    if (typeof maybeDecimal.toString === "function") {
      const str = maybeDecimal.toString();
      const parsed = Number(str);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return 0;
};

const normalizeSeller = (listing: any) => {
  if (listing?.seller) {
    return {
      id: listing.seller.id ?? 0,
      name: listing.seller.username ?? "",
      avatar: listing.seller.avatar_url ?? "",
      rating: toNumber(listing.seller.average_rating),
      sales: listing.seller.total_reviews ?? 0,
      isPremium: Boolean(listing.seller.is_premium),
      is_premium: Boolean(listing.seller.is_premium),
    };
  }
  return {
    id: 0,
    name: "",
    avatar: "",
    rating: 0,
    sales: 0,
    isPremium: false,
    is_premium: false,
  };
};

// Extract Supabase user ID from request
async function getSupabaseUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // 1) Try mobile Bearer token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (token) {
    const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await tmp.auth.getUser(token);
    if (!error && data?.user?.id) return data.user.id;
  }

  // 2) Fallback: SSR cookie session (Next.js web)
  try {
    const cookieStore = await (nextCookies() as any);
    const ssr = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    });
    const { data: { user } } = await ssr.auth.getUser();
    if (user?.id) return user.id;
  } catch (err) {
    console.warn("Failed to get user from cookies:", err);
  }

  return null;
}

function parseIntSafe(v: string | null, d: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : d;
}

function parseSeed(v: string | null, d: number): number {
  // PostgreSQL integer range: -2,147,483,648 to 2,147,483,647
  // We'll use positive values only: 0 to 2,147,483,647
  const MAX_INT = 2147483647;
  
  if (v) {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) {
      // Ensure seed is within PostgreSQL integer range
      return Math.abs(n % MAX_INT);
    }
  }
  // For default value (Date.now() or other), ensure it's within integer range
  // Use modulo to keep it within bounds
  return Math.abs(d % MAX_INT);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("q") || url.searchParams.get("search") || "";
    const category = url.searchParams.get("category");
    const categoryId = url.searchParams.get("categoryId");
    const gender = url.searchParams.get("gender");
    const limit = parseIntSafe(url.searchParams.get("limit"), 20);
    const page = parseIntSafe(url.searchParams.get("page"), 1);
    const offset = (page - 1) * limit;
    const seedId = parseSeed(url.searchParams.get("seed"), Date.now());
    
    // 检测请求来源：移动端默认启用feed算法，web端需要显式启用
    const userAgent = req.headers.get("user-agent") || "";
    const isMobileApp = userAgent.includes("ReactNative") || 
                       userAgent.includes("Mobile") ||
                       req.headers.get("x-mobile-app") === "true";
    
    // useFeed参数：移动端默认启用，web端需要显式启用（不影响生产环境）
    const useFeedParam = url.searchParams.get("useFeed");
    const useFeed = useFeedParam !== null 
      ? useFeedParam === "true" 
      : isMobileApp; // 移动端默认启用，web端默认禁用

    // Get user ID for personalized search
    const supabaseUserId = await getSupabaseUserIdFromRequest(req);

    // Normalize search query (allow empty string for feed algorithm)
    const normalizedSearchQuery = searchQuery.trim();

    // Validate search query only for non-feed search
    // Feed algorithm can work with empty query (returns personalized recommendations)
    if (!useFeed && (!normalizedSearchQuery || normalizedSearchQuery.length === 0)) {
      return NextResponse.json(
        { error: "Search query is required", success: false },
        { status: 400 }
      );
    }

    // If useFeed is true, use the feed algorithm
    // This works even with empty search query (returns personalized feed)
    if (useFeed) {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY);

      // Parse categoryId if provided, or look up categoryId from category name
      let parsedCategoryId: number | null = null;
      console.log('🔍 Search API - Received params:', {
        categoryId,
        category,
        categoryIdType: typeof categoryId,
        categoryIdValue: categoryId,
      });
      if (categoryId) {
        parsedCategoryId = parseInt(categoryId, 10);
        console.log('🔍 Search API - Parsed categoryId:', parsedCategoryId);
        if (isNaN(parsedCategoryId)) {
          console.error('🔍 Search API - Invalid categoryId:', categoryId);
          return NextResponse.json(
            { error: "Invalid categoryId", success: false },
            { status: 400 }
          );
        }
      } else if (category) {
        console.log('🔍 Search API - No categoryId, looking up category name:', category);
        // If category name is provided but not categoryId, look it up
        const { prisma } = await import("@/lib/db");
        const categoryRecord = await prisma.listing_categories.findFirst({
          where: {
            name: {
              contains: category,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
          },
        });
        if (categoryRecord) {
          parsedCategoryId = categoryRecord.id;
          console.log(`🔍 Found categoryId ${parsedCategoryId} for category name "${category}"`);
        } else {
          console.warn(`🔍 Category name "${category}" not found, proceeding without category filter`);
        }
      }

      // For feed algorithm, if search query is empty, pass empty string
      // The database function will treat empty query as "no search filter" and return personalized recommendations
      const feedSearchQuery = normalizedSearchQuery.length > 0 
        ? normalizedSearchQuery 
        : ""; // Empty string = no search filter, feed algorithm will personalize all items

      const { data, error } = await admin.rpc("get_search_feed", {
        p_supabase_user_id: supabaseUserId || null, // Allow null for anonymous users
        p_search_query: feedSearchQuery,
        p_limit: limit,
        p_offset: offset,
        p_seed: seedId,
        p_gender: gender || null,
        p_category_id: parsedCategoryId, // Use categoryId instead of category name
      });

      if (error) {
        console.error("Search feed error:", error);
        // Fallback to regular search if feed search fails (silent fallback)
        // This ensures production environment is not affected
        console.warn("Falling back to regular search due to feed search error");
        return await fallbackSearch(searchQuery, category, gender, limit, offset);
      }

      if (!data || data.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            items: [],
            total: 0,
            hasMore: false,
            page,
            limit,
            searchQuery,
            useFeed: true,
          },
        });
      }

      // Process items directly from get_search_feed results
      // IMPORTANT: Maintain the EXACT order from get_search_feed (feed algorithm sorting)
      // Use price_cents directly from RPC result to avoid Prisma Decimal conversion issues
      const { prisma } = await import("@/lib/db");
      const { Prisma } = await import("@prisma/client");
      
      // Debug: Log the order from get_search_feed
      console.log('🔍 Feed search - RPC call params:', {
        p_supabase_user_id: supabaseUserId || null,
        p_search_query: feedSearchQuery,
        p_limit: limit,
        p_offset: offset,
        p_seed: seedId,
        p_gender: gender || null,
        p_category_id: parsedCategoryId,
      });
      console.log('🔍 Feed search - RPC returned items:', data.length);
      console.log('🔍 Feed search order:', data.slice(0, 5).map((r: SearchRow) => ({ id: r.id, title: r.title, price_cents: r.price_cents, final_score: r.final_score })));
      if (data.length < limit && offset > 0) {
        console.warn('🔍 Feed search - WARNING: Received fewer items than requested!', {
          requested: limit,
          received: data.length,
          offset,
        });
      }
      
      // Calculate total count using raw SQL to match get_search_feed filter logic exactly
      // This includes tags search which Prisma doesn't support well
      let totalCount = 0;
      try {
        // Build SQL query that matches get_search_feed's inv_gender_search CTE exactly
        const sqlParts: string[] = [];
        const sqlParams: any[] = [];
        let paramIndex = 1;

        // Base conditions
        sqlParts.push('SELECT COUNT(*) as count FROM public.listings l');
        sqlParts.push('WHERE l.listed = true AND l.sold = false');

        // Gender filter (same as get_search_feed)
        if (gender) {
          const normalizeGender = (value: string): "Men" | "Women" | "Unisex" | undefined => {
            const lower = value.toLowerCase();
            if (lower === "men" || lower === "male") return "Men";
            if (lower === "women" || lower === "female") return "Women";
            if (lower === "unisex" || lower === "all") return "Unisex";
            return undefined;
          };

          const normalizedGender = normalizeGender(gender);
          if (normalizedGender) {
            if (normalizedGender === "Men") {
              sqlParts.push(`AND l.gender = 'Men'`);
            } else if (normalizedGender === "Women") {
              sqlParts.push(`AND l.gender = 'Women'`);
            } else if (normalizedGender === "Unisex") {
              sqlParts.push(`AND l.gender = 'Unisex'`);
            }
            // If gender is not specified, show all items
          }
        }

        // Category filter
        if (parsedCategoryId) {
          sqlParts.push(`AND l.category_id = $${paramIndex}`);
          sqlParams.push(parsedCategoryId);
          paramIndex++;
        } else if (category) {
          sqlParts.push(`AND EXISTS (SELECT 1 FROM public.listing_categories c WHERE c.id = l.category_id AND lower(c.name) LIKE $${paramIndex})`);
          sqlParams.push(`%${category.toLowerCase()}%`);
          paramIndex++;
        }

        // Search query filter (includes tags search, same as get_search_feed)
        if (normalizedSearchQuery && normalizedSearchQuery.length > 0) {
          const searchPattern = `%${normalizedSearchQuery.toLowerCase()}%`;
          sqlParts.push(`AND (
            lower(l.name) LIKE $${paramIndex}
            OR lower(COALESCE(l.description, '')) LIKE $${paramIndex}
            OR lower(COALESCE(l.brand, '')) LIKE $${paramIndex}
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(l.tags) AS tag
              WHERE lower(tag) LIKE $${paramIndex}
            )
          )`);
          sqlParams.push(searchPattern);
          paramIndex++;
        }

        const countSql = sqlParts.join(' ');
        const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(countSql, ...sqlParams);
        totalCount = Number(countResult[0]?.count || 0);
        console.log('🔍 Feed search - Total count from SQL:', totalCount);
      } catch (error) {
        console.error('🔍 Feed search - Error calculating count with SQL, falling back to Prisma:', error);
        // Fallback to Prisma count (without tags search)
        const where: any = {
          listed: true,
          sold: false,
        };

        if (parsedCategoryId) {
          where.category_id = parsedCategoryId;
        } else if (category) {
          where.category = {
            name: { contains: category, mode: "insensitive" },
          };
        }

        if (gender) {
          const normalizeGender = (value: string): "Men" | "Women" | "Unisex" | undefined => {
            const lower = value.toLowerCase();
            if (lower === "men" || lower === "male") return "Men";
            if (lower === "women" || lower === "female") return "Women";
            if (lower === "unisex" || lower === "all") return "Unisex";
            return undefined;
          };

          const normalizedGender = normalizeGender(gender);
          if (normalizedGender) {
            // Only match exact gender (exclude Unisex when searching for Men/Women)
            where.gender = normalizedGender;
          }
        }

        if (normalizedSearchQuery && normalizedSearchQuery.length > 0) {
          const searchFilters: any[] = [
            { name: { contains: normalizedSearchQuery, mode: "insensitive" } },
            { description: { contains: normalizedSearchQuery, mode: "insensitive" } },
            { brand: { contains: normalizedSearchQuery, mode: "insensitive" } },
          ];
          where.OR = searchFilters;
        }

        totalCount = await prisma.listings.count({ where });
        console.log('🔍 Feed search - Total count from Prisma (fallback):', totalCount);
      }
      
      // Fetch only the fields we need to supplement (size, condition, material, seller, etc.)
      // Use the order from data array to preserve feed algorithm sorting
      const listingIds = data.map((row: SearchRow) => row.id);
      
      const listings = await prisma.listings.findMany({
        where: { id: { in: listingIds } },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              avatar_url: true,
              average_rating: true,
              total_reviews: true,
              is_premium: true,
            },
          },
          category: {
            select: {
              name: true,
            },
          },
        },
      });

      // Create a map for quick lookup (order doesn't matter here)
      const listingMap = new Map<number, (typeof listings)[number]>();
      listings.forEach((listing) => listingMap.set(listing.id, listing));

      // Debug: Check if all items from RPC were found in Prisma query
      const missingIds = listingIds.filter((id: number) => !listingMap.has(id));
      if (missingIds.length > 0) {
        console.warn('🔍 Feed search - Missing listings in Prisma query:', missingIds);
      }
      console.log('🔍 Feed search - Prisma found listings:', listings.length, 'out of', listingIds.length);

      // Process items in the EXACT order from data array (preserves feed algorithm sorting)
      const items = data.map((row: SearchRow) => {
        const listing = listingMap.get(row.id);
        
        // Use price_cents directly from get_search_feed result (already in cents, convert to dollars)
        const price = row.price_cents != null ? Number(row.price_cents) / 100 : 0;
        
        // If listing not found, use minimal data from RPC result
        if (!listing) {
          const fallbackImages = extractImageUrls(null, row.image_url);
          return {
            id: row.id.toString(),
            title: row.title ?? "",
            description: "",
            price,
            brand: row.brand ?? "",
            size: null,
            condition: null,
            material: null,
            tags: Array.isArray(row.tags) ? row.tags : [],
            category: null,
            images: fallbackImages,
            shippingOption: null,
            shippingFee: 0,
            location: null,
            likesCount: 0,
            availableQuantity: 1,
            gender: gender || "Unisex",
            seller: { id: 0, name: "", avatar: "", rating: 0, sales: 0, isPremium: false, is_premium: false },
            createdAt: null,
            updatedAt: null,
            listed: true,
            sold: false,
            quantity: 1,
            source: row.source ?? "search",
            fair_score: row.fair_score === null ? null : Number(row.fair_score),
            final_score: row.final_score === null ? null : Number(row.final_score),
            is_boosted: row.is_boosted ?? false,
            boost_weight: row.boost_weight === null || row.boost_weight === undefined ? null : Number(row.boost_weight),
            search_relevance: row.search_relevance === null ? null : Number(row.search_relevance),
          };
        }

        // Build seller info
        const sellerInfo = (listing as any).seller
          ? {
              id: (listing as any).seller.id,
              name: (listing as any).seller.username,
              avatar: (listing as any).seller.avatar_url ?? "",
              rating: toNumber((listing as any).seller.average_rating),
              sales: (listing as any).seller.total_reviews ?? 0,
              isPremium: Boolean((listing as any).seller.is_premium),
              is_premium: Boolean((listing as any).seller.is_premium),
            }
          : { id: 0, name: "", avatar: "", rating: 0, sales: 0, isPremium: false, is_premium: false };

        // Extract images
        const imageUrls = (() => {
          const urls = toArray((listing as any).image_urls);
          if (urls.length > 0) {
            return urls;
          }
          if ((listing as any).image_url && typeof (listing as any).image_url === "string" && (listing as any).image_url.trim() !== "") {
            return [(listing as any).image_url];
          }
          return extractImageUrls(null, row.image_url);
        })();

        // Combine tags
        const listingTags = toArray((listing as any).tags);
        const combinedTags = listingTags.length > 0 ? listingTags : (Array.isArray(row.tags) ? row.tags : []);

        // Normalize gender
        const genderValue = (() => {
          const value = (listing as any).gender;
          if (!value || typeof value !== "string") return "Unisex";
          const lower = value.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })();

        const availableQuantity = toNumber((listing as any).inventory_count ?? 1);
        const quantityValue = (listing as any).quantity != null ? toNumber((listing as any).quantity) : availableQuantity;

        return {
          id: listing.id.toString(),
          title: (listing as any).name ?? row.title ?? "",
          description: (listing as any).description ?? "",
          price, // Use price_cents from get_search_feed (converted to dollars)
          brand: row.brand ?? "",
          size: mapSizeToDisplay((listing as any).size ?? null),
          condition: mapConditionToDisplay((listing as any).condition_type ?? null),
          material: (listing as any).material ?? null,
          tags: combinedTags,
          category: (listing as any).category?.name ?? null,
          images: imageUrls,
          shippingOption: (listing as any).shipping_option ?? null,
          shippingFee: toNumber((listing as any).shipping_fee ?? null),
          location: (listing as any).location ?? null,
          likesCount: toNumber((listing as any).likes_count ?? 0),
          availableQuantity,
          gender: genderValue,
          seller: sellerInfo,
          createdAt: (listing as any).created_at ? (listing as any).created_at.toISOString() : null,
          updatedAt: (listing as any).updated_at ? (listing as any).updated_at.toISOString() : null,
          listed: (listing as any).listed ?? true,
          sold: (listing as any).sold ?? false,
          quantity: quantityValue,
          source: row.source ?? "search",
          fair_score: row.fair_score === null ? null : Number(row.fair_score),
          final_score: row.final_score === null ? null : Number(row.final_score),
          is_boosted: row.is_boosted ?? false,
          boost_weight: row.boost_weight === null || row.boost_weight === undefined ? null : Number(row.boost_weight),
          search_relevance: row.search_relevance === null ? null : Number(row.search_relevance),
        };
      });

      // Debug: Log the final order
      console.log('🔍 Feed search - Final items count:', items.length, 'out of', data.length, 'from RPC');
      console.log('🔍 Feed search - Offset:', offset, 'Limit:', limit, 'Total count:', totalCount);
      console.log('🔍 Feed search - Has more:', offset + items.length < totalCount);
      console.log('🔍 Final API response order:', items.slice(0, 5).map((i: any) => ({ id: i.id, title: i.title, price: i.price })));
      
      // Ensure all items from RPC are included (no filtering)
      if (items.length !== data.length) {
        console.warn('🔍 Feed search - WARNING: Items count mismatch! RPC returned', data.length, 'but items array has', items.length);
      }

      return NextResponse.json({
        success: true,
        data: {
          items,
          total: totalCount, // Use calculated total count
          hasMore: offset + items.length < totalCount, // Same logic as fallbackSearch
          page,
          limit,
          searchQuery,
          useFeed: true,
        },
      });
    } else {
      // Fallback to regular search
      return await fallbackSearch(searchQuery, category, gender, limit, offset);
    }
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to perform search", success: false },
      { status: 500 }
    );
  }
}

// Fallback to regular Prisma search (existing production search logic)
// This is the default behavior and remains unchanged for backward compatibility
async function fallbackSearch(
  searchQuery: string,
  category: string | null,
  gender: string | null,
  limit: number,
  offset: number
) {
  const { prisma } = await import("@/lib/db");
  const { Prisma } = await import("@prisma/client");

  const where: any = {
    listed: true,
    sold: false,
  };

  if (category) {
    where.category = {
      name: { contains: category, mode: "insensitive" },
    };
  }

  if (gender) {
    const normalizeGender = (value: string): "Men" | "Women" | "Unisex" | undefined => {
      const lower = value.toLowerCase();
      if (lower === "men" || lower === "male") return "Men";
      if (lower === "women" || lower === "female") return "Women";
      if (lower === "unisex" || lower === "all") return "Unisex";
      return undefined;
    };

    const normalizedGender = normalizeGender(gender);
    if (normalizedGender) {
      where.gender = normalizedGender;
    }
  }

  if (searchQuery) {
    const trimmed = searchQuery.trim();
    if (trimmed.length > 0) {
      const searchFilters: any[] = [
        { name: { contains: trimmed, mode: "insensitive" } },
        { description: { contains: trimmed, mode: "insensitive" } },
        { brand: { contains: trimmed, mode: "insensitive" } },
      ];
      where.OR = searchFilters;
    }
  }

  const totalCount = await prisma.listings.count({ where });

  const listings = await prisma.listings.findMany({
    where,
    include: {
      seller: {
        select: {
          id: true,
          username: true,
          avatar_url: true,
          average_rating: true,
          total_reviews: true,
          is_premium: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: limit,
    skip: offset,
  });

  const toArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as string[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof value === "object") {
      const entries = Object.values(value as Record<string, unknown>);
      return entries.every((item) => typeof item === "string") ? (entries as string[]) : [];
    }
    return [];
  };

  const toNumber = (value: unknown): number => {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") return Number(value) || 0;
    return 0;
  };

  const formattedListings = listings.map((listing) => {
    const sellerInfo = listing.seller
      ? {
          id: listing.seller.id,
          name: listing.seller.username,
          avatar: listing.seller.avatar_url ?? "",
          rating: toNumber(listing.seller.average_rating),
          sales: listing.seller.total_reviews ?? 0,
          isPremium: Boolean(listing.seller.is_premium),
          is_premium: Boolean(listing.seller.is_premium),
        }
      : { id: 0, name: "", avatar: "", rating: 0, sales: 0, isPremium: false, is_premium: false };

    const imageUrls = toArray(listing.image_urls);
    const images = imageUrls.length > 0
      ? imageUrls
      : (listing.image_url && typeof listing.image_url === 'string' && listing.image_url.trim() !== ''
          ? [listing.image_url]
          : []);

    return {
      id: listing.id.toString(),
      title: listing.name,
      description: listing.description,
      price: toNumber(listing.price),
      brand: listing.brand,
      size: listing.size,
      condition: listing.condition_type,
      material: listing.material,
      tags: toArray(listing.tags),
      category: listing.category?.name ?? null,
      images,
      shippingOption: (listing as any).shipping_option ?? null,
      shippingFee: toNumber((listing as any).shipping_fee ?? null),
      location: (listing as any).location ?? null,
      likesCount: toNumber((listing as any).likes_count ?? 0),
      availableQuantity: toNumber((listing as any).inventory_count ?? 1),
      gender: (() => {
        const value = (listing as any).gender;
        if (!value || typeof value !== "string") return "Unisex";
        const lower = value.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })(),
      seller: sellerInfo,
      createdAt: listing.created_at ? listing.created_at.toISOString() : null,
      updatedAt: listing.updated_at ? listing.updated_at.toISOString() : null,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      items: formattedListings,
      total: totalCount,
      hasMore: offset + formattedListings.length < totalCount,
      page: Math.floor(offset / limit) + 1,
      limit,
      searchQuery,
      useFeed: false,
    },
  });
}

