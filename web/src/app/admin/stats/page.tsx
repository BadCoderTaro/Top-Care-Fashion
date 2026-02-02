"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Period = "d" | "w" | "m" | "y" | "custom";

interface StatsData {
  period: Period;
  startDate: string;
  endDate: string;
  users: {
    total: number;
    active: number;
    premium: number;
    new: number;
  };
  listings: {
    total: number;
    active: number;
    sold: number;
    new: number;
  };
  transactions: {
    total: number;
    completed: number;
  };
  revenue: {
    total: number;
    commission: number;
    boost: number;
    premium: number;
    platformEarnings: number;
  };
  promotions: {
    paid: number;
  };
  premium: {
    newSubscriptions: number;
  };
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("m");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadStats = async () => {
    try {
      setLoading(true);
      let url = `/api/admin/stats?period=${period}`;
      if (period === "custom") {
        if (!startDate || !endDate) {
          console.log("Waiting for date selection...");
          setLoading(false);
          return;
        }
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== "custom" || (startDate && endDate)) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, startDate, endDate]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Statistics</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Statistics</h2>
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
          <h1 className="text-2xl font-semibold">Statistics</h1>
          <p className="text-sm text-gray-600 mt-1">
            {formatDate(stats.startDate)} - {formatDate(stats.endDate)}
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Period Selector */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Time Period</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setPeriod("d")}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === "d"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod("w")}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === "w"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod("m")}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === "m"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod("y")}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === "y"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => setPeriod("custom")}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === "custom"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Custom Range
          </button>
        </div>

        {period === "custom" && (
          <div className="mt-4 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Platform Earnings Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-semibold mb-2">Platform Earnings</h3>
        <div className="text-4xl font-bold mb-4">
          ${stats.revenue.platformEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm opacity-90">Commission</div>
            <div className="text-lg font-semibold">
              ${stats.revenue.commission.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90">Boost</div>
            <div className="text-lg font-semibold">
              ${stats.revenue.boost.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90">Premium</div>
            <div className="text-lg font-semibold">
              ${stats.revenue.premium.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Revenue Breakdown */}
        <Link href="/admin/transactions" className="block">
          <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Revenue</h3>
              <span className="text-xs text-gray-500">→</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-2xl font-bold text-blue-600">
                  ${stats.revenue.total.toFixed(2)}
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Commission</span>
                  <span className="font-semibold text-orange-600">
                    ${stats.revenue.commission.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Boost</span>
                  <span className="font-semibold text-purple-600">
                    ${stats.revenue.boost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Premium</span>
                  <span className="font-semibold text-indigo-600">
                    ${stats.revenue.premium.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Users */}
        <Link href="/admin/users" className="block">
          <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Users</h3>
              <span className="text-xs text-gray-500">→</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">New Users</div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.users.new}
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-semibold">{stats.users.total}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="font-semibold text-green-600">{stats.users.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Premium</span>
                  <span className="font-semibold text-indigo-600">{stats.users.premium}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Listings */}
        <Link href="/admin/listings" className="block">
          <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Listings</h3>
              <span className="text-xs text-gray-500">→</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">New Listings</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.listings.new}
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-semibold">{stats.listings.total}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="font-semibold text-green-600">{stats.listings.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sold</span>
                  <span className="font-semibold text-gray-600">{stats.listings.sold}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Transactions */}
        <Link href="/admin/transactions" className="block">
          <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Transactions</h3>
              <span className="text-xs text-gray-500">→</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Total Transactions</div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.transactions.total}
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600">{stats.transactions.completed}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Promotions */}
        <Link href="/admin/promotions" className="block">
          <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Promotions</h3>
              <span className="text-xs text-gray-500">→</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Paid Promotions</div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.promotions.paid}
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-semibold text-purple-600">
                    ${stats.revenue.boost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Premium Subscriptions */}
        <Link href="/admin/users?filter=premium" className="block">
          <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Premium Subscriptions</h3>
              <span className="text-xs text-gray-500">→</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">New Subscriptions</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {stats.premium.newSubscriptions}
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-semibold text-indigo-600">
                    ${stats.revenue.premium.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

