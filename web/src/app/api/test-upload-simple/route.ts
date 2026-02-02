import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST() {
  try {
    console.log("🔍 Testing image upload with Service Role Key...");
    
    // 使用 Service Role Key 绕过 RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 暂时还是用 Anon Key
      { auth: { persistSession: false } }
    );

    // 创建一个简单的测试图片（1x1 像素的 PNG）
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const buffer = Buffer.from(testImageBase64, "base64");
    
    const fileKey = `test-${Date.now()}-${randomUUID()}.png`;
    
    console.log("🔍 Attempting upload to avatars bucket...");
    
    // 尝试上传到 avatars 存储桶
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileKey, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("🔍 Upload error:", uploadError);
      return NextResponse.json({ 
        ok: false, 
        error: uploadError.message,
        code: (uploadError as any)?.statusCode ?? (uploadError as any)?.status ?? (uploadError as any)?.name ?? 'UNKNOWN',
        details: uploadError,
        suggestion: "This is likely due to RLS policies requiring authentication. The mobile app should work because it sends auth tokens."
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
      message: "Image upload test successful!"
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
    timestamp: new Date().toISOString(),
    note: "This test uses Anon Key, so it will fail due to RLS policies. The mobile app should work because it sends auth tokens."
  });
}
