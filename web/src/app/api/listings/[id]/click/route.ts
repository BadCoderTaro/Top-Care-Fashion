import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/listings/[id]/click
 * 记录listing点击到listing_clicks表
 * 注意：clicks_count由数据库触发器trg_listing_clicks_inc自动更新，无需手动处理
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const listingId = Number.parseInt(params.id, 10);

    if (isNaN(listingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    // 检查listing是否存在
    const listing = await prisma.listings.findUnique({
      where: { id: listingId },
      select: {
        id: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // 获取用户（可选，未登录用户也可以点击）
    const user = await getSessionUser(req);
    const userId = user?.id ?? null;

    const now = new Date();
    // 缩短时间窗口到1秒，更严格防止重复
    const bucket = BigInt(Math.floor(now.getTime() / 1_000)); // 1秒时间桶
    const oneSecondAgo = new Date(now.getTime() - 1000); // 1秒前

    console.log(
      `[Click] Attempting to record click: listing=${listingId}, user=${userId}, bucket=${bucket}, time=${now.toISOString()}`
    );

    // 先检查最近1秒内是否已有记录（额外保护）
    const recentClick = await prisma.listing_clicks.findFirst({
      where: {
        listing_id: listingId,
        user_id: userId,
        clicked_at: {
          gte: oneSecondAgo,
        },
      },
      orderBy: {
        clicked_at: "desc",
      },
    });

    if (recentClick) {
      console.log(
        `[Click] ⚠️ Recent click found within 1 second: id=${recentClick.id}, time=${recentClick.clicked_at.toISOString()}, skipping`
      );
      return NextResponse.json({
        success: true,
        message: "Click already recorded",
      });
    }

    // 使用upsert + 唯一约束来防止重复
    // 如果记录已存在（唯一约束冲突），则不增加计数
    try {
      await prisma.$transaction(async (tx) => {
        // 尝试创建记录，如果已存在则忽略（唯一约束会阻止）
        try {
          const created = await tx.listing_clicks.create({
            data: {
              listing_id: listingId,
              user_id: userId,
              clicked_at: now,
              bucket_10s: bucket,
            },
          });

          console.log(`[Click] Successfully created click record: id=${created.id}`);
          // 数据库触发器 trg_listing_clicks_inc 会自动增加 clicks_count
        } catch (createError) {
          if (
            createError instanceof Prisma.PrismaClientKnownRequestError &&
            createError.code === "P2002"
          ) {
            // 唯一约束冲突，说明已经在当前时间桶内记录过，不增加计数
            console.log(
              `[Click] ⚠️ Duplicate click detected (inner catch): listing=${listingId}, user=${userId}, bucket=${bucket}, error=${JSON.stringify(createError.meta)}`
            );
            return; // 直接返回，不增加计数
          }
          console.error(`[Click] ❌ Create error (not P2002):`, createError);
          throw createError; // 其他错误继续抛出
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // 外层捕获唯一约束冲突（双重保护）
        console.log(
          `[Click] ⚠️ Duplicate click detected (outer catch): listing=${listingId}, user=${userId}, bucket=${bucket}, error=${JSON.stringify(error.meta)}`
        );
        return NextResponse.json({
          success: true,
          message: "Click already recorded",
        });
      }
      console.error(`[Click] ❌ Unexpected error:`, error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Click recorded",
    });
  } catch (error) {
    console.error("Error recording click:", error);
    return NextResponse.json(
      { error: "Failed to record click" },
      { status: 500 }
    );
  }
}

