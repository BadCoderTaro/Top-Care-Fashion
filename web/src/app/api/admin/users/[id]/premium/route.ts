import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * POST /api/admin/users/[id]/premium
 * Grant premium status to a user by creating a subscription
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const { months, paidAmount = 0 } = body;
    const userId = Number(params.id);

    if (!months || typeof months !== "number" || months < 1) {
      return NextResponse.json(
        { error: "Invalid months. Must be a positive number." },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine plan duration
    let planDuration: "1m" | "3m" | "1y";
    if (months <= 1) {
      planDuration = "1m";
    } else if (months <= 3) {
      planDuration = "3m";
    } else {
      planDuration = "1y";
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + months);

    // Get existing premium_until to extend from there if applicable
    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { premium_until: true },
    });

    const baseDate =
      existingUser?.premium_until && existingUser.premium_until > now
        ? existingUser.premium_until
        : now;
    const until = new Date(baseDate);
    until.setMonth(until.getMonth() + months);

    // Create subscription record
    // The trigger will automatically update users.is_premium and users.premium_until
    const subscription = await prisma.premium_subscriptions.create({
      data: {
        user_id: userId,
        plan_duration: planDuration,
        paid_amount: paidAmount,
        started_at: baseDate,
        ends_at: until,
        status: "ACTIVE",
      },
    });

    // Fetch updated user to return
    const updatedUser = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        is_premium: true,
        premium_until: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        planDuration: subscription.plan_duration,
        paidAmount: Number(subscription.paid_amount),
        startedAt: subscription.started_at.toISOString(),
        endsAt: subscription.ends_at.toISOString(),
        status: subscription.status,
      },
      user: {
        id: updatedUser?.id,
        username: updatedUser?.username,
        isPremium: updatedUser?.is_premium,
        premiumUntil: updatedUser?.premium_until?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Error granting premium:", error);
    return NextResponse.json(
      { error: "Failed to grant premium status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]/premium
 * Revoke premium status by expiring all active subscriptions
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const userId = Number(params.id);

    // Expire all active subscriptions for this user
    const result = await prisma.premium_subscriptions.updateMany({
      where: {
        user_id: userId,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Trigger will automatically update users.is_premium and users.premium_until

    // Fetch updated user to return
    const updatedUser = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        is_premium: true,
        premium_until: true,
      },
    });

    return NextResponse.json({
      success: true,
      expiredCount: result.count,
      user: {
        id: updatedUser?.id,
        username: updatedUser?.username,
        isPremium: updatedUser?.is_premium,
        premiumUntil: updatedUser?.premium_until?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Error revoking premium:", error);
    return NextResponse.json(
      { error: "Failed to revoke premium status" },
      { status: 500 }
    );
  }
}

