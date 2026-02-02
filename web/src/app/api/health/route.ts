// web/src/app/api/ai/health/route.ts
import { NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalizeKey = (s?: string) =>
  (s ?? "").replace(/\\n/g, "\n").replace(/\r/g, "").replace(/^"|"$/g, "").trim();

const norm = (s?: string) =>
  (s ?? "").trim().replace(/^"|"$/g, "").replace(/\/+$/g, "");

export async function GET() {
  const envPresence = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GOOGLE_CLOUD_PROJECT: !!process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_API_KEY: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
  };

  // ---- Google Vision auth probe
  let googleAuth: "ok" | "fail" = "fail";
  try {
    const vision = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: normalizeKey(process.env.GOOGLE_PRIVATE_KEY),
      },
    });
    await vision.getProjectId(); // lightweight check
    googleAuth = "ok";
  } catch (err) {
    console.error("[health] Google auth failed:", err);
  }

  // ---- Supabase health (with anon key headers)
  let supabase: "ok" | "fail" = "fail";
  let supabaseDetail: { status?: number; statusText?: string; body?: string; error?: string } | null = null;
  try {
    const url = norm(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const anon = norm(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const r = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      cache: "no-store",
    });
    if (r.ok) {
      supabase = "ok";
      supabaseDetail = { status: r.status, statusText: r.statusText };
    } else {
      supabase = "fail";
      supabaseDetail = { status: r.status, statusText: r.statusText, body: (await r.text()).slice(0, 300) };
    }
  } catch (err: any) {
    console.error("[health] Supabase check failed:", err);
    supabase = "fail";
    supabaseDetail = { error: String(err?.message || err) };
  }

  // ---- Gemini ping (optional, only if key present)
  let gemini: "ok" | "missing" | "fail" = "missing";
  const GEMINI_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (GEMINI_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
          cache: "no-store",
        },
      );
      gemini = res.ok ? "ok" : "fail";
    } catch (err) {
      console.error("[health] Gemini check failed:", err);
      gemini = "fail";
    }
  }

  return NextResponse.json({ envPresence, googleAuth, supabase, supabaseDetail, gemini });
}
