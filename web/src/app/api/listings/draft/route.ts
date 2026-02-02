import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Prisma, Gender } from "@prisma/client";
import { resolveCategoryId } from "@/lib/categories";

type ConditionEnum = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";

const PLACEHOLDER_TITLE = "Untitled draft";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drafts = await prisma.listings.findMany({
      where: {
        seller_id: sessionUser.id,
        listed: false,
        sold: false,
      },
      include: buildIncludeClause(),
      orderBy: { updated_at: "desc" },
    });

    const normalized = drafts.map((listing) => formatListing(listing));
    return NextResponse.json({ drafts: normalized });
  } catch (error) {
    console.error("❌ Error fetching draft listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      price,
      brand,
      size,
      condition,
      material,
      tags,
      category,
      gender,
      images,
      shippingOption,
      shippingFee,
      location,
    } = body ?? {};

    const resolvedTitle = sanitizeTitle(title);
    const resolvedDescription = sanitizeOptionalString(description);
    const resolvedPrice = sanitizeNumber(price, 0);
    const resolvedBrand = sanitizeOptionalString(brand);
    const resolvedSize = sanitizeOptionalString(size);
    const resolvedCondition = mapConditionToEnum(condition);
    const resolvedMaterial = sanitizeOptionalString(material);
    const resolvedGender: Gender = (() => {
      const normalized = sanitizeOptionalString(gender)?.toLowerCase();
      if (normalized === "men" || normalized === "male") return "Men";
      if (normalized === "women" || normalized === "female") return "Women";
      if (normalized === "unisex") return "Unisex";
      return "Unisex";
    })();
    const resolvedTags = Array.isArray(tags)
      ? tags.filter((tag): tag is string => typeof tag === "string" && !!tag.trim())
      : [];
    const resolvedImages = Array.isArray(images)
      ? images.filter((uri): uri is string => typeof uri === "string" && !!uri.trim())
      : [];
    const resolvedShippingOption = sanitizeOptionalString(shippingOption);
    const resolvedShippingFee = sanitizeNumber(shippingFee);
    const resolvedLocation = sanitizeOptionalString(location);

    let categoryId: number | null = null;
    if (typeof category === "string" && category.trim().length) {
      try {
        categoryId = await resolveCategoryId(category);
      } catch (err) {
        console.warn("⚠️ Unable to resolve category for draft", category, err);
      }
    }

    const listing = await prisma.listings.create({
      data: {
        name: resolvedTitle,
        description: resolvedDescription,
        price: new Prisma.Decimal(resolvedPrice ?? 0),
        brand: resolvedBrand ?? "",
        size: resolvedSize,
        condition_type: resolvedCondition,
        material: resolvedMaterial,
        tags:
          resolvedTags.length > 0 ? resolvedTags : Prisma.DbNull,
        category_id: categoryId,
        gender: resolvedGender,
        seller_id: sessionUser.id,
        image_urls:
          resolvedImages.length > 0
            ? resolvedImages
            : Prisma.DbNull,
        listed: false,
        sold: false,
        shipping_option: resolvedShippingOption,
        shipping_fee:
          resolvedShippingFee !== null && resolvedShippingFee !== undefined
            ? new Prisma.Decimal(resolvedShippingFee)
            : null,
        location: resolvedLocation,
      },
      include: buildIncludeClause(),
    });

    return NextResponse.json({ draft: formatListing(listing) }, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating draft listing:", error);
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 }
    );
  }
}

function buildIncludeClause() {
  return {
    seller: {
      select: {
        id: true,
        username: true,
        avatar_url: true,
        average_rating: true,
        total_reviews: true,
        is_premium: true,
      },
    },
    category: {
      select: {
        id: true,
        name: true,
        description: true,
      },
    },
  } as const;
}

function formatListing(listing: any) {
  const images = parseJsonArray(listing.image_urls, listing.image_url);
  const tags = parseJsonArray(listing.tags);

  return {
    id: listing.id.toString(),
    title: listing.name ?? PLACEHOLDER_TITLE,
    description: listing.description ?? "",
    price: Number(listing.price ?? 0),
    brand: listing.brand || null,
    size: listing.size,
    condition: mapConditionToDisplay(listing.condition_type),
    material: listing.material ?? null,
    gender: (listing as any).gender ?? "unisex",
    tags,
    category: listing.category?.name ?? null,
    images,
    shippingOption: (listing as any).shipping_option ?? null,
    shippingFee:
      listing.shipping_fee != null ? Number(listing.shipping_fee) : null,
    location: (listing as any).location ?? null,
    listed: listing.listed,
    sold: listing.sold,
    createdAt: listing.created_at?.toISOString?.() ?? null,
    updatedAt: listing.updated_at?.toISOString?.() ?? null,
    seller: {
      id: listing.seller?.id ?? undefined,
      name: listing.seller?.username ?? "Unknown",
      avatar: listing.seller?.avatar_url ?? "",
      rating: Number(listing.seller?.average_rating ?? 0),
      sales: listing.seller?.total_reviews ?? 0,
      isPremium: Boolean(listing.seller?.is_premium),
    },
  };
}

function sanitizeTitle(raw: unknown) {
  if (typeof raw !== "string") {
    return PLACEHOLDER_TITLE;
  }
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : PLACEHOLDER_TITLE;
}

function sanitizeOptionalString(raw: unknown) {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

function sanitizeNumber(raw: unknown, fallback?: number) {
  if (raw === null || raw === undefined) {
    return fallback ?? null;
  }
  const numeric = Number(raw);
  if (Number.isNaN(numeric)) {
    return fallback ?? null;
  }
  return numeric;
}

function parseJsonArray(value: unknown, fallback?: unknown) {
  if (!value && fallback) {
    return parseJsonArray(fallback);
  }

  if (!value) return [] as string[];

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && !!item.trim()
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string" && !!item.trim()
        );
      }
    } catch (error) {
      if (/^https?:\/\//i.test(trimmed)) {
        return [trimmed];
      }
      console.warn("⚠️ Failed to parse JSON array", { value: trimmed, error });
      return [];
    }
  }

  return [];
}

function mapConditionToEnum(raw: unknown): ConditionEnum {
  if (typeof raw !== "string") {
    return "GOOD";
  }
  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case "brand new":
    case "new":
      return "NEW";
    case "like new":
      return "LIKE_NEW";
    case "good":
      return "GOOD";
    case "fair":
      return "FAIR";
    case "poor":
      return "POOR";
    default:
      return "GOOD";
  }
}

function mapConditionToDisplay(condition: string | null | undefined) {
  switch (condition) {
    case "NEW":
      return "Brand New";
    case "LIKE_NEW":
      return "Like new";
    case "GOOD":
      return "Good";
    case "FAIR":
      return "Fair";
    case "POOR":
      return "Poor";
    default:
      return "Good";
  }
}

