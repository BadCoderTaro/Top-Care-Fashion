"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { UserAccount, Transaction, Listing } from "@/types/admin";
import Link from "next/link";

function toStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
        }
      } catch {
        // Fall back to delimiter parsing below when JSON parsing fails.
      }
    }

    return trimmed
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

const AVATAR_SIZE_CLASSES: Record<number, string> = {
  48: "h-12 w-12",
  56: "h-14 w-14",
  64: "h-16 w-16",
  72: "h-[72px] w-[72px]",
};

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<UserAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState<{ averageRating: number | null; totalReviews: number }>({ 
    averageRating: null, 
    totalReviews: 0 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const AvatarCircle = ({
    name,
    url,
    size = 72,
  }: {
    name?: string | null;
    url?: string | null;
    size?: number;
  }) => {
    const initials = (name || "?").trim().charAt(0).toUpperCase() || "?";
    const sizeClass = AVATAR_SIZE_CLASSES[size] ?? AVATAR_SIZE_CLASSES[72];
    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold border border-gray-200 overflow-hidden ${sizeClass}`}>
        {url ? (
          <img
            src={url}
            alt={name || "User avatar"}
            className="w-full h-full object-cover"
            onError={(e) => {
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.textContent = initials;
                parent.classList.remove("overflow-hidden");
              }
            }}
          />
        ) : (
          initials
        )}
      </span>
    );
  };

  useEffect(() => {
    const loadUserDetails = async () => {
      try {
        setLoading(true);
        
        // Load user details
        const userRes = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        } else if (userRes.status === 404) {
          setError("User not found");
        } else {
          throw new Error(`HTTP ${userRes.status}: Failed to load user`);
        }

        // Load user's transactions
        try {
          const transactionsRes = await fetch(`/api/admin/users/${userId}/transactions`, { cache: "no-store" });
          if (transactionsRes.ok) {
            const transactionsData = await transactionsRes.json();
            setTransactions(transactionsData.transactions || []);
          }
        } catch (error) {
          console.log("Could not load transactions:", error);
        }

        // Load user's listings
        try {
          const listingsRes = await fetch(`/api/admin/users/${userId}/listings`, { cache: "no-store" });
          if (listingsRes.ok) {
            const listingsData = await listingsRes.json();
            setListings(listingsData.listings || []);
          }
        } catch (error) {
          console.log("Could not load listings:", error);
        }

        // Load user's reviews
        try {
          const reviewsRes = await fetch(`/api/admin/users/${userId}/reviews`, { cache: "no-store" });
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json();
            setReviews(reviewsData.reviews || []);
            // Coerce ratings to the correct types and guard against invalid values
            const rawAvg = reviewsData?.averageRating;
            const avg =
              typeof rawAvg === 'number'
                ? rawAvg
                : typeof rawAvg === 'string'
                ? parseFloat(rawAvg)
                : null;

            const safeAvg = Number.isFinite(avg as number) ? (avg as number) : null;
            const safeTotal = Number(reviewsData?.totalReviews) || 0;

            setUserRating({
              averageRating: safeAvg,
              totalReviews: safeTotal,
            });
          }
        } catch (error) {
          console.log("Could not load reviews:", error);
        }
      } catch (error) {
        console.error('Error loading user details:', error);
        setError(error instanceof Error ? error.message : "Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    if (userId) loadUserDetails();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">User Details</h2>
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
        <h2 className="text-xl font-semibold">User Details</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">User Details</h2>
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center text-gray-500">User not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AvatarCircle name={user.username} url={user.avatar_url} />
          <div>
            <h1 className="text-2xl font-semibold">User Details</h1>
            <p className="text-sm text-gray-600 mt-1">User ID: {userId}</p>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Users
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* User Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">User Information</h3>

          <div className="space-y-3 text-sm">
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Role" value={user.role} />
            <InfoRow label="Status" value={
              <span className={`px-2 py-1 text-xs rounded-full ${
                user.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.status}
              </span>
            } />
            <InfoRow label="Date of Birth" value={(user as any).dob ? new Date((user as any).dob).toLocaleDateString() : null} />
            <InfoRow label="Gender" value={(user as any).gender} />
            <InfoRow label="Phone" value={(user as any).phone_number || (user as any).phone} />
            <InfoRow label="Country" value={(user as any).country} />
            <InfoRow label="Location" value={(user as any).location} />
            <InfoRow label="Bio" value={(user as any).bio} />
            <InfoRow label="Supabase User ID" value={(user as any).supabase_user_id} />
            <InfoRow label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
            <InfoRow label="Last Sign In" value={(user as any).last_sign_in_at ? new Date((user as any).last_sign_in_at).toLocaleString() : null} />
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Statistics</h3>
          
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Total Listings:</span>
              <div className="text-lg font-bold text-blue-600">{listings.length}</div>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">Items Sold:</span>
              <div className="text-lg font-bold text-green-600">
                {transactions.filter(t => t.sellerId === userId && t.status === 'completed').length}
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-500">Items Bought:</span>
              <div className="text-lg font-bold text-blue-600">
                {transactions.filter(t => t.buyerId === userId && t.status === 'completed').length}
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-500">Active Listings:</span>
              <div className="text-lg font-bold text-purple-600">
                {listings.filter(l => l.listed).length}
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-500">Total Transactions:</span>
              <div className="text-lg font-bold text-gray-600">{transactions.length}</div>
            </div>

            <div>
              <span className="text-sm text-gray-500">User Rating:</span>
              <div className="flex items-center space-x-2">
                {userRating.averageRating !== null ? (
                  <>
                    <div className="text-lg font-bold text-yellow-600">
                      {userRating.averageRating.toFixed(1)}★
                    </div>
                    <div className="text-sm text-gray-500">
                      ({userRating.totalReviews} reviews)
                    </div>
                  </>
                ) : (
                  <div className="text-lg font-bold text-gray-400">No reviews yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Reviews */}
      {reviews.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Reviews Received ({userRating.totalReviews})
            {userRating.averageRating && (
              <span className="ml-2 text-yellow-600">
                {userRating.averageRating.toFixed(1)}★ average
              </span>
            )}
          </h3>
          <div className="space-y-4">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/admin/users/${review.reviewerId}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {review.reviewerName}
                    </Link>
                    <span className="text-sm text-gray-500">
                      ({review.reviewerType})
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
                <p className="text-gray-700 mb-2">{review.comment}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Transaction: 
                    <Link
                      href={`/admin/transactions/${review.transactionId}`}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      {review.transactionId}
                    </Link>
                    {review.listingName && (
                      <>
                        {" for "}
                        <Link
                          href={`/admin/listings/${review.listingId}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {review.listingName}
                        </Link>
                      </>
                    )}
                  </div>
                  <div>{new Date(review.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
          {reviews.length > 5 && (
            <div className="mt-4 text-center">
              <span className="text-gray-500">
                Showing 5 of {reviews.length} reviews
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Listing</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.slice(0, 10).map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="py-2">
                      <Link
                        href={`/admin/transactions/${transaction.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {transaction.id}
                      </Link>
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.buyerId === userId 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {transaction.buyerId === userId ? 'Bought' : 'Sold'}
                      </span>
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/listings/${transaction.listingId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {transaction.listingName || `Listing ${transaction.listingId}`}
                      </Link>
                    </td>
                    <td className="py-2">
                      ${((transaction.priceEach || 0) * transaction.quantity).toFixed(2)}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {transaction.status === 'completed' && (
                        <Link
                          href={`/admin/transactions/${transaction.id}#reviews`}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View Reviews
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Premium Management */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Premium Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Premium Status</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  user.is_premium ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.is_premium ? 'Premium Member' : 'Free Member'}
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  if (user.is_premium) {
                    // Revoke premium by expiring subscriptions
                    const res = await fetch(`/api/admin/users/${userId}/premium`, {
                      method: 'DELETE',
                    });

                    if (res.ok) {
                      const data = await res.json();
                      setUser({ ...user, is_premium: data.user.isPremium, premium_until: data.user.premiumUntil });
                    } else {
                      const error = await res.json();
                      alert(`Failed to revoke premium: ${error.error || 'Unknown error'}`);
                    }
                  } else {
                    // Grant premium by creating subscription
                    const months = prompt('Enter premium duration in months:', '12');
                    if (!months) return;
                    const monthsNum = parseInt(months);
                    if (isNaN(monthsNum) || monthsNum < 1) {
                      alert('Invalid number of months');
                      return;
                    }

                    const paidAmount = prompt('Enter paid amount (0 for free):', '0');
                    if (paidAmount === null) return;
                    const paidAmountNum = parseFloat(paidAmount);
                    if (isNaN(paidAmountNum) || paidAmountNum < 0) {
                      alert('Invalid paid amount');
                      return;
                    }

                    const res = await fetch(`/api/admin/users/${userId}/premium`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        months: monthsNum,
                        paidAmount: paidAmountNum,
                      }),
                    });

                    if (res.ok) {
                      const data = await res.json();
                      setUser({ ...user, is_premium: data.user.isPremium, premium_until: data.user.premiumUntil });
                    } else {
                      const error = await res.json();
                      alert(`Failed to grant premium: ${error.error || 'Unknown error'}`);
                    }
                  }
                } catch (error) {
                  console.error('Error updating premium status:', error);
                  alert('Error updating premium status');
                }
              }}
              className={`px-4 py-2 text-sm rounded-md ${
                user.is_premium
                  ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              {user.is_premium ? 'Remove Premium' : 'Grant Premium'}
            </button>
          </div>

          {user.premium_until && (
            <div>
              <div className="text-sm text-gray-500">Premium Until</div>
              <div className="font-medium">{new Date(user.premium_until).toLocaleDateString()}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm text-gray-500">Mix Match Used</div>
              <div className="font-semibold">{(user as any).mix_match_used_count || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Free Promotions Used</div>
              <div className="font-semibold">{(user as any).free_promotions_used || 0}</div>
            </div>
          </div>

          {(user as any).free_promotions_reset_at && (
            <div>
              <div className="text-sm text-gray-500">Promotions Reset At</div>
              <div className="font-medium">{new Date((user as any).free_promotions_reset_at).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* User Preferences */}
      {((user as any).preferred_styles || (user as any).preferred_brands || (user as any).preferred_size_top) && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">User Preferences</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Preferred Size (Top)" value={(user as any).preferred_size_top} />
            <InfoRow label="Preferred Size (Bottom)" value={(user as any).preferred_size_bottom} />
            <InfoRow label="Preferred Size (Shoe)" value={(user as any).preferred_size_shoe} />
            {(user as any).preferred_styles && (
              <div>
                <div className="text-gray-500 mb-2">Preferred Styles:</div>
                <div className="flex flex-wrap gap-2">
                  {toStringArray((user as any).preferred_styles).map((style, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(user as any).preferred_brands && (
              <div>
                <div className="text-gray-500 mb-2">Preferred Brands:</div>
                <div className="flex flex-wrap gap-2">
                  {toStringArray((user as any).preferred_brands).map((brand, i) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
        <div className="space-y-3 text-sm">
          <InfoRow label="Likes Visibility" value={(user as any).likes_visibility} />
          <InfoRow label="Follows Visibility" value={(user as any).follows_visibility} />
        </div>
      </div>

      {/* User's Listings */}
      {listings.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">User's Listings</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.slice(0, 6).map((listing) => (
              <div key={listing.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium truncate">{listing.name}</h4>
                  <div className="flex space-x-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      listing.listed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {listing.listed ? 'Listed' : 'Unlisted'}
                    </span>
                    {listing.sold && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        Sold
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {listing.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-green-600">
                    ${listing.price.toFixed(2)}
                  </span>
                  <Link
                    href={`/admin/listings/${listing.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {listings.length > 6 && (
            <div className="mt-4 text-center">
              <Link
                href={`/admin/listings?seller=${userId}`}
                className="text-blue-600 hover:text-blue-800"
              >
                View all {listings.length} listings →
              </Link>
            </div>
          )}
        </div>
      )}
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
