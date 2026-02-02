import { NextRequest, NextResponse } from "next/server";
import { prisma, parseJson } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ConditionType, OrderStatus, Prisma } from "@prisma/client";
import { toNumber } from "@/lib/db";

function mapConditionOut(value: ConditionType | null | undefined):
  | "new"
  | "like_new"
  | "good"
  | "fair"
  | "poor"
  | null {
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
    default:
      return null;
  }
}

function normalizeConditionIn(value: unknown): ConditionType {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "NEW") return ConditionType.NEW;
  if (normalized === "LIKE_NEW") return ConditionType.LIKE_NEW;
  if (normalized === "GOOD") return ConditionType.GOOD;
  if (normalized === "FAIR") return ConditionType.FAIR;
  if (normalized === "POOR") return ConditionType.POOR;
  return ConditionType.GOOD;
}

function mapTxStatus(value: OrderStatus | null | undefined):
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled"
  | null {
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
    default:
      return null;
  }
}

function ensureStringArray(value: unknown): string[] {
  if (!value) return [];
  const parsed = Array.isArray(value) ? (value as unknown[]) : parseJson<string[]>(value);
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizeJsonInput(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    const cleaned = value.filter((item): item is string => typeof item === "string" && item.length > 0);
    return cleaned;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item: unknown): item is string => typeof item === "string" && item.length > 0);
      }
      return parsed;
    } catch {
      return trimmed;
    }
  }
  return value;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  const listing = await prisma.listings.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        }
      },
      promotions: {
        select: {
          id: true,
          status: true,
          started_at: true,
          ends_at: true,
          views: true,
          clicks: true,
          view_uplift_percent: true,
          click_uplift_percent: true,
          used_free_credit: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
    },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bagCount = await prisma.cart_items.count({
    where: {
      listing_id: id,
      quantity: {
        gt: 0,
      },
    },
  });

  const seller = listing.seller_id
    ? await prisma.users.findUnique({ where: { id: listing.seller_id }, select: { username: true } })
    : null;
  const tx = await prisma.orders.findFirst({
    where: { listing_id: id },
    orderBy: { created_at: "desc" },
    select: { id: true, status: true },
  });

  return NextResponse.json({
    id: String(listing.id),
    name: listing.name,
    description: listing.description,
    categoryId: listing.category_id ? String(listing.category_id) : null,
    categoryName: listing.category?.name ?? null,
    sellerId: listing.seller_id ? String(listing.seller_id) : null,
    sellerName: seller?.username ?? null,
    listed: Boolean(listing.listed),
    sold: Boolean(listing.sold),
    price: toNumber(listing.price) ?? 0,
    originalPrice: listing.original_price ? toNumber(listing.original_price) : null,
    imageUrl: listing.image_url ?? null,
    imageUrls: ensureStringArray(listing.image_urls),
    brand: listing.brand ?? null,
    size: listing.size ?? null,
    conditionType: mapConditionOut(listing.condition_type),
    tags: ensureStringArray(listing.tags),
    material: listing.material ?? null,
    weight: listing.weight ? toNumber(listing.weight) : null,
    dimensions: listing.dimensions ?? null,
    sku: listing.sku ?? null,
    inventoryCount: listing.inventory_count ?? 0,
    viewsCount: listing.views_count ?? 0,
    likesCount: listing.likes_count ?? 0,
    clicksCount: listing.clicks_count ?? 0,
    bagCount,
    gender: listing.gender ?? null,
    shippingOption: listing.shipping_option ?? null,
    shippingFee: listing.shipping_fee ? toNumber(listing.shipping_fee) : null,
    location: listing.location ?? null,
    createdAt: listing.created_at.toISOString(),
    updatedAt: listing.updated_at ? listing.updated_at.toISOString() : null,
    soldAt: listing.sold_at ? listing.sold_at.toISOString() : null,
    txId: tx ? String(tx.id) : null,
    txStatus: mapTxStatus(tx?.status),
    promotions: listing.promotions.map(promo => ({
      id: String(promo.id),
      status: promo.status,
      startedAt: promo.started_at.toISOString(),
      endsAt: promo.ends_at ? promo.ends_at.toISOString() : null,
      views: promo.views,
      clicks: promo.clicks,
      viewUpliftPercent: promo.view_uplift_percent,
      clickUpliftPercent: promo.click_uplift_percent,
      usedFreeCredit: promo.used_free_credit,
      createdAt: promo.created_at.toISOString(),
      updatedAt: promo.updated_at.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const {
    name,
    description,
    categoryId,
    sellerId,
    listed,
    price,
    imageUrl,
    imageUrls,
    brand,
    size,
    conditionType,
    tags,
  } = body ?? {};

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name ?? null;
  if (description !== undefined) data.description = description ?? null;
  if (categoryId !== undefined) data.category_id = categoryId ? Number(categoryId) : null;
  if (sellerId !== undefined) data.seller_id = sellerId ? Number(sellerId) : null;
  if (listed !== undefined) data.listed = Boolean(listed);
  if (price !== undefined) data.price = Number(price);
  if (imageUrl !== undefined) data.image_url = imageUrl ?? null;
  if (imageUrls !== undefined) {
    const normalized = normalizeJsonInput(imageUrls);
    if (normalized !== undefined) {
      data.image_urls = normalized;
    }
  }
  if (brand !== undefined) data.brand = brand ?? null;
  if (size !== undefined) data.size = size ?? null;
  if (conditionType !== undefined) data.condition_type = normalizeConditionIn(conditionType);
  if (tags !== undefined) {
    if (Array.isArray(tags)) {
      data.tags = tags.length ? tags : null;
    } else if (typeof tags === "string") {
      const trimmed = tags.trim();
      if (!trimmed) {
        data.tags = null;
      } else if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        // Parse JSON string to array
        try {
          data.tags = JSON.parse(trimmed);
        } catch {
          data.tags = null;
        }
      } else {
        const pieces = trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        data.tags = pieces.length ? pieces : null;
      }
    } else {
      data.tags = tags ?? null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    await prisma.listings.update({ where: { id }, data });
    const listing = await prisma.listings.findUnique({
      where: { id },
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
        sold: true,
        sold_at: true,
      },
    });
    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: String(listing.id),
      name: listing.name,
      description: listing.description,
      categoryId: listing.category_id ? String(listing.category_id) : null,
      sellerId: listing.seller_id ? String(listing.seller_id) : null,
      price: toNumber(listing.price) ?? 0,
      listed: Boolean(listing.listed),
      sold: Boolean(listing.sold),
      imageUrl: listing.image_url ?? null,
      imageUrls: ensureStringArray(listing.image_urls),
      brand: listing.brand ?? null,
      size: listing.size ?? null,
      conditionType: mapConditionOut(listing.condition_type),
      tags: ensureStringArray(listing.tags),
      createdAt: listing.created_at.toISOString(),
      soldAt: listing.sold_at ? listing.sold_at.toISOString() : null,
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  try {
    await prisma.listings.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Foreign key (has orders): fallback to unlist
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      try {
        await prisma.listings.update({ where: { id }, data: { listed: false } });
        return NextResponse.json({ ok: true, softDeleted: true });
      } catch {
        return NextResponse.json({ error: "Failed to unlist listing" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
  }
}
