import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase";
import { UserRole, UserStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "E-mail format is invalid. Please enter a valid e-mail." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json({ error: "missing password or email" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes("Email not confirmed")) {
        return NextResponse.json(
          { error: "Unverified Email detected, please verify your email" },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    const supabaseUser = signInData?.user;
    if (!supabaseUser) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    let admin = await prisma.users.findUnique({
      where: { supabase_user_id: supabaseUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        supabase_user_id: true,
      },
    });

    if (!admin) {
      const existing = await prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          supabase_user_id: true,
        },
      });

      if (existing && !existing.supabase_user_id) {
        admin = await prisma.users.update({
          where: { id: existing.id },
          data: { supabase_user_id: supabaseUser.id },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            supabase_user_id: true,
          },
        });
      } else {
        admin = existing;
      }
    }

    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    if (admin.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    if (admin.status === UserStatus.SUSPENDED) {
      return NextResponse.json({ error: "account suspended" }, { status: 403 });
    }

    await prisma.users.update({
      where: { id: admin.id },
      data: { last_sign_in_at: new Date() } as any,
      select: { id: true },
    });

    let session: any = signInData.session ?? null;
    if (!session) {
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData?.session ?? null;
    }
    const accessToken = session?.access_token ?? null;
    const refreshToken = session?.refresh_token ?? null;

    const response = NextResponse.json({
      success: true,
      message: "Admin logged in",
      adminId: admin.id,
    });

    if (accessToken && refreshToken) {
      response.cookies.set("sb-access-token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      response.cookies.set("sb-refresh-token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    const store = await cookies();
    store.set("tc_session", admin.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
