import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/notifications/[id] - 获取单个通知
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        user_id: sessionUser.id
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

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

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
    console.error("Error fetching notification:", error);
    return NextResponse.json({ 
      error: "Failed to fetch notification" 
    }, { status: 500 });
  }
}

// PATCH /api/notifications/[id] - 标记单个通知为已读
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const notification = await prisma.notifications.updateMany({
      where: {
        id: notificationId,
        user_id: sessionUser.id
      },
      data: {
        is_read: true,
        updated_at: new Date()
      }
    });

    if (notification.count === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read"
    });

  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ 
      error: "Failed to mark notification as read" 
    }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - 删除通知
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const notification = await prisma.notifications.deleteMany({
      where: {
        id: notificationId,
        user_id: sessionUser.id
      }
    });

    if (notification.count === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted"
    });

  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json({ 
      error: "Failed to delete notification" 
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




