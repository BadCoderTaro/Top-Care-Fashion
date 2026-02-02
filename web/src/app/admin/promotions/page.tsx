"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Promotion {
  id: number;
  listingId: number;
  sellerId: number;
  sellerUsername: string;
  listingName: string;
  listingPrice: number;
  listingImage: string | null;
  status: string;
  startedAt: string;
  endsAt: string | null;
  views: number;
  clicks: number;
  viewUplift: number;
  clickUplift: number;
  boostWeight: number;
  usedFreeCredit: boolean;
  paidAmount: number;
  ctr: string;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadPromotions();
  }, [statusFilter]);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      params.set("limit", "100");

      const res = await fetch(`/api/admin/promotions?${params}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setPromotions(data.data || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error loading promotions:", error);
      setError(error instanceof Error ? error.message : "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return "No end date";
    return new Date(isoDate).toLocaleDateString();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Boosted Listings Management</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Boosted Listings Management</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Boosted Listings Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all promotional boosts across the platform ({totalCount} total)
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              statusFilter === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              statusFilter === "ACTIVE"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("EXPIRED")}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              statusFilter === "EXPIRED"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Expired
          </button>
          <button
            onClick={() => setStatusFilter("SCHEDULED")}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              statusFilter === "SCHEDULED"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Scheduled
          </button>
        </div>
      </div>

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-gray-500">
            No {statusFilter.toLowerCase()} promotions found
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Listing
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Seller
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Performance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Uplift
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {promo.listingImage ? (
                            <Image
                              src={promo.listingImage}
                              alt={promo.listingName}
                              fill
                              className="object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/listings/${promo.listingId}`}
                            className="font-medium text-blue-600 hover:text-blue-800 block truncate"
                          >
                            {promo.listingName}
                          </Link>
                          <div className="text-sm text-gray-500">
                            ${promo.listingPrice.toFixed(2)} • Boost {promo.boostWeight}x
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${promo.sellerId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {promo.sellerUsername}
                      </Link>
                      {promo.paidAmount > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          Paid ${promo.paidAmount.toFixed(2)}
                        </div>
                      )}
                      {promo.usedFreeCredit && (
                        <div className="text-xs text-purple-600 mt-1">Free credit</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                          promo.status
                        )}`}
                      >
                        {promo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-900">{formatDate(promo.startedAt)}</div>
                      <div className="text-gray-500">
                        to {formatDate(promo.endsAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-900">
                        {promo.views.toLocaleString()} views
                      </div>
                      <div className="text-gray-500">
                        {promo.clicks.toLocaleString()} clicks • {promo.ctr}% CTR
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <div
                          className={`text-center px-2 py-1 rounded text-xs font-medium ${
                            promo.viewUplift >= 0
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          <div className="font-bold">
                            {promo.viewUplift >= 0 ? "+" : ""}
                            {promo.viewUplift}%
                          </div>
                          <div className="text-gray-500">Views</div>
                        </div>
                        <div
                          className={`text-center px-2 py-1 rounded text-xs font-medium ${
                            promo.clickUplift >= 0
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          <div className="font-bold">
                            {promo.clickUplift >= 0 ? "+" : ""}
                            {promo.clickUplift}%
                          </div>
                          <div className="text-gray-500">CTR</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/listings/${promo.listingId}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
