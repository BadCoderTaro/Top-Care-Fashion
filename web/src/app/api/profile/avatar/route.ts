import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // 统一鉴权（支持 Bearer legacy/Supabase、Cookie、tc_session）
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ 查找数据库用户
    const dbUser = await prisma.users.findUnique({
      where: { id: sessionUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3️⃣ 从 FormData 获取文件（⚠️ key 必须是 "file"）
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    // ✅ 添加详细日志调试
    console.log("📸 Received FormData keys:", Array.from(formData.keys()));
    console.log("📸 File object:", file);
    console.log("📸 File type:", file?.type);
    console.log("📸 File size:", file?.size);
    console.log("📸 File name:", file?.name);

    if (!file) {
      console.error("❌ No file provided in FormData");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 4️⃣ 转换为 Buffer（Node 环境必须手动转换）
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5️⃣ 上传到 Supabase Storage（⚠️ 使用 avatars bucket）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `avatar-${dbUser.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars") // ✅ 改为统一 avatars bucket
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Supabase upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 6️⃣ 获取 public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // 7️⃣ 更新数据库
    await prisma.users.update({
      where: { id: dbUser.id },
      data: { avatar_url: avatarUrl },
    });

    console.log("✅ Avatar uploaded:", avatarUrl);

    return NextResponse.json({
      ok: true,
      avatarUrl,
      message: "Avatar uploaded successfully",
    });
  } catch (err) {
    console.error("❌ Avatar upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const dbUser = await prisma.users.findUnique({ where: { id: sessionUser.id } });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 清除数据库中的头像
    await prisma.users.update({
      where: { id: dbUser.id },
      data: { avatar_url: null },
    });

    return NextResponse.json({ ok: true, message: "Avatar deleted" });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
