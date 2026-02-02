import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConnection } from "@/lib/db";

type IncomingPlan = {
  type: string;
  name: string;
  description?: string | null;
  pricing?: {
    monthly?: number | null;
    quarterly?: number | null;
    annual?: number | null;
  };
  listingLimit?: number | null;
  promotionPrice?: number | null;
  promotionDiscount?: number | null;
  commissionRate?: number | null;
  mixMatchLimit?: number | null;
  freePromotionCredits?: number | null;
  sellerBadge?: string | null;
  features?: unknown[];
  isPopular?: boolean;
};

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const plans: IncomingPlan[] = Array.isArray(body?.plans) ? body.plans : [];

    if (!plans.length) {
      return NextResponse.json({ error: "No plans provided" }, { status: 400 });
    }

    const connection = await getConnection();

    try {
      for (const plan of plans) {
        await connection.execute(
          `UPDATE pricing_plans SET
             name = ?,
             description = ?,
             price_monthly = ?,
             price_quarterly = ?,
             price_annual = ?,
             listing_limit = ?,
             promotion_price = ?,
             promotion_discount = ?,
             commission_rate = ?,
             mixmatch_limit = ?,
             free_promotion_credits = ?,
             seller_badge = ?,
             features = CAST(? AS jsonb),
             is_popular = ?
           WHERE plan_type = CAST(? AS "PlanType")`,
          [
            plan.name,
            plan.description ?? null,
            normalizeNumber(plan.pricing?.monthly),
            normalizeNumber(plan.pricing?.quarterly),
            normalizeNumber(plan.pricing?.annual),
            normalizeNumber(plan.listingLimit),
            normalizeNumber(plan.promotionPrice),
            normalizeNumber(plan.promotionDiscount),
            normalizeNumber(plan.commissionRate),
            normalizeNumber(plan.mixMatchLimit),
            normalizeNumber(plan.freePromotionCredits),
            plan.sellerBadge ?? null,
            plan.features ? JSON.stringify(plan.features) : null,
            Boolean(plan.isPopular),
            plan.type,
          ]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error("Error updating pricing plans:", error);
    return NextResponse.json(
      { error: "Failed to update pricing plans" },
      { status: 500 }
    );
  }
}
