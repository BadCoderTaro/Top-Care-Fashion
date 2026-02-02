import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase";
import { Gender, UserRole, UserStatus, VisibilitySetting } from "@prisma/client";

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

function toUserResponse(user: {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  is_premium: boolean;
  premium_until: Date | null;
  dob: Date | null;
  gender: Gender | null;
  avatar_url?: string | null; // ✅ 添加头像字段
  likes_visibility: VisibilitySetting;
  follows_visibility: VisibilitySetting;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: mapRole(user.role),
    status: mapStatus(user.status),
    isPremium: Boolean(user.is_premium),
    premiumUntil: user.premium_until ?? null,
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
    gender: mapGender(user.gender),
    avatar: user.avatar_url ?? null, // ✅ 统一成前端使用的 avatar
    likesVisibility: user.likes_visibility,
    followsVisibility: user.follows_visibility,
  };
}

export async function GET() {
  try {
    //double check if the pathof auth/me is being accessed by system
    console.log(" The route of /api/auth/me is accessed ");
    const supabase = await createSupabaseServer();

    // addition of safety measure against getUser errors
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error(" getUser failed from supabase: ", error.message);
    }
    const sUser = data?.user;

    const cookieStore = await cookies();
    const sid = cookieStore.get("tc_session")?.value;

    if (sUser?.id) {
      try {
        const user = await prisma.users.findUnique({
          where: { supabase_user_id: sUser.id },
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
            avatar_url: true, // ✅ 添加头像字段
            likes_visibility: true,
            follows_visibility: true,
          },
        });

        if (user) {
          // add console log for checking auth again
          console.log("Successfully authenticated through supabase:", user.email);
          return NextResponse.json({ user: toUserResponse(user), source: "supabase" });
        } else {
          // add warning of user ID not being local db but found 
          console.warn(" user ID from supabase found but not in local DB:", sUser.id);
        }
      } catch (dbError: any) {
        console.error("Database error when fetching user by supabase_user_id:", dbError?.message);
        // Return null user instead of throwing error
        return NextResponse.json({ user: null, source: "none", error: "Database unavailable" });
      }
    }

    if (sid) {
      const numericId = Number(sid);
      if (!Number.isNaN(numericId)) {
        try {
          const user = await prisma.users.findUnique({
            where: { id: numericId },
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
              avatar_url: true, // ✅ 添加头像字段
              likes_visibility: true,
              follows_visibility: true,
            },
          });

          //mitigation measures and checks against potential cookies errors/bugs
          if (user) {
            //add console log for checking auth in regards to cookie
            console.log("Authenticated through legacy cookie:", user.email);
            return NextResponse.json({ user: toUserResponse(user), source: "legacy-cookie" });
          } else {
            console.warn(" user ID from legacy cookie entry not found in DB:", numericId);
          }
        } catch (dbError: any) {
          console.error("Database error when fetching user by cookie ID:", dbError?.message);
          // Return null user instead of throwing error
          return NextResponse.json({ user: null, source: "none", error: "Database unavailable" });
        }
      }
    }

    // path when valid session cannot be found
    console.log("returning null, unable to find authenticated user");
    return NextResponse.json({ user: null, source: "none" });
  } catch (error: any) {
    // Catch any unexpected errors and always return JSON
    console.error("Unexpected error in /api/auth/me:", error?.message);
    return NextResponse.json(
      { user: null, source: "none", error: "Internal server error" },
      { status: 500 }
    );
  }
}
