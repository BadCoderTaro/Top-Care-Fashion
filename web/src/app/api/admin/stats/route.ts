import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserStatus, OrderStatus } from "@prisma/client";
import { summarizeOrderTotals } from "@/lib/admin-orders";

type Period = "d" | "w" | "m" | "y" | "custom";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "m") as Period;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Calculate date range based on period
    switch (period) {
      case "d": // Today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "w": // This week
        const weekStart = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), weekStart, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), weekStart + 6, 23, 59, 59, 999);
        break;
      case "m": // This month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "y": // This year
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "custom": // Custom range
        if (!startDateParam || !endDateParam) {
          return NextResponse.json({ error: "Start and end dates required for custom period" }, { status: 400 });
        }
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get user stats
    const [totalUsers, activeUsers, premiumUsers, newUsers] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.users.count({ where: { is_premium: true } }),
      prisma.users.count({ where: { created_at: { gte: startDate, lte: endDate } } }),
    ]);

    // Get listing stats
    const [totalListings, activeListings, soldListings, newListings] = await Promise.all([
      prisma.listings.count(),
      prisma.listings.count({ where: { listed: true, sold: false } }),
      prisma.listings.count({ where: { sold: true } }),
      prisma.listings.count({ where: { created_at: { gte: startDate, lte: endDate } } }),
    ]);

    // Get transaction stats
    const [allTransactions, completedTransactions, totalTransactions] = await Promise.all([
      prisma.orders.findMany({
        where: {
          created_at: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          status: true,
          created_at: true,
          total_amount: true,
          commission_rate: true,
          commission_amount: true,
          listing: {
            select: {
              price: true,
            },
          },
        },
      }),
      prisma.orders.count({
        where: {
          created_at: { gte: startDate, lte: endDate },
          status: {
            in: [OrderStatus.COMPLETED, OrderStatus.REVIEWED, OrderStatus.RECEIVED],
          },
        },
      }),
      prisma.orders.count({ where: { created_at: { gte: startDate, lte: endDate } } }),
    ]);

    // Calculate revenue
    const completedStatusList = [OrderStatus.COMPLETED, OrderStatus.REVIEWED, OrderStatus.RECEIVED];
    const completedOrders = allTransactions.filter((t) =>
      completedStatusList.some((status) => status === t.status)
    );

    const totalRevenue = completedOrders.reduce((sum, order) => {
      const { totalAmount } = summarizeOrderTotals(order);
      return sum + totalAmount;
    }, 0);

    const totalCommissionRevenue = completedOrders.reduce((sum, order) => {
      const commissionAmount = order.commission_amount ? Number(order.commission_amount) : 0;
      return sum + commissionAmount;
    }, 0);

    // Get boost revenue stats
    const boostRevenueStats = await prisma.listing_promotions.aggregate({
      _sum: {
        paid_amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        paid_amount: { gt: 0 },
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const totalBoostRevenue = boostRevenueStats._sum.paid_amount
      ? Number(boostRevenueStats._sum.paid_amount)
      : 0;
    const paidPromotions = boostRevenueStats._count.id;

    // Get premium subscription stats
    const premiumRevenueStats = await prisma.premium_subscriptions.aggregate({
      _sum: {
        paid_amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        paid_amount: { gt: 0 },
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const totalPremiumRevenue = premiumRevenueStats._sum.paid_amount
      ? Number(premiumRevenueStats._sum.paid_amount)
      : 0;
    const newPremiumSubscriptions = premiumRevenueStats._count.id;

    // Calculate platform earnings
    const platformEarnings = totalCommissionRevenue + totalBoostRevenue + totalPremiumRevenue;

    const stats = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
        premium: premiumUsers,
        new: newUsers,
      },
      listings: {
        total: totalListings,
        active: activeListings,
        sold: soldListings,
        new: newListings,
      },
      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
      },
      revenue: {
        total: totalRevenue,
        commission: totalCommissionRevenue,
        boost: totalBoostRevenue,
        premium: totalPremiumRevenue,
        platformEarnings,
      },
      promotions: {
        paid: paidPromotions,
      },
      premium: {
        newSubscriptions: newPremiumSubscriptions,
      },
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error loading stats data:", error);
    return NextResponse.json({ error: "Failed to load stats data" }, { status: 500 });
  }
}

