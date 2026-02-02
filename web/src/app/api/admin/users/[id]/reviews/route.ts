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

  const userId = Number(params.id);

  const [reviews, user] = await Promise.all([
    prisma.reviews.findMany({
      where: { reviewee_id: userId },
      include: {
        reviewer: { select: { username: true } },
        reviewee: { select: { username: true } },
        order: {
          select: {
            id: true,
            listing: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.users.findUnique({
      where: { id: userId },
      select: { average_rating: true, total_reviews: true },
    }),
  ]);

  const payload = reviews.map((review) => ({
    id: String(review.id),
    transactionId: review.order ? String(review.order.id) : "",
    reviewerId: String(review.reviewer_id),
    revieweeId: String(review.reviewee_id),
    rating: Number(review.rating ?? 0),
    reviewerType: mapReviewerType(review.reviewer_type),
    createdAt: review.created_at.toISOString(),
    reviewerName: review.reviewer?.username ?? null,
    revieweeName: review.reviewee?.username ?? null,
    listingName: review.order?.listing?.name ?? null,
    listingId: review.order?.listing ? String(review.order.listing.id) : null,
  }));

  return NextResponse.json({
    reviews: payload,
    averageRating: user?.average_rating !== null && user?.average_rating !== undefined ? Number(user.average_rating) : null,
    totalReviews: user?.total_reviews ?? 0,
  });
}
