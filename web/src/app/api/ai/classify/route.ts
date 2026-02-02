// web/src/app/api/ai/classify/route.ts
import { NextResponse, NextRequest } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";         // Vision requires Node on Vercel
export const dynamic = "force-dynamic";

// ---------- Google Vision client ----------
const privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
const fixedKey = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;

const vision = new ImageAnnotatorClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || "topcarefashion-ai",
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: fixedKey,
  },
});

// ---------- Dynamic Category Loading from Database ----------
type CategoryConfig = {
  name: string;
  keywords: string[];
  weightBoost: number;
};

let categoryCache: {
  categories: Record<string, CategoryConfig>;
  expiry: number;
} = { categories: {}, expiry: 0 };

async function getActiveCategories(): Promise<Record<string, CategoryConfig>> {
  // Return cached if still valid (5 minute cache)
  if (Object.keys(categoryCache.categories).length > 0 && Date.now() < categoryCache.expiry) {
    return categoryCache.categories;
  }

  try {
    const categories = await prisma.listing_categories.findMany({
      where: { is_active: true },
      select: {
        name: true,
        ai_keywords: true,
        ai_weight_boost: true,
      },
    });

    const config: Record<string, CategoryConfig> = {};

    for (const cat of categories) {
      const keywords = parseKeywords(cat.ai_keywords);

      config[cat.name] = {
        name: cat.name,
        keywords,
        weightBoost: cat.ai_weight_boost ?? 1.0,
      };
    }

    // Cache for 5 minutes
    categoryCache = {
      categories: config,
      expiry: Date.now() + 5 * 60 * 1000,
    };

    if (DEBUG) {
      console.log("[classify] Loaded categories from DB:", Object.keys(config));
    }

    return config;
  } catch (error) {
    console.error("[classify] Failed to load categories from database:", error);
    // Return empty config on error - will result in "Unknown" classification
    return {};
  }
}

function parseKeywords(value: Prisma.JsonValue | null): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

const GENERIC = new Set([
  "clothing","clothes","fashion","apparel","garment","textile","retail",
  "style","haute couture","model","photo shoot","pattern","design","fabric"
]);

const DEBUG = process.env.DEBUG_CLS === "1";

const sanitize = (s = "") =>
  s.toLowerCase()
    .replace(/#[a-z0-9_-]+/g, "")
    .replace(/\b[a-z0-9]{2,}-\d{2,}\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

function kwHits(text: string, keyword: string) {
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hyphenFlex = esc.replace(/\s|-/g, "[\\s-]");
  // Use unicode-safe boundaries around the pattern
  const re = new RegExp(`(?:^|\\b)${hyphenFlex}(?:\\b|$)`, "iu");
  return re.test(text);
}

function scoreCategoriesWeighted(
  labelAnnotations: { description?: string | null; score?: number | null }[],
  categoryConfigs: Record<string, CategoryConfig>
) {
  const scores: Record<string, number> =
    Object.fromEntries(Object.keys(categoryConfigs).map((k) => [k, 0]));

  for (const { description, score } of labelAnnotations) {
    const dRaw = description || "";
    const d = dRaw.toLowerCase();
    if (!d || GENERIC.has(d)) continue;

    for (const [cat, config] of Object.entries(categoryConfigs)) {
      if (!config.keywords.some((k) => kwHits(d, k))) continue;

      let w = score ?? 0;
      if (["clothing", "apparel", "fashion", "style"].includes(d)) continue;

      // Apply weight boost from database
      w *= config.weightBoost;

      // Additional fine-grained boosts for high-confidence labels
      if ((score ?? 0) > 0.85) w *= 1.2;

      // Specific keyword boosts (keeping some logic for better accuracy)
      if (cat === "Tops" && /sleeve|neck|collar/.test(d)) w *= 1.3;
      if (cat === "Bottoms" && d === "waist") w *= 1.15;

      scores[cat] += w;
    }
  }

  if (DEBUG) {
    console.log("[classify] labels:", labelAnnotations.map(l => `${l.description}:${(l.score || 0).toFixed(2)}`));
    console.log("[classify] scores:", scores);
  }

  const arr = Object.entries(scores);
  arr.sort((a, b) => b[1] - a[1]);
  const [bestCat, bestScore] = arr[0] ?? ["Unknown", 0];
  const secondScore = arr[1]?.[1] ?? 0;

  if (bestScore <= 0) {
    return { category: "Unknown", confidence: 0, scores };
  }

  let confidence = bestScore / (bestScore + secondScore || bestScore);
  confidence = Math.max(0.4, Math.min(0.99, confidence));
  if ((bestScore - secondScore) > 0.6) confidence = Math.max(confidence, 0.85);

  return { category: bestCat, confidence: Number(confidence.toFixed(2)), scores };
}

async function classifyImage(imageBuffer: Buffer) {
  const [result] = await vision.labelDetection({ image: { content: imageBuffer } });
  const anns = result?.labelAnnotations ?? [];

  const topK = (anns || [])
    .map(a => ({ label: sanitize(a.description || ""), score: a.score ?? 0 }))
    .filter(x => x.label)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const labels = uniq(topK.map(x => x.label));

  // Load active categories from database
  const categoryConfigs = await getActiveCategories();
  const { category, confidence } = scoreCategoriesWeighted(anns, categoryConfigs);

  return {
    category,
    confidence,
    topK,
    labels,
    raw: { count: anns.length },
  };
}

// ---------- Route handlers ----------
export async function GET() {
  return NextResponse.json({
    ok: true,
    accepts: ["POST multipart/form-data"],
    route: "/api/ai/classify",
  });
}

export async function OPTIONS() {
  // Simple CORS preflight (useful for web clients)
  const res = NextResponse.json({ ok: true });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With");
  return res;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    if (DEBUG) console.log("[classify] method=POST content-type=", req.headers.get("content-type"));

    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file field 'image'" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    const { category, confidence, topK, labels, raw } = await classifyImage(bytes);

    const res = NextResponse.json({
      category,
      confidence,
      labels,
      topK,
      meta: {
        source: "vision",
        labelCount: raw.count,
        latency_ms: Date.now() - t0,
      },
    });

    // Open CORS for web/demo clients
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (err: any) {
    if (DEBUG) console.error("[classify] error:", err);
    const res = NextResponse.json(
      {
        error: err?.message ?? "Unknown error",
        meta: { source: "vision", latency_ms: Date.now() - t0 },
      },
      { status: 500 }
    );
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }
}
