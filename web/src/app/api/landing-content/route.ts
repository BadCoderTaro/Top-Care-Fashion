import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export async function GET() {
  try {
    const connection = await getConnection();
    
    const [content] = await connection.execute(
      `SELECT hero_title, hero_subtitle,
        hero_carousel_images,
        feature_cards,
        mixmatch_title, mixmatch_desc, mixmatch_images,
        ailisting_title, ailisting_desc, ailisting_images,
        search_title, search_desc, search_images
       FROM landing_content WHERE id = 1`
    );
    
    await connection.end();
    
    if (!content || (content as any[]).length === 0) {
      return NextResponse.json({
        heroTitle: 'Discover outfits powered by AI',
        heroSubtitle: 'Mix & Match is an AI outfit recommender that builds looks from listed items. Snap, list, and get smart suggestions instantly.',
        heroCarouselImages: [],
        aiFeatures: {
          mixmatch: {
            title: 'Mix & Match',
            desc: 'AI outfit recommendations from your listed items.',
            images: [],
          },
          ailisting: {
            title: 'AI Listing',
            desc: 'Auto-generate titles, tags and descriptions from photos.',
            images: []
          },
          search: {
            title: 'Search',
            desc: 'Natural language and image-based search to find pieces fast.',
            images: []
          }
        }
      });
    }
    
    const landingContent = (content as any[])[0] as any;
    const parseMaybeJsonArray = (v: unknown): string[] | null => {
      if (!v) return null;
      if (Array.isArray(v)) return v as string[];
      if (typeof v === 'string') {
        try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; }
      }
      return null;
    };

    const parseFeatureCards = (val: unknown) => {
      if (!val) return null;
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) return null;
        return parsed
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const title = "title" in item && typeof (item as any).title === "string" ? (item as any).title : undefined;
            const desc = "desc" in item && typeof (item as any).desc === "string" ? (item as any).desc : undefined;
            const imagesRaw = (item as any).images;
            const images = Array.isArray(imagesRaw) ? imagesRaw.filter((img) => typeof img === "string") : [];
            if (!title && !desc && images.length === 0) return null;
            return { title, desc, images };
          })
          .filter(Boolean);
      } catch {
        return null;
      }
    };

    const fallbackCards = [
      {
        title: landingContent.mixmatch_title ?? 'Mix & Match',
        desc: landingContent.mixmatch_desc ?? 'AI outfit recommendations from your listed items.',
        images: parseMaybeJsonArray((landingContent as any).mixmatch_images) ?? [],
      },
      {
        title: landingContent.ailisting_title ?? 'AI Listing',
        desc: landingContent.ailisting_desc ?? 'Auto-generate titles, tags and descriptions from photos.',
        images: parseMaybeJsonArray(landingContent.ailisting_images) ?? [],
      },
      {
        title: landingContent.search_title ?? 'Search',
        desc: landingContent.search_desc ?? 'Natural language and image-based search to find pieces fast.',
        images: parseMaybeJsonArray(landingContent.search_images) ?? [],
      },
    ];

    const parsedCards = parseFeatureCards((landingContent as any).feature_cards);
    const featureCards =
      parsedCards && parsedCards.length > 0
        ? parsedCards
        : fallbackCards;

    return NextResponse.json({
      heroTitle: landingContent.hero_title,
      heroSubtitle: landingContent.hero_subtitle,
      heroCarouselImages: parseMaybeJsonArray(landingContent.hero_carousel_images),
      featureCards,
      aiFeatures: {
        mixmatch: fallbackCards[0],
        ailisting: fallbackCards[1],
        search: fallbackCards[2],
      },
    });
  } catch (error) {
    console.error("Error fetching landing content:", error);
    return NextResponse.json(
      { error: "Failed to fetch landing content" },
      { status: 500 }
    );
  }
}
