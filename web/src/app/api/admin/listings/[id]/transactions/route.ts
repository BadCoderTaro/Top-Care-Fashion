import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { orderStatusToAdmin, summarizeOrderTotals } from "@/lib/admin-orders";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const listingId = Number(params.id);

  const orders = await prisma.orders.findMany({
    where: { listing_id: listingId },
    include: {
      buyer: { select: { username: true } },
      seller: { select: { username: true } },
      listing: { select: { price: true } },
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
    };
  });

  return NextResponse.json({ transactions });
}
