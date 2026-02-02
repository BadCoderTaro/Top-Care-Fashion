// web/src/app/api/ai/describe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- Config ----------
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const MAX_LLM_ATTEMPTS = 3;
const TIMEOUT_MS = 10_000; // per attempt
const MAX_LABELS = 12;

// ---------- Schema ----------
const BodySchema = z.object({
  category: z.string().min(1, "category is required"),
  labels: z.array(z.string()).default([]),
});

// ---------- Helpers ----------
type ErrorLike = { statusCode?: number; status?: number; message?: string };
const toErrorLike = (e: unknown): ErrorLike =>
  e && typeof e === "object"
    ? {
        statusCode: typeof (e as any).statusCode === "number" ? (e as any).statusCode : undefined,
        status: typeof (e as any).status === "number" ? (e as any).status : undefined,
        message:
          typeof (e as any).message === "string"
            ? (e as any).message
            : e instanceof Error
            ? e.message
            : undefined,
      }
    : e instanceof Error
    ? { message: e.message }
    : {};

const BANNED_TOKENS = [
  "@","instagram","wechat","whatsapp","phone","email"
];

function redact(input: string): string {
  let out = input;
  for (const token of BANNED_TOKENS) {
    const t = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${t}\\b`, "gi");
    out = out.replace(re, " ");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function toNiceSentence(category: string, labels: string[]): string {
  const unique = Array.from(new Set(labels.map(l => l.toLowerCase()))).slice(0, 6);
  const nice = unique.length ? ` Featuring ${unique.join(", ")}.` : "";
  return `${category} with an easygoing style for everyday wear.${nice}`;
}

function fallbackCopy(category: string, labels: string[]): string {
  return redact(toNiceSentence(category, labels));
}

async function tryGemini(category: string, labels: string[]) {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, attempts: 0, blurb: "", reason: "missing_key" as const };

  const mod = await import("@google/generative-ai").catch(() => null as any);
  if (!mod?.GoogleGenerativeAI) return { ok: false, attempts: 0, blurb: "", reason: "sdk_missing" as const };

  const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = mod;
  const models = [GEMINI_MODEL, "gemini-2.5-flash"];
  let attempts = 0;

  for (const mdl of models) {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: mdl,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 64,
        topP: 0.9,
        topK: 40,
        candidateCount: 1,
      },
    });

    const prompt = [
      "You are a Fashion writer of 10 years write short, brand-safe product blurbs for a fashion marketplace.",
      "Rules:",
      "- 3-4 sentences, neutral tone, no hype.",
      "- No brand names or contact info.",
      "- Avoid claims; describe material, silhouette, use case.",
      "",
      `Category: ${category}`,
      `Labels: ${labels.join(", ") || "(none)"}`,
      "",
      "Return ONLY the blurb text.",
    ].join("\n");

    for (let i = 1; i <= MAX_LLM_ATTEMPTS; i++) {
      attempts++;
      const jitter = Math.floor(Math.random() * 150);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const resp = await model.generateContent(
          { contents: [{ role: "user", parts: [{ text: prompt }] }] } as any,
          { signal: controller.signal as any }
        );
        clearTimeout(timer);

        const text = resp?.response?.text?.() ?? "";
        const cleaned = redact(text).replace(/\s+/g, " ").trim();
        if (cleaned) return { ok: true, attempts, blurb: cleaned, model: mdl };
        await new Promise(r => setTimeout(r, i * 300 + jitter));
      } catch (e: any) {
        clearTimeout(timer);
        const status = (e?.statusCode ?? e?.status) as number | undefined;
        if (status === 429 || status === 503) {
          await new Promise(r => setTimeout(r, i * 400 + jitter));
          continue;
        }
        await new Promise(r => setTimeout(r, i * 250 + jitter));
      }
    }
    // try next model
  }
  return { ok: false, attempts, blurb: "", reason: "exhausted" as const };
}

// ---------- CORS + cache ----------
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function OPTIONS() {
  return withCORS(NextResponse.json({ ok: true }));
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.parse(json);

    const category = parsed.category.trim() || "Item";
    const labels = (parsed.labels || []).filter(Boolean).slice(0, MAX_LABELS);

    const gem = await tryGemini(category, labels);
    if (gem.ok) {
      return withCORS(
        NextResponse.json({
          category,
          labels,
          blurb: gem.blurb,
          meta: {
            source: "gemini",
            model: gem.model ?? GEMINI_MODEL,
            attempts: gem.attempts,
            latency_ms: Date.now() - t0,
          },
        })
      );
    }

    const blurb = fallbackCopy(category, labels);
    return withCORS(
      NextResponse.json({
        category,
        labels,
        blurb,
        meta: { source: "fallback", model: GEMINI_MODEL, attempts: gem.attempts ?? 0, latency_ms: Date.now() - t0 },
      })
    );
  } catch (e) {
    const err = toErrorLike(e);
    const message = err.message ?? "Failed to generate description";
    return withCORS(
      NextResponse.json({ ok: false, error: message, code: "BAD_REQUEST" }, { status: 400 })
    );
  }
}

// ---------- GET (status + optional live ping) ----------
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ping = url.searchParams.get("ping") === "1";
  const token = url.searchParams.get("token");
  const requireToken = process.env.NODE_ENV === "production";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // E) Lightweight readiness without hitting Gemini
  if (!ping) {
    const keyPresent = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
    return withCORS(
      NextResponse.json({
        ok: true,
        gemini: keyPresent ? "key_present" : "missing_key",
        model,
        hint: "Add ?ping=1 to perform a live Gemini ping.",
      })
    );
  }

  // Optional token gate for live ping in prod
  if (requireToken && token !== process.env.HEALTH_TOKEN) {
    return withCORS(NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }));
  }

  // Live ping (very small request)
  try {
    const mod = await import("@google/generative-ai");
    const { GoogleGenerativeAI } = mod;
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY!;
    const genAI = new GoogleGenerativeAI(key);
    const mdl = genAI.getGenerativeModel({
      model,
      generationConfig: { temperature: 0.1, maxOutputTokens: 8, candidateCount: 1 },
    });

    const r = await mdl.generateContent({
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    } as any);

    const text = r?.response?.text?.() ?? "";
    return withCORS(
      NextResponse.json({
        ok: true,
        gemini: text ? "ok" : "empty",
        model,
        sample: text,
      })
    );
  } catch (e: any) {
    return withCORS(
      NextResponse.json(
        { ok: false, gemini: "fail", model, error: String(e?.message || e) },
        { status: 500 }
      )
    );
  }
}
