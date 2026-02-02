import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { adminStatusToOrder, orderStatusToAdmin, summarizeOrderTotals } from "@/lib/admin-orders";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  const order = await prisma.orders.findUnique({
    where: { id },
    include: {
      buyer: { select: { username: true, email: true } },
      seller: { select: { username: true, email: true } },
      listing: {
        select: {
          id: true,
          name: true,
          description: true,
          image_url: true,
          brand: true,
          size: true,
          condition_type: true,
          price: true,
        },
      },
      payment_method_ref: {
        select: {
          id: true,
          type: true,
          label: true,
          brand: true,
          last4: true,
          expiry_month: true,
          expiry_year: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const { quantity, priceEach } = summarizeOrderTotals(order);

  const transaction = {
    id: String(order.id),
    buyerId: String(order.buyer_id),
    sellerId: String(order.seller_id),
    listingId: String(order.listing_id),
    quantity,
    priceEach,
    status: orderStatusToAdmin(order.status),
    createdAt: order.created_at.toISOString(),
    updatedAt: order.updated_at ? order.updated_at.toISOString() : null,
    buyerName: order.buyer?.username ?? null,
    buyerEmail: order.buyer?.email ?? null,
    sellerName: order.seller?.username ?? null,
    sellerEmail: order.seller?.email ?? null,
    listingName: order.listing?.name ?? null,
    listingDescription: order.listing?.description ?? null,
    listingImageUrl: order.listing?.image_url ?? null,
    listingBrand: order.listing?.brand ?? null,
    listingSize: order.listing?.size ?? null,
    listingCondition: order.listing?.condition_type
      ? order.listing.condition_type.toLowerCase()
      : null,
    shippingAddress: order.shipping_address ?? null,
    shippingMethod: order.shipping_method ?? null,
    paymentMethod: order.payment_method ?? null,
    paymentMethodId: order.payment_method_id ? String(order.payment_method_id) : null,
    paymentMethodDetails: order.payment_method_ref ? {
      id: String(order.payment_method_ref.id),
      type: order.payment_method_ref.type,
      label: order.payment_method_ref.label,
      brand: order.payment_method_ref.brand ?? null,
      last4: order.payment_method_ref.last4 ?? null,
      expiryMonth: order.payment_method_ref.expiry_month ?? null,
      expiryYear: order.payment_method_ref.expiry_year ?? null,
    } : null,
    commissionRate: order.commission_rate ? Number(order.commission_rate) : null,
    commissionAmount: order.commission_amount ? Number(order.commission_amount) : null,
    notes: order.notes ?? null,
  };

  return NextResponse.json(transaction);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status } = (await req.json().catch(() => ({}))) as { status?: string };

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const normalizedStatus = adminStatusToOrder(status);
  const id = Number(params.id);

  try {
    const updatedOrder = await prisma.orders.update({
      where: { id },
      data: {
        status: normalizedStatus,
        updated_at: new Date(),
      },
      include: {
        listing: { select: { id: true, sold_at: true } },
      },
    });

    const statusLower = String(status).trim().toLowerCase();
    if (statusLower === "completed" && updatedOrder.listing) {
      const soldAt = updatedOrder.listing.sold_at ?? new Date();
      await prisma.listings.update({
        where: { id: updatedOrder.listing.id },
        data: {
          sold: true,
          listed: false,
          sold_at: soldAt,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
