import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PromotionStatus } from "@prisma/client";

// Update promotion
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { status, endsAt } = body;
    const promotionId = Number(params.id);

    const promotion = await prisma.listing_promotions.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (status !== undefined) {
      if (!Object.values(PromotionStatus).includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
    }

    if (endsAt !== undefined) {
      updateData.ends_at = endsAt ? new Date(endsAt) : null;
    }

    const updatedPromotion = await prisma.listing_promotions.update({
      where: { id: promotionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      promotion: {
        id: updatedPromotion.id,
        listingId: updatedPromotion.listing_id,
        sellerId: updatedPromotion.seller_id,
        status: updatedPromotion.status,
        startedAt: updatedPromotion.started_at.toISOString(),
        endsAt: updatedPromotion.ends_at
          ? updatedPromotion.ends_at.toISOString()
          : null,
        views: updatedPromotion.views,
        clicks: updatedPromotion.clicks,
        usedFreeCredit: updatedPromotion.used_free_credit,
      },
    });
  } catch (error) {
    console.error("Error updating promotion:", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

// Delete promotion
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const promotionId = Number(params.id);

    const promotion = await prisma.listing_promotions.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    await prisma.listing_promotions.delete({
      where: { id: promotionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 }
    );
  }
}
