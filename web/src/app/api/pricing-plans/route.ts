import { NextResponse } from "next/server";
import { getConnection, parseJson, toBoolean, toNumber } from "@/lib/db";

type FeatureList = string[];

export async function GET() {
  try {
    const connection = await getConnection();

    const [plans]: any = await connection.execute(
      `SELECT plan_type, name, description, price_monthly, price_quarterly, price_annual,
        listing_limit, promotion_price, promotion_discount, commission_rate,
        free_promotion_credits, features, is_popular
       FROM pricing_plans
       WHERE active = TRUE
       ORDER BY price_monthly ASC`
    );

    await connection.end();

    const formattedPlans = (plans as any[]).map((plan) => ({
      type: plan.plan_type,
      name: plan.name,
      description: plan.description,
      pricing: {
        monthly: toNumber(plan.price_monthly) ?? 0,
        quarterly: toNumber(plan.price_quarterly),
        annual: toNumber(plan.price_annual),
      },
      listingLimit: toNumber(plan.listing_limit),
      promotionPrice: toNumber(plan.promotion_price) ?? 0,
      promotionDiscount: toNumber(plan.promotion_discount),
      commissionRate: toNumber(plan.commission_rate) ?? 0,
  freePromotionCredits: toNumber(plan.free_promotion_credits),
      features: parseJson<FeatureList>(plan.features) ?? [],
      isPopular: toBoolean(plan.is_popular),
    }));

    return NextResponse.json({ plans: formattedPlans });
  } catch (error) {
    console.error("Error fetching pricing plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing plans" },
      { status: 500 }
    );
  }
}
