import { NextRequest, NextResponse } from "next/server";
import { prisma, toNumber } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Gender, UserRole, UserStatus } from "@prisma/client";

type UserResponse = {
  id: string;
  username: string;
  email: string;
  status: "active" | "suspended";
  role: "User" | "Admin";
  is_premium: boolean;
  premium_until: string | null;
  dob: string | null;
  gender: "Male" | "Female" | null;
  average_rating: number | null;
  total_reviews: number;
  createdAt: string;
  avatar_url: string | null;
};

function mapRoleOut(value: UserRole): "User" | "Admin" {
  return value === UserRole.ADMIN ? "Admin" : "User";
}

function mapStatusOut(value: UserStatus): "active" | "suspended" {
  return value === UserStatus.SUSPENDED ? "suspended" : "active";
}

function mapGenderOut(value: Gender | null): "Male" | "Female" | null {
  if (!value) return null;

  // Handle new enum values
  if (value === "Men" as Gender) return "Male";
  if (value === "Women" as Gender) return "Female";
  if (value === "Unisex" as Gender) return null;

  // Backward compatibility with old enum
  if (value === "MALE" as Gender) return "Male";
  if (value === "FEMALE" as Gender) return "Female";

  return null;
}

function normalizeStatusIn(value: unknown): UserStatus {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "SUSPENDED") return UserStatus.SUSPENDED;
  return UserStatus.ACTIVE;
}

function normalizeRoleIn(value: unknown): UserRole {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "ADMIN") return UserRole.ADMIN;
  return UserRole.USER;
}

function normalizePremium(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    return trimmed === "1" || trimmed === "true";
  }
  return false;
}

function normalizeGenderIn(value: unknown): Gender | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  // Handle new API format (Male, Female, Unisex)
  if (normalized === "Male") return "Men" as Gender;
  if (normalized === "Female") return "Women" as Gender;
  if (normalized === "Unisex") return "Unisex" as Gender;

  // Backward compatibility with uppercase old enum
  if (normalized.toUpperCase() === "MALE" || normalized.toUpperCase() === "MEN") return "Men" as Gender;
  if (normalized.toUpperCase() === "FEMALE" || normalized.toUpperCase() === "WOMEN") return "Women" as Gender;

  return null;
}

function toIso(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString();
}

function toDateOnly(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function formatUser(user: {
  id: number;
  username: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  is_premium: boolean;
  premium_until: Date | null;
  dob: Date | null;
  gender: Gender | null;
  average_rating: any;
  total_reviews: number;
  created_at: Date;
  avatar_url: string | null;
}): UserResponse {
  return {
    id: String(user.id),
    username: user.username,
    email: user.email,
    status: mapStatusOut(user.status),
    role: mapRoleOut(user.role),
    is_premium: user.is_premium,
    premium_until: toIso(user.premium_until),
    dob: toDateOnly(user.dob),
    gender: mapGenderOut(user.gender),
    average_rating: toNumber(user.average_rating),
    total_reviews: user.total_reviews ?? 0,
    createdAt: toIso(user.created_at) ?? new Date().toISOString(),
    avatar_url: user.avatar_url ?? null,
  };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.users.findUnique({
    where: { id: Number(params.id) },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: String(user.id),
    username: user.username,
    email: user.email,
    status: mapStatusOut(user.status),
    role: mapRoleOut(user.role),
    is_premium: user.is_premium,
    premium_until: toIso(user.premium_until),
    dob: toDateOnly(user.dob),
    gender: mapGenderOut(user.gender),
    average_rating: toNumber(user.average_rating),
    total_reviews: user.total_reviews ?? 0,
    createdAt: toIso(user.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(user.updated_at),
    avatar_url: user.avatar_url ?? null,
    phone_number: user.phone_number ?? null,
    phone: user.phone ?? null,
    bio: user.bio ?? null,
    location: user.location ?? null,
    country: user.country ?? null,
    preferred_styles: user.preferred_styles ?? null,
    preferred_size_top: user.preferred_size_top ?? null,
    preferred_size_bottom: user.preferred_size_bottom ?? null,
    preferred_size_shoe: user.preferred_size_shoe ?? null,
    preferred_brands: user.preferred_brands ?? null,
    mix_match_used_count: user.mix_match_used_count ?? 0,
    free_promotions_used: user.free_promotions_used ?? 0,
    free_promotions_reset_at: toIso(user.free_promotions_reset_at),
    last_sign_in_at: toIso(user.last_sign_in_at),
    likes_visibility: user.likes_visibility,
    follows_visibility: user.follows_visibility,
    supabase_user_id: user.supabase_user_id ?? null,
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const { username, email, role, status, is_premium, premium_until, gender } = body ?? {};
    const userId = Number(params.id);

    // Build update data object with only defined fields
    const updateData: {
      username?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      is_premium?: boolean;
      premium_until?: Date | null;
      gender?: Gender | null;
    } = {};

    if (username !== undefined) {
      updateData.username = username;
    }
    if (email !== undefined) {
      updateData.email = email;
    }
    if (role !== undefined) {
      updateData.role = normalizeRoleIn(role);
    }
    if (status !== undefined) {
      updateData.status = normalizeStatusIn(status);
    }
    // Premium status should be managed through premium_subscriptions table, not directly
    // If is_premium or premium_until are provided, we'll handle them by creating/updating subscriptions
    if (is_premium !== undefined || premium_until !== undefined) {
      // Note: Direct updates to is_premium/premium_until are blocked by trigger
      // Admin should use premium_subscriptions table instead
      // For now, we'll skip these fields and log a warning
      console.warn(
        `Attempted to directly update premium status for user ${userId}. ` +
        `Premium status should be managed through premium_subscriptions table.`
      );
      // Remove from updateData to prevent trigger override
    }
    if (gender !== undefined) {
      updateData.gender = normalizeGenderIn(gender);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      id: String(user.id),
      username: user.username,
      email: user.email,
      status: mapStatusOut(user.status),
      role: mapRoleOut(user.role),
      is_premium: user.is_premium,
      premium_until: toIso(user.premium_until),
      dob: toDateOnly(user.dob),
      gender: mapGenderOut(user.gender),
      average_rating: toNumber(user.average_rating),
      total_reviews: user.total_reviews ?? 0,
      createdAt: toIso(user.created_at) ?? new Date().toISOString(),
      avatar_url: user.avatar_url ?? null,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
