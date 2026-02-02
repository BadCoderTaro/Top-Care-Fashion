import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isVisibilitySetting, VisibilitySetting } from "@/types/privacy";

type FollowInfo = { id: number };

type UserProfile = {
  id: number;
  username: string | null;
  email: string | null;
  phone_number: string | null;
  bio: string | null;
  location: string | null;
  dob: Date | null;
  gender: string | null;
  avatar_url: string | null;
  preferred_styles: unknown;
  preferred_size_top: string | null;
  preferred_size_bottom: string | null;
  preferred_size_shoe: string | null;
  preferred_brands: unknown;
  total_reviews: number | null;
  followers: FollowInfo[];
  following: FollowInfo[];
  likes_visibility: VisibilitySetting;
  follows_visibility: VisibilitySetting;
};

const normalizePreferredStyles = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value) {
    return value as unknown[];
  }
  return [];
};

const normalizePreferredBrands = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch (err) {
      console.warn("Failed to parse preferred_brands string", err);
      return [];
    }
  }
  if (typeof value === "object") {
    const candidates = Object.values(value as Record<string, unknown>);
    return candidates.filter((item): item is string => typeof item === "string");
  }
  return [];
};

const mapGender = (value: string | null) => {
  if (!value) return null;

  // Handle new enum values (Men, Women, Unisex)
  if (value === "Men") return "Male";
  if (value === "Women") return "Female";
  if (value === "Unisex") return null;

  // Backward compatibility with old enum (MALE, FEMALE)
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";

  return null;
};

const formatUserResponse = (user: UserProfile) => ({
  id: user.id.toString(),
  username: user.username,
  email: user.email,
  phone: user.phone_number,
  bio: user.bio,
  location: user.location,
  dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
  gender: mapGender(user.gender),
  avatar_url: user.avatar_url,
  followersCount: user.followers.length,
  followingCount: user.following.length,
  reviewsCount: user.total_reviews ?? 0,
  preferred_styles: normalizePreferredStyles(user.preferred_styles),
  preferred_size_top: user.preferred_size_top,
  preferred_size_bottom: user.preferred_size_bottom,
  preferred_size_shoe: user.preferred_size_shoe,
  preferred_brands: normalizePreferredBrands(user.preferred_brands),
  likesVisibility: user.likes_visibility,
  followsVisibility: user.follows_visibility,
});

// 统一使用 getSessionUser，避免路由内重复鉴权

const selectUserProfile = {
  id: true,
  username: true,
  email: true,
  phone_number: true,
  bio: true,
  location: true,
  dob: true,
  gender: true,
  avatar_url: true,
  preferred_styles: true,
  preferred_size_top: true,
  preferred_size_bottom: true,
  preferred_size_shoe: true,
  preferred_brands: true,
  total_reviews: true,
  followers: {
    select: {
      id: true,
    },
  },
  following: {
    select: {
      id: true,
    },
  },
  likes_visibility: true,
  follows_visibility: true,
} satisfies Record<string, unknown>;

/**
 * 获取用户资料
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No valid session found" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: sessionUser.id },
      select: selectUserProfile
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found", message: "User account no longer exists" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: formatUserResponse(dbUser as UserProfile),
    });
  } catch (error) {
    console.error("❌ Profile GET error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Check if it's a database connection error
    if (errorMsg.includes("Can't reach database") || errorMsg.includes("Connection")) {
      return NextResponse.json(
        { error: "Service unavailable", message: "Database connection failed. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", message: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * 更新用户资料
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No valid session found" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: sessionUser.id },
      select: selectUserProfile
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found", message: "User account no longer exists" },
        { status: 404 }
      );
    }

    const data = await req.json();
    console.log("📝 Profile update request data:", JSON.stringify(data, null, 2));
    console.log("📝 Current user ID:", dbUser.id);

    const updateData: Record<string, unknown> = {};

    if (data.username !== undefined && data.username !== null) {
      updateData.username = data.username;
    }
    if (data.email !== undefined && data.email !== null) {
      updateData.email = data.email;
    }
    if (data.phone !== undefined && data.phone !== null) {
      updateData.phone_number = data.phone;
    }
    if (data.bio !== undefined && data.bio !== null) {
      updateData.bio = data.bio;
    }
    if (data.location !== undefined && data.location !== null) {
      updateData.location = data.location;
    }
    if (data.dob !== undefined && data.dob !== null) {
      updateData.dob = new Date(data.dob);
    }
    if (Object.prototype.hasOwnProperty.call(data, "gender")) {
      if (data.gender === null || data.gender === undefined) {
        updateData.gender = null;
      } else if (data.gender === "Male") {
        updateData.gender = "Men";
      } else if (data.gender === "Female") {
        updateData.gender = "Women";
      } else {
        updateData.gender = null;
      }
    }
    if (data.avatar_url !== undefined && data.avatar_url !== null) {
      updateData.avatar_url = data.avatar_url;
    }
    if (Object.prototype.hasOwnProperty.call(data, "likesVisibility")) {
      if (!isVisibilitySetting(data.likesVisibility)) {
        return NextResponse.json(
          { error: "Invalid likes visibility value" },
          { status: 400 },
        );
      }
      updateData.likes_visibility = data.likesVisibility;
    }
    if (Object.prototype.hasOwnProperty.call(data, "followsVisibility")) {
      if (!isVisibilitySetting(data.followsVisibility)) {
        return NextResponse.json(
          { error: "Invalid follows visibility value" },
          { status: 400 },
        );
      }
      updateData.follows_visibility = data.followsVisibility;
    }

    if (data.preferredStyles !== undefined) {
      if (Array.isArray(data.preferredStyles)) {
        updateData.preferred_styles = data.preferredStyles;
      } else if (data.preferredStyles === null) {
        updateData.preferred_styles = null;
      }
    }

    if (data.preferredSizes !== undefined && data.preferredSizes !== null) {
      const sizes = data.preferredSizes as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(sizes, "top")) {
        updateData.preferred_size_top = sizes.top ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(sizes, "bottom")) {
        updateData.preferred_size_bottom = sizes.bottom ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(sizes, "shoe")) {
        updateData.preferred_size_shoe = sizes.shoe ?? null;
      }
    }

    if (data.preferredBrands !== undefined) {
      if (Array.isArray(data.preferredBrands)) {
        updateData.preferred_brands = data.preferredBrands;
      } else if (data.preferredBrands === null) {
        updateData.preferred_brands = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      console.log("📝 No fields to update, returning current user data");
      return NextResponse.json({
        ok: true,
        user: formatUserResponse(dbUser as UserProfile),
      });
    }

    const updated = await prisma.users.update({
      where: { id: dbUser.id },
      data: updateData,
      select: selectUserProfile,
    });

    console.log("✅ Profile updated successfully");

    return NextResponse.json({
      ok: true,
      user: formatUserResponse(updated as UserProfile),
    });
  } catch (err) {
    console.error("❌ Update profile failed:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    // Check if it's a database connection error
    if (errorMsg.includes("Can't reach database") || errorMsg.includes("Connection")) {
      return NextResponse.json(
        {
          error: "Service unavailable",
          message: "Database connection failed. Please try again later.",
          details: errorMsg,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: "Update failed",
        message: "Failed to update profile",
        details: errorMsg,
      },
      { status: 400 },
    );
  }
}
