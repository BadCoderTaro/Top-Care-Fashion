import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;

// Production Web URL - used for password reset emails
const PRODUCTION_WEB_URL = "https://top-care-fashion.vercel.app";

function resolveSiteUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SUPABASE_RESET_REDIRECT_URL ||
    process.env.APP_ORIGIN ||
    "";
  if (envUrl.trim()) return envUrl.trim().replace(/\/+$/, "");

  const origin = req.nextUrl.origin;

  // 🔥 If origin is localhost or local IP (from mobile dev), use production URL
  if (origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      /http:\/\/\d+\.\d+\.\d+\.\d+/.test(origin)) {
    console.log(`[forgot-password] Detected local origin (${origin}), using production URL: ${PRODUCTION_WEB_URL}`);
    return PRODUCTION_WEB_URL;
  }

  return origin.replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "E-mail format is invalid. Please enter a valid e-mail." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const redirectBase = resolveSiteUrl(req);
    const redirectUrl = `${redirectBase}/reset-password/confirm`;

    console.log('[forgot-password] redirectBase:', redirectBase);
    console.log('[forgot-password] redirectUrl:', redirectUrl);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      // Avoid leaking which e-mails exist; log for observability and still reply success.
      console.warn("Password reset email error:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to request password reset" }, { status: 500 });
  }
}
