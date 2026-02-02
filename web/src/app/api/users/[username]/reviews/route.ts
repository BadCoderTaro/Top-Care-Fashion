import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/users/[username]/reviews - Get reviews for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const username = resolvedParams.username;

    // 查找用户
    const user = await prisma.users.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatar_url: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 获取该用户收到的所有 reviews
    const reviews = await prisma.reviews.findMany({
      where: {
        reviewee_id: user.id, // 被评论的用户
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
        order: {
          select: {
            id: true,
            listing: {
              select: {
                name: true,
                image_url: true,
                image_urls: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // 转换数据格式
    const formattedReviews = reviews.map((review) => {
      // 解析 images 字段
      let images: string[] = [];
      if (review.images) {
        try {
          const parsed = typeof review.images === 'string' 
            ? JSON.parse(review.images) 
            : review.images;
          images = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error('Error parsing review images:', e);
          images = [];
        }
      }

      // 格式化时间
      const createdDate = new Date(review.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let timeAgo: string;
      if (diffDays === 0) {
        timeAgo = 'Today';
      } else if (diffDays === 1) {
        timeAgo = 'Yesterday';
      } else if (diffDays < 7) {
        timeAgo = `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else {
        timeAgo = createdDate.toLocaleDateString();
      }

      return {
        id: review.id,
        reviewer: {
          id: review.reviewer.id,
          name: review.reviewer.username,
          avatar: review.reviewer.avatar_url || undefined,
        },
        rating: review.rating,
        comment: review.comment || '',
        time: timeAgo,
        date: createdDate.toISOString(),
        type: review.reviewer_type.toLowerCase(), // 'buyer' or 'seller'
        images: images,
        hasPhoto: images.length > 0,
        product: review.order?.listing ? {
          name: review.order.listing.name,
          image: (() => {
            // 优先使用 image_url
            if (review.order.listing.image_url) {
              return review.order.listing.image_url;
            }
            // 尝试解析 image_urls
            if (review.order.listing.image_urls) {
              try {
                // 可能是 JSON 字符串
                if (typeof review.order.listing.image_urls === 'string') {
                  const parsed = JSON.parse(review.order.listing.image_urls);
                  return Array.isArray(parsed) ? parsed[0] : undefined;
                }
                // 可能已经是数组
                if (Array.isArray(review.order.listing.image_urls)) {
                  return review.order.listing.image_urls[0];
                }
              } catch (e) {
                // 如果 JSON.parse 失败，可能本身就是 URL 字符串
                return review.order.listing.image_urls as string;
              }
            }
            return undefined;
          })(),
        } : undefined,
      };
    });

    return NextResponse.json({
      reviews: formattedReviews,
      totalCount: formattedReviews.length,
    });

  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}











