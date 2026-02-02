import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/likes/[listingId] - Check if user has liked a specific listing
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ listingId: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listingId } = await context.params;

    console.log('Checking like status for listing:', listingId, 'by user:', user.id);

    const like = await prisma.user_likes.findUnique({
      where: {
        user_id_listing_id: {
          user_id: user.id,
          listing_id: parseInt(listingId),
        },
      },
    });

    const isLiked = !!like;

    console.log('Like status:', isLiked);

    return NextResponse.json({
      success: true,
      data: { liked: isLiked },
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    return NextResponse.json(
      { error: 'Failed to check like status' },
      { status: 500 }
    );
  }
}

