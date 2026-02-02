import { NextRequest, NextResponse } from "next/server";
import { prisma, parseJson, toNumber } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type TagList = string[];

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const [feedbackList, totalCount] = await Promise.all([
    prisma.feedback.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    }),
    prisma.feedback.count(),
  ]);

  const feedbacks = feedbackList.map((feedback) => ({
    id: String(feedback.id),
    userId: feedback.user_id !== null ? String(feedback.user_id) : undefined,
    userEmail: feedback.user_email,
    userName: feedback.user_name,
    message: feedback.message,
    rating: toNumber(feedback.rating),
    tags: parseJson<TagList>(feedback.tags) ?? [],
    featured: feedback.featured,
    createdAt: feedback.created_at.toISOString(),
    associatedUserName: feedback.user?.username,
    isPublic: feedback.is_public ?? true,
    type: feedback.type ?? "general",
    title: feedback.title,
    priority: feedback.priority ?? "medium",
    status: feedback.status ?? "open",
    updatedAt: feedback.updated_at?.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    feedbacks,
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
    const { userId, userEmail, userName, message, rating, tags, featured, isPublic, type, title, priority, status } = body ?? {};

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (featured && !userName) {
      return NextResponse.json({ error: "userName is required for featured feedback" }, { status: 400 });
    }

    await prisma.feedback.create({
      data: {
        user_id: userId ? Number(userId) : null,
        user_email: userEmail || null,
        user_name: userName || null,
        message,
        rating: rating !== undefined && rating !== null ? Number(rating) : null,
        tags: tags || undefined,
        featured: Boolean(featured),
        is_public: isPublic !== undefined ? Boolean(isPublic) : true,
        type: type || "general",
        title: title || null,
        priority: priority || "medium",
        status: status || "open",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding feedback:", error);
    return NextResponse.json({ error: "Failed to add feedback" }, { status: 500 });
  }
}
