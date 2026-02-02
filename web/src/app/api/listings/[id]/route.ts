import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { resolveCategoryId } from "@/lib/categories";

/**
 * 映射条件显示值
 */
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

/**
 * 映射尺码显示值
 */
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

const mapGenderToEnum = (raw: unknown): "Men" | "Women" | "Unisex" | null => {
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case "men":
    case "male":
      return "Men";
    case "women":
    case "female":
      return "Women";
    case "unisex":
    case "uni":
    case "all":
      return "Unisex";
    default:
      return null;
  }
};

/**
 * Helper to safely parse JSON arrays or comma-separated strings
 */
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
      // Handle comma-separated strings (e.g., "adidas,clothing,vintage")
      if (trimmed.includes(',')) {
        return trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      console.warn("Failed to parse JSON array field for listing", { value: trimmed, error });
      return [];
    }
  }
  return [];
};

/**
 * 获取单个listing详情
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const listingId = Number.parseInt(params.id, 10);

    if (isNaN(listingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    console.log(`📖 Fetching listing ${listingId}`);

    // 尝试获取当前用户（可选，用于检查是否是卖家本人）
    const sessionUser = await getSessionUser(req).catch(() => null);

    // 构建查询条件
    const where: any = { id: listingId };
    
    // 如果是匿名用户，只允许查看已上架且未售出的 listing
    if (!sessionUser) {
      where.listed = true;
      where.sold = false;
    }
    // 如果是已登录用户，可以查看已上架的 listing，或者自己创建的 listing

    const listing = await prisma.listings.findFirst({
      where: sessionUser
        ? {
            id: listingId,
            OR: [
              { listed: true, sold: false }, // 已上架且未售出
              { seller_id: sessionUser.id }, // 或者是自己的 listing
            ],
          }
        : where,
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
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

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

    const formattedListing = {
      id: listing.id.toString(),
      title: listing.name,
      description: listing.description,
      price: Number(listing.price),
      brand: listing.brand,
      size: mapSizeToDisplay(listing.size),
      condition: mapConditionToDisplay(listing.condition_type),
      material: listing.material,
      gender: (listing as any).gender || null,
      tags,
      category: listing.category?.name,
      images,
      shippingOption: (listing as any).shipping_option || "Free shipping",
      shippingFee: Number((listing as any).shipping_fee || 0),
      location: (listing as any).location || "",
      seller: {
        id: listing.seller?.id || 0, // 🔥 添加seller ID字段
        name: listing.seller?.username || "Unknown",
        avatar: listing.seller?.avatar_url || "",
        rating: Number(listing.seller?.average_rating) || 0,
        sales: Number(listing.seller?.total_reviews) || 0,
        isPremium: Boolean(listing.seller?.is_premium),
        is_premium: Boolean(listing.seller?.is_premium),
      },
      createdAt: listing.created_at.toISOString(),
      listed: listing.listed,
      sold: listing.sold,
      availableQuantity: Number((listing as any).inventory_count ?? 1), // 🔥 当前库存数量（stock）
    };

    return NextResponse.json({ listing: formattedListing });
  } catch (error) {
    console.error(`❌ Error fetching listing ${context.params}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch listing", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * 更新listing
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // 使用 getSessionUser 支持 Legacy JWT token
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      console.log("❌ No session user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Authenticated user:", sessionUser.username, "ID:", sessionUser.id);

    const params = await context.params;
    const listingId = Number.parseInt(params.id, 10);

    if (isNaN(listingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    const body = await req.json();
    console.log("📝 Updating listing:", listingId, "with data:", JSON.stringify(body, null, 2));

    // 验证listing是否属于当前用户
    const existingListing = await prisma.listings.findFirst({
      where: {
        id: listingId,
        seller_id: sessionUser.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found or not owned by user" }, { status: 404 });
    }

    // 转换condition字符串到ConditionType枚举
    const mapConditionToEnum = (conditionStr: string) => {
      // 标准化输入字符串，处理大小写和空格
      const normalizedStr = conditionStr.trim();
      
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
        "poor": "POOR"
      };
      
      const result = conditionMap[normalizedStr];
      console.log("📝 Condition mapping (update):", { input: conditionStr, normalized: normalizedStr, result });
      return result || "GOOD";
    };

    // 准备更新数据
    const updateData: any = {};

    if (body.title !== undefined) updateData.name = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) {
      const numericPrice = Number(body.price);
      if (!Number.isNaN(numericPrice)) {
        updateData.price = numericPrice;
      }
    }
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.size !== undefined) updateData.size = body.size;
    if (body.condition !== undefined) updateData.condition_type = mapConditionToEnum(body.condition);
    if (body.material !== undefined) updateData.material = body.material;
    if (body.gender !== undefined) {
      console.log("📝 Gender field received:", { raw: body.gender, type: typeof body.gender });
      const resolvedGender = mapGenderToEnum(body.gender);
      console.log("📝 Gender after mapping:", { resolved: resolvedGender });
      // Always update gender field. If invalid input, default to Unisex enum
      updateData.gender = resolvedGender || "Unisex";
      console.log("📝 Gender to be saved:", updateData.gender);
    }
    // Prisma expects Json type fields as JavaScript arrays/objects, not JSON strings
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.images !== undefined) updateData.image_urls = body.images;
    if (body.shippingOption !== undefined) updateData.shipping_option = body.shippingOption;
    if (body.shippingFee !== undefined) {
      const numericFee = Number(body.shippingFee);
      if (!Number.isNaN(numericFee)) {
        updateData.shipping_fee = numericFee;
      } else {
        updateData.shipping_fee = null;
      }
    }
    if (body.location !== undefined) updateData.location = body.location;
    if (body.listed !== undefined) updateData.listed = body.listed;
    if (body.sold !== undefined) updateData.sold = body.sold;
    
    // 🔥 处理库存数量
    if (body.quantity !== undefined) {
      const numericQuantity = Number(body.quantity);
      if (!Number.isNaN(numericQuantity) && numericQuantity >= 1) {
        updateData.inventory_count = numericQuantity;
        console.log("✅ Updating inventory_count to:", numericQuantity);
      } else {
        console.warn("⚠️ Invalid quantity value:", body.quantity);
      }
    }

    // 🔥 处理 category（通过 name 查找 category_id）
    if (body.category !== undefined && typeof body.category === "string" && body.category.trim().length > 0) {
      try {
        const categoryId = await resolveCategoryId(body.category);
        updateData.category_id = categoryId;
        console.log("✅ Category resolved:", body.category, "->", categoryId);
      } catch (err) {
        console.warn("⚠️ Unable to resolve category:", body.category, err);
      }
    }

    updateData.updated_at = new Date();

    console.log("📝 Update data prepared:", JSON.stringify(updateData, null, 2));
    console.log("📝 Gender in updateData:", {
      gender: updateData.gender,
      type: typeof updateData.gender,
      hasGender: 'gender' in updateData
    });

    const updatedListing = await prisma.listings.update({
      where: { id: listingId },
      data: updateData,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            average_rating: true,
            total_reviews: true,
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
    });

    console.log("✅ Listing updated successfully:", updatedListing.id);
    console.log("✅ Gender in database after update:", {
      gender: (updatedListing as any).gender,
      type: typeof (updatedListing as any).gender
    });

    const images = (() => {
      const parsed = parseJsonArray(updatedListing.image_urls);
      if (parsed.length > 0) {
        return parsed;
      }
      if (typeof updatedListing.image_url === "string" && updatedListing.image_url.trim().length > 0) {
        return [updatedListing.image_url];
      }
      return [];
    })();

    const tags = parseJsonArray(updatedListing.tags);

    const formattedListing = {
      id: updatedListing.id.toString(),
      title: updatedListing.name,
      description: updatedListing.description,
      price: Number(updatedListing.price),
      brand: updatedListing.brand,
      size: mapSizeToDisplay(updatedListing.size),
      condition: mapConditionToDisplay(updatedListing.condition_type),
      material: updatedListing.material,
      gender: (updatedListing as any).gender || null,
      tags,
      category: updatedListing.category?.name || "Unknown",
      images,
      shippingOption: (updatedListing as any).shipping_option || "Free shipping",
      shippingFee: Number((updatedListing as any).shipping_fee || 0),
      location: (updatedListing as any).location || "",
      seller: {
        id: updatedListing.seller?.id || 0, // 🔥 添加seller ID字段
        name: updatedListing.seller?.username || "Unknown",
        avatar: updatedListing.seller?.avatar_url || "",
        rating: Number(updatedListing.seller?.average_rating) || 0,
        sales: updatedListing.seller?.total_reviews || 0,
      },
      listed: updatedListing.listed,
      sold: updatedListing.sold,
      availableQuantity: Number((updatedListing as any).inventory_count ?? 1), // 🔥 当前库存数量（stock）
      createdAt: updatedListing.created_at.toISOString(),
      updatedAt: updatedListing.updated_at?.toISOString() || null,
    };

    return NextResponse.json({
      success: true,
      listing: formattedListing,
    });

  } catch (error) {
    console.error("❌ Error updating listing:", error);
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}

/**
 * 删除listing
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // 使用 getSessionUser 支持 Legacy JWT token
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      console.log("❌ No session user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Authenticated user:", sessionUser.username, "ID:", sessionUser.id);

    const params = await context.params;
    const listingId = Number.parseInt(params.id, 10);

    if (isNaN(listingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    console.log("🗑️ Deleting listing:", listingId, "for user:", sessionUser.id);

    // 验证listing是否属于当前用户
    const existingListing = await prisma.listings.findFirst({
      where: {
        id: listingId,
        seller_id: sessionUser.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found or not owned by user" }, { status: 404 });
    }

    // 删除listing
    await prisma.listings.delete({
      where: { id: listingId },
    });

    console.log("✅ Listing deleted successfully:", listingId);

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully",
    });

  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 }
    );
  }
}

