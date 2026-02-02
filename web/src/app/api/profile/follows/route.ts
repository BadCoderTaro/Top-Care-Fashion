import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type FollowListType = "followers" | "following";

const baseUserSelect = {
  id: true,
  username: true,
  avatar_url: true,
  bio: true,
  location: true,
  followers: {
    select: { id: true },
  },
  following: {
    select: { id: true },
  },
} satisfies Record<string, unknown>;

const parseType = (value: string | null): FollowListType =>
  value === "following" ? "following" : "followers";

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = parseType(searchParams.get("type"));

  try {
    let list;

    if (type === "followers") {
      const relations = await prisma.user_follows.findMany({
        where: { following_id: sessionUser.id },
        include: { follower: { select: baseUserSelect } },
        orderBy: { created_at: "desc" },
      });

      list = relations
        .map((relation) => {
          if (!relation.follower) {
            return null;
          }

          return {
            id: relation.follower.id.toString(),
            username: relation.follower.username,
            avatarUrl: relation.follower.avatar_url,
            bio: relation.follower.bio,
            location: relation.follower.location,
            followersCount: relation.follower.followers?.length ?? 0,
            followingCount: relation.follower.following?.length ?? 0,
            followedAt:
              relation.created_at?.toISOString() ?? new Date().toISOString(),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    } else {
      const relations = await prisma.user_follows.findMany({
        where: { follower_id: sessionUser.id },
        include: { following: { select: baseUserSelect } },
        orderBy: { created_at: "desc" },
      });

      list = relations
        .map((relation) => {
          if (!relation.following) {
            return null;
          }

          return {
            id: relation.following.id.toString(),
            username: relation.following.username,
            avatarUrl: relation.following.avatar_url,
            bio: relation.following.bio,
            location: relation.following.location,
            followersCount: relation.following.followers?.length ?? 0,
            followingCount: relation.following.following?.length ?? 0,
            followedAt:
              relation.created_at?.toISOString() ?? new Date().toISOString(),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("❌ Failed to fetch follow list:", error);
    return NextResponse.json(
      { error: "Failed to fetch follow list" },
      { status: 500 },
    );
  }
}
