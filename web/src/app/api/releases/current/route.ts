import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

// GET - Get current release download links
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    
    const { data: releases, error } = await supabase
      .from("releases")
      .select("*")
      .eq("is_current", true);

    if (error) {
      console.error("Error fetching current releases:", error);
      return NextResponse.json({ error: "Failed to fetch current releases" }, { status: 500 });
    }

    const android = releases?.find((r) => r.platform === "android");

    return NextResponse.json({
      android: android
        ? {
            version: android.version,
            url: android.file_url,
            releaseNotes: android.release_notes,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error in GET /api/releases/current:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

