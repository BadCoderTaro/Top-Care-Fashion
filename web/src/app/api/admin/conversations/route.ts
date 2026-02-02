import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ConversationType, ConversationStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filters
    const type = searchParams.get("type") as ConversationType | null;
    const status = searchParams.get("status") as ConversationStatus | null;
    const userId = searchParams.get("userId");
    const searchQuery = searchParams.get("search");

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (userId) {
      const userIdNum = parseInt(userId);
      where.OR = [
        { initiator_id: userIdNum },
        { participant_id: userIdNum }
      ];
    }

    if (searchQuery) {
      where.OR = [
        { initiator: { username: { contains: searchQuery, mode: "insensitive" } } },
        { participant: { username: { contains: searchQuery, mode: "insensitive" } } }
      ];
    }

    // Fetch conversations with counts
    const [conversations, totalCount] = await Promise.all([
      prisma.conversations.findMany({
        where,
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar_url: true,
              role: true
            }
          },
          participant: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar_url: true,
              role: true
            }
          },
          listing: {
            select: {
              id: true,
              name: true,
              price: true,
              image_url: true
            }
          },
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              created_at: true,
              sender_id: true,
              message_type: true
            }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { last_message_at: "desc" },
        skip,
        take: limit
      }),
      prisma.conversations.count({ where })
    ]);

    // Format response
    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      type: conv.type,
      status: conv.status,
      initiator: {
        id: conv.initiator.id,
        username: conv.initiator.username,
        email: conv.initiator.email,
        avatar_url: conv.initiator.avatar_url,
        role: conv.initiator.role
      },
      participant: {
        id: conv.participant.id,
        username: conv.participant.username,
        email: conv.participant.email,
        avatar_url: conv.participant.avatar_url,
        role: conv.participant.role
      },
      listing: conv.listing ? {
        id: conv.listing.id,
        name: conv.listing.name,
        price: conv.listing.price,
        image_url: conv.listing.image_url
      } : null,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0] ? {
        id: conv.messages[0].id,
        content: conv.messages[0].content,
        sender_id: conv.messages[0].sender_id,
        message_type: conv.messages[0].message_type,
        created_at: conv.messages[0].created_at.toISOString()
      } : null,
      last_message_at: conv.last_message_at?.toISOString() || null,
      created_at: conv.created_at.toISOString(),
      updated_at: conv.updated_at.toISOString()
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
