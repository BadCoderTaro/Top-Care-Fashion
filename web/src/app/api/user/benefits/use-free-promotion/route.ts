import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUseFreePromotion, isPremiumUser, shouldResetFreePromotions } from "@/lib/userPermissions";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.users.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        is_premium: true,
        premium_until: true,
        free_promotions_used: true,
        free_promotions_reset_at: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isPremium = isPremiumUser(user);
    if (!isPremium) {
      return NextResponse.json({ ok: false, reason: "not_premium" }, { status: 403 });
    }

    let used = user.free_promotions_used ?? 0;
    let lastReset = user.free_promotions_reset_at ?? null;

    // Reset monthly if needed
    if (shouldResetFreePromotions(lastReset)) {
      const resetTimestamp = new Date();
      used = 0;
      await prisma.users.update({
        where: { id: user.id },
        data: { free_promotions_used: 0, free_promotions_reset_at: resetTimestamp },
      });
      lastReset = resetTimestamp;
    }

  const status = canUseFreePromotion(isPremium, used, lastReset);
    if (!status.canUse) {
      return NextResponse.json({ ok: false, reason: "quota_exhausted", remaining: 0 }, { status: 403 });
    }

    const updated = await prisma.users.update({
      where: { id: user.id },
      data: {
        free_promotions_used: used + 1,
        free_promotions_reset_at: lastReset ?? new Date(),
      },
      select: { free_promotions_used: true, free_promotions_reset_at: true },
    });

    const newUsed = updated.free_promotions_used ?? used + 1;
  const nextStatus = canUseFreePromotion(isPremium, newUsed, updated.free_promotions_reset_at);

    return NextResponse.json({
      ok: true,
      used: newUsed,
      remaining: nextStatus.remaining,
      resetAt: updated.free_promotions_reset_at?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("❌ Use free promotion failed:", err);
    return NextResponse.json({ error: "Failed to update counter" }, { status: 400 });
  }
}
