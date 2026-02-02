import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * 检查用户是否有权限查看listing的完整统计数据
 * @param listingId - Listing ID
 * @param userId - User ID (可选，如果不提供则从session获取)
 * @returns true if user can view full stats (seller or admin), false otherwise
 */
export async function canViewFullStats(
  listingId: number,
  userId?: number
): Promise<boolean> {
  try {
    // 获取listing信息
    const listing = await prisma.listings.findUnique({
      where: { id: listingId },
      select: {
        seller_id: true,
      },
    });

    if (!listing) {
      return false;
    }

    // 如果没有提供userId，返回false（需要登录才能查看）
    if (!userId) {
      return false;
    }

    // 检查是否为listing的卖家
    if (listing.seller_id === userId) {
      return true;
    }

    // 检查是否为管理员
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        role: true,
      },
    });

    // UserRole enum values: USER, ADMIN
    return user?.role === "ADMIN";
  } catch (error) {
    console.error("Error checking stats permissions:", error);
    return false;
  }
}

/**
 * 从请求中获取用户并检查权限
 */
export async function checkStatsPermission(
  req: NextRequest,
  listingId: number
): Promise<{ canViewFull: boolean; userId?: number }> {
  const user = await getSessionUser(req);
  if (!user) {
    return { canViewFull: false };
  }

  const canViewFull = await canViewFullStats(listingId, user.id);
  return { canViewFull, userId: user.id };
}

