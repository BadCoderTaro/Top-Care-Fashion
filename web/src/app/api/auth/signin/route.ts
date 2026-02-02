import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase";
import { Gender, UserRole, UserStatus, VisibilitySetting } from "@prisma/client";
import { signLegacyToken } from "@/lib/jwt";

function mapRole(value: UserRole | null | undefined): "User" | "Admin" {
  return value === UserRole.ADMIN ? "Admin" : "User";
}

function mapStatus(value: UserStatus | null | undefined): "active" | "suspended" {
  return value === UserStatus.SUSPENDED ? "suspended" : "active";
}

function mapGender(value: Gender | null | undefined): "Male" | "Female" | null {
  if (!value) return null;
  const raw = (value as unknown as string).toLowerCase();
  if (raw === "men" || raw === "male") return "Male";
  if (raw === "women" || raw === "female") return "Female";
  return null;
}


export async function POST(req: NextRequest) {
  try {
    console.log("🔍 Signin API - Starting request");
    const body = await req.json().catch(() => ({}));
    const { email, password } = body as Record<string, unknown>;
    console.log("🔍 Signin API - Email:", typeof email === "string" ? `${email.substring(0, 5)}...` : "invalid");

    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const normalizedPassword = typeof password === "string" ? password : "";

    // Validate email format (must match frontend validation exactly)
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.warn("Detected invalid email format:", normalizedEmail);
      return NextResponse.json(
        { error: "E-mail format is invalid. Please enter a valid e-mail." },
        { status: 400 }
      );
    }

    if (!normalizedEmail || !normalizedPassword) {
      console.warn("Missing fields detected during sign-in");
      return NextResponse.json({ error: "missing password or email" }, { status: 400 });
    }

    console.log("🔐 Signing in via Supabase for:", normalizedEmail);

    const supabase = await createSupabaseServer();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    if (signInError) {
      if (signInError.message.includes("Email not confirmed")) {
        console.warn("Unverified email detected:", normalizedEmail);
        return NextResponse.json(
          { error: "Unverified Email detected, please verify your email" },
          { status: 403 }
        );
      }

      console.warn("Supabase signInWithPassword failed:", signInError.message);
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    const supabaseUser = signInData?.user;
    if (!supabaseUser) {
      console.warn("Supabase response missing user payload");
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    console.log("✅ Supabase sign-in successful for:", normalizedEmail);
    console.log("✅ Supabase email_confirmed_at:", supabaseUser.email_confirmed_at);

    // 直接查询本地用户，不自动创建
    const user = await prisma.users.findUnique({
      where: { supabase_user_id: supabaseUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        is_premium: true,
        premium_until: true,
        dob: true,
        gender: true,
        avatar_url: true,
        bio: true,
        phone_number: true,
        location: true,
        likes_visibility: true,
        follows_visibility: true,
      },
    });

    if (!user) {
      console.error("Local user record not found for Supabase user", supabaseUser.id);
      return NextResponse.json({ error: "User not found. Please register first." }, { status: 404 });
    }

    if (user.status === UserStatus.SUSPENDED) {
      console.warn("Suspended account attempted login:", normalizedEmail);
      return NextResponse.json({ error: "account suspended" }, { status: 403 });
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { last_sign_in_at: new Date() } as any,
      select: { id: true },
    });

    const dob = user.dob ? user.dob.toISOString().slice(0, 10) : null;
    const responseUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: mapRole(user.role),
      status: mapStatus(user.status),
      dob,
      gender: mapGender(user.gender),
      isPremium: Boolean(user.is_premium),
      premiumUntil: user.premium_until ?? null,
      avatar_url: user.avatar_url,
      bio: user.bio,
      phone: user.phone_number,
      location: user.location,
      likesVisibility: user.likes_visibility as VisibilitySetting,
      followsVisibility: user.follows_visibility as VisibilitySetting,
    };

    const legacyAccessToken = signLegacyToken({ uid: user.id, kind: "legacy" }, { expiresIn: 60 * 60 * 24 * 7 });

    let session: any = signInData.session ?? null;
    if (!session) {
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData?.session ?? null;
    }
    const accessToken = session?.access_token ?? null;
    const refreshToken = session?.refresh_token ?? null;

    const response = NextResponse.json({
      ok: true,
      supabaseUserId: supabaseUser.id,
      user: responseUser,
      source: "supabase",
      access_token: accessToken,
      refresh_token: refreshToken,
      legacy_access_token: legacyAccessToken,
      token_type: "supabase",
    });

    if (session) {
      response.cookies.set("sb-access-token", session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      response.cookies.set("sb-refresh-token", session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    console.log("🏁 Signin API - Completed for:", normalizedEmail);
    return response;
  } catch (error) {
    console.error("❌ Signin API - Error details:", error);
    console.error("❌ Signin API - Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: "Failed to sign in", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
