import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/notifications - 获取用户的所有通知
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread_only") === "true";

    // 构建查询条件
    const where: any = {
      user_id: sessionUser.id,
    };

    if (unreadOnly) {
      where.is_read = false;
    }

    const notifications = await prisma.notifications.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            name: true,
            price: true,
            image_url: true,
            image_urls: true,
          }
        },
        related_user: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.notifications.count({
      where
    });

    // 格式化响应数据
    const formattedNotifications = notifications.map(notification => {
      const listingImage = notification.listing?.image_url ??
        (Array.isArray(notification.listing?.image_urls)
          ? (notification.listing.image_urls[0] as string)
          : null);

      const conversationId =
        "conversation_id" in notification && notification.conversation_id != null
          ? notification.conversation_id.toString()
          : undefined;

      // 🔥 修复：优先使用 related_user 的头像（动态的），而不是 image_url（静态的）
      // 这样同一个商品多个买家的通知可以正确显示不同买家的头像
      const notificationImage = notification.related_user?.avatar_url || notification.image_url;

      const formatted = {
        id: notification.id.toString(),
        type: notification.type.toLowerCase(),
        title: notification.title,
        message: notification.message,
        image: notificationImage,
        listingImage,
        time: notification.created_at ? formatTime(notification.created_at) : null,
        isRead: notification.is_read,
        orderId: notification.order_id || undefined,
        listingId: notification.listing_id?.toString(),
        userId: notification.related_user_id?.toString(),
        username: notification.related_user?.username,
        conversationId,
        related_user_id: notification.related_user_id?.toString(),
        listing: notification.listing
          ? {
              id: notification.listing.id.toString(),
              title: notification.listing.name,
              price: notification.listing.price,
              image: listingImage,
            }
          : null,
      };

      return formatted;
    });

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      totalCount,
      hasMore: offset + limit < totalCount
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    
    // 如果是表不存在的错误，返回空数组而不是错误
    if (error instanceof Error && error.message.includes('P2021')) {
      console.log("🔔 Notifications table doesn't exist yet, returning empty array");
      return NextResponse.json({
        success: true,
        notifications: [],
        totalCount: 0,
        hasMore: false
      });
    }
    
    return NextResponse.json({ 
      error: "Failed to fetch notifications" 
    }, { status: 500 });
  }
}

// POST /api/notifications - 创建新通知
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("🔔 POST /api/notifications - Request body:", JSON.stringify(body, null, 2));
    
    const {
      type,
      title,
      message,
      image_url,
      order_id,
      listing_id,
      related_user_id,
      userId
    } = body;

    if (!type || !title) {
      console.log("❌ Missing required fields:", { type: !!type, title: !!title });
      return NextResponse.json({ 
        error: "Type and title are required" 
      }, { status: 400 });
    }

    console.log("🔔 Creating notification with data:", {
      user_id: userId ? parseInt(userId) : sessionUser.id,
      type: type.toUpperCase(),
      title,
      message,
      image_url,
      order_id,
      listing_id: listing_id ? parseInt(listing_id) : null,
      related_user_id: related_user_id ? parseInt(related_user_id) : null,
    });

    const notification = await prisma.notifications.create({
      data: {
        user_id: userId ? parseInt(userId) : sessionUser.id,
        type: type.toUpperCase(),
        title,
        message,
        image_url,
        order_id,
        listing_id: listing_id ? parseInt(listing_id) : null,
        related_user_id: related_user_id ? parseInt(related_user_id) : null,
      },
      include: {
        listing: {
          select: {
            id: true,
            name: true,
            price: true,
            image_url: true,
            image_urls: true,
          }
        },
        related_user: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          }
        }
      }
    });

    // 🔥 修复：优先使用 related_user 的头像（动态的），而不是 image_url（静态的）
    const notificationImage = notification.related_user?.avatar_url || notification.image_url;

    // 格式化响应数据
    const formattedNotification = {
      id: notification.id.toString(),
      type: notification.type.toLowerCase(),
      title: notification.title,
      message: notification.message,
      image: notificationImage,
      time: notification.created_at ? formatTime(notification.created_at) : null,
      isRead: notification.is_read,
      orderId: notification.order_id,
      listingId: notification.listing_id?.toString(),
      userId: notification.related_user_id?.toString(),
      username: notification.related_user?.username,
      listing: notification.listing ? {
        id: notification.listing.id.toString(),
        title: notification.listing.name,
        price: notification.listing.price,
        image: notification.listing.image_url || 
               (Array.isArray(notification.listing.image_urls) 
                 ? (notification.listing.image_urls[0] as string) 
                 : null)
      } : null
    };

    return NextResponse.json({
      success: true,
      notification: formattedNotification
    });

  } catch (error) {
    console.error("❌ Error creating notification:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      error: error
    });
    
    // 如果是表不存在的错误，返回成功但不创建
    if (error instanceof Error && error.message.includes('P2021')) {
      console.log("🔔 Notifications table doesn't exist yet, skipping creation");
      return NextResponse.json({
        success: true,
        message: "Notification table not ready yet"
      });
    }
    
    return NextResponse.json({ 
      error: "Failed to create notification",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/notifications - 标记所有通知为已读
export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.notifications.updateMany({
      where: {
        user_id: sessionUser.id,
        is_read: false
      },
      data: {
        is_read: true,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read"
    });

  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json({ 
      error: "Failed to mark notifications as read" 
    }, { status: 500 });
  }
}

// 格式化时间
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

