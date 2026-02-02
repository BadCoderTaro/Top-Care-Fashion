import { NextRequest, NextResponse } from "next/server";
import { prisma, parseJson, toNumber } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ConditionType } from "@prisma/client";

type TagList = string[];
type ImageList = string[];

function mapCondition(value: ConditionType): "new" | "like_new" | "good" | "fair" | "poor" {
  switch (value) {
    case ConditionType.NEW:
      return "new";
    case ConditionType.LIKE_NEW:
      return "like_new";
    case ConditionType.GOOD:
      return "good";
    case ConditionType.FAIR:
      return "fair";
    case ConditionType.POOR:
      return "poor";
  }
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const listingData = await prisma.listings.findMany({
      where: {
        seller_id: Number(params.id),
      },
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        seller_id: true,
        listed: true,
        price: true,
        image_url: true,
        image_urls: true,
        brand: true,
        size: true,
        condition_type: true,
        tags: true,
        created_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const listings = listingData.map((listing) => ({
      id: String(listing.id),
      name: listing.name,
      description: listing.description,
      categoryId: listing.category_id ? String(listing.category_id) : null,
      sellerId: listing.seller_id ? String(listing.seller_id) : null,
      listed: listing.listed,
      price: toNumber(listing.price) ?? 0,
      imageUrl: listing.image_url,
      imageUrls: parseJson<ImageList>(listing.image_urls),
      brand: listing.brand,
      size: listing.size,
      conditionType: mapCondition(listing.condition_type),
      tags: parseJson<TagList>(listing.tags),
      createdAt: listing.created_at.toISOString(),
    }));

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Error fetching user listings:", error);
    return NextResponse.json({ error: "Failed to fetch user listings" }, { status: 500 });
  }
}
