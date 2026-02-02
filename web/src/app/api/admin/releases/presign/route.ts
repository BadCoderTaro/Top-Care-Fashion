import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { ensurePublicBucket } from "../helpers";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is required`);
  return v;
}

function sanitizeSegment(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// POST - Create a signed upload URL for large release files
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const {
      fileName,
      fileType,
      version,
      platform: rawPlatform,
    } = body ?? {};

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    if (!version || typeof version !== "string" || !version.trim()) {
      return NextResponse.json({ error: "version is required" }, { status: 400 });
    }

    const platform = typeof rawPlatform === "string" && rawPlatform.trim() ? rawPlatform.trim() : "android";
    const safePlatform = sanitizeSegment(platform, "android");
    const safeVersion = sanitizeSegment(version, "v");

    // Extract base filename to avoid any path traversal
    const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
    const safeFileName = sanitizeSegment(baseName, `release-${Date.now()}.apk`);

    const bucket = "releases";
    await ensurePublicBucket(supabaseAdmin, bucket);

    const uniqueId = randomUUID();
    const path = `${safePlatform}/${safeVersion}/${uniqueId}-${safeFileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error("Failed to create signed upload URL:", error);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      bucket,
      path: data.path,
      token: data.token,
      expiresIn: 120, // Supabase signed upload URLs expire after 2 minutes by default
      fileType: typeof fileType === "string" ? fileType : undefined,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/releases/presign:", error);
    return NextResponse.json({ error: error?.message || "Failed to create upload URL" }, { status: 500 });
  }
}

