import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function mapReviewerType(value: unknown): "buyer" | "seller" {
  return String(value ?? "").toUpperCase() === "SELLER" ? "seller" : "buyer";
}

function normalizeReviewerType(value: string): "BUYER" | "SELLER" {
  return value === "seller" ? "SELLER" : "BUYER";
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orderId = Number(params.id);

  const reviews = await prisma.reviews.findMany({
    where: { order_id: orderId },
    include: {
      reviewer: { select: { username: true } },
      reviewee: { select: { username: true } },
      order: {
        select: {
          listing: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const payload = reviews.map((review) => ({
    id: String(review.id),
    transactionId: String(orderId),
    reviewerId: String(review.reviewer_id),
    revieweeId: String(review.reviewee_id),
    rating: Number(review.rating ?? 0),
    comment: review.comment ?? "",
    reviewerType: mapReviewerType(review.reviewer_type),
    createdAt: review.created_at.toISOString(),
    reviewerName: review.reviewer?.username ?? null,
    revieweeName: review.reviewee?.username ?? null,
    listingName: review.order?.listing?.name ?? null,
    listingId: review.order?.listing ? String(review.order.listing.id) : null,
  }));

  return NextResponse.json({ reviews: payload });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reviewerId, revieweeId, rating, comment, reviewerType } = (await req.json().catch(() => ({}))) as {
    reviewerId?: number | string;
    revieweeId?: number | string;
    rating?: number | string;
    comment?: string;
    reviewerType?: string;
  };

  if (!reviewerId || !revieweeId || rating === undefined || rating === null || !comment || !reviewerType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const numericRating = Number(rating);
  if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  if (!["buyer", "seller"].includes(reviewerType)) {
    return NextResponse.json({ error: "Invalid reviewer type" }, { status: 400 });
  }

  const orderId = Number(params.id);
  const reviewerIdNum = Number(reviewerId);
  const revieweeIdNum = Number(revieweeId);

  if (Number.isNaN(reviewerIdNum) || Number.isNaN(revieweeIdNum)) {
    return NextResponse.json({ error: "Reviewer and reviewee must be valid IDs" }, { status: 400 });
  }

  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    select: { buyer_id: true, seller_id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (order.buyer_id !== reviewerIdNum && order.seller_id !== reviewerIdNum) {
    return NextResponse.json({ error: "Reviewer is not part of this transaction" }, { status: 403 });
  }

  const expectedReviewerType = order.buyer_id === reviewerIdNum ? "buyer" : "seller";
  if (reviewerType !== expectedReviewerType) {
    return NextResponse.json({ error: "Reviewer type doesn't match role in transaction" }, { status: 400 });
  }

  const expectedRevieweeId = order.buyer_id === reviewerIdNum ? order.seller_id : order.buyer_id;
  if (revieweeIdNum !== expectedRevieweeId) {
    return NextResponse.json({ error: "Invalid reviewee for this transaction" }, { status: 400 });
  }

  const existing = await prisma.reviews.findFirst({
    where: { order_id: orderId, reviewer_id: reviewerIdNum },
  });

  if (existing) {
    return NextResponse.json({ error: "Review already exists for this transaction and reviewer" }, { status: 400 });
  }

  const review = await prisma.reviews.create({
    data: {
      order_id: orderId,
      reviewer_id: reviewerIdNum,
      reviewee_id: revieweeIdNum,
      rating: numericRating,
      comment,
      reviewer_type: normalizeReviewerType(reviewerType),
    },
  });

  return NextResponse.json({
    message: "Review created successfully",
    reviewId: review.id,
  });
}
