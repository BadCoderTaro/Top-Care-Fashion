import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const categoryIdParam = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const genderParam = searchParams.get("gender");
    const sizeParam = searchParams.get("size");
    const sizesParam = searchParams.get("sizes"); // Support multiple sizes (comma-separated)
    const conditionParam = searchParams.get("condition");
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const limit = Math.max(parseInt(searchParams.get("limit") || "20", 10), 1);
    const pageParam = searchParams.get("page");
    const explicitOffset = parseInt(searchParams.get("offset") || "0", 10);
    const page = pageParam ? Math.max(parseInt(pageParam, 10), 1) : null;
    const offset = page ? (page - 1) * limit : Math.max(explicitOffset, 0);
    const sortParam = searchParams.get("sort");

    // 构建查询条件
    const where: any = {
      listed: true,
      sold: false,
    };

    // 优先使用 categoryId，如果没有则使用 category 名称
    if (categoryIdParam) {
      const categoryId = parseInt(categoryIdParam, 10);
      if (!isNaN(categoryId)) {
        where.category_id = categoryId;
      }
    } else if (category && category !== "All") {
      where.category = {
        name: { contains: category, mode: "insensitive" },
      };
    }

    if (genderParam && genderParam !== "All") {
      const normalizeGender = (value: string): "Men" | "Women" | "Unisex" | undefined => {
        const lower = value.toLowerCase();
        if (lower === "men" || lower === "male") return "Men";
        if (lower === "women" || lower === "female") return "Women";
        if (lower === "unisex" || lower === "all") return "Unisex";
        return undefined;
      };

      const normalizedGender = normalizeGender(genderParam);
      if (normalizedGender) {
        where.gender = normalizedGender;
      }
    }

    // Filter by condition
    if (conditionParam && conditionParam !== "All") {
      // Map display condition to enum value
      const mapConditionToEnum = (conditionStr: string): "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR" | undefined => {
        const conditionMap: Record<string, "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR"> = {
          "Brand New": "NEW",
          "New": "NEW",
          "Like New": "LIKE_NEW",
          "Like new": "LIKE_NEW",
          "like new": "LIKE_NEW",
          "Good": "GOOD",
          "good": "GOOD",
          "Fair": "FAIR",
          "fair": "FAIR",
          "Poor": "POOR",
          "poor": "POOR",
        };
        return conditionMap[conditionStr] || conditionMap[conditionStr.trim()];
      };

      const conditionEnum = mapConditionToEnum(conditionParam);
      if (conditionEnum) {
        where.condition_type = conditionEnum;
      }
    }

    // Filter by price range
    if (minPriceParam || maxPriceParam) {
      const minPrice = minPriceParam ? parseFloat(minPriceParam) : null;
      const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : null;

      if (minPrice !== null && !isNaN(minPrice) && maxPrice !== null && !isNaN(maxPrice)) {
        where.price = {
          gte: minPrice,
          lte: maxPrice,
        };
      } else if (minPrice !== null && !isNaN(minPrice)) {
        where.price = {
          gte: minPrice,
        };
      } else if (maxPrice !== null && !isNaN(maxPrice)) {
        where.price = {
          lte: maxPrice,
        };
      }
    }

    // Filter by search (process before size to build base conditions)
    const searchFilters: any[] = [];
    if (search) {
      const trimmed = search.trim();
      if (trimmed.length > 0) {
        searchFilters.push(
          { name: { contains: trimmed, mode: "insensitive" } },
          { description: { contains: trimmed, mode: "insensitive" } },
          { brand: { contains: trimmed, mode: "insensitive" } }
        );
      }
    }

    // Filter by size (supports single or multiple sizes)
    const sizeFilters: any[] = [];
    const sizeTokens = new Set<string>();

    if (sizesParam) {
      sizesParam
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value !== "All" && value !== "My Size")
        .forEach((value) => sizeTokens.add(value));
    }

    if (sizeParam && sizeParam !== "All" && sizeParam !== "My Size") {
      sizeTokens.add(sizeParam.trim());
    }

    const sizesToFilter = Array.from(sizeTokens);
    const hasSizeFilters = sizesToFilter.length > 0;

    if (hasSizeFilters) {
      console.log(`🔍 Size filter: searching for ${sizesToFilter.length} size(s):`, sizesToFilter);
    }

    sizesToFilter.forEach((rawSize) => {
      const normalizedSize = rawSize.trim();
      if (!normalizedSize) {
        return;
      }

      const normalizedSizeUpper = normalizedSize.toUpperCase();
      const isNumericSize = /^\d+$/.test(normalizedSize);
      const isSingleLetter = normalizedSize.length === 1;

      if (isNumericSize) {
        sizeFilters.push({ size: { equals: normalizedSize, mode: "insensitive" } });
        sizeFilters.push({ size: { startsWith: `${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { startsWith: `${normalizedSize}/`, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: ` / ${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: ` / ${normalizedSize}/`, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: `/${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: `/${normalizedSize}/`, mode: "insensitive" } });
        return;
      }

      if (isSingleLetter && normalizedSizeUpper === "L") {
        sizeFilters.push({ size: { equals: normalizedSize, mode: "insensitive" } });
        sizeFilters.push({ size: { startsWith: `${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { startsWith: `${normalizedSize}/`, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: ` / ${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: ` / ${normalizedSize}/`, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: `/${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: `/${normalizedSize}/`, mode: "insensitive" } });
        return;
      }

      if (isSingleLetter) {
        sizeFilters.push({ size: { equals: normalizedSize, mode: "insensitive" } });
        sizeFilters.push({ size: { startsWith: `${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { startsWith: `${normalizedSize}/`, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: ` / ${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: ` / ${normalizedSize}/`, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: `/${normalizedSize} `, mode: "insensitive" } });
        sizeFilters.push({ size: { contains: `/${normalizedSize}/`, mode: "insensitive" } });
        sizeFilters.push({ size: { endsWith: ` / ${normalizedSize}`, mode: "insensitive" } });
        sizeFilters.push({ size: { endsWith: `/${normalizedSize}`, mode: "insensitive" } });
        return;
      }

      sizeFilters.push({ size: { equals: normalizedSize, mode: "insensitive" } });
      sizeFilters.push({ size: { startsWith: `${normalizedSize} `, mode: "insensitive" } });
      sizeFilters.push({ size: { startsWith: `${normalizedSize}/`, mode: "insensitive" } });
      sizeFilters.push({ size: { contains: ` / ${normalizedSize} `, mode: "insensitive" } });
      sizeFilters.push({ size: { contains: ` / ${normalizedSize}/`, mode: "insensitive" } });
      sizeFilters.push({ size: { contains: `/${normalizedSize} `, mode: "insensitive" } });
      sizeFilters.push({ size: { contains: `/${normalizedSize}/`, mode: "insensitive" } });
      sizeFilters.push({ size: { endsWith: ` / ${normalizedSize}`, mode: "insensitive" } });
      sizeFilters.push({ size: { endsWith: `/${normalizedSize}`, mode: "insensitive" } });

      if (normalizedSizeUpper.length >= 3) {
        sizeFilters.push({ size: { contains: normalizedSize, mode: "insensitive" } });
      }
    });

    // Combine search and size filters with AND logic
    // (search in name/description/brand) AND (size matches one of the patterns)
    if (searchFilters.length > 0 && sizeFilters.length > 0) {
      // Both search and size filters exist - combine with AND
      if (!where.AND) {
        where.AND = [];
      }
      where.AND.push({ OR: searchFilters });
      where.AND.push({ OR: sizeFilters });
    } else if (searchFilters.length > 0) {
      // Only search filters
      where.OR = searchFilters;
    } else if (sizeFilters.length > 0) {
      // Only size filters
      where.OR = sizeFilters;
    }

    const orderBy: Prisma.listingsOrderByWithRelationInput = (() => {
      switch (sortParam) {
        case "price-asc":
        case "Price Low to High":
          return { price: "asc" };
        case "price-desc":
        case "Price High to Low":
          return { price: "desc" };
        case "name-asc":
          return { name: "asc" };
        case "name-desc":
          return { name: "desc" };
        case "date-asc":
          return { created_at: "asc" };
        case "date-desc":
        case "Latest":
        default:
          return { created_at: "desc" };
      }
    })();

  // 获取总记录数（用于分页）
  const totalCount = await prisma.listings.count({
    where,
  });

  // Debug: Log the where clause for size filtering
  if (hasSizeFilters) {
    console.log(`🔍 Size filter WHERE clause:`, JSON.stringify(where, null, 2));
  }

  // 获取 listings
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
      orderBy,
      take: limit,
      skip: offset,
    });

    // Debug: Log the sizes of returned listings
    if (hasSizeFilters) {
      const returnedSizes = listings.map(l => l.size).filter(Boolean);
      const uniqueSizes = [...new Set(returnedSizes)];
      console.log(`🔍 Size filter results: found ${listings.length} listings`);
      console.log(`🔍 Requested sizes:`, sizesToFilter);
      console.log(`🔍 Returned sizes:`, uniqueSizes);
      console.log(`🔍 Sample size values:`, returnedSizes.slice(0, 10));

      const requestedSizeSet = new Set(sizesToFilter.map((value) => value.toUpperCase()));
      const mismatched = uniqueSizes.filter((size) => {
        if (!size) return false;
        const sizeUpper = size.toUpperCase();
        if (requestedSizeSet.has(sizeUpper)) {
          return false;
        }
        if (requestedSizeSet.has("L") && sizeUpper.includes("L") && sizeUpper !== "L") {
          return true;
        }
        return true;
      });

      if (mismatched.length > 0) {
        console.warn(`⚠️ WARNING: Found sizes outside the requested set:`, mismatched);
      }
    }

    const toArray = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value as string[];
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch (parseError) {
          console.warn("Failed to parse JSON string field", parseError);
          return [];
        }
      }
      if (typeof value === "object") {
        const entries = Object.values(value as Record<string, unknown>);
        return entries.every((item) => typeof item === "string")
          ? (entries as string[])
          : [];
      }
      return [];
    };

    const mapConditionToDisplay = (conditionEnum: string) => {
      const conditionMap: Record<string, string> = {
        "NEW": "Brand New",
        "LIKE_NEW": "Like new",
        "GOOD": "Good",
        "FAIR": "Fair",
        "POOR": "Poor"
      };
      return conditionMap[conditionEnum] || conditionEnum;
    };

    const mapSizeToDisplay = (sizeValue: string | null): string | null => {
      if (!sizeValue) return null;
      const trimmed = sizeValue.trim();

      // Preserve "N/A" exactly, do not split into "N"
      if (/^n\/a$/i.test(trimmed)) {
        return "N/A";
      }
      
      // 处理复杂的尺码字符串（如 "M / EU 38 / UK 10 / US 6"）
      if (trimmed.includes("/")) {
        const parts = trimmed.split("/");
        const firstPart = parts[0].trim();
        
        // 如果第一部分是字母尺码，直接返回
        if (["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(firstPart)) {
          return firstPart;
        }
        
        // 如果包含数字，提取数字部分
        const numberMatch = firstPart.match(/\d+/);
        if (numberMatch) {
          return numberMatch[0];
        }
        
        return firstPart;
      }
      
      // 处理简单的尺码值
      const sizeMap: Record<string, string> = {
        // 数字尺码（鞋子）
        "28": "28", "29": "29", "30": "30", "31": "31", "32": "32", "33": "33", "34": "34",
        "35": "35", "36": "36", "37": "37", "38": "38", "39": "39", "40": "40", "41": "41", "42": "42", "43": "43", "44": "44", "45": "45",
        "46": "46", "47": "47", "48": "48", "49": "49", "50": "50",
        
        // 服装尺码
        "XXS": "XXS", "XS": "XS", "S": "S", "M": "M", "L": "L", "XL": "XL", "XXL": "XXL", "XXXL": "XXXL",
        "Free Size": "Free Size",
        
        // 配饰尺码
        "One Size": "One Size", "Small": "Small", "Medium": "Medium", "Large": "Large",
        
        // 包类尺码
        "Extra Large": "Extra Large",
        
        // 通用选项
        "Other": "Other"
      };

      return sizeMap[sizeValue] || sizeValue;
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

    // 转换数据格式
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

      return {
        id: listing.id.toString(),
        title: listing.name, // 使用 name 字段
        description: listing.description,
  price: toNumber(listing.price),
        brand: listing.brand,
        size: mapSizeToDisplay(listing.size),
        condition: mapConditionToDisplay(listing.condition_type), // 使用映射函数转换枚举值
        material: listing.material,
        tags: toArray(listing.tags),
        category: listing.category?.name ?? null,
        images: (() => {
          // 优先使用 image_urls (JSON数组)，如果没有则使用 image_url (单个字符串)
          const imageUrls = toArray(listing.image_urls);
          if (imageUrls.length > 0) {
            return imageUrls;
          }
          // 如果 image_urls 为空，尝试使用 image_url
          if (listing.image_url && typeof listing.image_url === 'string' && listing.image_url.trim() !== '') {
            return [listing.image_url];
          }
          return [];
        })(),
        shippingOption: (listing as any).shipping_option ?? null,
        shippingFee: toNumber((listing as any).shipping_fee ?? null),
        location: (listing as any).location ?? null,
        likesCount: toNumber((listing as any).likes_count ?? 0),
        availableQuantity: toNumber((listing as any).inventory_count ?? 1), // 🔥 当前库存数量（stock）
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
        total: totalCount, // 真实的总记录数
        hasMore: offset + formattedListings.length < totalCount, // 精确判断是否有更多数据
        page: page ?? undefined,
        limit,
      },
    });

  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

