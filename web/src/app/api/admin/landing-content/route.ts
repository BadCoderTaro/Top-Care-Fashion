import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { heroTitle, heroSubtitle, heroCarouselImages, aiFeatures, featureCards } = body as any;
    // Normalize mixmatch images: prefer aiFeatures.mixmatch.images, else merge legacy girl/boy
    const mixmatchImages: string[] | null =
      (aiFeatures?.mixmatch?.images && Array.isArray(aiFeatures.mixmatch.images) && aiFeatures.mixmatch.images.length > 0)
        ? aiFeatures.mixmatch.images
        : (
            ((aiFeatures?.mixmatch?.girlImages || []) as string[]).concat((aiFeatures?.mixmatch?.boyImages || []) as string[])
          ).length > 0
          ? ((aiFeatures?.mixmatch?.girlImages || []) as string[]).concat((aiFeatures?.mixmatch?.boyImages || []) as string[])
          : null;

    const sanitizeFeatureCards = (val: unknown): Array<{ title?: string; desc?: string; images: string[] }> | null => {
      if (!val || !Array.isArray(val)) return null;
      const normalized = val
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const title = typeof (item as any).title === "string" ? (item as any).title.trim() : undefined;
          const desc = typeof (item as any).desc === "string" ? (item as any).desc.trim() : undefined;
          const imagesRaw = (item as any).images;
          const images = Array.isArray(imagesRaw) ? imagesRaw.filter((img) => typeof img === "string" && img.trim().length > 0) : [];
          if (!title && !desc && images.length === 0) return null;
          return { title, desc, images };
        })
        .filter(Boolean) as Array<{ title?: string; desc?: string; images: string[] }>;
      return normalized.length > 0 ? normalized : null;
    };

    const legacyFeatureCards = sanitizeFeatureCards([
      aiFeatures?.mixmatch,
      aiFeatures?.ailisting,
      aiFeatures?.search,
    ]);

    const normalizedFeatureCards = sanitizeFeatureCards(featureCards) ?? legacyFeatureCards;

    const connection = await getConnection();

    // Use UPSERT so that first save creates the row if not existing
    await connection.execute(
      `INSERT INTO landing_content (
         id,
         hero_title, hero_subtitle, hero_carousel_images,
         mixmatch_title, mixmatch_desc, mixmatch_images,
         ailisting_title, ailisting_desc, ailisting_images,
         search_title, search_desc, search_images,
         feature_cards,
         updated_at
       ) VALUES (
         1,
         ?, ?, CAST(? AS JSONB),
         ?, ?, CAST(? AS JSONB),
         ?, ?, CAST(? AS JSONB),
         ?, ?, CAST(? AS JSONB),
         CAST(? AS JSONB),
         NOW()
       )
       ON CONFLICT (id) DO UPDATE SET
         hero_title = EXCLUDED.hero_title,
         hero_subtitle = EXCLUDED.hero_subtitle,
         hero_carousel_images = EXCLUDED.hero_carousel_images,
         mixmatch_title = EXCLUDED.mixmatch_title,
         mixmatch_desc = EXCLUDED.mixmatch_desc,
         mixmatch_images = EXCLUDED.mixmatch_images,
         ailisting_title = EXCLUDED.ailisting_title,
         ailisting_desc = EXCLUDED.ailisting_desc,
         ailisting_images = EXCLUDED.ailisting_images,
         search_title = EXCLUDED.search_title,
         search_desc = EXCLUDED.search_desc,
         search_images = EXCLUDED.search_images,
         feature_cards = EXCLUDED.feature_cards,
         updated_at = NOW()`,
      [
        heroTitle ?? null,
        heroSubtitle ?? null,
        heroCarouselImages ? JSON.stringify(heroCarouselImages) : null,
        aiFeatures?.mixmatch?.title ?? null,
        aiFeatures?.mixmatch?.desc ?? null,
        mixmatchImages ? JSON.stringify(mixmatchImages) : null,
        aiFeatures?.ailisting?.title ?? null,
        aiFeatures?.ailisting?.desc ?? null,
        aiFeatures?.ailisting?.images ? JSON.stringify(aiFeatures.ailisting.images) : null,
        aiFeatures?.search?.title ?? null,
        aiFeatures?.search?.desc ?? null,
        aiFeatures?.search?.images ? JSON.stringify(aiFeatures.search.images) : null,
        normalizedFeatureCards ? JSON.stringify(normalizedFeatureCards) : null,
      ]
    );

    await connection.end();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating landing content:", error);
    return NextResponse.json(
      { error: "Failed to update landing content" },
      { status: 500 }
    );
  }
}
