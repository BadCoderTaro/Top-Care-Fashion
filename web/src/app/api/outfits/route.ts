import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Auth header:', req.headers.get('authorization'));

    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('🔍 Raw body received:', body);

    const {
      outfit_name,
      base_item_id,
      top_item_id,
      bottom_item_id,
      shoe_item_id,
      accessory_ids = [],
      
      // ⭐ NEW: AI analysis fields
      ai_rating,
      style_name,
      color_harmony_score,
      color_harmony_feedback,
      style_tips,
      vibe,
    } = body;

    // ✨ BANDAID FIX: Better ID conversion with validation
    const parseItemId = (id: any): number | null => {
      if (!id) return null;
      
      // If it's already a number, return it
      if (typeof id === 'number') return id;
      
      // If it's a string, try to parse it
      if (typeof id === 'string') {
        // Skip placeholder/invalid strings
        if (id.startsWith('listing-') || isNaN(Number(id))) {
          console.log(`⚠️ Skipping invalid ID: ${id}`);
          return null;
        }
        
        const parsed = parseInt(id, 10);
        return isNaN(parsed) ? null : parsed;
      }
      
      return null;
    };

    const baseId = parseItemId(base_item_id);
    const topId = parseItemId(top_item_id);
    const bottomId = parseItemId(bottom_item_id);
    const shoeId = parseItemId(shoe_item_id);

    console.log('🔍 Converted IDs:', { baseId, topId, bottomId, shoeId });

    // ✨ BANDAID FIX: Process accessory IDs safely
    const processedAccessoryIds = Array.isArray(accessory_ids)
      ? accessory_ids
          .map(parseItemId)
          .filter((id): id is number => id !== null)
      : [];

    console.log('🔍 Processed accessory IDs:', processedAccessoryIds);

    // ✨ BANDAID FIX: Validate that we have at least ONE valid item
    if (!baseId && !topId && !bottomId && !shoeId && processedAccessoryIds.length === 0) {
      return NextResponse.json(
        { message: 'At least one valid item ID is required' },
        { status: 400 }
      );
    }

    // ✨ BANDAID FIX: Validate outfit_name
    if (!outfit_name || typeof outfit_name !== 'string' || outfit_name.trim() === '') {
      return NextResponse.json(
        { message: 'Outfit name is required' },
        { status: 400 }
      );
    }

    console.log('📦 Creating outfit with:', {
      user_id: sessionUser.id,
      outfit_name: outfit_name.trim(),
      base_item_id: baseId,
      top_item_id: topId,
      bottom_item_id: bottomId,
      shoe_item_id: shoeId,
      accessory_ids: processedAccessoryIds,
    });

    // ✨ BANDAID FIX: Use explicit NULL values and proper types
    const outfit = await prisma.saved_outfits.create({
      data: {
        user_id: sessionUser.id,
        outfit_name: outfit_name.trim(),
        base_item_id: baseId ?? null,
        top_item_id: topId ?? null,
        bottom_item_id: bottomId ?? null,
        shoe_item_id: shoeId ?? null,
        accessory_ids: processedAccessoryIds.length > 0 ? processedAccessoryIds : [],
        
        // ⭐ NEW: Save complete AI analysis data
        ai_rating: ai_rating ?? null,
        style_name: style_name ?? null,
        color_harmony_score: color_harmony_score ?? null,
        color_harmony_feedback: color_harmony_feedback ?? null,
        style_tips: style_tips ?? null,
        vibe: vibe ?? null,
      },
    });

    console.log('✅ Outfit created successfully:', outfit.id);
    return NextResponse.json(
      { 
        message: 'Outfit saved successfully',
        data: outfit 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Error creating outfit:', error);
    
    // ✨ BANDAID FIX: Better error messages
    if (error instanceof Error) {
      // Check for specific Prisma errors
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { message: 'One or more items do not exist in the database' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('insufficient data')) {
        return NextResponse.json(
          { message: 'Database connection issue. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        message: 'Failed to create outfit',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ✨ BANDAID FIX: Add GET endpoint to retrieve saved outfits
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const outfits = await prisma.saved_outfits.findMany({
      where: {
        user_id: sessionUser.id,
      },
      orderBy: {
        created_at: 'desc',
      },
      // Don't include relations - just get the basic data
      select: {
        id: true,
        outfit_name: true,
        base_item_id: true,
        top_item_id: true,
        bottom_item_id: true,
        shoe_item_id: true,
        accessory_ids: true,
        created_at: true,
        updated_at: true,
        
        // ⭐ NEW: Include complete AI analysis fields
        ai_rating: true,
        style_name: true,
        color_harmony_score: true,
        color_harmony_feedback: true,
        style_tips: true,
        vibe: true,
      },
    });

    return NextResponse.json({ data: outfits }, { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching outfits:', error);
    return NextResponse.json(
      { message: 'Failed to fetch outfits' },
      { status: 500 }
    );
  }
}