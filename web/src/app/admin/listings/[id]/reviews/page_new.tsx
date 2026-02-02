"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ListingReviewsPage() {
  const params = useParams();
  const listingId = params.id as string;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/listings/${listingId}/transactions`, {
          cache: "no-store"
        });
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
        <h2 className="text-xl font-semibold">Listing Reviews</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Listing Reviews</h2>
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
          <h1 className="text-2xl font-semibold">Reviews for Listing</h1>
          <p className="text-sm text-gray-600 mt-1">
            Listing ID: {listingId}
          </p>
        </div>
        <Link
          href={`/admin/listings/${listingId}`}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Listing
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>System Update:</strong> Reviews are now linked to transactions instead of listings. 
              This provides better tracking and allows both buyers and sellers to review each transaction.
            </p>
          </div>
        </div>
      </div>

      {transactions.length > 0 ? (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Transactions for this Listing ({transactions.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Reviews are now attached to individual transactions. Click on a transaction to view its reviews.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2">Transaction ID</th>
                  <th className="pb-2">Buyer</th>
                  <th className="pb-2">Seller</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="py-2">
                      <Link
                        href={`/admin/transactions/${transaction.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {transaction.id}
                      </Link>
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${transaction.buyerId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {transaction.buyerName || `User ${transaction.buyerId}`}
                      </Link>
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${transaction.sellerId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {transaction.sellerName || `User ${transaction.sellerId}`}
                      </Link>
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-2">
                      ${((transaction.priceEach || 0) * transaction.quantity).toFixed(2)}
                    </td>
                    <td className="py-2">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/transactions/${transaction.id}#reviews`}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        View Reviews
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No transactions found for this listing.</p>
            <p className="text-sm">Reviews will appear here once transactions are completed.</p>
          </div>
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
