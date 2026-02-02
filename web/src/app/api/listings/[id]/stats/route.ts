import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkStatsPermission } from "@/lib/listing-stats-auth";

/**
 * GET /api/listings/[id]/stats
 * 获取listing统计数据
 * - 卖家和管理员：可查看所有统计（views, likes, clicks）和时间序列数据
 * - 其他用户：只能查看 likes_count
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const listingId = Number.parseInt(params.id, 10);

    if (isNaN(listingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    // 检查listing是否存在
    const listing = await prisma.listings.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        views_count: true,
        likes_count: true,
        clicks_count: true,
        seller_id: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // 检查权限
    const { canViewFull } = await checkStatsPermission(req, listingId);

    // 统计当前加入购物车的次数（仅对有权限的用户计算）
    let bagCount: number | null = null;
    if (canViewFull) {
      bagCount = await prisma.cart_items.count({
        where: {
          listing_id: listingId,
          quantity: {
            gt: 0,
          },
        },
      });
    }

    // 基础统计
    const baseStats = {
      views: canViewFull ? (listing.views_count ?? 0) : null,
      likes: listing.likes_count ?? 0, // 所有用户都可以看到likes
      clicks: canViewFull ? (listing.clicks_count ?? 0) : null,
      bag: canViewFull ? bagCount ?? 0 : null,
    };

    // 时间序列统计（仅对有权查看完整统计的用户）
    let timeSeriesData: Array<{
      date: string;
      views: number;
      likes: number;
      clicks: number;
    }> = [];

    if (canViewFull) {
      // 获取最近30天的统计数据
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // 设置为当天的开始时间（UTC）
      thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

      const dailyStats = await prisma.listing_stats_daily.findMany({
        where: {
          listing_id: listingId,
          date: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      timeSeriesData = dailyStats.map((stat) => ({
        date: stat.date.toISOString().split("T")[0],
        views: stat.views,
        likes: stat.likes,
        clicks: stat.clicks,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        listingId: listing.id.toString(),
        stats: baseStats,
        timeSeries: canViewFull ? timeSeriesData : null,
        canViewFull,
      },
    });
  } catch (error) {
    console.error("Error fetching listing stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing stats" },
      { status: 500 }
    );
  }
}

