import { OrderStatus, Prisma } from "@prisma/client";

export type AdminOrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

const statusMapOut: Record<OrderStatus, AdminOrderStatus> = {
  [OrderStatus.IN_PROGRESS]: "pending",
  [OrderStatus.TO_SHIP]: "paid",
  [OrderStatus.SHIPPED]: "shipped",
  [OrderStatus.DELIVERED]: "shipped",
  [OrderStatus.RECEIVED]: "completed",
  [OrderStatus.COMPLETED]: "completed",
  [OrderStatus.REVIEWED]: "completed",
  [OrderStatus.CANCELLED]: "cancelled",
};

export function orderStatusToAdmin(status: OrderStatus | null | undefined): AdminOrderStatus {
  if (!status) return "pending";
  return statusMapOut[status] ?? "pending";
}

export function adminStatusToOrder(status: string | null | undefined): OrderStatus {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  switch (normalized) {
    case "paid":
      return OrderStatus.TO_SHIP;
    case "shipped":
      return OrderStatus.SHIPPED;
    case "completed":
      return OrderStatus.COMPLETED;
    case "cancelled":
      return OrderStatus.CANCELLED;
    case "pending":
    default:
      return OrderStatus.IN_PROGRESS;
  }
}

export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value) || 0;
}

type OrderTotalsInput = {
  total_amount: Prisma.Decimal | null;
  order_items?: { quantity: number | null; price: Prisma.Decimal | null }[];
  listing?: { price: Prisma.Decimal | number | null } | null;
};

export function summarizeOrderTotals(input: OrderTotalsInput) {
  const items = input.order_items ?? [];
  const quantityFromItems = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const quantity = quantityFromItems > 0 ? quantityFromItems : 1;

  const totalFromItems = items.reduce((sum, item) => {
    const price = decimalToNumber(item.price);
    const qty = item.quantity ?? 0;
    return sum + price * qty;
  }, 0);

  const totalAmount =
    input.total_amount !== null && input.total_amount !== undefined
      ? decimalToNumber(input.total_amount)
      : totalFromItems > 0
      ? totalFromItems
      : decimalToNumber(input.listing?.price);

  const priceEach = quantity > 0 ? totalAmount / quantity : totalAmount;

  return {
    quantity,
    priceEach,
    totalAmount,
  };
}
