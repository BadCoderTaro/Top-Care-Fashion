import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { ensurePublicBucket } from "./helpers";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is required`);
  return v;
}

// GET - List all releases
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Use service role client to bypass RLS after admin check
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: releases, error } = await supabaseAdmin
      .from("releases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching releases:", error);
      return NextResponse.json({ error: "Failed to fetch releases" }, { status: 500 });
    }

    return NextResponse.json({ releases: releases || [] });
  } catch (error: any) {
    console.error("Error in GET /api/admin/releases:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

// POST - Finalize release after file upload
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const {
      version,
      releaseNotes,
      setAsCurrent,
      path,
      fileName,
      fileSize,
      platform: rawPlatform,
    } = body ?? {};

    const platform = typeof rawPlatform === "string" && rawPlatform.trim() ? rawPlatform.trim() : "android";
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }
    const numericFileSize = Number(fileSize);
    if (!Number.isFinite(numericFileSize) || numericFileSize <= 0) {
      return NextResponse.json({ error: "File size must be a positive number" }, { status: 400 });
    }
    if (!version || typeof version !== "string" || !version.trim()) {
      return NextResponse.json({ error: "Version is required" }, { status: 400 });
    }

    const normalizedVersion = version.trim();

    if (!path.startsWith(`${platform}/`)) {
      return NextResponse.json({ error: "Invalid file path for selected platform" }, { status: 400 });
    }

    const bucket = "releases";
    await ensurePublicBucket(supabaseAdmin, bucket);

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const fileUrl = data.publicUrl;

    // Save release info to database using service role client
    // If setAsCurrent, unset other current releases for this platform
    if (setAsCurrent) {
      await supabaseAdmin
        .from("releases")
        .update({ is_current: false })
        .eq("platform", platform);
    }

    const { data: release, error: dbError } = await supabaseAdmin
      .from("releases")
      .insert({
        version: normalizedVersion,
        platform,
        file_url: fileUrl,
        file_name: fileName,
        file_size: Math.round(numericFileSize),
        release_notes: typeof releaseNotes === "string" && releaseNotes.trim() ? releaseNotes : null,
        is_current: Boolean(setAsCurrent),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from(bucket).remove([path]);
      return NextResponse.json({ error: `Failed to save release: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ release, message: "Release uploaded successfully" });
  } catch (error: any) {
    console.error("Error in POST /api/admin/releases:", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
  }
}

