import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    console.log("🔍 Testing image upload to Supabase...");
    
    // 检查用户认证状态
    const sessionUser = await getSessionUser(req);
    console.log("🔍 Session user:", sessionUser ? `${sessionUser.id} (${sessionUser.email})` : "No authenticated user");
    
    // 根据认证状态选择不同的 Supabase 客户端
    let supabase;
    if (sessionUser) {
      // 如果有认证用户，使用 Service Role Key 来绕过 RLS
      console.log("🔍 Using Service Role Key for authenticated user");
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
    } else {
      // 如果没有认证用户，使用 Anon Key（RLS 策略允许 public 用户上传）
      console.log("🔍 Using Anon Key for anonymous user (RLS policies allow public uploads)");
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
    }

    // 创建一个简单的测试图片（1x1 像素的 PNG）
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const buffer = Buffer.from(testImageBase64, "base64");
    
    const fileKey = `test-${Date.now()}-${randomUUID()}.png`;
    
    console.log("🔍 Attempting upload to avatars bucket...");
    
    // 尝试上传到 avatars 存储桶，使用公共访问
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileKey, buffer, {
        contentType: "image/png",
        upsert: false,
        // 不设置 owner，让 Supabase 自动处理
      });

    if (uploadError) {
      console.error("🔍 Upload error:", uploadError);
      return NextResponse.json({ 
        ok: false, 
        error: uploadError.message,
        code: (uploadError as any)?.statusCode ?? (uploadError as any)?.status ?? (uploadError as any)?.name ?? 'UNKNOWN',
        details: uploadError
      }, { status: 500 });
    }

    console.log("🔍 Upload successful:", uploadData);
    
    // 获取公共 URL
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileKey);
    
    return NextResponse.json({ 
      ok: true, 
      uploadData,
      publicUrl: publicUrlData.publicUrl,
      message: "Image upload test successful!",
      userInfo: {
        authenticated: !!sessionUser,
        userId: sessionUser?.id || null,
        email: sessionUser?.email || null
      }
    });
    
  } catch (error) {
    console.error("🔍 Unexpected error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Use POST method to test image upload to Supabase",
    timestamp: new Date().toISOString()
  });
}
