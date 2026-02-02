import { NextRequest, NextResponse } from "next/server";
import { prisma, parseJson, toNumber } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { ConditionType, OrderStatus } from "@prisma/client";

type ImageList = string[];

function ensureStringArray(value: unknown): string[] {
  if (!value) return [];
  const parsed = Array.isArray(value) ? (value as unknown[]) : parseJson<ImageList>(value);
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function mapConditionOut(value: ConditionType): "new" | "like_new" | "good" | "fair" | "poor" {
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

function normalizeConditionIn(value: unknown): ConditionType {
  const normalized = String(value ?? "").trim().toUpperCase();
  switch (normalized) {
    case "NEW":
      return ConditionType.NEW;
    case "LIKE_NEW":
      return ConditionType.LIKE_NEW;
    case "FAIR":
      return ConditionType.FAIR;
    case "POOR":
      return ConditionType.POOR;
    default:
      return ConditionType.GOOD;
  }
}

type SortOption =
  | "date-desc"
  | "date-asc"
  | "price-desc"
  | "price-asc"
  | "name-asc"
  | "name-desc"
  | "views-desc"
  | "views-asc"
  | "clicks-desc"
  | "clicks-asc";

function mapOrderStatus(value: OrderStatus | null | undefined): "pending" | "paid" | "shipped" | "completed" | "cancelled" | null {
  if (!value) return null;
  switch (value) {
    case OrderStatus.IN_PROGRESS:
      return "pending";
    case OrderStatus.TO_SHIP:
      return "paid";
    case OrderStatus.SHIPPED:
    case OrderStatus.DELIVERED:
      return "shipped";
    case OrderStatus.RECEIVED:
    case OrderStatus.COMPLETED:
    case OrderStatus.REVIEWED:
      return "completed";
    case OrderStatus.CANCELLED:
      return "cancelled";
  }
}

function mapListingRow(listing: {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  seller_id: number | null;
  listed: boolean;
  sold: boolean;
  price: any;
  image_url: string | null;
  image_urls: any;
  brand: string | null;
  size: string | null;
  condition_type: ConditionType;
  tags: any;
  created_at: Date;
  sold_at: Date | null;
  updated_at: Date | null;
  views_count: number | null;
  clicks_count: number;
  likes_count: number | null;
  seller: { username: string } | null;
  orders: { id: number; status: OrderStatus }[];
  promotions?: { id: number; status: string; started_at: Date; ends_at: Date | null }[];
}) {
  const imageUrls = ensureStringArray(listing.image_urls);
  const tags = ensureStringArray(listing.tags);
  const latestOrder = listing.orders[0];
  const activePromotion = listing.promotions?.find(p => p.status === 'ACTIVE');

  return {
    id: String(listing.id),
    name: listing.name,
    description: listing.description,
    categoryId: listing.category_id ? String(listing.category_id) : null,
    sellerId: listing.seller_id ? String(listing.seller_id) : null,
    sellerName: listing.seller?.username ?? null,
    listed: listing.listed,
    sold: listing.sold,
    price: toNumber(listing.price) ?? 0,
    imageUrl: listing.image_url,
    imageUrls,
    brand: listing.brand,
    size: listing.size,
    conditionType: mapConditionOut(listing.condition_type),
    tags,
    createdAt: listing.created_at.toISOString(),
    soldAt: listing.sold_at?.toISOString() ?? null,
    txStatus: latestOrder ? mapOrderStatus(latestOrder.status) : null,
    txId: latestOrder ? String(latestOrder.id) : null,
    isBoosted: !!activePromotion,
    boostEndsAt: activePromotion?.ends_at?.toISOString() ?? null,
    viewsCount: listing.views_count ?? 0,
    clicksCount: listing.clicks_count ?? 0,
    likesCount: listing.likes_count ?? 0,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.max(parseInt(searchParams.get("limit") || "50", 10), 1);
  const skip = (page - 1) * limit;
  const sortParam = (searchParams.get("sort") as SortOption | null) ?? "date-desc";
  const statusParam = searchParams.get("status");
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");

  const where: Prisma.listingsWhereInput = {};

  if (statusParam === "listed") {
    where.listed = true;
  } else if (statusParam === "unlisted") {
    where.listed = false;
  } else if (statusParam === "sold") {
    where.sold = true;
  } else if (statusParam === "boosted") {
    where.promotions = {
      some: {
        status: "ACTIVE",
      },
    };
  }

  if (categoryParam && categoryParam !== "all") {
    const categoryId = Number(categoryParam);
    if (!Number.isNaN(categoryId)) {
      where.category_id = categoryId;
    }
  }

  const trimmedSearch = searchParam?.trim();
  if (trimmedSearch) {
    const searchConditions: Prisma.listingsWhereInput[] = [
      { name: { contains: trimmedSearch, mode: "insensitive" } },
      { description: { contains: trimmedSearch, mode: "insensitive" } },
      { brand: { contains: trimmedSearch, mode: "insensitive" } },
      { seller: { username: { contains: trimmedSearch, mode: "insensitive" } } },
    ];

    // Attempt to match numeric IDs directly
    const numericId = Number(trimmedSearch);
    if (!Number.isNaN(numericId)) {
      searchConditions.push({ id: numericId });
    }

    // For tag-based searches, try to match exact tag entries
    searchConditions.push({ tags: { array_contains: [trimmedSearch] } });

    where.OR = searchConditions;
  }

  const orderBy: Prisma.listingsOrderByWithRelationInput = (() => {
    switch (sortParam) {
      case "price-desc":
        return { price: "desc" };
      case "price-asc":
        return { price: "asc" };
      case "name-asc":
        return { name: "asc" };
      case "name-desc":
        return { name: "desc" };
      case "views-desc":
        return { views_count: "desc" };
      case "views-asc":
        return { views_count: "asc" };
      case "clicks-desc":
        return { clicks_count: "desc" };
      case "clicks-asc":
        return { clicks_count: "asc" };
      case "date-asc":
        return { created_at: "asc" };
      case "date-desc":
      default:
        return { created_at: "desc" };
    }
  })();

  const [dbListings, totalCount] = await Promise.all([
    prisma.listings.findMany({
      where,
      skip,
      take: limit,
      include: {
        seller: {
          select: {
            username: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
        promotions: {
          select: {
            id: true,
            status: true,
            started_at: true,
            ends_at: true,
          },
          where: {
            status: "ACTIVE",
          },
        },
      },
      orderBy,
    }),
    prisma.listings.count({ where }),
  ]);

  const listings = dbListings.map(mapListingRow);
  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    listings,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const {
      name,
      description,
      categoryId,
      sellerId,
      listed = true,
      price,
      imageUrl,
      imageUrls,
      brand,
      size,
      conditionType,
      tags,
    } = body;

    if (!name || price === undefined || price === null) {
      return NextResponse.json({ error: "name and price are required" }, { status: 400 });
    }

    const listing = await prisma.listings.create({
      data: {
        name,
        description: description ?? null,
        category_id: categoryId ? Number(categoryId) : null,
        seller_id: sellerId ? Number(sellerId) : null,
        listed: Boolean(listed),
        price: Number(price),
        image_url: imageUrl || null,
        image_urls: imageUrls || undefined,
        brand: brand || null,
        size: size || null,
        condition_type: normalizeConditionIn(conditionType),
        tags: tags || undefined,
      },
      include: {
        seller: {
          select: {
            username: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
      },
    });

    return NextResponse.json(mapListingRow(listing));
  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
