import { prisma } from './db';

/**
 * Helper function to post a system message exactly once per (orderId, status) combination
 * Uses upsert with idempotencyKey to prevent duplicates
 */
export async function postSystemMessageOnce(params: {
  conversationId: number;
  senderId: number;
  receiverId: number;
  content: string;
  actorName?: string;
  orderId?: number; // 🔥 用于构建唯一的 idempotencyKey
  messageType?: string; // 🔥 消息类型标识 (如 'PAID', 'SHIPPED', 'COMPLETED')
}) {
  const { conversationId, senderId, receiverId, content, actorName, orderId, messageType } = params;
  
  // Replace placeholders in content with actual actor name
  let finalContent = content;
  if (actorName) {
    finalContent = content.replace(/@User/g, actorName).replace(/@Buyer/g, actorName).replace(/@Seller/g, actorName);
  }
  
  try {
    // 🔥 使用 orderId + messageType 构建唯一的 idempotencyKey
    let idempotencyKey: string | undefined;
    if (orderId && messageType) {
      idempotencyKey = `order-${orderId}-${messageType}`;
    }
    
    // 🔥 如果有 idempotencyKey，先检查是否已存在
    if (idempotencyKey) {
      const existing = await prisma.messages.findUnique({
        where: {
          idempotencyKey: idempotencyKey,
        },
      });

      if (existing) {
        console.log(`⏭️ System message already exists with idempotencyKey: ${idempotencyKey}`);
        return existing;
      }
    } else {
      // 🔥 没有 idempotencyKey 时，fallback 到旧的内容去重逻辑（向后兼容）
      const existing = await prisma.messages.findFirst({
        where: {
          conversation_id: conversationId,
          message_type: 'SYSTEM',
          content: finalContent,
        },
      });

      if (existing) {
        console.log(`⏭️ System message already exists with same content`);
        return existing;
      }
    }

    const message = await prisma.messages.create({
      data: {
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: finalContent,
        message_type: 'SYSTEM',
        idempotencyKey: idempotencyKey, // 🔥 存储 idempotencyKey
      },
    });
    
    console.log(`✅ Created new system message${idempotencyKey ? ` with idempotencyKey: ${idempotencyKey}` : ''}`);
    return message;
  } catch (error) {
    console.error('❌ Error in postSystemMessageOnce:', error);
    throw error;
  }
}

