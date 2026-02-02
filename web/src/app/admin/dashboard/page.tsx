"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  totalListings: number;
  activeListings: number;
  soldListings: number;
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number; // THIS MONTH
  totalCommissionRevenue: number; // THIS MONTH
  totalBoostRevenue: number; // THIS MONTH
  totalPremiumRevenue: number; // THIS MONTH
  paidPromotionsTotal: number;
  paidPromotionsThisMonth: number;
  newUsersThisMonth: number;
  newListingsThisMonth: number;
  transactionsThisMonth: number;
  // Promotion stats
  totalPromotions: number;
  activePromotions: number;
  expiredPromotions: number;
  promotionsThisMonth: number;
  promotionTotalViews: number;
  promotionTotalClicks: number;
  promotionAvgViewUplift: number;
  promotionAvgClickUplift: number;
  // Premium subscription stats
  totalPremiumSubscriptions: number;
  activePremiumSubscriptions: number;
  expiredPremiumSubscriptions: number;
  premiumSubscriptionsThisMonth: number;
  paidPremiumSubscriptionsThisMonth: number;
}

interface TopItem {
  id: string;
  name: string;
  views: number;
  likes: number;
  clicks: number;
  bag: number;
}

interface TopSeller {
  id: string;
  username: string;
  totalSales: number;
  revenue: number;
  rating: number | null;
}

interface RecentTransaction {
  id: string;
  buyerName: string;
  sellerName: string;
  listingName: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface TopBoostedListing {
  id: string;
  listingId: string;
  listingName: string;
  views: number;
  clicks: number;
  viewUplift: number;
  clickUplift: number;
  ctr: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [topBoostedListings, setTopBoostedListings] = useState<TopBoostedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setStats(data.stats);
        setTopItems(data.topItems || []);
        setTopSellers(data.topSellers || []);
        setRecentTransactions(data.recentTransactions || []);
        setTopBoostedListings(data.topBoostedListings || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error instanceof Error ? error.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center text-gray-500">No data available.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Overview of your marketplace performance (This Month)
          </p>
        </div>
        <Link
          href="/admin/stats"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          View Detailed Stats
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtext={`${stats.activeUsers} active, ${stats.premiumUsers} premium`}
          color="blue"
          link="/admin/users"
        />
        <StatCard
          title="Total Listings"
          value={stats.totalListings}
          subtext={`${stats.activeListings} active, ${stats.soldListings} sold`}
          color="green"
          link="/admin/listings"
        />
        <StatCard
          title="Transactions"
          value={stats.totalTransactions}
          subtext={`${stats.completedTransactions} completed`}
          color="purple"
          link="/admin/transactions"
        />
        <StatCard
          title="Revenue This Month"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          subtext={`${stats.completedTransactions} completed orders`}
          color="yellow"
          link="/admin/transactions"
        />
      </div>

      {/* Revenue Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Breakdown (THIS MONTH) */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Breakdown (This Month)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-xs text-gray-500 mt-1">All completed transactions</div>
              </div>
              <div className="text-xl font-bold text-blue-600">
                ${stats.totalRevenue.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Commission Revenue</div>
                <div className="text-xs text-gray-500 mt-1">Platform earnings from sales</div>
              </div>
              <div className="text-xl font-bold text-orange-600">
                ${stats.totalCommissionRevenue.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Boost Revenue</div>
                <div className="text-xs text-gray-500 mt-1">{stats.paidPromotionsThisMonth} paid promotions</div>
              </div>
              <div className="text-xl font-bold text-purple-600">
                ${stats.totalBoostRevenue.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Premium Revenue</div>
                <div className="text-xs text-gray-500 mt-1">{stats.paidPremiumSubscriptionsThisMonth} new subscriptions</div>
              </div>
              <div className="text-xl font-bold text-indigo-600">
                ${stats.totalPremiumRevenue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Platform Earnings (THIS MONTH) */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Platform Earnings (This Month)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Total Platform Earnings</div>
                <div className="text-xs text-gray-500 mt-1">Commission + Boost + Premium</div>
              </div>
              <div className="text-xl font-bold text-blue-600">
                ${(stats.totalCommissionRevenue + stats.totalBoostRevenue + stats.totalPremiumRevenue).toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Commission Revenue</div>
                <div className="text-xs text-gray-500 mt-1">From transaction fees</div>
              </div>
              <div className="text-xl font-bold text-orange-600">
                ${stats.totalCommissionRevenue.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Boost Revenue</div>
                <div className="text-xs text-gray-500 mt-1">From paid promotions</div>
              </div>
              <div className="text-xl font-bold text-purple-600">
                ${stats.totalBoostRevenue.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <div className="text-sm text-gray-600">Premium Revenue</div>
                <div className="text-xs text-gray-500 mt-1">From subscriptions</div>
              </div>
              <div className="text-xl font-bold text-indigo-600">
                ${stats.totalPremiumRevenue.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Revenue Mix</div>
                <div className="text-xs text-gray-500 mt-1">Commission / Boost / Premium</div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                {stats.totalCommissionRevenue + stats.totalBoostRevenue + stats.totalPremiumRevenue > 0
                  ? `${((stats.totalCommissionRevenue / (stats.totalCommissionRevenue + stats.totalBoostRevenue + stats.totalPremiumRevenue)) * 100).toFixed(0)}% / ${((stats.totalBoostRevenue / (stats.totalCommissionRevenue + stats.totalBoostRevenue + stats.totalPremiumRevenue)) * 100).toFixed(0)}% / ${((stats.totalPremiumRevenue / (stats.totalCommissionRevenue + stats.totalBoostRevenue + stats.totalPremiumRevenue)) * 100).toFixed(0)}%`
                  : "0% / 0% / 0%"
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity (THIS MONTH) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActivityCard
          title="New Users"
          value={stats.newUsersThisMonth}
          period="This Month"
          color="blue"
        />
        <ActivityCard
          title="New Listings"
          value={stats.newListingsThisMonth}
          period="This Month"
          color="green"
        />
        <ActivityCard
          title="Transactions"
          value={stats.transactionsThisMonth}
          period="This Month"
          color="purple"
        />
      </div>

      {/* Boost/Promotion Overview */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Boost Overview</h3>
          <Link
            href="/admin/promotions"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{stats.activePromotions}</div>
            <div className="text-sm text-blue-600 mt-1">Active Boosts</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalPromotions} total • {stats.expiredPromotions} expired
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{stats.promotionTotalViews.toLocaleString()}</div>
            <div className="text-sm text-green-600 mt-1">Total Views</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.promotionTotalClicks.toLocaleString()} clicks
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              {stats.promotionAvgViewUplift >= 0 ? '+' : ''}{stats.promotionAvgViewUplift}%
            </div>
            <div className="text-sm text-purple-600 mt-1">Avg View Uplift</div>
            <div className="text-xs text-gray-500 mt-1">vs baseline period</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">
              {stats.promotionAvgClickUplift >= 0 ? '+' : ''}{stats.promotionAvgClickUplift}%
            </div>
            <div className="text-sm text-orange-600 mt-1">Avg CTR Uplift</div>
            <div className="text-xs text-gray-500 mt-1">vs baseline period</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{stats.promotionsThisMonth}</span> new boosts this month
          </div>
        </div>
      </div>

      {/* Premium Subscription Overview */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Premium Subscriptions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-700">{stats.activePremiumSubscriptions}</div>
            <div className="text-sm text-amber-600 mt-1">Active Premium</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalPremiumSubscriptions} total • {stats.expiredPremiumSubscriptions} expired
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">${stats.totalPremiumRevenue.toLocaleString()}</div>
            <div className="text-sm text-green-600 mt-1">Total Revenue</div>
            <div className="text-xs text-gray-500 mt-1">
              All-time premium earnings
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              ${stats.totalPremiumRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600 mt-1">Premium Revenue</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.paidPremiumSubscriptionsThisMonth} new subscriptions this month
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              {stats.premiumSubscriptionsThisMonth}
            </div>
            <div className="text-sm text-purple-600 mt-1">This Month</div>
            <div className="text-xs text-gray-500 mt-1">New subscriptions</div>
          </div>
        </div>
      </div>

      {/* Top Boosted Listings */}
      {topBoostedListings.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Boosted Listings</h3>
          <div className="space-y-3">
            {topBoostedListings.map((item) => (
              <Link
                key={item.id}
                href={`/admin/listings/${item.listingId}`}
                className="block p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.listingName}</div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        👁 {item.views} views
                      </span>
                      <span className="text-gray-600">
                        👆 {item.clicks} clicks
                      </span>
                      <span className="text-gray-600">
                        CTR {item.ctr}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 ml-4">
                    <div className="text-center px-3 py-2 bg-white rounded-lg shadow-sm">
                      <div className={`text-lg font-bold ${item.viewUplift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.viewUplift >= 0 ? '+' : ''}{item.viewUplift}%
                      </div>
                      <div className="text-xs text-gray-500">Views</div>
                    </div>
                    <div className="text-center px-3 py-2 bg-white rounded-lg shadow-sm">
                      <div className={`text-lg font-bold ${item.clickUplift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.clickUplift >= 0 ? '+' : ''}{item.clickUplift}%
                      </div>
                      <div className="text-xs text-gray-500">CTR</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Items & Top Sellers */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Items */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Items</h3>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/listings/${item.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      👁 {item.views} | ❤ {item.likes} | 👆 {item.clicks} | 🛒 {item.bag}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No data available</div>
          )}
        </div>

        {/* Top Sellers */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Sellers</h3>
          {topSellers.length > 0 ? (
            <div className="space-y-3">
              {topSellers.map((seller) => (
                <Link
                  key={seller.id}
                  href={`/admin/users/${seller.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{seller.username}</div>
                      <div className="text-sm text-gray-600">
                        {seller.totalSales} sales • ${seller.revenue.toFixed(2)} revenue
                      </div>
                    </div>
                    {seller.rating && (
                      <div className="text-sm text-yellow-600 font-medium">
                        {seller.rating.toFixed(1)}★
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Link
            href="/admin/transactions"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View All →
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Buyer</th>
                  <th className="pb-2">Seller</th>
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs">{transaction.id}</td>
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${transaction.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {transaction.buyerName}
                      </Link>
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${transaction.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {transaction.sellerName}
                      </Link>
                    </td>
                    <td className="py-2">{transaction.listingName}</td>
                    <td className="py-2 font-medium">${transaction.amount.toFixed(2)}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No recent transactions</div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtext,
  color,
  link,
}: {
  title: string;
  value: string | number;
  subtext: string;
  color: "blue" | "green" | "purple" | "yellow";
  link?: string;
}) {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-50",
    green: "border-green-500 bg-green-50",
    purple: "border-purple-500 bg-purple-50",
    yellow: "border-yellow-500 bg-yellow-50",
  };

  const content = (
    <div className={`border-l-4 ${colorClasses[color]} rounded-lg p-4`}>
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtext}</div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block hover:opacity-80 transition">
        {content}
      </Link>
    );
  }

  return content;
}

function ActivityCard({
  title,
  value,
  period,
  color,
}: {
  title: string;
  value: number;
  period: string;
  color: "blue" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    purple: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className={`px-2 py-1 text-xs rounded-full ${colorClasses[color]}`}>
          {period}
        </span>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'paid':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
