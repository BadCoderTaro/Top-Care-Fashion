// web/src/app/api/promotions/calculate-uplift/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CalculateUpliftPayload {
  promotionId: number;
}

interface UpliftResult {
  promotionId: number;
  listingId: number;
  boostPeriod: {
    start: string;
    end: string;
    days: number;
    views: number;
    clicks: number;
    ctr: number;
  };
  baselinePeriod: {
    start: string;
    end: string;
    days: number;
    views: number;
    clicks: number;
    ctr: number;
  };
  uplift: {
    viewUpliftPercent: number;
    clickUpliftPercent: number;
  };
}

/**
 * POST /api/promotions/calculate-uplift
 * Manually calculate and update uplift metrics for a specific promotion
 */
export async function POST(req: NextRequest) {
  try {
    const body: CalculateUpliftPayload = await req.json();
    const { promotionId } = body;

    if (!promotionId) {
      return NextResponse.json(
        { error: "Missing promotionId" },
        { status: 400 }
      );
    }

    // Fetch the promotion
    const promotion = await prisma.listing_promotions.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    // Calculate boost period
    const boostStart = new Date(promotion.started_at);
    const boostEnd = promotion.ends_at ? new Date(promotion.ends_at) : new Date();
    const boostDays = Math.max(
      1,
      Math.ceil((boostEnd.getTime() - boostStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    // Calculate baseline period (same duration before boost)
    const baselineEnd = new Date(boostStart);
    baselineEnd.setDate(baselineEnd.getDate() - 1);
    const baselineStart = new Date(baselineEnd);
    baselineStart.setDate(baselineStart.getDate() - boostDays + 1);

    // Query baseline stats from listing_stats_daily
    const baselineStats = await prisma.$queryRaw<
      Array<{ total_views: bigint; total_clicks: bigint }>
    >`
      SELECT
        COALESCE(SUM(views), 0)::bigint as total_views,
        COALESCE(SUM(clicks), 0)::bigint as total_clicks
      FROM listing_stats_daily
      WHERE listing_id = ${promotion.listing_id}
        AND date >= ${baselineStart.toISOString().split('T')[0]}::date
        AND date <= ${baselineEnd.toISOString().split('T')[0]}::date
    `;

    const baselineViewsRaw = Number(baselineStats[0]?.total_views || 0);
    const baselineClicksRaw = Number(baselineStats[0]?.total_clicks || 0);

    // Current boost stats
    const boostViews = promotion.views;
    const boostClicks = promotion.clicks;

    // Apply baseline floors
    const flooredBaselineViews = Math.max(baselineViewsRaw, boostDays);
    const baselineDailyViews = Math.max(1, flooredBaselineViews / boostDays);
    const boostDailyViews = boostDays > 0 ? boostViews / boostDays : boostViews;

    const flooredBaselineClicks = Math.max(baselineClicksRaw, 0);

    // Calculate CTRs (as percentages)
    const boostCtr = boostViews > 0 ? (boostClicks / boostViews) * 100 : 0;
    let baselineCtr =
      flooredBaselineViews > 0
        ? (flooredBaselineClicks / flooredBaselineViews) * 100
        : 0;
    if (baselineCtr <= 0 && flooredBaselineClicks > 0) {
      baselineCtr = 1;
    }

    // Calculate uplift percentages
    let viewUpliftPercent = 0;
    let clickUpliftPercent = 0;

    if (baselineDailyViews > 0 && boostViews > 0) {
      viewUpliftPercent = Math.round(
        ((boostDailyViews - baselineDailyViews) / baselineDailyViews) * 100
      );
      // Cap at reasonable limits
      viewUpliftPercent = Math.max(-99, Math.min(999, viewUpliftPercent));
    }

    if (baselineCtr > 0 && boostViews > 0) {
      clickUpliftPercent = Math.round(
        ((boostCtr - baselineCtr) / baselineCtr) * 100
      );
      // Cap at reasonable limits
      clickUpliftPercent = Math.max(-99, Math.min(999, clickUpliftPercent));
    }

    // Update the promotion with calculated uplift
    await prisma.listing_promotions.update({
      where: { id: promotionId },
      data: {
        view_uplift_percent: viewUpliftPercent,
        click_uplift_percent: clickUpliftPercent,
      },
    });

    const result: UpliftResult = {
      promotionId: promotion.id,
      listingId: promotion.listing_id,
      boostPeriod: {
        start: boostStart.toISOString(),
        end: boostEnd.toISOString(),
        days: boostDays,
        views: boostViews,
        clicks: boostClicks,
        ctr: parseFloat(boostCtr.toFixed(2)),
      },
      baselinePeriod: {
        start: baselineStart.toISOString(),
        end: baselineEnd.toISOString(),
        days: boostDays,
        views: baselineViewsRaw,
        clicks: baselineClicksRaw,
        ctr: parseFloat(baselineCtr.toFixed(2)),
      },
      uplift: {
        viewUpliftPercent,
        clickUpliftPercent,
      },
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Calculate uplift error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
