"use client";

import { useEffect, useState } from "react";
import ConversationTable, { type Conversation } from "@/components/admin/ConversationTable";
import Link from "next/link";
import SearchBar from "@/components/admin/SearchBar";
import Pagination from "@/components/admin/Pagination";

type FilterType = "all" | "ORDER" | "SUPPORT" | "GENERAL";
type StatusFilter = "all" | "ACTIVE" | "ARCHIVED" | "DELETED";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
      });

      if (filter !== "all") {
        params.append("type", filter);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const res = await fetch(`/api/admin/conversations?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      setConversations(json.conversations || []);
      setPagination(json.pagination);
    } catch (e: any) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentPage, filter, statusFilter, searchTerm]);

  const handleFilterChange = (value: FilterType) => {
    setFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Conversation Management</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
          <button
            onClick={load}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Conversation Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage all platform conversations
          </p>
        </div>
        <Link
          href="/admin/support"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          TOP Support Dashboard
        </Link>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Conversations</div>
            <div className="text-2xl font-bold mt-1">{pagination.totalCount}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Current Page</div>
            <div className="text-2xl font-bold mt-1">
              {pagination.page} / {pagination.totalPages}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Showing</div>
            <div className="text-2xl font-bold mt-1">{conversations.length}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Per Page</div>
            <div className="text-2xl font-bold mt-1">{pagination.limit}</div>
          </div>
        </div>
      )}

      {/* Pagination - Top */}
      {!loading && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border">
        <SearchBar
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          placeholder="Search by username..."
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as FilterType)}
            aria-label="Filter by type"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="ORDER">Order</option>
            <option value="SUPPORT">Support</option>
            <option value="GENERAL">General</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
            aria-label="Filter by status"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="DELETED">Deleted</option>
          </select>
          {(searchTerm || filter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilter("all");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Conversations Table */}
      <ConversationTable
        conversations={conversations}
        loading={loading}
        emptyMessage="No conversations found. Conversations will appear here once users start chatting."
      />

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
