import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is required`);
  return v;
}

function sanitizePathPart(s: string) {
  return s.replace(/[^a-zA-Z0-9._\-/]/g, "_").replace(/\.+\//g, "_");
}

async function ensurePublicBucket(supabase: any, bucket: string) {
  // Try create; if exists, try update to public
  const { error: createErr } = await supabase.storage.createBucket(bucket, { public: true });
  if (createErr && !String(createErr.message || "").toLowerCase().includes("already exists")) {
    // Bucket may exist but we can still try to update to public
    const { error: updateErr } = await supabase.storage.updateBucket(bucket, { public: true });
    if (updateErr) {
      // Ignore if operation not allowed; we'll continue and rely on getPublicUrl for signed/failed state
    }
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const { searchParams } = new URL(req.url);
  const bucket = "assets"; // enforce assets bucket
  const prefixRaw = sanitizePathPart(searchParams.get("prefix") || "");
  const prefix = prefixRaw.startsWith("assets/") ? prefixRaw.replace(/^\/+/, "") : `assets/${prefixRaw || ""}`;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    await ensurePublicBucket(supabase, bucket);

    const origName = sanitizePathPart(file.name || "image");
    const name = `${Date.now()}_${origName}`;
    const path = `${prefix}/${name}`.replace(/\/+/, "/");
    const arrayBuf = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, Buffer.from(arrayBuf), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) {
      return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ bucket, path, url: data.publicUrl });
  } catch (error: any) {
    console.error("Storage upload error:", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
  }
}
