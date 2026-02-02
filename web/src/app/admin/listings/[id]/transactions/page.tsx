"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Transaction } from "@/types/admin";
import Link from "next/link";

export default function ListingTransactionsPage() {
  const params = useParams();
  const listingId = params.id as string;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/listings/${listingId}/transactions`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTransactions(data.transactions || []);
      } catch (error) {
        console.error('Error loading transactions:', error);
        setError(error instanceof Error ? error.message : "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };

    if (listingId) loadTransactions();
  }, [listingId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Listing Transactions</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Listing Transactions</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Listing Transactions</h1>
          <p className="text-sm text-gray-600 mt-1">
            {transactions.length} transactions for this listing
          </p>
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>Second-hand Platform:</strong> Each listing represents one item. Once completed, the item should be unlisted.
            </p>
          </div>
        </div>
        <Link
          href="/admin/listings"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Listings
        </Link>
      </div>

      {transactions.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Each</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-sm font-mono">{transaction.id}</td>
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
                    <td className="px-4 py-3 text-sm">${Number(transaction.priceEach || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      ${(Number(transaction.priceEach || 0) * transaction.quantity).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/transactions/${transaction.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No transactions found for this listing.
        </div>
      )}
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
