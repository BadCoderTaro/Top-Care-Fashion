import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Get all active categories
    const categories = await prisma.listing_categories.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });

    // Create a map of category name to ID for easy lookup
    const categoryMap = categories.reduce<Record<string, number>>((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {});

    // Get categories that have listings for each gender
    // Men: only Men listings (exclude Unisex)
    const menCategories = await prisma.listings.groupBy({
      by: ['category_id'],
      where: {
        listed: true,
        sold: false,
        gender: 'Men',
      },
      _count: {
        id: true,
      },
    });

    // Women: only Women listings (exclude Unisex)
    const womenCategories = await prisma.listings.groupBy({
      by: ['category_id'],
      where: {
        listed: true,
        sold: false,
        gender: 'Women',
      },
      _count: {
        id: true,
      },
    });

    // Unisex: only Unisex listings (exclude Men/Women)
    const unisexCategories = await prisma.listings.groupBy({
      by: ['category_id'],
      where: {
        listed: true,
        sold: false,
        gender: 'Unisex',
      },
      _count: {
        id: true,
      },
    });

    // Create sets of category IDs that have listings for each gender
    // Filter out null category_id values
    const menCategoryIds = new Set(
      menCategories
        .map(c => c.category_id)
        .filter((id): id is number => id !== null && id !== undefined)
    );
    const womenCategoryIds = new Set(
      womenCategories
        .map(c => c.category_id)
        .filter((id): id is number => id !== null && id !== undefined)
    );
    const unisexCategoryIds = new Set(
      unisexCategories
        .map(c => c.category_id)
        .filter((id): id is number => id !== null && id !== undefined)
    );

    // Helper function to create records with only categories that have listings
    const createRecordForGender = (categoryIds: Set<number>) => {
      return categories
        .filter(cat => categoryIds.has(cat.id))
        .reduce<Record<string, { id: number; subcategories: string[] }>>((acc, category) => {
          acc[category.name] = { id: category.id, subcategories: [] };
          return acc;
        }, {});
    };

    return NextResponse.json({
      success: true,
      data: {
        men: createRecordForGender(menCategoryIds),
        women: createRecordForGender(womenCategoryIds),
        unisex: createRecordForGender(unisexCategoryIds),
        categoryMap, // 名称到ID的映射
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
