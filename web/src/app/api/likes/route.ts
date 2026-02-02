import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/likes - Get user's liked listings
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Getting liked listings for user:', user.id);

    const likedListings = await prisma.user_likes.findMany({
      where: {
        user_id: user.id,
        // 🔥 只显示未售出且已上架的商品
        listing: {
          sold: false,
          listed: true,
        },
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
                is_premium: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log('Found liked listings:', likedListings.length);

    return NextResponse.json({
      success: true,
      data: likedListings.map((like) => {
        const listing = like.listing
          ? {
              ...like.listing,
              seller: like.listing.seller
                ? {
                    ...like.listing.seller,
                    isPremium: Boolean(like.listing.seller.is_premium),
                  }
                : null,
            }
          : null;

        return {
          id: like.id,
          listing,
          created_at: like.created_at,
        };
      }),
    });
  } catch (error) {
    console.error('Error getting liked listings:', error);
    return NextResponse.json(
      { error: 'Failed to get liked listings' },
      { status: 500 }
    );
  }
}

// POST /api/likes - Like/unlike a listing
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_id, action } = await request.json();

    if (!listing_id || !action) {
      return NextResponse.json(
        { error: 'Missing listing_id or action' },
        { status: 400 }
      );
    }

    console.log('Like action:', action, 'for listing:', listing_id, 'by user:', user.id);

    if (action === 'like') {
      // Check if already liked
      const existingLike = await prisma.user_likes.findUnique({
        where: {
          user_id_listing_id: {
            user_id: user.id,
            listing_id: parseInt(listing_id),
          },
        },
      });

      if (existingLike) {
        return NextResponse.json({
          success: true,
          data: { liked: true, message: 'Already liked' },
        });
      }

      // Create new like
      await prisma.user_likes.create({
        data: {
          user_id: user.id,
          listing_id: parseInt(listing_id),
        },
      });

      // 🔥 实时更新likes_count
      await prisma.listings.update({
        where: { id: parseInt(listing_id) },
        data: {
          likes_count: {
            increment: 1,
          },
        },
      });

      // 🔔 创建like notification
      try {
        // 获取商品信息
        const listing = await prisma.listings.findUnique({
          where: { id: parseInt(listing_id) },
          include: {
            seller: {
              select: {
                id: true,
                username: true,
                avatar_url: true,
              },
            },
          },
        });

        if (listing && listing.seller && listing.seller.id !== user.id) {
          // 只有不是自己like自己的商品才创建notification
          await prisma.notifications.create({
            data: {
              user_id: listing.seller.id, // 商品卖家收到通知
              type: 'LIKE',
              title: `@${user.username} liked your listing`,
              message: listing.name,
              image_url: user.avatar_url,
              listing_id: parseInt(listing_id),
              related_user_id: user.id,
            },
          });
          console.log(`🔔 Like notification created for seller ${listing.seller.username}`);
        }
      } catch (notificationError) {
        console.error("❌ Error creating like notification:", notificationError);
        // 不阻止like操作，即使notification创建失败
      }

      console.log('Successfully liked listing:', listing_id);
    } else if (action === 'unlike') {
      // Remove like
      await prisma.user_likes.deleteMany({
        where: {
          user_id: user.id,
          listing_id: parseInt(listing_id),
        },
      });

      // 🔥 实时更新likes_count
      await prisma.listings.update({
        where: { id: parseInt(listing_id) },
        data: {
          likes_count: {
            decrement: 1,
          },
        },
      });

      console.log('Successfully unliked listing:', listing_id);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "like" or "unlike"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { liked: action === 'like' },
    });
  } catch (error) {
    console.error('Error handling like action:', error);
    return NextResponse.json(
      { error: 'Failed to handle like action' },
      { status: 500 }
    );
  }
}

