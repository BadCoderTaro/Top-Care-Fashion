import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * 轻量级的新消息检查API
 * 只返回每个对话的最后一条消息ID和时间戳，用于轮询检查新消息
 * GET /api/conversations/check
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const dbUser = sessionUser
      ? { id: sessionUser.id, username: sessionUser.username }
      : null;

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 只获取对话ID、对方用户信息和最后一条消息的基本信息
    const conversations = await prisma.conversations.findMany({
      where: {
        OR: [
          { initiator_id: dbUser.id },
          { participant_id: dbUser.id }
        ],
        status: "ACTIVE"
      },
      select: {
        id: true,
        initiator_id: true,
        participant_id: true,
        initiator: {
          select: {
            id: true,
            username: true,
          }
        },
        participant: {
          select: {
            id: true,
            username: true,
          }
        },
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            id: true,
            created_at: true,
            sender_id: true,
            receiver_id: true,
            is_read: true,
          }
        }
      },
    });

    // 格式化返回数据：包含对话ID、最后一条消息的ID和时间、对方用户信息、未读状态
    const result = conversations
      .filter(conv => conv.messages.length > 0)
      .map(conv => {
        const lastMessage = conv.messages[0];
        const otherUser = conv.initiator_id === dbUser.id ? conv.participant : conv.initiator;
        // 判断是否未读：消息的接收者是当前用户，且消息未读
        const isUnread = lastMessage.receiver_id === dbUser.id && !lastMessage.is_read;
        
        return {
          conversationId: String(conv.id),
          lastMessageId: String(lastMessage.id),
          lastMessageTime: lastMessage.created_at.toISOString(),
          isFromMe: lastMessage.sender_id === dbUser.id,
          isUnread,
          senderUsername: otherUser?.username || 'User',
        };
      });

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error("❌ Error checking conversations:", error);
    return NextResponse.json(
      { error: "Failed to check conversations" },
      { status: 500 }
    );
  }
}

