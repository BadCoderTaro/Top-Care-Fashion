"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/components/AuthContext";
import type { Listing } from "@/types/admin";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/admin/SearchBar";
import Pagination from "@/components/admin/Pagination";

type EditingListing = Listing;

type ViewMode = "grid" | "table";
type FilterType = "all" | "listed" | "unlisted" | "sold" | "boosted";
type SortOption =
  | "date-desc"
  | "date-asc"
  | "price-desc"
  | "price-asc"
  | "name-asc"
  | "name-desc"
  | "views-desc"
  | "views-asc"
  | "clicks-desc"
  | "clicks-asc";

interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

const PAGE_SIZE = 50;

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

function getPrimaryImage(listing: Listing): string | null {
  if (listing.imageUrl) return listing.imageUrl;
  if (listing.imageUrls && listing.imageUrls.length > 0) {
    return listing.imageUrls.find((url) => Boolean(url)) ?? listing.imageUrls[0] ?? null;
  }
  return null;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "$0.00";
  return `$${Number(amount).toFixed(2)}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
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

function ListingManagementContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<EditingListing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterType>(
    (searchParams.get("filter") as FilterType) || "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
  });

  const isAdmin = user?.actor === "Admin";

  // Set category filter from URL params
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    }
  }, [searchParams]);

  const stats = useMemo(() => {
    const listedCount = items.filter((item) => item.listed).length;
    const soldCount = items.filter((item) => item.sold).length;
    return {
      total: items.length,
      listed: listedCount,
      sold: soldCount,
    };
  }, [items]);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
        sort: sortOption,
      });
      if (isAdmin && filter !== "all") {
        params.set("status", filter);
      }
      if (categoryFilter && categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }

      const endpoint = isAdmin
        ? `/api/admin/listings?${params.toString()}`
        : `/api/listings?${params.toString()}`;
      const [listingsRes, categoriesRes] = await Promise.all([
        fetch(endpoint, { cache: "no-store" }),
        isAdmin ? fetch("/api/admin/categories", { cache: "no-store" }) : Promise.resolve(null)
      ]);

      if (!listingsRes.ok) {
        if (listingsRes.status === 403) {
          setError("Access denied. Admin privileges required.");
          return;
        }
        throw new Error(`HTTP ${listingsRes.status}: ${listingsRes.statusText}`);
      }

      const listingsJson = await listingsRes.json();
      if (isAdmin) {
        setItems((listingsJson.listings || []) as EditingListing[]);
        if (listingsJson.pagination) {
          setPagination(listingsJson.pagination);
        }
      } else {
        const data = listingsJson?.data;
        const fetchedItems = (data?.items || []) as EditingListing[];
        setItems(fetchedItems);
        if (data) {
          const total = Number(data.total ?? fetchedItems.length) || 0;
          const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;
          setPagination({
            page: currentPage,
            limit: PAGE_SIZE,
            totalCount: total,
            totalPages,
          });
        }
      }

      if (categoriesRes) {
        if (categoriesRes.ok) {
          const categoriesJson = await categoriesRes.json();
          setCategories(categoriesJson.categories || []);
        }
      }
    } catch (error) {
      console.error('Error loading listings:', error);
      setError(error instanceof Error ? error.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentPage, sortOption, filter, categoryFilter, searchTerm]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);
  // Editing moved to Listing Details page; no inline edit via query string.

  const applyTagFilter = (tag: string) => {
    setFilter("all");
    setSearchTerm(tag);
    setCurrentPage(1);
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json().catch(() => ({ ok: true }));
        if (data.softDeleted) {
          alert('Listing has related transactions. It was unlisted instead.');
        }
        await loadListings();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Error deleting listing');
    }
  };

  const toggleListing = async (listingId: string, currentListed: boolean) => {
    try {
      await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listed: !currentListed })
      });
      loadListings();
    } catch (error) {
      console.error("Failed to toggle listing:", error);
    }
  };



  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Listing Management</h2>
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
        <h2 className="text-2xl font-semibold">Listing Management</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
          <button 
            onClick={loadListings}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Listing Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {items.length} of {pagination.totalCount} listings
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <dl className="flex items-center gap-4 text-sm text-gray-600">
            <div>
              <dt className="uppercase text-xs tracking-wide">Listed</dt>
              <dd className="font-semibold text-gray-900">{stats.listed}</dd>
            </div>
            <div>
              <dt className="uppercase text-xs tracking-wide">Sold</dt>
              <dd className="font-semibold text-gray-900">{stats.sold}</dd>
            </div>
          </dl>
          {isAdmin && (
            <div className="flex border rounded-md self-start">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 text-sm ${viewMode === "grid" ? "bg-gray-100" : ""}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 text-sm ${viewMode === "table" ? "bg-gray-100" : ""}`}
              >
                Table
              </button>
            </div>
          )}
        </div>
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
          placeholder="Search listings..."
          className="flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterType);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md"
            title="Filter listings by status"
          >
            <option value="all">All Listings</option>
            <option value="listed">Listed Only</option>
            <option value="unlisted">Unlisted Only</option>
            <option value="sold">Sold</option>
            <option value="boosted">Boosted Only</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md"
            title="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value as SortOption);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md"
            title="Sort listings"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="price-desc">Price: high to low</option>
            <option value="price-asc">Price: low to high</option>
            <option value="name-asc">Name: A → Z</option>
            <option value="name-desc">Name: Z → A</option>
            <option value="views-desc">Most views</option>
            <option value="views-asc">Least views</option>
            <option value="clicks-desc">Most clicks</option>
            <option value="clicks-asc">Least clicks</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isAdmin={isAdmin}
              onDelete={deleteListing}
              onToggleListing={toggleListing}
              onTagFilter={applyTagFilter}
            />
          ))}
        </div>
      ) : (
        <ListingTable
          listings={items}
          isAdmin={isAdmin}
          onDelete={deleteListing}
          onToggleListing={toggleListing}
          onTagFilter={applyTagFilter}
        />
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm || filter !== "all"
            ? "No listings match your search criteria."
            : "No listings found. Create your first listing to get started."
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

      {/* Creation disabled in management UI */}

    </div>
  );
}

// Components
function ListingCard({
  listing,
  isAdmin,
  onDelete,
  onToggleListing,
  onTagFilter,
}: {
  listing: EditingListing;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onToggleListing: (id: string, listed: boolean) => void;
  onTagFilter?: (tag: string) => void;
}) {
  const coverImage = getPrimaryImage(listing);
  const gallery = (listing.imageUrls ?? [])
    .filter((url) => Boolean(url) && url !== coverImage)
    .slice(0, 4);
  const totalImages = (listing.imageUrls?.filter((url) => Boolean(url)).length ?? 0) - (coverImage ? 1 : 0);
  const remainingImages = Math.max(0, totalImages - gallery.length);

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        {coverImage ? (
          <div className="aspect-square overflow-hidden">
            <img
              src={coverImage}
              alt={listing.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            No image available
          </div>
        )}

        <div className="absolute inset-x-0 top-3 flex justify-between px-3 pointer-events-none">
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                listing.listed ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
              }`}
            >
              {listing.listed ? "Listed" : "Unlisted"}
            </span>
            {listing.sold && (
              <span className="px-2 py-1 text-xs rounded-full bg-red-600 text-white shadow">
                Sold
              </span>
            )}
            {listing.isBoosted && (
              <span className="px-2 py-1 text-xs rounded-full bg-purple-600 text-white shadow">
                🚀 Boosted
              </span>
            )}
          </div>
          {listing.txStatus && (
            <span className={`px-2 py-1 text-xs rounded-full ${getTxColor(listing.txStatus)}`}>
              {listing.txStatus}
            </span>
          )}
        </div>
      </div>

      {gallery.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
          {gallery.map((url, index) => (
            <img
              key={`${listing.id}-gallery-${index}`}
              src={url}
              alt={`${listing.name} preview ${index + 1}`}
              className="h-12 w-12 rounded object-cover border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ))}
          {remainingImages > 0 && (
            <div className="h-12 w-12 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500">
              +{remainingImages}
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{listing.name}</h3>
            <div className="mt-1 text-xs text-gray-600 space-x-2">
              {listing.brand && <span>Brand: {listing.brand}</span>}
              {listing.size && <span>Size: {listing.size}</span>}
            </div>
            {listing.conditionType && (
              <div className="text-xs text-gray-500">
                Condition: {listing.conditionType.replace("_", " ")}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-[var(--brand-color)]">
              {formatCurrency(listing.price)}
            </div>
            {listing.sold && (
              <div className="text-xs text-gray-500">Sold {formatDate(listing.soldAt)}</div>
            )}
          </div>
        </div>

        {listing.sellerId && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-gray-500">Seller:</span>
            <Link
              href={`/admin/users/${listing.sellerId}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {listing.sellerName || `User ${listing.sellerId}`}
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <div className="text-gray-400">Created</div>
            <div className="font-medium text-gray-700">{formatDate(listing.createdAt)}</div>
          </div>
          <div>
            <div className="text-gray-400">Sold</div>
            <div className="font-medium text-gray-700">{formatDate(listing.soldAt)}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-xs text-gray-600 pt-2 border-t">
          <div className="flex items-center gap-1">
            <span>👁</span>
            <span>{listing.viewsCount ?? 0} views</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👆</span>
            <span>{listing.clicksCount ?? 0} clicks</span>
          </div>
          <div className="flex items-center gap-1">
            <span>❤</span>
            <span>{listing.likesCount ?? 0} likes</span>
          </div>
        </div>

        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {listing.tags.map((tag) => (
              <button
                key={`${listing.id}-tag-${tag}`}
                type="button"
                onClick={() => onTagFilter?.(tag)}
                className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Link
            href={`/admin/listings/${listing.id}`}
            className="flex-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-center"
          >
            Details
          </Link>
          {isAdmin && (
            <>
              <button
                onClick={() => onToggleListing(listing.id, listing.listed)}
                className={`px-3 py-1 text-xs rounded ${
                  listing.listed
                    ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                    : "bg-green-100 hover:bg-green-200 text-green-800"
                }`}
              >
                {listing.listed ? "Unlist" : "List"}
              </button>
              <button
                onClick={() => onDelete(listing.id)}
                className="px-3 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-800"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingTable({
  listings,
  isAdmin,
  onDelete,
  onToggleListing,
  onTagFilter,
}: {
  listings: EditingListing[];
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onToggleListing: (id: string, listed: boolean) => void;
  onTagFilter?: (tag: string) => void;
}) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listing</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold</th>
              {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {listings.map((listing) => (
              <ListingTableRow
                key={listing.id}
                listing={listing}
                isAdmin={isAdmin}
                onDelete={onDelete}
                onToggleListing={onToggleListing}
                onTagFilter={onTagFilter}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListingTableRow({
  listing,
  isAdmin,
  onDelete,
  onToggleListing,
  onTagFilter,
}: {
  listing: EditingListing;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onToggleListing: (id: string, listed: boolean) => void;
  onTagFilter?: (tag: string) => void;
}) {
  const coverImage = getPrimaryImage(listing);

  return (
    <tr>
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-3">
          {coverImage && (
            <img
              src={coverImage}
              alt={listing.name}
              className="w-12 h-12 rounded object-cover border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="min-w-0">
            <Link
              href={`/admin/listings/${listing.id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 block truncate"
            >
              {listing.name}
            </Link>
            <div className="mt-1 text-xs text-gray-500 space-x-2">
              {listing.brand && <span>Brand: {listing.brand}</span>}
              {listing.size && <span>Size: {listing.size}</span>}
              {listing.conditionType && <span>{listing.conditionType.replace("_", " ")}</span>}
            </div>
            {listing.tags && listing.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {listing.tags.slice(0, 4).map((tag) => (
                  <button
                    key={`${listing.id}-table-tag-${tag}`}
                    type="button"
                    onClick={() => onTagFilter?.(tag)}
                    className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    #{tag}
                  </button>
                ))}
                {listing.tags.length > 4 && (
                  <span className="text-[11px] text-gray-400">+{listing.tags.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm">
        {listing.sellerId ? (
          <Link href={`/admin/users/${listing.sellerId}`} className="text-blue-600 hover:text-blue-800">
            {listing.sellerName || `User ${listing.sellerId}`}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3 align-top text-sm font-medium">{formatCurrency(listing.price)}</td>
      <td className="px-4 py-3 align-top text-sm">
        <div className="flex flex-wrap gap-1">
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              listing.listed ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
            }`}
          >
            {listing.listed ? "Listed" : "Unlisted"}
          </span>
          {listing.sold && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Sold</span>
          )}
          {listing.isBoosted && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
              🚀 Boosted
            </span>
          )}
          {listing.txStatus && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${getTxColor(listing.txStatus)}`}>
              {listing.txStatus}
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-1 text-xs text-gray-500">
          <span>👁 {listing.viewsCount ?? 0}</span>
          <span>👆 {listing.clicksCount ?? 0}</span>
          <span>❤ {listing.likesCount ?? 0}</span>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-gray-600">{formatDate(listing.createdAt)}</td>
      <td className="px-4 py-3 align-top text-sm text-gray-600">{formatDate(listing.soldAt)}</td>
      {isAdmin && (
        <td className="px-4 py-3 align-top text-sm">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/listings/${listing.id}`}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              Details
            </Link>
            <button
              onClick={() => onToggleListing(listing.id, listing.listed)}
              className={`px-2 py-1 text-xs rounded ${
                listing.listed
                  ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                  : "bg-green-100 hover:bg-green-200 text-green-800"
              }`}
            >
              {listing.listed ? "Unlist" : "List"}
            </button>
            <button
              onClick={() => onDelete(listing.id)}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded"
            >
              Delete
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

export default function ListingManagementPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Listing Management</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    }>
      <ListingManagementContent />
    </Suspense>
  );
}
