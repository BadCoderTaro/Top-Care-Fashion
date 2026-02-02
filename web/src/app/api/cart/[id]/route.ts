import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// PUT /api/cart/[id] - Update cart item quantity
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const cartItemId = parseInt(id);
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Valid quantity is required' },
        { status: 400 }
      );
    }

    // 检查购物车项目是否存在且属于当前用户
    const existingCartItem = await prisma.cart_items.findFirst({
      where: {
        id: cartItemId,
        user_id: user.id,
      },
    });

    if (!existingCartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    // 更新数量
    const updatedCartItem = await prisma.cart_items.update({
      where: { id: cartItemId },
      data: { quantity: quantity },
      include: {
        listing: {
          include: {
            seller: {
              select: {
                id: true,
                username: true,
                avatar_url: true,
                average_rating: true,
                total_reviews: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedCartItem);

  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/[id] - Remove cart item
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const cartItemId = parseInt(id);

    // 检查购物车项目是否存在且属于当前用户
    const existingCartItem = await prisma.cart_items.findFirst({
      where: {
        id: cartItemId,
        user_id: user.id,
      },
    });

    if (!existingCartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    // 删除购物车项目
    await prisma.cart_items.delete({
      where: { id: cartItemId },
    });

    return NextResponse.json({ message: 'Cart item removed successfully' });

  } catch (error) {
    console.error('Error removing cart item:', error);
    return NextResponse.json(
      { error: 'Failed to remove cart item' },
      { status: 500 }
    );
  }
}
