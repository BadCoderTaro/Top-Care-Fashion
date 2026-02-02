import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const categoryId = Number(params.id);

    const updateData: {
      name?: string;
      description?: string;
      is_active?: boolean;
      sort_order?: number;
      ai_keywords?: any;
      ai_weight_boost?: number;
    } = {};

    if (body.name !== undefined && body.name !== null) {
      updateData.name = body.name;
    }
    if (body.description !== undefined && body.description !== null) {
      updateData.description = body.description;
    }
    if (body.isActive !== undefined) {
      updateData.is_active = body.isActive;
    }
    if (body.sortOrder !== undefined) {
      updateData.sort_order = body.sortOrder;
    }
    if (body.aiKeywords !== undefined) {
      updateData.ai_keywords = body.aiKeywords;
    }
    if (body.aiWeightBoost !== undefined) {
      updateData.ai_weight_boost = body.aiWeightBoost;
    }

    const category = await prisma.listing_categories.update({
      where: { id: categoryId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        is_active: true,
        sort_order: true,
        ai_keywords: true,
        ai_weight_boost: true,
        _count: {
          select: {
            listings: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: String(category.id),
      name: category.name,
      description: category.description,
      createdAt: category.created_at.toISOString(),
      isActive: category.is_active ?? true,
      sortOrder: category.sort_order ?? 0,
      aiKeywords: category.ai_keywords || [],
      aiWeightBoost: category.ai_weight_boost ?? 1.0,
      listingCount: category._count?.listings ?? 0,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const categoryId = Number(params.id);

    await prisma.listing_categories.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
