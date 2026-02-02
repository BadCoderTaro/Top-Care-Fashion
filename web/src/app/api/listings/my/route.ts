import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * 获取当前登录用户
 */
// 统一鉴权：使用 getSessionUser(req)

/**
 * 获取当前用户的listings
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const user = sessionUser ? sessionUser : null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // 'active', 'sold', 'all'
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Filter参数
    const category = searchParams.get("category");
    const condition = searchParams.get("condition");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sortBy = searchParams.get("sortBy") || "latest";
    const genderParam = searchParams.get("gender");

    console.log("📖 Loading user listings for user:", user.id);
    console.log("📖 Filter params:", { status, category, condition, minPrice, maxPrice, sortBy });

    // 构建查询条件
    const where: any = {
      seller_id: user.id,
    };

    if (status === "active") {
      where.listed = true;
      where.sold = false; // 🔥 排除已售出的商品
    } else if (status === "sold") {
      where.sold = true;
    } else if (status === "unlisted") {
      where.listed = false;
      where.sold = false; // 🔥 排除已售出的草稿
    } else if (status === "all") {
      // 🔥 'all' 表示 active + unlisted（不包括已售出的）
      where.sold = false;
    }
    // 如果status没有指定，则获取所有listings（包括已售出的）

    // 添加filter条件
    if (category && category !== "All") {
      // 直接使用分类名称查询，避免额外的数据库查询
      where.category = {
        name: category,
      };
    }

    if (condition && condition !== "All") {
      const normalizeCondition = (value: string): "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR" | null => {
        const normalized = value.trim().toLowerCase();
        switch (normalized) {
          case "brand new":
          case "new":
          case "new-in-box":
          case "new in box":
            return "NEW";
          case "like new":
          case "nearly new":
            return "LIKE_NEW";
          case "good":
            return "GOOD";
          case "fair":
            return "FAIR";
          case "poor":
            return "POOR";
          default:
            if (normalized.replace(/[_\s-]+/g, "") === "brandnew") {
              return "NEW";
            }
            if (normalized.replace(/[_\s-]+/g, "") === "likenew") {
              return "LIKE_NEW";
            }
            return null;
        }
      };

      const conditionType = normalizeCondition(condition);
      if (conditionType) {
        where.condition_type = conditionType;
      }
    }

    if (genderParam) {
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

    if (minPrice) {
      where.price = { ...where.price, gte: parseFloat(minPrice) };
    }

    if (maxPrice) {
      where.price = { ...where.price, lte: parseFloat(maxPrice) };
    }

    // 构建排序条件
    let orderBy: any = { created_at: "desc" };
    if (sortBy === "price_low_to_high") {
      orderBy = { price: "asc" };
    } else if (sortBy === "price_high_to_low") {
      orderBy = { price: "desc" };
    } else if (sortBy === "latest") {
      orderBy = { created_at: "desc" };
    }

    console.log("📖 Final where clause:", JSON.stringify(where, null, 2));
    console.log("📖 Order by:", orderBy);

    // Get total count of listings matching the where clause
    const total = await prisma.listings.count({ where });

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
        // 🔥 对于sold状态的商品，包含最新的订单信息
        orders: status === "sold" ? {
          select: {
            id: true,
            status: true,
            quantity: true,
            created_at: true,
            updated_at: true,
            buyer_id: true,
            seller_id: true,
          },
          orderBy: { created_at: "desc" },
          take: 1, // 只取最新的订单
        } : false,
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    // 🔥 为每个sold商品获取conversationId
    const listingsWithConversations = await Promise.all(
      listings.map(async (listing: any) => {
        let conversationId = null;
        if (status === "sold" && listing.orders?.[0]) {
          const latestOrder = listing.orders[0];

          // 通过 listing_id 和订单参与双方查找对应 conversation，避免命中其他买家的对话
          const conversation = await prisma.conversations.findFirst({
            where: {
              listing_id: listing.id,
              OR: [
                {
                  initiator_id: latestOrder.buyer_id,
                  participant_id: latestOrder.seller_id,
                },
                {
                  initiator_id: latestOrder.seller_id,
                  participant_id: latestOrder.buyer_id,
                },
              ],
            },
            select: {
              id: true,
            },
          });

          conversationId = conversation?.id?.toString() || null;
        }
        
        return {
          ...listing,
          conversationId
        };
      })
    );

    const parseJsonArray = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          return [];
        }
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : [];
        } catch (error) {
          if (/^https?:\/\//i.test(trimmed)) {
            return [trimmed];
          }
          console.warn("Failed to parse JSON array field", { value: trimmed, error });
          return [];
        }
      }
      return [];
    };

  const formattedListings = listingsWithConversations.map((listing: any) => {
      const images = (() => {
        const parsed = parseJsonArray(listing.image_urls);
        if (parsed.length > 0) {
          return parsed;
        }
        if (typeof listing.image_url === "string" && listing.image_url.trim().length > 0) {
          return [listing.image_url];
        }
        return [];
      })();

      const tags = parseJsonArray(listing.tags);

      const latestOrder = status === "sold" ? listing.orders?.[0] : undefined;

      return {
        id: listing.id.toString(),
        title: listing.name,
        description: listing.description,
        price: Number(listing.price),
        brand: listing.brand,
        size: listing.size,
        condition: listing.condition_type.toLowerCase(),
        material: listing.material,
        tags,
        category: listing.category?.name || "Unknown",
        images,
        seller: {
          id: listing.seller?.id ?? 0,
          name: listing.seller?.username || "Unknown",
          avatar: listing.seller?.avatar_url || "",
          rating: Number(listing.seller?.average_rating) || 0,
          sales: listing.seller?.total_reviews || 0,
          isPremium: Boolean(listing.seller?.is_premium),
          is_premium: Boolean(listing.seller?.is_premium),
        },
        listed: listing.listed,
        sold: listing.sold,
        availableQuantity: Number(listing.inventory_count ?? 1), // 🔥 当前库存数量（stock）
        createdAt: listing.created_at.toISOString(),
        updatedAt: listing.updated_at?.toISOString() || null,
        orderStatus: latestOrder ? latestOrder.status : null,
        orderId: latestOrder ? latestOrder.id : null,
        orderQuantity: latestOrder ? Number(latestOrder.quantity ?? 1) : null,
        buyerId: latestOrder ? latestOrder.buyer_id : null,
        sellerId: latestOrder ? latestOrder.seller_id : null,
        conversationId: listing.conversationId,
      };
    });

    console.log(`✅ Found ${formattedListings.length} listings for user ${user.id}, total: ${total}`);

    return NextResponse.json({
      listings: formattedListings,
      total: total,
    });

  } catch (error) {
    console.error("❌ Error fetching user listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
