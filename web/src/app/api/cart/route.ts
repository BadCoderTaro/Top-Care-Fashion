import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/cart - Get user's cart items
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Getting cart items for user:', user.id);

    const cartItems = await prisma.cart_items.findMany({
      where: {
        user_id: user.id,
      },
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
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // 转换数据格式以匹配前端期望
    const formattedItems = cartItems.reduce<any[]>((acc, cartItem) => {
      const listing = cartItem.listing;
      if (!listing) return acc;

      // 处理图片数据
      let images: string[] = [];
      if ((listing as any).image_url) {
        images = [(listing as any).image_url as string];
      } else if ((listing as any).image_urls) {
        try {
          const imageUrls = typeof (listing as any).image_urls === 'string'
            ? JSON.parse((listing as any).image_urls)
            : (listing as any).image_urls;
          images = Array.isArray(imageUrls) ? imageUrls : [];
        } catch (e) {
          console.log('Error parsing image_urls:', e);
          images = [];
        }
      }

      // 处理tags数据
      let tags: string[] = [];
      if ((listing as any).tags) {
        try {
          const parsed = typeof (listing as any).tags === 'string'
            ? JSON.parse((listing as any).tags)
            : (listing as any).tags;
          tags = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.log('Error parsing tags:', e);
          tags = [];
        }
      }

      acc.push({
        id: cartItem.id,
        quantity: cartItem.quantity,
        created_at: cartItem.created_at,
        updated_at: cartItem.updated_at,
        item: {
          id: (listing as any).id.toString(),
          title: (listing as any).name,
          price: Number((listing as any).price),
          description: (listing as any).description,
          brand: (listing as any).brand,
          size: (listing as any).size,
          condition: (listing as any).condition_type,
          material: (listing as any).material,
          gender: (listing as any).gender || 'unisex',
          tags,
          category: (listing as any).category?.name || null,
          images,
          // shipping fields (may be null)
          shippingOption: (listing as any).shipping_option || null,
          shippingFee: (listing as any).shipping_fee ? Number((listing as any).shipping_fee) : null,
          location: (listing as any).location || null,
          // 🔥 库存数量
          availableQuantity: Number((listing as any).inventory_count ?? 0),
          seller: {
            id: (listing as any).seller.id,
            name: (listing as any).seller.username,
            avatar: (listing as any).seller.avatar_url || '',
            rating: Number((listing as any).seller.average_rating || 0),
            sales: Number((listing as any).seller.total_reviews || 0),
          },
        },
      });
      return acc;
    }, []);

    return NextResponse.json({ items: formattedItems });

  } catch (error) {
    console.error('Error getting cart items:', error);
    return NextResponse.json(
      { error: 'Failed to get cart items' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, quantity = 1 } = body;

    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      );
    }

    // 检查商品是否存在且可购买
    const listing = await prisma.listings.findUnique({
      where: { id: parseInt(listingId) },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot add your own listing to cart' },
        { status: 400 }
      );
    }

    if (listing.sold) {
      return NextResponse.json(
        { error: 'Listing is already sold' },
        { status: 400 }
      );
    }

    if (!listing.listed) {
      return NextResponse.json(
        { error: 'Listing is not available' },
        { status: 400 }
      );
    }

    // 检查是否已经在购物车中
    const existingCartItem = await prisma.cart_items.findUnique({
      where: {
        user_id_listing_id: {
          user_id: user.id,
          listing_id: parseInt(listingId),
        },
      },
    });

    if (existingCartItem) {
      // 更新数量
      const updatedCartItem = await prisma.cart_items.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + quantity },
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

      return NextResponse.json(updatedCartItem, { status: 200 });
    } else {
      // 创建新的购物车项目
      const newCartItem = await prisma.cart_items.create({
        data: {
          user_id: user.id,
          listing_id: parseInt(listingId),
          quantity: quantity,
        },
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

      return NextResponse.json(newCartItem, { status: 201 });
    }

  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Clear entire cart
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.cart_items.deleteMany({
      where: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ message: 'Cart cleared successfully' });

  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { error: 'Failed to clear cart' },
      { status: 500 }
    );
  }
}
