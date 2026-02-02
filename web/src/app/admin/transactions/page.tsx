"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Transaction } from "@/types/admin";
import Link from "next/link";
import SearchBar from "@/components/admin/SearchBar";
import Pagination from "@/components/admin/Pagination";

type FilterType = "all" | "pending" | "paid" | "shipped" | "completed" | "cancelled";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>(
    (searchParams.get("filter") as FilterType) || "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

  const statusOptions: Transaction["status"][] = ["pending", "paid", "shipped", "completed", "cancelled"];

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "50",
        });
        const res = await fetch(`/api/admin/transactions?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPagination(data.pagination);
      } catch (error) {
        console.error('Error loading transactions:', error);
        setError(error instanceof Error ? error.message : "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [currentPage]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter !== "all" && transaction.status !== filter) return false;

    if (normalizedSearch) {
      const matchesCore = [
        transaction.listingName,
        transaction.buyerName,
        transaction.sellerName,
        transaction.buyerEmail,
        transaction.sellerEmail,
      ].some((value) => typeof value === "string" && value.toLowerCase().includes(normalizedSearch));

      if (!matchesCore) {
        return false;
      }
    }

    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const updateTransactionStatus = async (id: string, status: Transaction["status"]) => {
    const current = transactions.find((transaction) => transaction.id === id);
    if (!current || current.status === status) return;

    try {
      setUpdatingId(id);
      const res = await fetch(`/api/admin/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const serverMessage = payload?.error || payload?.message || `HTTP ${res.status}`;
        console.warn("Failed to update transaction status", serverMessage);
        alert(serverMessage);
        return;
      }

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === id ? { ...transaction, status } : transaction
        )
      );
    } catch (err) {
      console.error("Failed to update transaction status", err);
      alert(err instanceof Error ? err.message : "Failed to update transaction");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Transaction Management</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Transaction Management</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
        </div>
      </div>
    );
  }

  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.priceEach || 0) * t.quantity, 0);

  const totalCommissionRevenue = filteredTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + ((t as any).commissionAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transaction Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredTransactions.length} of {pagination.totalCount} transactions
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Total Revenue (Completed)</div>
          <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
          <div className="text-xs text-gray-600 mt-1">Commission: ${totalCommissionRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {(['pending', 'paid', 'shipped', 'completed', 'cancelled'] as const).map(status => {
          const count = transactions.filter(t => t.status === status).length;
          return (
            <div key={status} className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-600 capitalize">{status}</div>
              <div className="text-2xl font-bold">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Pagination - Top */}
      {!loading && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          placeholder="Search by listing, buyer, or seller..."
          className="flex-1"
        />
        <div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterType);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md"
            aria-label="Filter transactions by status"
          >
            <option value="all">All Transactions</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const total = ((transaction.priceEach || 0) * transaction.quantity).toFixed(2);
                  const isExpanded = expandedId === transaction.id;

                  return (
                    <Fragment key={transaction.id}>
                      <tr className="align-top">
                        <td className="px-4 py-3 text-sm font-mono">{transaction.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/admin/listings/${transaction.listingId}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {transaction.listingName || `Listing ${transaction.listingId}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/admin/users/${transaction.buyerId}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {transaction.buyerName || `User ${transaction.buyerId}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/admin/users/${transaction.sellerId}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {transaction.sellerName || `User ${transaction.sellerId}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">{transaction.quantity}</td>
                        <td className="px-4 py-3 text-sm font-medium">${total}</td>
                        <td className="px-4 py-3 text-sm">
                          {(transaction as any).commissionAmount ? (
                            <span className="text-orange-600 font-medium">
                              ${((transaction as any).commissionAmount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                            <select
                              value={transaction.status}
                              onChange={(e) => updateTransactionStatus(transaction.id, e.target.value as Transaction["status"])}
                              disabled={updatingId === transaction.id}
                              className="text-xs border rounded px-2 py-1 focus:outline-none"
                              aria-label="Update transaction status"
                            >
                              {statusOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/transactions/${transaction.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleExpand(transaction.id)}
                              className="text-sm text-gray-600 hover:text-gray-900"
                            >
                              {isExpanded ? "Hide" : "Details"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="px-4 py-4 bg-gray-50 text-sm">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="flex gap-3">
                                {transaction.listingImageUrl && (
                                  <img
                                    src={transaction.listingImageUrl}
                                    alt={transaction.listingName || "Listing image"}
                                    className="w-24 h-24 rounded object-cover border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                )}
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-900">
                                    {transaction.listingName || `Listing ${transaction.listingId}`}
                                  </div>
                                  {transaction.listingBrand && <div>Brand: {transaction.listingBrand}</div>}
                                  {transaction.listingSize && <div>Size: {transaction.listingSize}</div>}
                                  {transaction.listingCondition && (
                                    <div>Condition: {transaction.listingCondition}</div>
                                  )}
                                  {transaction.listingDescription && (
                                    <p className="text-gray-600 text-sm leading-snug">
                                      {transaction.listingDescription}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="grid gap-3 text-sm">
                                <div>
                                  <div className="text-xs uppercase text-gray-500">Buyer</div>
                                  <div className="font-medium text-gray-900">
                                    {transaction.buyerName || `User ${transaction.buyerId}`}
                                  </div>
                                  {transaction.buyerEmail && (
                                    <div className="text-xs text-gray-500">{transaction.buyerEmail}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs uppercase text-gray-500">Seller</div>
                                  <div className="font-medium text-gray-900">
                                    {transaction.sellerName || `User ${transaction.sellerId}`}
                                  </div>
                                  {transaction.sellerEmail && (
                                    <div className="text-xs text-gray-500">{transaction.sellerEmail}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs uppercase text-gray-500">Quantity</div>
                                  <div className="text-gray-800">{transaction.quantity}</div>
                                </div>
                                <div>
                                  <div className="text-xs uppercase text-gray-500">Total</div>
                                  <div className="text-gray-800">${total}</div>
                                </div>
                                {((transaction as any).commissionAmount) && (
                                  <>
                                    <div>
                                      <div className="text-xs uppercase text-gray-500">Commission</div>
                                      <div className="text-orange-600 font-medium">
                                        ${((transaction as any).commissionAmount).toFixed(2)}
                                        {(transaction as any).commissionRate && (
                                          <span className="text-xs text-gray-500 ml-1">
                                            ({((transaction as any).commissionRate * 100).toFixed(2)}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs uppercase text-gray-500">Seller Receives</div>
                                      <div className="text-green-600 font-medium">
                                        ${(parseFloat(total) - (transaction as any).commissionAmount).toFixed(2)}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          {searchTerm || filter !== "all"
            ? "No transactions match your search criteria."
            : "No transactions found."
          }
        </div>
      )}

      {/* Pagination - Bottom */}
      {!loading && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Transaction Management</h2>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      }
    >
      <TransactionsPageContent />
    </Suspense>
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
