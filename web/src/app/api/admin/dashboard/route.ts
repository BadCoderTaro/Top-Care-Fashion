import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserStatus, OrderStatus } from "@prisma/client";
import { summarizeOrderTotals } from "@/lib/admin-orders";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Calculate date ranges - Dashboard shows MONTHLY data only
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get user stats (THIS MONTH)
    const [totalUsers, activeUsers, premiumUsers, newUsersThisMonth] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.users.count({ where: { is_premium: true } }),
      prisma.users.count({ where: { created_at: { gte: startOfMonth, lte: endOfMonth } } }),
    ]);

    // Get listing stats (THIS MONTH)
    const [totalListings, activeListings, soldListings, newListingsThisMonth] = await Promise.all([
      prisma.listings.count(),
      prisma.listings.count({ where: { listed: true, sold: false } }),
      prisma.listings.count({ where: { sold: true } }),
      prisma.listings.count({ where: { created_at: { gte: startOfMonth, lte: endOfMonth } } }),
    ]);

    // Get transaction stats (THIS MONTH)
    const [allTransactions, completedTransactions, transactionsThisMonth] = await Promise.all([
      prisma.orders.findMany({
        where: {
          created_at: { gte: startOfMonth, lte: endOfMonth },
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
          created_at: { gte: startOfMonth, lte: endOfMonth },
          status: {
            in: [OrderStatus.COMPLETED, OrderStatus.REVIEWED, OrderStatus.RECEIVED],
          },
        },
      }),
      prisma.orders.count({ where: { created_at: { gte: startOfMonth, lte: endOfMonth } } }),
    ]);

    // Calculate revenue (THIS MONTH ONLY)
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

    // Get top items by views
    const topItemsRaw = await prisma.listings.findMany({
      select: {
        id: true,
        name: true,
        views_count: true,
        likes_count: true,
        clicks_count: true,
      },
      orderBy: {
        views_count: "desc",
      },
      take: 5,
    });

    // Get bag counts for each top item
    const topItems = await Promise.all(
      topItemsRaw.map(async (item) => {
        const bagCount = await prisma.cart_items.count({
          where: {
            listing_id: item.id,
            quantity: {
              gt: 0,
            },
          },
        });
        return {
          ...item,
          bag_count: bagCount,
        };
      })
    );

    // Get top sellers
    const topSellersData = await prisma.orders.groupBy({
      by: ["seller_id"],
      where: {
        status: {
          in: [OrderStatus.COMPLETED, OrderStatus.REVIEWED, OrderStatus.RECEIVED],
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const topSellers = await Promise.all(
      topSellersData.map(async (seller) => {
        const user = await prisma.users.findUnique({
          where: { id: seller.seller_id },
          select: {
            id: true,
            username: true,
            average_rating: true,
          },
        });

        const orders = await prisma.orders.findMany({
          where: {
            seller_id: seller.seller_id,
            status: {
              in: [OrderStatus.COMPLETED, OrderStatus.REVIEWED, OrderStatus.RECEIVED],
            },
          },
          include: {
            listing: {
              select: {
                price: true,
              },
            },
          },
        });

        const revenue = orders.reduce((sum, order) => {
          return sum + (order.listing?.price ? Number(order.listing.price) : 0);
        }, 0);

        return {
          id: String(seller.seller_id),
          username: user?.username || `User ${seller.seller_id}`,
          totalSales: seller._count.id,
          revenue,
          rating: user?.average_rating ? Number(user.average_rating) : null,
        };
      })
    );

    // Get recent transactions
    const recentOrders = await prisma.orders.findMany({
      take: 10,
      orderBy: { created_at: "desc" },
      include: {
        buyer: { select: { username: true } },
        seller: { select: { username: true } },
        listing: { select: { name: true, price: true } },
      },
    });

    const recentTransactions = recentOrders.map((order) => ({
      id: String(order.id),
      buyerName: order.buyer?.username || `User ${order.buyer_id}`,
      sellerName: order.seller?.username || `User ${order.seller_id}`,
      listingName: order.listing?.name || `Listing ${order.listing_id}`,
      amount: order.listing?.price ? Number(order.listing.price) : 0,
      status: order.status.toLowerCase(),
      createdAt: order.created_at.toISOString(),
    }));

    // Get promotion stats (THIS MONTH)
    const [
      totalPromotions,
      activePromotions,
      expiredPromotions,
      promotionsThisMonth,
    ] = await Promise.all([
      prisma.listing_promotions.count(),
      prisma.listing_promotions.count({
        where: {
          status: "ACTIVE",
          ends_at: { gt: now },
        },
      }),
      prisma.listing_promotions.count({
        where: { status: "EXPIRED" },
      }),
      prisma.listing_promotions.count({
        where: { created_at: { gte: startOfMonth, lte: endOfMonth } },
      }),
    ]);

    // Calculate boost revenue from paid_amount field (THIS MONTH ONLY)
    const boostRevenueThisMonthStats = await prisma.listing_promotions.aggregate({
      _sum: {
        paid_amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        paid_amount: { gt: 0 },
        created_at: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Get total paid promotions count (all time, for reference)
    const paidPromotionsTotal = await prisma.listing_promotions.count({
      where: {
        paid_amount: { gt: 0 },
      },
    });

    const totalBoostRevenue = boostRevenueThisMonthStats._sum.paid_amount
      ? Number(boostRevenueThisMonthStats._sum.paid_amount)
      : 0;
    const paidPromotionsThisMonth = boostRevenueThisMonthStats._count.id;

    // Get premium subscription stats
    const [
      totalPremiumSubscriptions,
      activePremiumSubscriptions,
      expiredPremiumSubscriptions,
      premiumSubscriptionsThisMonth,
    ] = await Promise.all([
      prisma.premium_subscriptions.count(),
      prisma.premium_subscriptions.count({
        where: {
          status: "ACTIVE",
          ends_at: { gt: now },
        },
      }),
      prisma.premium_subscriptions.count({
        where: { status: "EXPIRED" },
      }),
      prisma.premium_subscriptions.count({
        where: { created_at: { gte: startOfMonth, lte: endOfMonth } },
      }),
    ]);

    // Calculate premium subscription revenue (THIS MONTH ONLY)
    const premiumRevenueThisMonthStats = await prisma.premium_subscriptions.aggregate({
      _sum: {
        paid_amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        paid_amount: { gt: 0 },
        created_at: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const totalPremiumRevenue = premiumRevenueThisMonthStats._sum.paid_amount
      ? Number(premiumRevenueThisMonthStats._sum.paid_amount)
      : 0;
    const paidPremiumSubscriptionsThisMonth = premiumRevenueThisMonthStats._count.id;

    // Get promotion performance stats
    const promotionPerformance = await prisma.listing_promotions.aggregate({
      where: {
        status: "ACTIVE",
        ends_at: { gt: now },
      },
      _sum: {
        views: true,
        clicks: true,
      },
      _avg: {
        view_uplift_percent: true,
        click_uplift_percent: true,
      },
    });

    // Get top boosted listings by performance
    const topBoostedListings = await prisma.listing_promotions.findMany({
      where: {
        status: "ACTIVE",
        ends_at: { gt: now },
        views: { gt: 0 },
      },
      select: {
        id: true,
        listing_id: true,
        views: true,
        clicks: true,
        view_uplift_percent: true,
        click_uplift_percent: true,
        listing: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        views: "desc",
      },
      take: 5,
    });

    const stats = {
      totalUsers,
      activeUsers,
      premiumUsers,
      totalListings,
      activeListings,
      soldListings,
      totalTransactions: allTransactions.length,
      completedTransactions,
      totalRevenue,
      totalCommissionRevenue,
      totalBoostRevenue,
      totalPremiumRevenue,
      paidPromotionsTotal,
      paidPromotionsThisMonth,
      newUsersThisMonth,
      newListingsThisMonth,
      transactionsThisMonth,
      // Promotion stats
      totalPromotions,
      activePromotions,
      expiredPromotions,
      promotionsThisMonth,
      promotionTotalViews: promotionPerformance._sum.views ?? 0,
      promotionTotalClicks: promotionPerformance._sum.clicks ?? 0,
      promotionAvgViewUplift: promotionPerformance._avg.view_uplift_percent
        ? Math.round(promotionPerformance._avg.view_uplift_percent)
        : 0,
      promotionAvgClickUplift: promotionPerformance._avg.click_uplift_percent
        ? Math.round(promotionPerformance._avg.click_uplift_percent)
        : 0,
      // Premium subscription stats
      totalPremiumSubscriptions,
      activePremiumSubscriptions,
      expiredPremiumSubscriptions,
      premiumSubscriptionsThisMonth,
      paidPremiumSubscriptionsThisMonth,
    };

    return NextResponse.json({
      stats,
      topItems: topItems.map((item) => ({
        id: String(item.id),
        name: item.name,
        views: item.views_count || 0,
        likes: item.likes_count || 0,
        clicks: item.clicks_count || 0,
        bag: item.bag_count || 0,
      })),
      topSellers,
      recentTransactions,
      topBoostedListings: topBoostedListings.map((promo) => ({
        id: String(promo.id),
        listingId: String(promo.listing_id),
        listingName: promo.listing?.name || `Listing ${promo.listing_id}`,
        views: promo.views ?? 0,
        clicks: promo.clicks ?? 0,
        viewUplift: promo.view_uplift_percent ?? 0,
        clickUplift: promo.click_uplift_percent ?? 0,
        ctr: promo.views > 0 ? ((promo.clicks / promo.views) * 100).toFixed(2) : "0",
      })),
    });
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
