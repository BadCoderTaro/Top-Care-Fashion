import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const conversationId = parseInt(params.id);

    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar_url: true,
            role: true,
            status: true
          }
        },
        participant: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar_url: true,
            role: true,
            status: true
          }
        },
        listing: {
          select: {
            id: true,
            name: true,
            price: true,
            image_url: true,
            listed: true,
            sold: true,
            seller_id: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar_url: true,
                role: true
              }
            },
            receiver: {
              select: {
                id: true,
                username: true,
                avatar_url: true
              }
            }
          },
          orderBy: { created_at: "asc" }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Format response
    const formattedConversation = {
      id: conversation.id,
      type: conversation.type,
      status: conversation.status,
      initiator: {
        id: conversation.initiator.id,
        username: conversation.initiator.username,
        email: conversation.initiator.email,
        avatar_url: conversation.initiator.avatar_url,
        role: conversation.initiator.role,
        status: conversation.initiator.status
      },
      participant: {
        id: conversation.participant.id,
        username: conversation.participant.username,
        email: conversation.participant.email,
        avatar_url: conversation.participant.avatar_url,
        role: conversation.participant.role,
        status: conversation.participant.status
      },
      listing: conversation.listing ? {
        id: conversation.listing.id,
        name: conversation.listing.name,
        price: conversation.listing.price,
        image_url: conversation.listing.image_url,
        listed: conversation.listing.listed,
        sold: conversation.listing.sold,
        seller_id: conversation.listing.seller_id
      } : null,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        message_type: msg.message_type,
        is_read: msg.is_read,
        sender: {
          id: msg.sender.id,
          username: msg.sender.username,
          avatar_url: msg.sender.avatar_url,
          role: msg.sender.role
        },
        receiver: {
          id: msg.receiver.id,
          username: msg.receiver.username,
          avatar_url: msg.receiver.avatar_url
        },
        created_at: msg.created_at.toISOString()
      })),
      messageCount: conversation.messages.length,
      last_message_at: conversation.last_message_at?.toISOString() || null,
      created_at: conversation.created_at.toISOString(),
      updated_at: conversation.updated_at.toISOString()
    };

    return NextResponse.json({ conversation: formattedConversation });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const conversationId = parseInt(params.id);

    // Check if conversation exists
    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Delete conversation and all related messages in a transaction
    await prisma.$transaction([
      // Delete all messages first
      prisma.messages.deleteMany({
        where: { conversation_id: conversationId }
      }),
      // Delete all notifications related to this conversation
      prisma.notifications.deleteMany({
        where: { conversation_id: conversationId }
      }),
      // Then delete the conversation
      prisma.conversations.delete({
        where: { id: conversationId }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
