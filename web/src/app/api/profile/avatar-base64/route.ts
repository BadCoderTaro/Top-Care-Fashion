import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.users.findUnique({ where: { id: sessionUser.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null) as null | { imageData?: string; fileName?: string };
    const imageData = body?.imageData;
    const fileNameInput = body?.fileName || `avatar_${Date.now()}.jpg`;

    if (!imageData || typeof imageData !== "string") {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // 支持 data URL 或纯 base64
    const matches = imageData.match(/^data:(.*?);base64,(.*)$/);
    const base64Part = matches ? matches[2] : imageData;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Part, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid base64 data" }, { status: 400 });
    }

    const ext = (fileNameInput.split(".").pop() || "jpg").toLowerCase();
    const fileName = `avatar-${dbUser.id}-${Date.now()}.${ext}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Supabase upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const avatarUrl = urlData.publicUrl;

    await prisma.users.update({ where: { id: dbUser.id }, data: { avatar_url: avatarUrl } });

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (err) {
    console.error("❌ Avatar base64 upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
