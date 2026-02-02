import { NextResponse } from "next/server";
import { getConnection, toNumber } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase";

type RateLimitEntry = { count: number; expiresAt: number };
type RateLimitStore = Map<string, RateLimitEntry>;

function getRateLimitStore(): RateLimitStore {
  const globalState = globalThis as { __dbStatusRateLimit?: RateLimitStore };
  if (!globalState.__dbStatusRateLimit) {
    globalState.__dbStatusRateLimit = new Map<string, RateLimitEntry>();
  }
  return globalState.__dbStatusRateLimit;
}

function rateLimited(key: string): boolean {
  const store = getRateLimitStore();
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = Number(process.env.DB_STATUS_RATE_LIMIT ?? "6");

  const entry = store.get(key);
  if (!entry || entry.expiresAt < now) {
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }

  if (entry.count >= maxRequests) {
    return true;
  }

  entry.count += 1;
  store.set(key, entry);
  return false;
}

export async function GET(request: Request) {
  try {
    const key =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("cf-connecting-ip") ??
      "unknown";

    if (rateLimited(key)) {
      return NextResponse.json(
        {
          status: "rate_limited",
          error: "Too many requests to db-status endpoint",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    const conn = await getConnection();
    const [rows]: any = await conn.execute("SELECT COUNT(*) AS count FROM users");
    await conn.end();

    const total = Array.isArray(rows) && rows.length ? toNumber(rows[0].count) ?? 0 : 0;

    // Supabase check: also try a lightweight auth ping
    const supabase = await createSupabaseServer();
    const { data: authData } = await supabase.auth.getUser();

    return NextResponse.json({
      status: "connected",
      userCount: total,
      supabaseAuth: Boolean(authData?.user) ? "session" : "no-session",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
