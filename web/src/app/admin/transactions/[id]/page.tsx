"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Transaction, Review } from "@/types/admin";
import Link from "next/link";

export default function TransactionDetailPage() {
  const params = useParams();
  const transactionId = params.id as string;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactionDetails = async () => {
      try {
        setLoading(true);
        
        // Load transaction details
        const transactionRes = await fetch(`/api/admin/transactions/${transactionId}`, { cache: "no-store" });
        if (transactionRes.ok) {
          const transactionData = await transactionRes.json();
          setTransaction(transactionData);
        } else if (transactionRes.status === 404) {
          setError("Transaction not found");
        } else {
          throw new Error(`HTTP ${transactionRes.status}: Failed to load transaction`);
        }

        // Load related reviews
        try {
          const reviewsRes = await fetch(`/api/admin/transactions/${transactionId}/reviews`, { cache: "no-store" });
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json();
            setReviews(reviewsData.reviews || []);
          }
        } catch (error) {
          console.log("Could not load reviews:", error);
        }
      } catch (error) {
        console.error('Error loading transaction details:', error);
        setError(error instanceof Error ? error.message : "Failed to load transaction details");
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) loadTransactionDetails();
  }, [transactionId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Transaction Details</h2>
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
        <h2 className="text-xl font-semibold">Transaction Details</h2>
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
          <h1 className="text-2xl font-semibold">Transaction Details</h1>
          <p className="text-sm text-gray-600 mt-1">
            Transaction ID: {transactionId}
          </p>
        </div>
        <Link
          href="/admin/transactions"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Transactions
        </Link>
      </div>

      {transaction ? (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Transaction Information</h3>

              <div className="space-y-3 text-sm">
                <InfoRow label="Status" value={
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                } />

                <InfoRow label="Listing" value={
                  <div className="mt-1 flex items-start gap-3">
                    {transaction.listingImageUrl && (
                      <img
                        src={transaction.listingImageUrl}
                        alt={transaction.listingName || "Listing preview"}
                        className="w-16 h-16 rounded object-cover border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <Link
                        href={`/admin/listings/${transaction.listingId}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {transaction.listingName || `Listing ${transaction.listingId}`}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500 space-x-2">
                        {transaction.listingBrand && <span>Brand: {transaction.listingBrand}</span>}
                        {transaction.listingSize && <span>Size: {transaction.listingSize}</span>}
                        {transaction.listingCondition && <span>Condition: {transaction.listingCondition}</span>}
                      </div>
                      {transaction.listingDescription && (
                        <p className="mt-2 text-sm text-gray-600 leading-snug">
                          {transaction.listingDescription}
                        </p>
                      )}
                    </div>
                  </div>
                } />

                <InfoRow label="Quantity" value={transaction.quantity} />
                <InfoRow label="Price Each" value={`$${transaction.priceEach?.toFixed(2)}`} />
                <InfoRow label="Total Amount" value={
                  <span className="text-lg font-bold text-green-600">
                    ${((transaction.priceEach || 0) * transaction.quantity).toFixed(2)}
                  </span>
                } />

                {((transaction as any).commissionRate || (transaction as any).commissionAmount) && (
                  <>
                    <div className="border-t pt-3 mt-3">
                      <div className="text-xs uppercase text-gray-500 mb-2">Commission</div>
                      <InfoRow label="Commission Rate" value={(transaction as any).commissionRate ? `${((transaction as any).commissionRate * 100).toFixed(2)}%` : null} />
                      <InfoRow label="Commission Amount" value={(transaction as any).commissionAmount ? (
                        <span className="font-bold text-orange-600">
                          ${(transaction as any).commissionAmount.toFixed(2)}
                        </span>
                      ) : null} />
                      {(transaction as any).commissionAmount && (
                        <InfoRow label="Seller Receives" value={
                          <span className="font-bold text-green-600">
                            ${(((transaction.priceEach || 0) * transaction.quantity) - (transaction as any).commissionAmount).toFixed(2)}
                          </span>
                        } />
                      )}
                    </div>
                  </>
                )}

                <div className="border-t pt-3 mt-3">
                  <InfoRow label="Created At" value={new Date(transaction.createdAt).toLocaleString()} />
                  <InfoRow label="Updated At" value={(transaction as any).updatedAt ? new Date((transaction as any).updatedAt).toLocaleString() : null} />
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Parties & Reviews</h3>

              <div className="space-y-3 text-sm">
                <InfoRow label="Buyer" value={
                  <div>
                    <Link
                      href={`/admin/users/${transaction.buyerId}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {transaction.buyerName || `User ${transaction.buyerId}`}
                    </Link>
                    {transaction.buyerEmail && (
                      <div className="text-xs text-gray-500">{transaction.buyerEmail}</div>
                    )}
                  </div>
                } />

                <InfoRow label="Seller" value={
                  <div>
                    <Link
                      href={`/admin/users/${transaction.sellerId}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {transaction.sellerName || `User ${transaction.sellerId}`}
                    </Link>
                    {transaction.sellerEmail && (
                      <div className="text-xs text-gray-500">{transaction.sellerEmail}</div>
                    )}
                  </div>
                } />

                <div className="border-t pt-3 mt-3">
                  <InfoRow label="Reviews Submitted" value={`${reviews.length} / 2`} />

                  {reviews.length > 0 && (
                    <InfoRow label="Average Rating" value={
                      <span className="font-bold text-yellow-600">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}★
                      </span>
                    } />
                  )}

                  <InfoRow label="Buyer Review" value={
                    reviews.find(r => r.reviewerType === 'buyer') ? (
                      <span className="text-green-600">✓ Completed</span>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )
                  } />

                  <InfoRow label="Seller Review" value={
                    reviews.find(r => r.reviewerType === 'seller') ? (
                      <span className="text-green-600">✓ Completed</span>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )
                  } />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Payment Information */}
          {((transaction as any).shippingAddress || (transaction as any).shippingMethod || (transaction as any).paymentMethod || (transaction as any).notes) && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Shipping Information</h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Shipping Address" value={(transaction as any).shippingAddress} />
                  <InfoRow label="Shipping Method" value={(transaction as any).shippingMethod} />
                </div>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Payment & Notes</h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Payment Method" value={(transaction as any).paymentMethod} />
                  {(transaction as any).paymentMethodDetails && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                      <div className="text-xs text-gray-500 uppercase mb-1">Payment Details</div>
                      <InfoRow label="Type" value={(transaction as any).paymentMethodDetails.type} />
                      <InfoRow label="Label" value={(transaction as any).paymentMethodDetails.label} />
                      {(transaction as any).paymentMethodDetails.brand && (
                        <InfoRow label="Brand" value={(transaction as any).paymentMethodDetails.brand} />
                      )}
                      {(transaction as any).paymentMethodDetails.last4 && (
                        <InfoRow label="Card Number" value={`**** **** **** ${(transaction as any).paymentMethodDetails.last4}`} />
                      )}
                      {(transaction as any).paymentMethodDetails.expiryMonth && (transaction as any).paymentMethodDetails.expiryYear && (
                        <InfoRow label="Expiry" value={`${String((transaction as any).paymentMethodDetails.expiryMonth).padStart(2, '0')}/${(transaction as any).paymentMethodDetails.expiryYear}`} />
                      )}
                    </div>
                  )}
                  <InfoRow label="Notes" value={(transaction as any).notes} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center text-gray-500">
            Transaction not found or details could not be loaded.
          </div>
        </div>
      )}

      {/* Transaction Reviews */}
      <div id="reviews" className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Transaction Reviews
          {reviews.length > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              ({reviews.length} of 2 possible reviews)
            </span>
          )}
        </h3>

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/admin/users/${review.reviewerId}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {review.reviewerName}
                    </Link>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      review.reviewerType === 'buyer' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {review.reviewerType === 'buyer' ? 'Buyer Review' : 'Seller Review'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">
                      {review.rating}/5
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-3">{review.comment}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Review for: 
                    <Link
                      href={`/admin/users/${review.revieweeId}`}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      {review.revieweeName}
                    </Link>
                  </div>
                  <div>{new Date(review.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No reviews have been submitted for this transaction yet.
            {transaction?.status === 'completed' && (
              <div className="mt-2">
                <span className="text-sm">Reviews can be submitted after the transaction is completed.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-500">{label}:</span>
      <div className="font-medium">{value}</div>
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
