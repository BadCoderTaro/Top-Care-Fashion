// web/src/app/api/feed/home/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies as nextCookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || ""; // server-only

type FeedRow = {
  id: number;
  title: string | null;
  image_url: string | null;
  image_urls: unknown; // JSON array or null
  price_cents: number | null;
  brand: string | null;
  tags: string[] | null;
  source: "trending" | "brand" | "tag" | "brand&tag" | "affinity" | "collab";
  fair_score: number | null;
  final_score: number | null;
  is_boosted?: boolean;
  boost_weight?: number;
};

// ---------------- In-memory cache ----------------
const cache = new Map<string, { data: { items: FeedRow[]; meta: any }; ts: number }>();
const CACHE_TTL_MS = 20_000;

function parseIntSafe(v: string | null, d: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : d;
}
function parseSeed(v: string | null, d: number): number {
  // PostgreSQL integer range: -2,147,483,648 to 2,147,483,647
  // We'll use positive values only: 0 to 2,147,483,647
  const MAX_INT = 2147483647;
  
  if (v) {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) {
      // Ensure seed is within PostgreSQL integer range
      return Math.abs(n % MAX_INT);
    }
  }
  // For default value (Date.now() or other), ensure it's within integer range
  // Use modulo to keep it within bounds
  return Math.abs(d % MAX_INT);
}
function okJson(data: any, init?: number | ResponseInit) {
  // Allow shorthand okJson(data, 401) or okJson(data, { status: 401 })
  const opts: ResponseInit | undefined = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, opts);
}

// Helper function to extract image URLs from image_urls (JSON) or image_url (string)
function extractImageUrls(imageUrls: unknown, imageUrl: string | null): string[] {
  // First try image_urls (JSON array)
  if (imageUrls) {
    if (Array.isArray(imageUrls)) {
      const urls = imageUrls.filter((item): item is string => typeof item === "string" && item.length > 0);
      if (urls.length > 0) {
        return urls;
      }
    } else if (typeof imageUrls === "string") {
      try {
        const parsed = JSON.parse(imageUrls);
        if (Array.isArray(parsed)) {
          const urls = parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
          if (urls.length > 0) {
            return urls;
          }
        }
      } catch {
        // If parsing fails, treat as single URL if it starts with http
        if (imageUrls.startsWith("http")) {
          return [imageUrls];
        }
      }
    }
  }
  
  // Fallback to image_url
  if (imageUrl && typeof imageUrl === "string" && imageUrl.trim().length > 0) {
    return [imageUrl];
  }
  
  return [];
}

function createSeededRng(seed: number) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(input: T[], seed?: number): T[] {
  if (!Number.isFinite(seed) || seed === undefined || seed === null) {
    return input;
  }
  const rng = createSeededRng(seed);
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------- Auth extraction ----------------
async function getSupabaseUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // 1) Try mobile Bearer token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (token) {
    const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await tmp.auth.getUser(token);
    if (!error && data?.user?.id) return data.user.id;
  }

  // 2) Fallback: SSR cookie session (Next.js web)
try {
  // In your setup cookies() is typed async → await it.
  const cookieStore = await (nextCookies() as any);

  const ssr = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // In Route Handlers, request cookies are mutable
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete({ name, ...options });
      },
    },
  });

  const { data, error } = await ssr.auth.getUser();
  if (!error && data?.user?.id) return data.user.id;
} catch {
  // ignore
}

  return null;
}

// ---------------- TRENDING (no auth) ----------------
async function fetchTrending(
  limit: number,
  offset: number,
  seedId?: number
): Promise<{ items: FeedRow[]; meta: any }> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY);

  const fetchUntil = Math.max(0, offset + limit - 1);

  // Use the new view that includes boost information
  const { data: recs, error: recErr } = await admin
    .from("listing_recommendations_with_boost")
    .select("listing_id,fair_score,final_score,is_boosted,boost_weight")
    .order("final_score", { ascending: false })  // Order by final_score (includes boost)
    .range(0, fetchUntil);

  if (recErr) {
    return { items: [], meta: { error: recErr.message, mode: "trending", limit, offset } };
  }

  const ids = (recs ?? []).map((r) => r.listing_id);
  if (ids.length === 0) {
    return { items: [], meta: { mode: "trending", limit, offset, seedId: null, cached: false } };
  }

  // Fetch card data and image_urls from listings table
  const { data: cards, error: cardErr } = await admin
    .from("listing_card_v")
    .select("id,title,image_url,price_cents,brand,tags")
    .in("id", ids as number[]);

  if (cardErr) {
    return { items: [], meta: { error: cardErr.message, mode: "trending", limit, offset } };
  }

  // Fetch image_urls from listings table
  const { data: listings, error: listingsErr } = await admin
    .from("listings")
    .select("id,image_url,image_urls")
    .in("id", ids as number[]);

  if (listingsErr) {
    console.warn("⚠️ Failed to fetch image_urls from listings table:", listingsErr.message);
  }

  // Create a map of listing ID to image data
  const imageMap = new Map<number, { image_url: string | null; image_urls: unknown }>();
  (listings ?? []).forEach((listing: any) => {
    imageMap.set(listing.id, {
      image_url: listing.image_url ?? null,
      image_urls: listing.image_urls ?? null,
    });
  });

  // Preserve rec order (sorted by final_score)
  const byId = new Map<number, any>((cards ?? []).map((c: any) => [c.id, c]));
  const items: FeedRow[] = ids
    .map((id) => {
      const card = byId.get(id);
      const rec = recs?.find((r) => r.listing_id === id);
      if (!card) return null;
      
      const imageData = imageMap.get(id);
      const imageUrls = extractImageUrls(imageData?.image_urls, imageData?.image_url ?? card.image_url ?? null);
      const primaryImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
      
      return {
        id,
        title: card.title ?? "",
        image_url: primaryImageUrl,
        image_urls: imageData?.image_urls ?? null,
        price_cents: Number(card.price_cents ?? 0),
        brand: card.brand ?? "",
        tags: Array.isArray(card.tags) ? card.tags : [],
        source: "trending",
        fair_score: rec?.fair_score ?? null,
        final_score: rec?.final_score ?? rec?.fair_score ?? null,
        is_boosted: rec?.is_boosted ?? false,
        boost_weight: rec?.boost_weight ? Number(rec.boost_weight) : undefined,
      } as FeedRow;
    })
    .filter(Boolean) as FeedRow[];

  const randomized = shuffleWithSeed(items, seedId);
  const paged = randomized.slice(offset, offset + limit);

  return {
    items: paged,
    meta: {
      mode: "trending",
      page: Math.floor(offset / limit) + 1,
      limit,
      cached: false,
      seedId: seedId ?? null,
    },
  };
}

// ---------------- FOR YOU (auth required) ----------------
async function fetchForYou(
  supabaseUserId: string,
  limit: number,
  offset: number,
  seedId: number,
  gender: string | null
): Promise<{ items: FeedRow[]; meta: any; status?: number }> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY);

  // get_feed_v2函数现在从数据库读取用户的gender，传递null让函数自动从数据库读取
  // admin.rpc 是 Supabase JS 客户端调用自定义的数据库远程过程调用（RPC, Remote Procedure Call）的方法，
  // 用于从数据库服务器执行一段 SQL/Plpgsql 代码，然后返回数据结果。
  // 这里它用来调用 get_feed_v2 这个存储过程/函数，获取为“foryou”模式定制的 feed 数据：
  // 参数包括用户ID、模式、分页、随机种子，性别参数为null让后端自动从users表读取。
  const { data, error } = await admin.rpc("get_feed_v2", {
    p_supabase_user_id: supabaseUserId,
    p_mode: "foryou",
    p_limit: limit,
    p_offset: offset,
    p_seed: seedId,
    p_gender: null, // 传递null，函数会从users表读取gender
  });

  if (error) {
    console.error("❌ get_feed_v2 RPC error:", error);
    console.error("   Details:", JSON.stringify(error, null, 2));
    return {
      items: [],
      meta: { mode: "foryou", limit, page: Math.floor(offset / limit) + 1, seedId, error: error.message },
      status: 500,
    };
  }

  const rows = Array.isArray(data) ? (data as any[]) : [];
  
  if (rows.length > 0 && process.env.NODE_ENV === "development") {
    console.log("✅ get_feed_v2 returned", rows.length, "items");
    console.log("   Sample row keys:", Object.keys(rows[0]));
    console.log("   Sample row:", JSON.stringify(rows[0], null, 2).substring(0, 200));
  }

  // Fetch image_urls from listings table for all items
  const listingIds = rows.map((r) => Number(r.id)).filter((id) => !isNaN(id));
  const { data: listings, error: listingsErr } = await admin
    .from("listings")
    .select("id,image_url,image_urls")
    .in("id", listingIds);

  if (listingsErr) {
    console.warn("⚠️ Failed to fetch image_urls from listings table:", listingsErr.message);
  }

  // Create a map of listing ID to image data
  const imageMap = new Map<number, { image_url: string | null; image_urls: unknown }>();
  (listings ?? []).forEach((listing: any) => {
    imageMap.set(listing.id, {
      image_url: listing.image_url ?? null,
      image_urls: listing.image_urls ?? null,
    });
  });
  
  const items: FeedRow[] = [];
  for (const r of rows) {
    try {
      const listingId = Number(r.id);
      const imageData = imageMap.get(listingId);
      const imageUrls = extractImageUrls(imageData?.image_urls, imageData?.image_url ?? r.image_url ?? null);
      const primaryImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
      
      items.push({
        id: listingId,
        title: r.title ?? "",
        image_url: primaryImageUrl,
        image_urls: imageData?.image_urls ?? null,
        price_cents: r.price_cents !== null && r.price_cents !== undefined ? Number(r.price_cents) : null,
        brand: r.brand ?? "",
        tags: Array.isArray(r.tags) ? r.tags : [],
        source: (r.source ?? "brand") as FeedRow["source"],
        fair_score: r.fair_score === null ? null : Number(r.fair_score),
        final_score: r.final_score === null ? null : Number(r.final_score),
        is_boosted: r.is_boosted ?? false,
        boost_weight: r.boost_weight ? Number(r.boost_weight) : undefined,
      });
    } catch (err) {
      console.error("❌ Error mapping feed row:", err, "Row:", r);
    }
  }

  return {
    items,
    meta: { mode: "foryou", page: Math.floor(offset / limit) + 1, limit, seedId, cached: false },
  };
}

// ---------------- Route Handler ----------------
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const modeParam = (url.searchParams.get("mode") || "").toLowerCase(); // "foryou" | "trending"
  const page = Math.max(1, parseIntSafe(url.searchParams.get("page"), 1));
  const limit = Math.min(50, parseIntSafe(url.searchParams.get("limit"), 20));
  const seedId = parseSeed(url.searchParams.get("seedId"), Date.now());
  const noStore = url.searchParams.get("noStore") === "1";

  const offset = (page - 1) * limit;

  const supabaseUserId = await getSupabaseUserIdFromRequest(req);
  const effectiveMode =
    modeParam === "foryou"
      ? "foryou"
      : modeParam === "trending"
      ? "trending"
      : supabaseUserId
      ? "foryou"
      : "trending";

  // 缓存键不再包含gender，因为gender现在从数据库读取，基于用户ID
  // 使用用户ID作为缓存键的一部分，这样不同用户的feed会被分别缓存
  const cacheKey = `${effectiveMode}|uid=${supabaseUserId ?? "anon"}|p=${page}|l=${limit}|seed=${seedId}`;

  if (!noStore) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      return okJson({ ...hit.data, meta: { ...hit.data.meta, cached: true } });
    }
  }

  try {
    let result: { items: FeedRow[]; meta: any; status?: number };

    if (effectiveMode === "foryou") {
      if (!supabaseUserId) {
        return okJson({ items: [], meta: { mode: "foryou", error: "Unauthorized" } }, { status: 401 });
      }
      // gender参数保留但不再使用，函数会从数据库读取
      result = await fetchForYou(supabaseUserId, limit, offset, seedId, null);
      if (result.status) {
        const { status, ...rest } = result as any;
        return okJson(rest, { status });
      }
    } else {
      result = await fetchTrending(limit, offset, seedId);
    }

    const data = { items: result.items, meta: { ...(result.meta || {}), cached: false } };

    if (!noStore) {
      cache.set(cacheKey, { data, ts: Date.now() });
    }

    return okJson(data);
  } catch (e: any) {
    console.error("❌ Feed API error:", e);
    console.error("   Stack:", e?.stack);
    return okJson(
      { items: [], meta: { error: e?.message ?? "Internal error", mode: effectiveMode, cached: false } },
      { status: 500 }
    );
  }
}
