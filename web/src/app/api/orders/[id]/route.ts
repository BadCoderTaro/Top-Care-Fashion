import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyLegacyToken } from '@/lib/jwt';
import { createSupabaseServer } from '@/lib/supabase';
import { postSystemMessageOnce } from '@/lib/messages';

// 支持legacy token的getCurrentUser函数
async function getCurrentUserWithLegacySupport(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return null;
    }

    // 优先尝试 legacy JWT
    const legacy = verifyLegacyToken(token);
    if (legacy.valid && legacy.payload?.uid) {
      const legacyUser = await prisma.users.findUnique({
        where: { id: Number(legacy.payload.uid) },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          is_premium: true,
          dob: true,
          gender: true,
          avatar_url: true,
        },
      });
      if (legacyUser) {
        return {
          id: legacyUser.id,
          username: legacyUser.username,
          email: legacyUser.email,
          role: legacyUser.role,
          status: legacyUser.status,
          isPremium: Boolean(legacyUser.is_premium),
          dob: legacyUser.dob ? legacyUser.dob.toISOString().slice(0, 10) : null,
          gender: legacyUser.gender,
          avatar_url: legacyUser.avatar_url,
        };
      }
    }

    // 回退到Supabase认证
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const dbUser = await prisma.users.findUnique({
        where: { supabase_user_id: user.id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          is_premium: true,
          dob: true,
          gender: true,
          avatar_url: true,
        },
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
          isPremium: Boolean(dbUser.is_premium),
          dob: dbUser.dob ? dbUser.dob.toISOString().slice(0, 10) : null,
          gender: dbUser.gender,
          avatar_url: dbUser.avatar_url,
        };
      }
    }

    return null;
  } catch (err) {
    console.error("❌ getCurrentUserWithLegacySupport failed:", err);
    return null;
  }
}

// GET /api/orders/[id] - Get a specific order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUserWithLegacySupport(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyer_id: true,
        seller_id: true,
        listing_id: true,
        order_number: true,
        status: true,
        total_amount: true,
        quantity: true,
        shipping_method: true,
        notes: true,
        // 买家信息字段
        buyer_name: true,
        buyer_phone: true,
        shipping_address: true,
        payment_method: true,
        payment_details: true,
        created_at: true,
        updated_at: true,
        buyer: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            email: true,
            phone_number: true
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            email: true,
            phone_number: true
          }
        },
        listing: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image_url: true,
            image_urls: true,
            brand: true,
            size: true,
            condition_type: true,
            gender: true,
            shipping_option: true,
            shipping_fee: true,
            location: true
          }
        },
        reviews: {
          select: {
            id: true,
            reviewer_id: true,
            reviewee_id: true,
            rating: true,
            comment: true,
            created_at: true,
            reviewer: {
              select: {
                id: true,
                username: true,
                avatar_url: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to view this order
    if (order.buyer_id !== currentUser.id && order.seller_id !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this order' },
        { status: 403 }
      );
    }

    // Handle null values by providing defaults
    const orderWithDefaults = {
      ...order,
      order_number: order.order_number || `ORD-${order.id}-${Date.now()}`,
      total_amount: order.total_amount || 0
    };

    return NextResponse.json(orderWithDefaults);

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUserWithLegacySupport(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Valid status values
    const validStatuses = [
      'IN_PROGRESS', 'TO_SHIP', 'SHIPPED', 'DELIVERED', 
      'RECEIVED', 'COMPLETED', 'REVIEWED', 'CANCELLED'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get the order first
    const existingOrder = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        seller: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization based on status change
    let canUpdate = false;
    
    if (status === 'CANCELLED') {
      // ✅ 状态机守卫：只能在 IN_PROGRESS 或 TO_SHIP 状态取消订单
      if (!['IN_PROGRESS', 'TO_SHIP'].includes(existingOrder.status)) {
        return NextResponse.json(
          { error: 'Cannot cancel order after shipping' },
          { status: 400 }
        );
      }
      // Only buyer or seller can cancel before shipping
      canUpdate = existingOrder.buyer_id === currentUser.id || 
                  existingOrder.seller_id === currentUser.id;
    } else if (status === 'TO_SHIP' || status === 'SHIPPED') {
      // Only seller can mark as shipped
      canUpdate = existingOrder.seller_id === currentUser.id;
    } else if (status === 'DELIVERED') {
      // Only seller can mark as delivered (package arrived)
      canUpdate = existingOrder.seller_id === currentUser.id;
    } else if (status === 'RECEIVED') {
      // Only buyer can mark as received
      canUpdate = existingOrder.buyer_id === currentUser.id;
    } else if (status === 'COMPLETED' || status === 'REVIEWED') {
      // Either party can mark as completed/reviewed
      canUpdate = existingOrder.buyer_id === currentUser.id || 
                  existingOrder.seller_id === currentUser.id;
    }

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Unauthorized to update this order status' },
        { status: 403 }
      );
    }

    // Update the order
    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: {
        status: status as any,
        updated_at: new Date()
      },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            email: true,
            phone_number: true
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            email: true,
            phone_number: true
          }
        },
        listing: {
          select: {
            id: true,
            name: true,
            price: true,
            image_url: true,
            image_urls: true,
            brand: true,
            size: true,
            condition_type: true
          }
        },
        reviews: {
          select: {
            id: true,
            reviewer_id: true,
            rating: true,
            comment: true,
            created_at: true
          }
        }
      }
    });

    // 🔥 如果订单被取消，恢复商品状态和库存
    if (status === 'CANCELLED' && existingOrder.listing_id) {
      // 获取当前商品信息
      const listing = await prisma.listings.findUnique({
        where: { id: existingOrder.listing_id },
        select: { inventory_count: true }
      });

      if (listing) {
        // 恢复库存数量
        const currentStock = listing.inventory_count ?? 0;
        const restoredStock = currentStock + (existingOrder.quantity || 1);
        
        await prisma.listings.update({
          where: { id: existingOrder.listing_id },
          data: {
            sold: false,
            sold_at: null,
            inventory_count: restoredStock,
            listed: true // 如果之前因为售罄而下架，重新上架
          }
        });
        
        console.log(`✅ Listing ${existingOrder.listing_id} restored: stock ${currentStock} -> ${restoredStock} after order ${orderId} cancellation`);
      }
    }

    // 🔥 如果订单完成（买家确认收货），检查库存并标记商品状态
    if ((status === 'RECEIVED' || status === 'COMPLETED') && existingOrder.listing_id) {
      // 获取当前库存
      const listing = await prisma.listings.findUnique({
        where: { id: existingOrder.listing_id },
        select: { inventory_count: true }
      });

      if (listing) {
        // 只有库存为 0 时才标记为已售出
        const currentStock = listing.inventory_count ?? 0;
        if (currentStock <= 0) {
          await prisma.listings.update({
            where: { id: existingOrder.listing_id },
            data: {
              sold: true,
              sold_at: new Date(),
              listed: false // 售罄时下架
            }
          });
          console.log(`✅ Listing ${existingOrder.listing_id} marked as sold out (inventory = 0) after order ${orderId} completion`);
        } else {
          // 库存还有剩余，保持上架状态
          console.log(`✅ Listing ${existingOrder.listing_id} still has ${currentStock} items in stock after order ${orderId} completion`);
        }
      }
    }

    // 🔔 创建订单状态变化notification
    try {
      const isSeller = currentUser.id === existingOrder.seller_id;
      const targetUserId = isSeller ? existingOrder.buyer_id : existingOrder.seller_id;

      // 🔥 查找正确的 conversation
      const conversation = await prisma.conversations.findFirst({
        where: {
          listing_id: existingOrder.listing_id,
          OR: [
            {
              initiator_id: existingOrder.buyer_id,
              participant_id: existingOrder.seller_id,
            },
            {
              initiator_id: existingOrder.seller_id,
              participant_id: existingOrder.buyer_id,
            },
          ],
        },
        select: {
          id: true,
        },
      });
      
      let notificationTitle = '';
      let notificationMessage = '';
      
      switch (status) {
        case 'IN_PROGRESS':
          // 🔥 买家下单 → 通知卖家 "有新订单"
          // isSeller=false（买家操作）→ 通知给卖家
          notificationTitle = 'New order received';
          notificationMessage = `@${existingOrder.buyer.username} placed an order for your item.`;
          break;
        case 'TO_SHIP':
          notificationTitle = 'Order ready to ship';
          notificationMessage = `@${existingOrder.seller.username} is preparing your order for shipment.`;
          break;
        case 'SHIPPED':
          // 🔥 通知是发给对方的，所以视角要反过来
          // isSeller=true → 通知买家 "卖家发货了"
          // isSeller=false → 通知卖家 "你发货了"（理论上不会发生，因为只有卖家能标记发货）
          if (isSeller) {
            notificationTitle = 'Order shipped';
            notificationMessage = `@${existingOrder.seller.username} has shipped your order.`;
          } else {
            notificationTitle = 'Order shipped';
            notificationMessage = `You shipped the order to @${existingOrder.buyer.username}.`;
          }
          break;
        case 'DELIVERED':
          // 🔥 通知是发给对方的
          // isSeller=true → 通知买家 "包裹到了，请确认"
          // isSeller=false → 通知卖家 "买家说包裹到了"（理论上不会发生）
          if (isSeller) {
            notificationTitle = 'Order arrived';
            notificationMessage = `Parcel arrived. Please confirm you have received the item.`;
          } else {
            notificationTitle = 'Order arrived';
            notificationMessage = `Parcel delivered to @${existingOrder.buyer.username}. Waiting for confirmation.`;
          }
          break;
        case 'RECEIVED':
          // 🔥 买家确认收货 → 通知卖家 "买家确认了"
          // isSeller=false（买家操作）→ 通知给卖家
          notificationTitle = 'Order completed';
          notificationMessage = `@${existingOrder.buyer.username} confirmed received. Transaction completed.`;
          break;
        case 'CANCELLED':
          // 通知targetUser（对方）谁取消了订单
          notificationTitle = 'Order cancelled';
          notificationMessage = `@${currentUser.username} cancelled the order with you.`;
          break;
      }
      
      if (notificationTitle && targetUserId) {
        // 🔥 通知头像应该显示执行操作的人（currentUser）的头像
        // 例如：卖家发货 → 显示卖家头像；买家确认 → 显示买家头像
        const notificationImageUrl = currentUser.avatar_url || null;
        
        await prisma.notifications.create({
          data: {
            user_id: targetUserId,
            type: 'ORDER',
            title: notificationTitle,
            message: notificationMessage,
            image_url: notificationImageUrl,
            order_id: orderId.toString(),
            related_user_id: currentUser.id, // 发起操作的用户
            conversation_id: conversation?.id, // ✅ 添加对话ID
          },
        });
        console.log(`🔔 Order status notification created for user ${targetUserId} (${status})`);
      }
      
      // 🔔 创建系统消息到对话中（如果找到 conversation）
      if (conversation) {
        try {
          // 🔥 根据状态生成统一的系统消息内容（前端会动态转换显示）
          let systemMessage = '';
          
          switch (status) {
            case 'SHIPPED':
              systemMessage = 'Seller has shipped your parcel.';
              break;
            case 'DELIVERED':
              systemMessage = 'Parcel arrived. Waiting for buyer to confirm received.';
              break;
            case 'RECEIVED':
            case 'COMPLETED':
              // ✅ 统一使用 COMPLETED 作为状态
              systemMessage = 'Order confirmed received. Transaction completed.';
              break;
            case 'CANCELLED':
              systemMessage = '@User cancelled the order.';
              break;
            default:
              systemMessage = notificationMessage;
          }
          
          if (systemMessage) {
            // 🔥 Use postSystemMessageOnce to prevent duplicates
            const actorName = currentUser.username;
            // 🔥 对于 RECEIVED 和 COMPLETED，统一使用 'COMPLETED' 作为 messageType，防止重复
            const normalizedMessageType = (status === 'RECEIVED' || status === 'COMPLETED') 
              ? 'COMPLETED' 
              : status;
            
            await postSystemMessageOnce({
              conversationId: conversation.id,
              senderId: currentUser.id,
              receiverId: targetUserId,
              content: systemMessage,
              actorName: actorName,
              orderId: orderId, // 🔥 传入订单 ID
              messageType: normalizedMessageType // 🔥 使用标准化后的消息类型
            });
            console.log(`📨 System message created in conversation ${conversation.id}: ${systemMessage} (messageType: ${normalizedMessageType})`);
          }
        } catch (messageError) {
          console.error('❌ Error creating system message:', messageError);
        }
      }
    } catch (notificationError) {
      console.error("❌ Error creating order status notification:", notificationError);
      // 不阻止订单更新，即使notification创建失败
    }

    return NextResponse.json(updatedOrder);

  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
