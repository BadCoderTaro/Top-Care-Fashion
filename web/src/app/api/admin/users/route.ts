import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { Gender, UserRole, UserStatus } from "@prisma/client";

function mapRole(value: UserRole): "User" | "Admin" {
  return value === UserRole.ADMIN ? "Admin" : "User";
}

function mapStatus(value: UserStatus): "active" | "suspended" {
  return value === UserStatus.SUSPENDED ? "suspended" : "active";
}

function mapGender(value: Gender | null): "Male" | "Female" | null {
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

type SortOption =
  | "created-desc"
  | "created-asc"
  | "name-asc"
  | "name-desc"
  | "status"
  | "role"
  | "premium";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.max(parseInt(searchParams.get("limit") || "50", 10), 1);
  const skip = (page - 1) * limit;
  const sortParam = (searchParams.get("sort") as SortOption | null) ?? "created-desc";
  const filterParam = searchParams.get("filter") ?? "all";
  const searchParam = searchParams.get("search");

  const where: Prisma.usersWhereInput = {};

  switch (filterParam) {
    case "active":
      where.status = UserStatus.ACTIVE;
      break;
    case "suspended":
      where.status = UserStatus.SUSPENDED;
      break;
    case "premium":
      where.is_premium = true;
      break;
    case "admin":
      where.role = UserRole.ADMIN;
      break;
    default:
      break;
  }

  const trimmedSearch = searchParam?.trim();
  if (trimmedSearch) {
    const searchConditions: Prisma.usersWhereInput[] = [
      { username: { contains: trimmedSearch, mode: "insensitive" } },
      { email: { contains: trimmedSearch, mode: "insensitive" } },
    ];

    if (trimmedSearch.toLowerCase() === "admin" || trimmedSearch.toLowerCase() === "user") {
      searchConditions.push({ role: trimmedSearch.toLowerCase() === "admin" ? UserRole.ADMIN : UserRole.USER });
    }

    const numericId = Number(trimmedSearch);
    if (!Number.isNaN(numericId)) {
      searchConditions.push({ id: numericId });
    }

    where.OR = searchConditions;
  }

  const orderBy: Prisma.usersOrderByWithRelationInput | Prisma.usersOrderByWithRelationInput[] = (() => {
    switch (sortParam) {
      case "name-asc":
        return { username: "asc" };
      case "name-desc":
        return { username: "desc" };
      case "created-asc":
        return { created_at: "asc" };
      case "status":
        return [{ status: "asc" }, { created_at: "desc" }];
      case "role":
        return [{ role: "asc" }, { username: "asc" }];
      case "premium":
        return [{ is_premium: "desc" }, { created_at: "desc" }];
      case "created-desc":
      default:
        return { created_at: "desc" };
    }
  })();

  const [dbUsers, totalCount] = await Promise.all([
    prisma.users.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        role: true,
        is_premium: true,
        premium_until: true,
        dob: true,
        gender: true,
        avatar_url: true,
        created_at: true,
      },
      orderBy,
    }),
    prisma.users.count({ where }),
  ]);

  const users = dbUsers.map((user) => ({
    id: String(user.id),
    username: user.username,
    email: user.email,
    status: mapStatus(user.status),
    role: mapRole(user.role),
    is_premium: user.is_premium,
    premium_until: user.premium_until?.toISOString() ?? null,
    dob: user.dob?.toISOString().slice(0, 10) ?? null,
    gender: mapGender(user.gender),
    createdAt: user.created_at.toISOString(),
    avatar_url: user.avatar_url ?? null,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  });
}
