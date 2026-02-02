import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma, PromotionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PromotionRow {
  id: number;
  listing_id: number;
  seller_id: number;
  status: string;
  started_at: Date;
  ends_at: Date | null;
  views: number;
  clicks: number;
  view_uplift_percent: number;
  click_uplift_percent: number;
  boost_weight: any;
  used_free_credit: boolean;
  paid_amount: any;
  listing_name: string | null;
  listing_price: any;
  listing_image_url: string | null;
  listing_image_urls: Prisma.JsonValue | null;
  seller_username: string | null;
}

function extractFirstImage(imageUrls: Prisma.JsonValue | null, fallback?: string | null) {
  if (!imageUrls && fallback) return fallback;

  const toArray = (value: Prisma.JsonValue | null): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((v) => String(v)).filter(Boolean);
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v)).filter(Boolean);
        }
      } catch (err) {
        if (value.startsWith("http")) {
          return [value];
        }
      }
    }
    return [];
  };

  const images = toArray(imageUrls);
  if (images.length > 0) {
    return images[0];
  }
  return fallback ?? null;
}

// Get all promotions (admin view)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // ACTIVE, EXPIRED, SCHEDULED, or null for all
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const rows = await prisma.$queryRaw<PromotionRow[]>`
      SELECT
        lp.id,
        lp.listing_id,
        lp.seller_id,
        lp.status,
        lp.started_at,
        lp.ends_at,
        lp.views,
        lp.clicks,
        lp.view_uplift_percent,
        lp.click_uplift_percent,
        lp.boost_weight,
        lp.used_free_credit,
        lp.paid_amount,
        l.name AS listing_name,
        l.price AS listing_price,
        l.image_url AS listing_image_url,
        l.image_urls AS listing_image_urls,
        u.username AS seller_username
      FROM listing_promotions lp
      INNER JOIN listings l ON l.id = lp.listing_id
      INNER JOIN users u ON u.id = lp.seller_id
      ${status ? Prisma.raw(`WHERE lp.status = '${status}'`) : Prisma.empty}
      ORDER BY lp.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM listing_promotions lp
      ${status ? Prisma.raw(`WHERE lp.status = '${status}'`) : Prisma.empty}
    `;
    const totalCount = Number(countResult[0].count);

    const promotions = rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      sellerId: row.seller_id,
      sellerUsername: row.seller_username || `User ${row.seller_id}`,
      listingName: row.listing_name || `Listing ${row.listing_id}`,
      listingPrice: row.listing_price ? Number(row.listing_price) : 0,
      listingImage: extractFirstImage(row.listing_image_urls, row.listing_image_url),
      status: row.status,
      startedAt: row.started_at.toISOString(),
      endsAt: row.ends_at ? row.ends_at.toISOString() : null,
      views: row.views ?? 0,
      clicks: row.clicks ?? 0,
      viewUplift: row.view_uplift_percent ?? 0,
      clickUplift: row.click_uplift_percent ?? 0,
      boostWeight: row.boost_weight ? Number(row.boost_weight) : 1.5,
      usedFreeCredit: row.used_free_credit ?? false,
      paidAmount: row.paid_amount ? Number(row.paid_amount) : 0,
      ctr: row.views > 0 ? ((row.clicks / row.views) * 100).toFixed(2) : "0",
    }));

    return NextResponse.json({
      success: true,
      data: promotions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + promotions.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching admin promotions:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 }
    );
  }
}

// Create new promotion
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { listingId, sellerId, endsAt, usedFreeCredit } = body;

    if (!listingId || !sellerId) {
      return NextResponse.json(
        { error: "listingId and sellerId are required" },
        { status: 400 }
      );
    }

    // Check if listing exists and is not sold
    const listing = await prisma.listings.findUnique({
      where: { id: Number(listingId) },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.sold) {
      return NextResponse.json(
        { error: "Cannot promote a sold listing" },
        { status: 400 }
      );
    }

    // Check if there's already an active promotion
    const existingPromotion = await prisma.listing_promotions.findFirst({
      where: {
        listing_id: Number(listingId),
        status: PromotionStatus.ACTIVE,
      },
    });

    if (existingPromotion) {
      return NextResponse.json(
        { error: "Listing already has an active promotion" },
        { status: 400 }
      );
    }

    // Create the promotion
    const promotion = await prisma.listing_promotions.create({
      data: {
        listing_id: Number(listingId),
        seller_id: Number(sellerId),
        status: PromotionStatus.ACTIVE,
        started_at: new Date(),
        ends_at: endsAt ? new Date(endsAt) : null,
        used_free_credit: usedFreeCredit ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      promotion: {
        id: promotion.id,
        listingId: promotion.listing_id,
        sellerId: promotion.seller_id,
        status: promotion.status,
        startedAt: promotion.started_at.toISOString(),
        endsAt: promotion.ends_at ? promotion.ends_at.toISOString() : null,
        views: promotion.views,
        clicks: promotion.clicks,
        usedFreeCredit: promotion.used_free_credit,
      },
    });
  } catch (error) {
    console.error("Error creating promotion:", error);
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}
