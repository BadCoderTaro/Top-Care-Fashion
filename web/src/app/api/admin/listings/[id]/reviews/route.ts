import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function mapReviewerType(value: unknown): "buyer" | "seller" {
  return String(value ?? "").toUpperCase() === "SELLER" ? "seller" : "buyer";
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const listingId = Number(params.id);

  const reviews = await prisma.reviews.findMany({
    where: {
      order: {
        listing_id: listingId,
      },
    },
    include: {
      reviewer: { select: { username: true } },
      reviewee: { select: { username: true } },
      order: {
        select: {
          id: true,
          listing_id: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });

  const payload = reviews.map((review) => ({
    id: String(review.id),
    listingId: review.order?.listing_id ? String(review.order.listing_id) : null,
    reviewerId: String(review.reviewer_id),
    revieweeId: String(review.reviewee_id),
    transactionId: review.order ? String(review.order.id) : "",
    rating: Number(review.rating ?? 0),
    comment: review.comment ?? "",
    reviewerType: mapReviewerType(review.reviewer_type),
    createdAt: review.created_at.toISOString(),
    reviewerName: review.reviewer?.username ?? null,
    revieweeName: review.reviewee?.username ?? null,
  }));

  return NextResponse.json({ reviews: payload });
}
