import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// POST /api/notifications/system - 创建系统消息通知
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      message, 
      target_user_id, // 可选：指定特定用户，不指定则发送给所有用户
      image_url 
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // 如果指定了目标用户，只发送给该用户
    if (target_user_id) {
      const notification = await prisma.notifications.create({
        data: {
          user_id: target_user_id,
          type: 'SYSTEM',
          title,
          message,
          image_url: image_url || null,
        },
      });

      return NextResponse.json({
        success: true,
        notification,
      });
    } else {
      // 发送给所有用户
      const users = await prisma.users.findMany({
        select: { id: true },
      });

      const notifications = await Promise.all(
        users.map(user =>
          prisma.notifications.create({
            data: {
              user_id: user.id,
              type: 'SYSTEM',
              title,
              message,
              image_url: image_url || null,
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        notifications,
        count: notifications.length,
      });
    }

  } catch (error) {
    console.error("Error creating system notification:", error);
    return NextResponse.json(
      { error: "Failed to create system notification" },
      { status: 500 }
    );
  }
}

// GET /api/notifications/system - 获取系统消息模板
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 返回一些常用的系统消息模板
    const templates = [
      {
        id: "welcome",
        title: "Welcome to TOP Care Fashion!",
        message: "Thank you for joining our community. Start exploring amazing fashion items!",
        image_url: null,
      },
      {
        id: "maintenance",
        title: "Scheduled Maintenance",
        message: "We will be performing scheduled maintenance on our platform. Some features may be temporarily unavailable.",
        image_url: null,
      },
      {
        id: "new_feature",
        title: "New Feature Available!",
        message: "Check out our latest feature that makes shopping even more convenient!",
        image_url: null,
      },
      {
        id: "security_alert",
        title: "Security Alert",
        message: "Please update your password to keep your account secure.",
        image_url: null,
      },
      {
        id: "promotion",
        title: "Special Promotion!",
        message: "Don't miss out on our limited-time promotion. Shop now and save!",
        image_url: null,
      },
    ];

    return NextResponse.json({
      success: true,
      templates,
    });

  } catch (error) {
    console.error("Error fetching system notification templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}



