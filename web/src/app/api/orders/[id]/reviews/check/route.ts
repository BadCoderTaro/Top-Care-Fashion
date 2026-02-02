import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/orders/[id]/reviews/check - Check review status for an order
// This endpoint checks whether reviews exist for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUser(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // 获取订单信息
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        reviews: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 🔥 检查用户是否有权限访问该订单
    if (order.buyer_id !== currentUser.id && order.seller_id !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to access this order' },
        { status: 403 }
      );
    }

    // 检查当前用户是否已经评论过
    const userReview = order.reviews.find(
      (review) => review.reviewer_id === currentUser.id
    );

    // 检查对方是否已经评论过
    const otherUserId = order.buyer_id === currentUser.id 
      ? order.seller_id 
      : order.buyer_id;
    const otherReview = order.reviews.find(
      (review) => review.reviewer_id === otherUserId
    );

    // 判断用户角色
    const isBuyer = order.buyer_id === currentUser.id;

    // 返回评论状态
    return NextResponse.json({
      orderId: orderId,
      userRole: isBuyer ? 'buyer' : 'seller',
      hasUserReviewed: !!userReview,
      hasOtherReviewed: !!otherReview,
      reviewsCount: order.reviews.length,
      userReview: userReview || null,
      otherReview: otherReview || null,
    });

  } catch (error) {
    console.error('Error checking review status:', error);
    return NextResponse.json(
      { error: 'Failed to check review status' },
      { status: 500 }
    );
  }
}

