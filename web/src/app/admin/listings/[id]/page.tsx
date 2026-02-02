"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Listing } from "@/types/admin";
import Link from "next/link";

interface Promotion {
  id: string;
  status: string;
  startedAt: string;
  endsAt: string | null;
  views: number;
  clicks: number;
  viewUpliftPercent: number;
  clickUpliftPercent: number;
  usedFreeCredit: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EnhancedListing extends Listing {
  categoryName?: string | null;
  originalPrice?: number | null;
  material?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  sku?: string | null;
  inventoryCount?: number;
  viewsCount?: number;
  likesCount?: number;
  clicksCount?: number;
  bagCount?: number;
  gender?: string | null;
  shippingOption?: string | null;
  shippingFee?: number | null;
  location?: string | null;
  updatedAt?: string | null;
  promotions?: Promotion[];
}

function toImageArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((url): url is string => typeof url === "string" && url.trim().length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed)
          ? parsed.filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
          : [];
      } catch {
        return [];
      }
    }
    return [trimmed];
  }
  if (typeof value === "object" && value !== null) {
    const maybeArray = (value as { imageUrls?: unknown }).imageUrls;
    return toImageArray(maybeArray);
  }
  return [];
}

function ListingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  const [listing, setListing] = useState<EnhancedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePromotion, setShowCreatePromotion] = useState(false);
  const [promotionEndDate, setPromotionEndDate] = useState("");
  const [useFreeCredit, setUseFreeCredit] = useState(false);
  const [creatingPromotion, setCreatingPromotion] = useState(false);
  const [timeSeriesStats, setTimeSeriesStats] = useState<Array<{
    date: string;
    views: number;
    likes: number;
    clicks: number;
  }> | null>(null);

  const loadListingDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/listings/${listingId}`, { cache: "no-store" });
      if (res.ok) {
        const listingData = await res.json();
        const normalizedImages = toImageArray(listingData.imageUrls ?? listingData.imageUrl ?? listingData.image_url);
        const normalizedListing: EnhancedListing = {
          ...listingData,
          imageUrls: normalizedImages,
          imageUrl: listingData.imageUrl ?? listingData.image_url ?? normalizedImages[0] ?? null,
        };
        setListing(normalizedListing);
        
        // Load time series stats
        try {
          const statsRes = await fetch(`/api/listings/${listingId}/stats`, { cache: "no-store" });
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            if (statsData.success && statsData.data.timeSeries) {
              setTimeSeriesStats(statsData.data.timeSeries);
            }
          }
        } catch (statsError) {
          console.warn('Failed to load time series stats:', statsError);
        }
      } else if (res.status === 404) {
        setError("Listing not found");
      } else {
        throw new Error(`HTTP ${res.status}: Failed to load listing`);
      }
    } catch (error) {
      console.error('Error loading listing details:', error);
      setError(error instanceof Error ? error.message : "Failed to load listing details");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = async () => {
    if (!listing) return;

    setCreatingPromotion(true);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          sellerId: listing.sellerId,
          endsAt: promotionEndDate || null,
          usedFreeCredit: useFreeCredit,
        }),
      });

      if (res.ok) {
        alert('Promotion created successfully!');
        setShowCreatePromotion(false);
        setPromotionEndDate('');
        setUseFreeCredit(false);
        await loadListingDetails();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create promotion');
      }
    } catch (err) {
      console.error('Error creating promotion:', err);
      alert('Error creating promotion');
    } finally {
      setCreatingPromotion(false);
    }
  };

  const handleStopPromotion = async (promotionId: number) => {
    if (!confirm('Are you sure you want to stop this promotion?')) return;

    try {
      const res = await fetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      });

      if (res.ok) {
        alert('Promotion stopped successfully!');
        await loadListingDetails();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to stop promotion');
      }
    } catch (err) {
      console.error('Error stopping promotion:', err);
      alert('Error stopping promotion');
    }
  };

  const handleDeletePromotion = async (promotionId: number) => {
    if (!confirm('Are you sure you want to delete this promotion? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/promotions/${promotionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Promotion deleted successfully!');
        await loadListingDetails();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete promotion');
      }
    } catch (err) {
      console.error('Error deleting promotion:', err);
      alert('Error deleting promotion');
    }
  };

  useEffect(() => {
    if (listingId) loadListingDetails();
  }, [listingId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Listing Details</h2>
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
        <h2 className="text-xl font-semibold">Listing Details</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Listing Details</h2>
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center text-gray-500">Listing not found.</div>
        </div>
      </div>
    );
  }

  const images = toImageArray(listing.imageUrls);
  const coverImage = listing.imageUrl || images[0] || null;
  const gallery = coverImage ? images.filter((url) => url !== coverImage) : images;

  const activePromotion = listing.promotions?.find(p => p.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Listing Details</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-600">Listing ID: {listingId}</p>
            {listing.txStatus && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${getTxColor(listing.txStatus)}`}>
                {listing.txStatus}
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                listing.listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {listing.listed ? 'Listed' : 'Unlisted'}
            </span>
            {listing.sold && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Sold</span>
            )}
            {activePromotion && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">Promoted</span>
            )}
          </div>
        </div>
        <Link
          href="/admin/listings"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Listings
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Images */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          {coverImage ? (
            <img
              src={coverImage}
              alt={listing.name}
              className="w-full rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400">
              No image available
            </div>
          )}
          {gallery.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {gallery.map((url, idx) => (
                <img
                  key={`${listing.id}-gallery-${idx}`}
                  src={url}
                  alt={`${listing.name} image ${idx + 2}`}
                  className="w-20 h-20 rounded object-cover border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

          <div className="space-y-3 text-sm">
            <InfoRow label="Name" value={listing.name} className="text-lg font-medium" />
            <InfoRow label="Description" value={listing.description} />
            <InfoRow label="Category" value={listing.categoryName || listing.categoryId} />
            <InfoRow label="Brand" value={listing.brand} />
            <InfoRow label="Size" value={listing.size} />
            <InfoRow label="Gender" value={listing.gender} />
            <InfoRow label="Condition" value={listing.conditionType?.replace('_', ' ')} className="capitalize" />
            <InfoRow label="Material" value={listing.material} />
            <InfoRow label="Dimensions" value={listing.dimensions} />
            <InfoRow label="Weight" value={listing.weight ? `${listing.weight} kg` : null} />
            <InfoRow label="SKU" value={listing.sku} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pricing & Inventory */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Pricing & Inventory</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Current Price" value={`$${listing.price?.toFixed(2)}`} className="text-2xl font-bold text-green-600" />
            <InfoRow label="Original Price" value={listing.originalPrice ? `$${listing.originalPrice.toFixed(2)}` : null} />
            <InfoRow label="Inventory Count" value={listing.inventoryCount?.toString()} />
            <InfoRow label="Shipping Option" value={listing.shippingOption} />
            <InfoRow label="Shipping Fee" value={listing.shippingFee ? `$${listing.shippingFee.toFixed(2)}` : null} />
            <InfoRow label="Location" value={listing.location} />
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Statistics</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Views" value={listing.viewsCount?.toString() || '0'} />
            <InfoRow label="Likes" value={listing.likesCount?.toString() || '0'} />
            <InfoRow label="Clicks" value={listing.clicksCount?.toString() || '0'} />
            <InfoRow label="Bag Adds" value={typeof listing.bagCount === "number" ? listing.bagCount.toString() : '0'} />
            <InfoRow label="Status" value={
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  listing.listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {listing.listed ? 'Listed' : 'Unlisted'}
                </span>
                {listing.sold && (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Sold</span>
                )}
              </div>
            } />
            <InfoRow label="Created At" value={new Date(listing.createdAt).toLocaleString()} />
            <InfoRow label="Updated At" value={listing.updatedAt ? new Date(listing.updatedAt).toLocaleString() : null} />
            <InfoRow label="Sold At" value={listing.soldAt ? new Date(listing.soldAt).toLocaleString() : null} />
          </div>
          
          {/* Time Series Chart */}
          {timeSeriesStats && timeSeriesStats.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-md font-semibold mb-4">30-Day Trend</h4>
              <div className="space-y-4">
                {/* Views Chart */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600">Views</span>
                    <span className="text-xs text-gray-500">
                      Max: {Math.max(...timeSeriesStats.map(d => d.views))}
                    </span>
                  </div>
                  <div className="h-20 bg-gray-100 rounded flex items-end gap-1 p-1">
                    {timeSeriesStats.map((stat, idx) => {
                      const maxViews = Math.max(...timeSeriesStats.map(d => d.views), 1);
                      const height = (stat.views / maxViews) * 100;
                      return (
                        <div
                          key={`views-${idx}`}
                          className="flex-1 bg-blue-500 rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${stat.date}: ${stat.views} views`}
                        />
                      );
                    })}
                  </div>
                </div>
                
                {/* Likes Chart */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600">Likes</span>
                    <span className="text-xs text-gray-500">
                      Max: {Math.max(...timeSeriesStats.map(d => d.likes))}
                    </span>
                  </div>
                  <div className="h-20 bg-gray-100 rounded flex items-end gap-1 p-1">
                    {timeSeriesStats.map((stat, idx) => {
                      const maxLikes = Math.max(...timeSeriesStats.map(d => d.likes), 1);
                      const height = (stat.likes / maxLikes) * 100;
                      return (
                        <div
                          key={`likes-${idx}`}
                          className="flex-1 bg-green-500 rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${stat.date}: ${stat.likes} likes`}
                        />
                      );
                    })}
                  </div>
                </div>
                
                {/* Clicks Chart */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600">Clicks</span>
                    <span className="text-xs text-gray-500">
                      Max: {Math.max(...timeSeriesStats.map(d => d.clicks))}
                    </span>
                  </div>
                  <div className="h-20 bg-gray-100 rounded flex items-end gap-1 p-1">
                    {timeSeriesStats.map((stat, idx) => {
                      const maxClicks = Math.max(...timeSeriesStats.map(d => d.clicks), 1);
                      const height = (stat.clicks / maxClicks) * 100;
                      return (
                        <div
                          key={`clicks-${idx}`}
                          className="flex-1 bg-purple-500 rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${stat.date}: ${stat.clicks} clicks`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seller Information */}
      {listing.sellerId && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Seller Information</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Seller" value={
              <Link
                href={`/admin/users/${listing.sellerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {listing.sellerName || `User ${listing.sellerId}`}
              </Link>
            } />
            <InfoRow label="Seller ID" value={listing.sellerId} />
          </div>
        </div>
      )}

      {/* Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {listing.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Promotions / Boost Management */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Promotions & Boosts</h3>
          {!activePromotion && listing.listed && !listing.sold && !showCreatePromotion && (
            <button
              onClick={() => setShowCreatePromotion(true)}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Create Promotion
            </button>
          )}
        </div>

        {/* Create Promotion Form */}
        {showCreatePromotion && (
          <div className="mb-6 border rounded-lg p-4 bg-purple-50">
            <h4 className="font-semibold mb-3">Create New Promotion</h4>
            <div className="space-y-3">
              <div>
                <label htmlFor="promotionEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  id="promotionEndDate"
                  value={promotionEndDate}
                  onChange={(e) => setPromotionEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min={new Date().toISOString().split('T')[0]}
                  aria-label="Promotion end date"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no end date</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useFreeCredit"
                  checked={useFreeCredit}
                  onChange={(e) => setUseFreeCredit(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useFreeCredit" className="text-sm">
                  Use seller's free promotion credit
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreatePromotion}
                  disabled={creatingPromotion}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {creatingPromotion ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePromotion(false);
                    setPromotionEndDate('');
                    setUseFreeCredit(false);
                  }}
                  disabled={creatingPromotion}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {listing.promotions && listing.promotions.length > 0 ? (
          <div className="space-y-4">
            {listing.promotions.map((promo) => (
              <div key={promo.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      promo.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : promo.status === 'EXPIRED'
                        ? 'bg-gray-100 text-gray-800'
                        : promo.status === 'PAUSED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {promo.status}
                    </span>
                    {promo.usedFreeCredit && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Free Credit
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">ID: {promo.id}</span>
                    {promo.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleStopPromotion(Number(promo.id))}
                        className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                      >
                        Stop
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePromotion(Number(promo.id))}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Views</div>
                    <div className="font-semibold">{promo.views}</div>
                    {promo.viewUpliftPercent > 0 && (
                      <div className="text-xs text-green-600">+{promo.viewUpliftPercent}% uplift</div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500">Clicks</div>
                    <div className="font-semibold">{promo.clicks}</div>
                    {promo.clickUpliftPercent > 0 && (
                      <div className="text-xs text-green-600">+{promo.clickUpliftPercent}% uplift</div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500">Started</div>
                    <div className="font-semibold">{new Date(promo.startedAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ends</div>
                    <div className="font-semibold">
                      {promo.endsAt ? new Date(promo.endsAt).toLocaleDateString() : 'No end date'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No promotions yet. Create a promotion to boost this listing.
          </div>
        )}
      </div>

      {/* Listing Management */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Listing Management</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/admin/listings/${listing.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ listed: !listing.listed })
                });
                if (res.ok) {
                  await loadListingDetails();
                }
              } catch (err) {
                console.error('Toggle list failed', err);
              }
            }}
            className={`px-4 py-2 text-sm rounded-md ${listing.listed ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {listing.listed ? 'Unlist' : 'List'}
          </button>
          <button
            onClick={async () => {
              if (!confirm('Are you sure you want to delete this listing?')) return;
              try {
                const res = await fetch(`/api/admin/listings/${listing.id}`, { method: 'DELETE' });
                if (res.ok) {
                  const data = await res.json().catch(() => ({ ok: true }));
                  if (data.softDeleted) {
                    alert('Listing has related transactions. It was unlisted instead.');
                  }
                  router.push('/admin/listings');
                } else {
                  const err = await res.json().catch(() => ({}));
                  alert(err.error || 'Failed to delete listing');
                }
              } catch (err) {
                console.error('Delete failed', err);
                alert('Error deleting listing');
              }
            }}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Related Links */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Related Information</h3>
        <div className="space-y-2">
          <Link
            href={`/admin/listings/${listing.id}/transactions`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:text-blue-800"
          >
            View Transactions →
          </Link>
          <Link
            href={`/admin/listings/${listing.id}/reviews`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:text-blue-800"
          >
            View Reviews →
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-500">{label}:</span>
      <div className={`font-medium ${className}`}>{value}</div>
    </div>
  );
}

function getTxColor(status?: string) {
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

export default function ListingDetailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Listing Details</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    }>
      <ListingDetailContent />
    </Suspense>
  );
}
