import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_LIMIT = 100;

const sanitizeBrandName = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawLimit = searchParams.get("limit");
    const searchTerm = searchParams.get("search")?.trim();

    const limit = (() => {
      const parsed = rawLimit ? Number.parseInt(rawLimit, 10) : 24;
      if (Number.isNaN(parsed) || parsed <= 0) return 24;
      return Math.min(parsed, MAX_LIMIT);
    })();

    const groups = await prisma.listings.groupBy({
      by: ["brand"],
      where: {
        listed: true,
        sold: false,
        NOT: {
          brand: null,
        },
        brand: searchTerm
          ? {
              contains: searchTerm,
              mode: "insensitive",
            }
          : undefined,
      },
      _count: {
        brand: true,
      },
      orderBy: [
        {
          _count: {
            brand: "desc",
          },
        },
        { brand: "asc" },
      ],
      take: limit,
    });

    const brands = groups
      .map((group) => ({
        name: sanitizeBrandName(group.brand ?? null),
        listingsCount: group._count.brand,
      }))
      .filter((item): item is { name: string; listingsCount: number } => Boolean(item.name));

    return NextResponse.json({
      success: true,
      brands,
    });
  } catch (error) {
    console.error("Error fetching brand summaries:", error);
    return NextResponse.json(
      { error: "Failed to load brands" },
      { status: 500 },
    );
  }
}
