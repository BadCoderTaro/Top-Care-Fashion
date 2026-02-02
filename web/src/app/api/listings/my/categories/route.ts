import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * 获取当前登录用户
 */
// 统一鉴权：使用 getSessionUser(req)

/**
 * 获取当前用户listings中实际使用的分类
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const user = sessionUser ? sessionUser : null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📖 Loading categories for user:", user.id);

    // 获取用户listings中实际使用的分类（只计算active listings）
    const categories = await prisma.listing_categories.findMany({
      where: {
        listings: {
          some: {
            seller_id: user.id,
            listed: true,
            sold: false,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            listings: {
              where: {
                seller_id: user.id,
                listed: true,
                sold: false,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // 格式化分类数据
    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      count: category._count.listings,
    }));

    console.log(`✅ Found ${formattedCategories.length} categories for user ${user.id}`);

    return NextResponse.json({
      success: true,
      categories: formattedCategories,
    });

  } catch (error) {
    console.error("❌ Error fetching user categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
