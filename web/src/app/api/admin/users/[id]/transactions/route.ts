import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { orderStatusToAdmin, summarizeOrderTotals } from "@/lib/admin-orders";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = Number(params.id);

  const orders = await prisma.orders.findMany({
    where: {
      OR: [{ buyer_id: userId }, { seller_id: userId }],
    },
    include: {
      buyer: { select: { username: true } },
      seller: { select: { username: true } },
      listing: { select: { id: true, name: true, price: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const transactions = orders.map((order) => {
    const { quantity, priceEach } = summarizeOrderTotals(order);
    return {
      id: String(order.id),
      buyerId: String(order.buyer_id),
      sellerId: String(order.seller_id),
      listingId: String(order.listing_id),
      quantity,
      priceEach,
      status: orderStatusToAdmin(order.status),
      createdAt: order.created_at.toISOString(),
      buyerName: order.buyer?.username ?? null,
      sellerName: order.seller?.username ?? null,
      listingName: order.listing?.name ?? null,
    };
  });

  return NextResponse.json({ transactions });
}
