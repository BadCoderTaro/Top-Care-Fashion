import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// DELETE /api/outfits/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const outfitId = parseInt(id);

    if (!outfitId || isNaN(outfitId)) {
      return NextResponse.json(
        { message: 'Invalid outfit ID' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting outfit:', outfitId, 'for user:', sessionUser.id);

    // Check if outfit exists and belongs to user
    const outfit = await prisma.saved_outfits.findFirst({
      where: {
        id: outfitId,
        user_id: sessionUser.id,
      },
    });

    if (!outfit) {
      return NextResponse.json(
        { message: 'Outfit not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the outfit
    await prisma.saved_outfits.delete({
      where: {
        id: outfitId,
      },
    });

    console.log('✅ Outfit deleted successfully:', outfitId);
    return NextResponse.json(
      { message: 'Outfit deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error deleting outfit:', error);
    return NextResponse.json(
      { message: 'Failed to delete outfit' },
      { status: 500 }
    );
  }
}
