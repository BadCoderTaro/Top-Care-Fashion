import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    console.log("🔍 Testing Supabase write access...");
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 使用 Anon Key 而不是 Service Role Key
      { auth: { persistSession: false } }
    );

    console.log("🔍 Supabase client created");
    console.log("🔍 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("🔍 Service Role Key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 测试写入 listings 表
    const { data, error } = await supabase
      .from("listings")
      .insert([{ 
        name: "Test from API", // 使用 name 而不是 title
        description: "If this works, write is OK",
        price: 0.01,
        seller_id: 1, // 使用 seller_id 而不是 user_id
        listed: true,
        sold: false,
        condition_type: "GOOD" // 使用正确的枚举值
      }])
      .select();

    if (error) {
      console.error("🔍 Insert error:", error);
      return NextResponse.json({ 
        ok: false, 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    console.log("🔍 Insert successful:", data);
    return NextResponse.json({ ok: true, data });
    
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
    message: "Use POST method to test Supabase write access",
    timestamp: new Date().toISOString()
  });
}
