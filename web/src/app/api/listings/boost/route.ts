import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  getPromotionPrice,
  getFreePromotionLimit,
  isPremiumUser,
  shouldResetFreePromotions,
} from "@/lib/userPermissions";

const BOOST_DURATION_DAYS = 3;
const MAX_SELECTION = 20;

type PromotionRow = { listing_id: number };
type CreatedPromotionRow = {
  id: number;
  listing_id: number;
  used_free_credit: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const rawListingIds: unknown[] = Array.isArray(body?.listingIds)
      ? body.listingIds
      : [];

    const listingIds = Array.from(
      new Set(
        rawListingIds
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );

    if (!listingIds.length) {
      return NextResponse.json(
        { error: "No listings selected" },
        { status: 400 }
      );
    }

    if (listingIds.length > MAX_SELECTION) {
      return NextResponse.json(
        { error: `Cannot boost more than ${MAX_SELECTION} listings at once.` },
        { status: 400 }
      );
    }

    const plan: "free" | "premium" = body?.plan === "premium" ? "premium" : "free";
    const autoUseFreeCredits = body?.useFreeCredits !== false;
    const paymentMethodIdRaw = body?.paymentMethodId ?? null;
    const paymentMethodId = paymentMethodIdRaw
      ? Number(paymentMethodIdRaw)
      : null;

    const dbUser = await prisma.users.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        is_premium: true,
        premium_until: true,
        free_promotions_used: true,
        free_promotions_reset_at: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const premiumActive = isPremiumUser({
      is_premium: dbUser.is_premium,
      premium_until: dbUser.premium_until,
    });

    if (plan === "premium" && !premiumActive) {
      return NextResponse.json(
        { error: "Premium plan requires active membership", requiresMembership: true },
        { status: 403 }
      );
    }

    const ownedListings = await prisma.listings.findMany({
      where: {
        id: { in: listingIds },
        seller_id: session.id,
      },
      select: { id: true },
    });

    const ownedIds = new Set(ownedListings.map((item) => item.id));
    const unauthorizedIds = listingIds.filter((id) => !ownedIds.has(id));

    if (unauthorizedIds.length) {
      return NextResponse.json(
        { error: "Some listings are not available for boosting", invalidListingIds: unauthorizedIds },
        { status: 403 }
      );
    }

    const existingPromotions = await prisma.$queryRaw<PromotionRow[]>`
      SELECT listing_id
      FROM listing_promotions
      WHERE seller_id = ${session.id}
        AND listing_id IN (${Prisma.join(listingIds)})
        AND status IN ('ACTIVE', 'SCHEDULED');
    `;

    const alreadyPromotedIds = new Set(
      existingPromotions.map((promo) => promo.listing_id)
    );
    const availableListingIds = listingIds.filter((id) => !alreadyPromotedIds.has(id));

    if (!availableListingIds.length) {
      return NextResponse.json(
        { error: "Selected listings are already boosted." },
        { status: 400 }
      );
    }

    const pricePerBoost = getPromotionPrice(plan === "premium");
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + BOOST_DURATION_DAYS);

    let usedCount = dbUser.free_promotions_used ?? 0;
    let resetAt = dbUser.free_promotions_reset_at ?? null;
    let needsResetWrite = false;

    if (premiumActive) {
      if (shouldResetFreePromotions(resetAt)) {
        usedCount = 0;
        resetAt = now;
        needsResetWrite = true;
      } else if (!resetAt) {
        resetAt = now;
        needsResetWrite = true;
      }
    } else {
      usedCount = 0;
    }

    const limit = premiumActive ? getFreePromotionLimit(true) ?? 0 : 0;
    const freeCreditsAvailable =
      plan === "premium" && premiumActive
        ? Math.max(0, limit - usedCount)
        : 0;

    const freeCreditsUsed = autoUseFreeCredits
      ? Math.min(freeCreditsAvailable, availableListingIds.length)
      : 0;
    const paidBoostCount = availableListingIds.length - freeCreditsUsed;
    const totalCharge = Number((paidBoostCount * pricePerBoost).toFixed(2));

    if (totalCharge > 0) {
      if (!paymentMethodId) {
        return NextResponse.json(
          {
            error: "Payment method required",
            requiresPaymentMethod: true,
            totalCharge,
          },
          { status: 400 }
        );
      }

      const paymentMethod = await prisma.user_payment_methods.findFirst({
        where: {
          id: paymentMethodId,
          user_id: session.id,
        },
        select: { id: true },
      });

      if (!paymentMethod) {
        return NextResponse.json(
          { error: "Payment method not found", requiresPaymentMethod: true },
          { status: 404 }
        );
      }

      // TODO: integrate actual payment charge when payment gateway is ready
    }

    const promotions = await prisma.$transaction(async (tx) => {
      if (premiumActive && (needsResetWrite || freeCreditsUsed > 0)) {
        await tx.users.update({
          where: { id: session.id },
          data: {
            free_promotions_used: usedCount + freeCreditsUsed,
            free_promotions_reset_at: resetAt ?? now,
          },
        });
      }

      const createdRows: CreatedPromotionRow[] = [];

      for (let index = 0; index < availableListingIds.length; index += 1) {
        const listingId = availableListingIds[index];
        const usedFree = index < freeCreditsUsed;
        const paidAmount = usedFree ? 0.00 : pricePerBoost;
        const rows = await tx.$queryRaw<CreatedPromotionRow[]>`
          INSERT INTO listing_promotions
            (listing_id, seller_id, status, started_at, ends_at, views, clicks, view_uplift_percent, click_uplift_percent, used_free_credit, paid_amount, created_at, updated_at)
          VALUES
            (${listingId}, ${session.id}, 'ACTIVE', ${now}, ${new Date(endsAt)}, 0, 0, 0, 0, ${usedFree}, ${paidAmount}, ${now}, ${now})
          RETURNING id, listing_id, used_free_credit;
        `;

        if (rows.length > 0) {
          createdRows.push(rows[0]);
        }
      }

      return createdRows;
    });

    return NextResponse.json({
      success: true,
      data: {
        createdCount: promotions.length,
        promotionIds: promotions.map((promo) => promo.id),
        freeCreditsUsed,
        paidBoostCount,
        totalCharge,
        pricePerBoost,
        currency: "USD",
        alreadyPromotedIds: Array.from(alreadyPromotedIds),
      },
    });
  } catch (error) {
    console.error("❌ Failed to boost listings:", error);
    return NextResponse.json(
      { error: "Failed to boost listings" },
      { status: 500 }
    );
  }
}
