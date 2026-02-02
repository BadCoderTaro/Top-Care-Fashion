import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get query parameters for search and filtering
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || ""; // "answered" or "pending"

  // Build where clause for filtering
  const whereClause: any = {};

  // Search in question and answer
  if (search) {
    whereClause.OR = [
      { question: { contains: search, mode: "insensitive" } },
      { answer: { contains: search, mode: "insensitive" } },
    ];
  }

  // Filter by category
  if (category) {
    whereClause.category = category;
  }

  // Filter by status (answered vs pending)
  if (status === "answered") {
    whereClause.answer = { not: null };
  } else if (status === "pending") {
    whereClause.answer = null;
  }

  const faqList = await prisma.faq.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    select: {
      id: true,
      user_id: true,
      user_email: true,
      question: true,
      answer: true,
      category: true,
      created_at: true,
      answered_at: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  const faqs = faqList.map((faq) => ({
    id: faq.id,
    userId: faq.user_id?.toString() ?? null,
    userEmail: faq.user_email ?? null,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    createdAt: faq.created_at.toISOString(),
    answeredAt: faq.answered_at?.toISOString() ?? null,
    associatedUserName: faq.user?.username ?? null,
  }));

  return NextResponse.json({ faqs });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { id, answer, category } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updateData: any = {
      answer: answer ?? null,
      answered_at: new Date(),
    };

    // Update category if provided
    if (category !== undefined) {
      updateData.category = category || null;
    }

    const faq = await prisma.faq.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        user_id: true,
        user_email: true,
        question: true,
        answer: true,
        category: true,
        created_at: true,
        answered_at: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: faq.id,
      userId: faq.user_id?.toString() ?? null,
      userEmail: faq.user_email ?? null,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      createdAt: faq.created_at.toISOString(),
      answeredAt: faq.answered_at?.toISOString() ?? null,
      associatedUserName: faq.user?.username ?? null,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.faq.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
