// web/src/app/api/promotions/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TrackingPayload {
  listingId: number;
  eventType: "view" | "click";
}

/**
 * POST /api/promotions/track
 * Track views and clicks for boosted listings
 */
export async function POST(req: NextRequest) {
  try {
    const body: TrackingPayload = await req.json();
    const { listingId, eventType } = body;

    if (!listingId || !eventType) {
      return NextResponse.json(
        { error: "Missing listingId or eventType" },
        { status: 400 }
      );
    }

    if (eventType !== "view" && eventType !== "click") {
      return NextResponse.json(
        { error: "Invalid eventType. Must be 'view' or 'click'" },
        { status: 400 }
      );
    }

    // Find active promotion for this listing
    const promotion = await prisma.listing_promotions.findFirst({
      where: {
        listing_id: listingId,
        status: "ACTIVE",
        ends_at: {
          gt: new Date(),
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!promotion) {
      // No active promotion found, silently succeed (no error)
      return NextResponse.json({ success: true, tracked: false });
    }

    // Increment the appropriate counter
    const updateData =
      eventType === "view"
        ? { views: { increment: 1 } }
        : { clicks: { increment: 1 } };

    await prisma.listing_promotions.update({
      where: { id: promotion.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      tracked: true,
      promotionId: promotion.id,
      eventType,
    });
  } catch (error: any) {
    console.error("Promotion tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
