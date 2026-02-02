"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface QuickStats {
  users: number;
  listings: number;
  transactions: number;
  revenue: number;
}

export default function AdminHomePage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuickStats = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setStats({
            users: data.stats?.totalUsers || 0,
            listings: data.stats?.totalListings || 0,
            transactions: data.stats?.totalTransactions || 0,
            revenue: data.stats?.totalRevenue || 0,
          });
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuickStats();
  }, []);

  const navItems = [
    {
      title: "Dashboard",
      description: "Overview and statistics",
      href: "/admin/dashboard",
      icon: "📊",
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "Users",
      description: "Manage user accounts",
      href: "/admin/users",
      icon: "👥",
      color: "bg-green-50 border-green-200",
      stat: stats?.users,
    },
    {
      title: "Conversations",
      description: "View all platform conversations",
      href: "/admin/conversations",
      icon: "💬",
      color: "bg-cyan-50 border-cyan-200",
    },
    {
      title: "TOP Support",
      description: "Manage support conversations",
      href: "/admin/support",
      icon: "🎧",
      color: "bg-orange-50 border-orange-200",
    },
    {
      title: "Listings",
      description: "Manage product listings",
      href: "/admin/listings",
      icon: "📦",
      color: "bg-purple-50 border-purple-200",
      stat: stats?.listings,
    },
    {
      title: "Boosted Listings",
      description: "Manage promotional boosts",
      href: "/admin/promotions",
      icon: "🚀",
      color: "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300",
    },
    {
      title: "Transactions",
      description: "View and manage orders",
      href: "/admin/transactions",
      icon: "💳",
      color: "bg-yellow-50 border-yellow-200",
      stat: stats?.transactions,
    },
    {
      title: "Categories",
      description: "Organize product categories",
      href: "/admin/categories",
      icon: "🏷️",
      color: "bg-pink-50 border-pink-200",
    },
    {
      title: "Listing Images",
      description: "Manage image storage & cleanup",
      href: "/admin/listing-images",
      icon: "🖼️",
      color: "bg-indigo-50 border-indigo-200",
    },
    {
      title: "Flags",
      description: "Review flagged content and users",
      href: "/admin/reports",
      icon: "🚩",
      color: "bg-red-50 border-red-200",
    },
    {
      title: "Feedback",
      description: "View user feedback and suggestions",
      href: "/admin/feedback",
      icon: "💭",
      color: "bg-teal-50 border-teal-200",
    },
    {
      title: "FAQ",
      description: "Manage frequently asked questions",
      href: "/admin/faq",
      icon: "❓",
      color: "bg-amber-50 border-amber-200",
    },
    {
      title: "Landing Page",
      description: "Manage landing page content",
      href: "/admin/content",
      icon: "📝",
      color: "bg-slate-50 border-slate-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
        <p className="text-gray-600 mt-2">
          Manage your marketplace from this central dashboard
        </p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Users</div>
            <div className="text-2xl font-bold text-gray-900">{stats.users}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Listings</div>
            <div className="text-2xl font-bold text-gray-900">{stats.listings}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Transactions</div>
            <div className="text-2xl font-bold text-gray-900">{stats.transactions}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">${stats.revenue.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block border-2 rounded-xl p-6 hover:shadow-lg transition-all ${item.color}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{item.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
              {item.stat !== undefined && !loading && (
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{item.stat}</div>
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-500 flex items-center">
              View details
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/admin/support?filter=pending"
            className="p-4 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
          >
            <div className="font-medium text-gray-900">Pending Support</div>
            <div className="text-sm text-gray-600 mt-1">Reply to support messages</div>
          </Link>
          <Link
            href="/admin/listings?filter=unlisted"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="font-medium text-gray-900">Review Unlisted Items</div>
            <div className="text-sm text-gray-600 mt-1">Check items pending approval</div>
          </Link>
          <Link
            href="/admin/transactions?filter=pending"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="font-medium text-gray-900">Pending Transactions</div>
            <div className="text-sm text-gray-600 mt-1">Process pending orders</div>
          </Link>
          <Link
            href="/admin/users?filter=premium"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="font-medium text-gray-900">Premium Users</div>
            <div className="text-sm text-gray-600 mt-1">Manage premium memberships</div>
          </Link>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <strong>Admin Portal</strong> • Version 1.0
          </div>
          <div>
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
