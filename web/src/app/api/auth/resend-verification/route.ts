import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

/**
 * Resolve site URL for email redirects
 */
function resolveSiteUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SUPABASE_RESET_REDIRECT_URL ||
    process.env.APP_ORIGIN ||
    "";
  if (envUrl.trim()) return envUrl.trim().replace(/\/+$/, "");

  const origin = req.nextUrl.origin;
  return origin.replace(/\/+$/, "");
}

/**
 * API route to resend email verification link
 * POST /api/auth/resend-verification
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    console.log("🔍 Resend Verification API - Starting request");
    const body = await req.json().catch(() => ({}));
    const { email } = body as Record<string, unknown>;

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.warn("Invalid email format:", normalizedEmail);
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    console.log("📧 Resending verification email to:", normalizedEmail);

    const supabase = await createSupabaseServer();
    const redirectBase = resolveSiteUrl(req);
    const redirectUrl = `${redirectBase}/verify-email/success`;

    console.log('[resend-verification] redirectBase:', redirectBase);
    console.log('[resend-verification] redirectUrl:', redirectUrl);

    // Resend verification email using Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectUrl,
      }
    });

    if (error) {
      console.error("❌ Supabase resend verification failed:", error.message);

      // Return a generic success message even on error to prevent email enumeration
      // But log the actual error for debugging
      return NextResponse.json({
        ok: true,
        message: "If this email is registered, a verification link has been sent.",
      });
    }

    console.log("✅ Verification email resent successfully to:", normalizedEmail);

    return NextResponse.json({
      ok: true,
      message: "Verification email has been sent. Please check your inbox.",
    });

  } catch (error) {
    console.error("❌ Resend Verification API - Error:", error);
    return NextResponse.json(
      {
        error: "Failed to resend verification email",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
