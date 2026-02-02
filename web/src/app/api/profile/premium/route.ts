import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getConnection, toNumber } from "@/lib/db";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Helper to get premium pricing from pricing_plans
async function getPremiumPrice(duration: "1m" | "3m" | "1y"): Promise<number> {
  try {
    const connection = await getConnection();
    const [plans]: any = await connection.execute(
      `SELECT price_monthly, price_quarterly, price_annual
       FROM pricing_plans
       WHERE plan_type = 'PREMIUM' AND active = TRUE
       LIMIT 1`
    );
    await connection.end();

    if (!plans || plans.length === 0) {
      // Default fallback prices (from Plans & Pricing.md)
      return duration === "1y" ? 59.90 : duration === "3m" ? 18.90 : 6.90;
    }

    const plan = plans[0];
    if (duration === "1y") return toNumber(plan.price_annual) ?? 59.90;
    if (duration === "3m") return toNumber(plan.price_quarterly) ?? 18.90;
    return toNumber(plan.price_monthly) ?? 6.90;
  } catch (error) {
    console.error("Error fetching premium price:", error);
    // Return default prices on error (from Plans & Pricing.md)
    return duration === "1y" ? 59.90 : duration === "3m" ? 18.90 : 6.90;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.users.findUnique({
    where: { id: session.id },
    select: { id: true, is_premium: true, premium_until: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    isPremium: Boolean(dbUser.is_premium),
    premiumUntil: dbUser.premium_until ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plan: "1m" | "3m" | "1y" = body?.plan ?? "1m";

    const now = new Date();
    const months = plan === "1y" ? 12 : plan === "3m" ? 3 : 1;

    const existing = await prisma.users.findUnique({
      where: { id: session.id },
      select: { premium_until: true },
    });

    // Check existing premium subscription expiry
    // If user has an active subscription that expires in the future, extend from that date
    // Otherwise, start from now
    const currentExpiry = existing?.premium_until;
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const until = addMonths(baseDate, months);

    // Get pricing for this plan
    const paidAmount = await getPremiumPrice(plan);

    // Create subscription record
    // Note: The trigger sync_users_premium_status() will automatically update users.is_premium and users.premium_until
    // The trigger handles multiple active subscriptions correctly:
    // - It queries ALL active subscriptions (status = 'ACTIVE' AND ends_at > NOW())
    // - It uses MAX(ends_at) to get the latest expiry date
    // - It updates users.premium_until to that latest expiry date
    // This means if a user has multiple subscriptions, their premium_until will always be set to the latest expiry
    // started_at is set to baseDate (current expiry if exists, otherwise now) to accurately reflect extension
    await prisma.premium_subscriptions.create({
      data: {
        user_id: session.id,
        plan_duration: plan,
        paid_amount: paidAmount,
        started_at: baseDate, // Use baseDate instead of now to reflect extension from existing subscription
        ends_at: until,
        status: "ACTIVE",
      },
    });

    // Reset free promotions counter when subscribing
    // Note: We update this separately because it's not part of premium status sync
    // The trigger enforce_premium_subscription_sync only handles is_premium and premium_until
    await prisma.users.update({
      where: { id: session.id },
      data: {
        free_promotions_used: 0,
        free_promotions_reset_at: new Date(),
      },
    });

    // Fetch updated user to return (trigger will have updated is_premium and premium_until)
    const updated = await prisma.users.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        is_premium: true,
        premium_until: true,
      },
    });

    if (!updated) {
      throw new Error("User not found after subscription creation");
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: String(updated.role).toUpperCase() === "ADMIN" ? "Admin" : "User",
        status: String(updated.status).toUpperCase() === "SUSPENDED" ? "suspended" : "active",
        isPremium: Boolean(updated.is_premium),
        premiumUntil: updated.premium_until ?? null,
      },
    });
  } catch (err) {
    console.error("❌ Premium upgrade failed:", err);
    return NextResponse.json({ error: "Upgrade failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Expire all active subscriptions for this user
  await prisma.premium_subscriptions.updateMany({
    where: {
      user_id: session.id,
      status: "ACTIVE",
    },
    data: {
      status: "EXPIRED",
    },
  });

  // Trigger will sync users.is_premium and users.premium_until
  const updated = await prisma.users.findUnique({
    where: { id: session.id },
    select: { id: true, is_premium: true, premium_until: true },
  });

  return NextResponse.json({
    ok: true,
    isPremium: Boolean(updated?.is_premium),
    premiumUntil: updated?.premium_until ?? null,
  });
}
