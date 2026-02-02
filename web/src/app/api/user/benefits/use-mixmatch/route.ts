import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasReachedMixMatchLimit, isPremiumUser } from "@/lib/userPermissions";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await (prisma.users as any).findUnique({
      where: { id: session.id },
      select: {
        id: true,
        is_premium: true,
        premium_until: true,
        mix_match_used_count: true,
      } as any,
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isPremium = isPremiumUser(user);
  const used = (user as any).mix_match_used_count ?? 0;

    if (hasReachedMixMatchLimit(isPremium, used)) {
      return NextResponse.json({
        ok: false,
        reason: "limit_reached",
        message: isPremium ? "Unlimited for premium" : "Free users can only use Mix & Match 3 times.",
        used,
      }, { status: 403 });
    }

    const updated = await (prisma.users as any).update({
      where: { id: user.id },
      data: { mix_match_used_count: used + 1 },
      select: { mix_match_used_count: true },
    });

    return NextResponse.json({
      ok: true,
  used: (updated as any).mix_match_used_count ?? used + 1,
    });
  } catch (err) {
    console.error("❌ Use Mix&Match failed:", err);
    return NextResponse.json({ error: "Failed to update counter" }, { status: 400 });
  }
}
