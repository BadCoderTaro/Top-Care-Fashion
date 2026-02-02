import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  isPremiumUser, 
  getUserBenefits, 
  canUseFreePromotion,
  shouldResetFreePromotions 
} from "@/lib/userPermissions";

/**
 * GET /api/user/benefits
 * 获取当前用户的权益信息
 */
export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取用户完整信息
    const user = await prisma.users.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        username: true,
        is_premium: true,
        premium_until: true,
        mix_match_used_count: true,
        free_promotions_used: true,
        free_promotions_reset_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 检查是否为付费用户
    const isPremium = isPremiumUser(user);
    
    // 获取当前活跃 listings 数量
    const activeListingsCount = await prisma.listings.count({
      where: {
        seller_id: user.id,
        listed: true,
        sold: false,
      },
    });

    // 🔥 检查是否需要重置免费 promotion 计数器
    const needsPromotionReset = shouldResetFreePromotions(user.free_promotions_reset_at);
    let freePromotionsUsed = user.free_promotions_used || 0;
    let freePromotionResetAt = user.free_promotions_reset_at ?? null;

    if (needsPromotionReset && isPremium) {
      const resetTimestamp = new Date();
      await prisma.users.update({
        where: { id: user.id },
        data: {
          free_promotions_used: 0,
          free_promotions_reset_at: resetTimestamp,
        },
      });
      freePromotionsUsed = 0;
      freePromotionResetAt = resetTimestamp;
    }

    // 🔥 获取 Mix & Match 使用次数
    const mixMatchUsedCount = user.mix_match_used_count || 0;

    // 🔥 检查免费 promotion 可用性
    const freePromotionStatus = canUseFreePromotion(
      isPremium,
      freePromotionsUsed,
      freePromotionResetAt
    );

    // 获取用户权益
    const benefits = getUserBenefits(isPremium);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          isPremium,
          premiumUntil: user.premium_until?.toISOString() || null,
        },
        benefits: {
          ...benefits,
          activeListingsCount,
          canCreateListing: benefits.listingLimit === null || activeListingsCount < benefits.listingLimit,
          mixMatchUsedCount,
          mixMatchRemaining: benefits.mixMatchLimit === null 
            ? null 
            : Math.max(0, benefits.mixMatchLimit - mixMatchUsedCount),
          canUseMixMatch: benefits.mixMatchLimit === null || mixMatchUsedCount < benefits.mixMatchLimit,
          freePromotionsUsed,
          freePromotionsRemaining: freePromotionStatus.remaining,
          canUseFreePromotion: freePromotionStatus.canUse,
          freePromotionResetAt: freePromotionResetAt?.toISOString() || null,
          promotionPricing: benefits.promotionPricing,
          listingLimitRemaining: benefits.listingLimit === null 
            ? null 
            : Math.max(0, benefits.listingLimit - activeListingsCount),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user benefits:", error);
    return NextResponse.json(
      { error: "Failed to fetch user benefits" },
      { status: 500 }
    );
  }
}
