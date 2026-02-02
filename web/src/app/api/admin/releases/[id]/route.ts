import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is required`);
  return v;
}

// PATCH - Set as current release
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { isCurrent } = body;

    // Use service role client to bypass RLS after admin check
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Get the release to know its platform
    const { data: release, error: fetchError } = await supabaseAdmin
      .from("releases")
      .select("platform")
      .eq("id", id)
      .single();

    if (fetchError || !release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // If setting as current, unset other current releases for this platform
    if (isCurrent) {
      await supabaseAdmin
        .from("releases")
        .update({ is_current: false })
        .eq("platform", release.platform);
    }

    // Update the release
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("releases")
      .update({ is_current: isCurrent, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating release:", updateError);
      return NextResponse.json({ error: "Failed to update release" }, { status: 500 });
    }

    return NextResponse.json({ release: updated, message: "Release updated successfully" });
  } catch (error: any) {
    console.error("Error in PATCH /api/admin/releases/[id]:", error);
    return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });
  }
}

// DELETE - Delete release
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await context.params;

    // Use service role client to bypass RLS after admin check
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Get release info before deleting
    const { data: release, error: fetchError } = await supabaseAdmin
      .from("releases")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from("releases")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting release:", deleteError);
      return NextResponse.json({ error: "Failed to delete release" }, { status: 500 });
    }

    // Try to delete from storage
    try {
      // Extract path from URL
      const url = new URL(release.file_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/releases\/(.+)/);
      if (pathMatch) {
        const path = pathMatch[1];
        await supabaseAdmin.storage.from("releases").remove([path]);
      }
    } catch (storageError) {
      console.warn("Could not delete file from storage:", storageError);
      // Continue anyway - database record is deleted
    }

    return NextResponse.json({ message: "Release deleted successfully" });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/releases/[id]:", error);
    return NextResponse.json({ error: error?.message || "Delete failed" }, { status: 500 });
  }
}

