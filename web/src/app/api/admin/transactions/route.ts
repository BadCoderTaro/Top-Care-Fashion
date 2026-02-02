import { NextResponse, NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { orderStatusToAdmin, summarizeOrderTotals } from "@/lib/admin-orders";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const [orders, totalCount] = await Promise.all([
    prisma.orders.findMany({
      skip,
      take: limit,
    include: {
      buyer: { select: { id: true, username: true, email: true } },
      seller: { select: { id: true, username: true, email: true } },
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
      orderBy: { created_at: "desc" },
    }),
    prisma.orders.count(),
  ]);

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
      listingPrice: order.listing?.price ? Number(order.listing.price) : null,
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
  });

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    transactions,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  });
}
