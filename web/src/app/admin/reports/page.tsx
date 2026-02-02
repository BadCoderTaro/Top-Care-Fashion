"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Report } from "@/types/admin";

interface ExtendedReport extends Report {
  editing?: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ExtendedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("all");
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
      const res = await fetch(`/api/admin/reports?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setReports((json.reports || []).map((r: Report) => ({ ...r, editing: false })));
      if (json.pagination) {
        setPagination(json.pagination);
      }
    } catch (e: any) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentPage]);

  const startEdit = (id: string) => {
    setReports(reports.map(report => ({ 
      ...report, 
      editing: report.id === id ? true : false 
    })));
  };

  const cancelEdit = (id: string) => {
    setReports(reports.map(report => ({ 
      ...report, 
      editing: report.id === id ? false : report.editing 
    })));
    load(); // Reload to reset changes
  };

  const saveEdit = async (report: ExtendedReport) => {
    try {
      setSaving(report.id);
      const updateData = {
        id: report.id,
        status: report.status,
        notes: report.notes
      };

      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setReports(reports.map(r => ({ 
          ...r, 
          editing: r.id === report.id ? false : r.editing 
        })));
        load();
      } else {
        console.error('Failed to save report');
      }
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setSaving(null);
    }
  };

  const quickUpdateStatus = async (id: string, status: Report["status"]) => {
    try {
      setSaving(id);
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      if (res.ok) {
        load();
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(null);
    }
  };

  const updateField = (id: string, field: keyof Report, value: any) => {
    setReports(reports.map(report => 
      report.id === id ? { ...report, [field]: value } : report
    ));
  };

  const filteredReports = reports.filter(report => 
    filter === "all" || report.status === filter
  );

  const getStatusColor = (status: Report["status"]) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "dismissed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTargetTypeColor = (targetType: Report["targetType"]) => {
    return targetType === "listing" 
      ? "bg-blue-100 text-blue-800" 
      : "bg-purple-100 text-purple-800";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Flags Management</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Flags Management</h2>
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Flags Management</h2>
        <div className="text-sm text-gray-600">
          Showing {reports.length} of {pagination.totalCount} flags • {reports.filter(r => r.status === 'open').length} open
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: "all", label: "All Flags" },
          { key: "open", label: "Open" },
          { key: "resolved", label: "Resolved" },
          { key: "dismissed", label: "Dismissed" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key as any);
              setCurrentPage(1);
            }}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              filter === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                {reports.filter(r => r.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Flags List */}
      <div className="grid gap-4">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            {report.editing ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor={`status-${report.id}`} className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      id={`status-${report.id}`}
                      value={report.status}
                      onChange={(e) => updateField(report.id, 'status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`notes-${report.id}`} className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                    <textarea
                      id={`notes-${report.id}`}
                      value={report.notes || ''}
                      onChange={(e) => updateField(report.id, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Add internal notes about this flag..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => cancelEdit(report.id)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={saving === report.id}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(report)}
                    disabled={saving === report.id}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving === report.id ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium">Flag #{report.id}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getTargetTypeColor(report.targetType)}`}>
                        {report.targetType}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">
                      <strong>Target:</strong>
                      {report.targetType === 'listing' ? (
                        <Link
                          href={`/admin/listings/${report.targetId}`}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          Listing #{report.targetId}
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/users/${report.targetId}`}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          User #{report.targetId}
                        </Link>
                      )}
                    </p>
                    <p className="text-gray-900 mb-2">
                      <strong>Reason:</strong> {report.reason}
                    </p>
                    <p className="text-gray-600">
                      <strong>Reporter:</strong> {report.reporterId ? (
                        <Link
                          href={`/admin/users/${report.reporterId}`}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          {report.reporter}
                        </Link>
                      ) : (
                        <span className="ml-1">{report.reporter}</span>
                      )}
                    </p>
                    {report.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <strong>Admin Notes:</strong> {report.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Flag ID:</span>
                    <div className="font-medium">{report.id}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <div className="font-medium">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Target Type:</span>
                    <div className="font-medium capitalize">{report.targetType}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Resolved:</span>
                    <div className="font-medium">
                      {report.resolvedAt ? new Date(report.resolvedAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-3">
                    {report.status === 'open' && (
                      <>
                        <button
                          onClick={() => quickUpdateStatus(report.id, 'resolved')}
                          disabled={saving === report.id}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => quickUpdateStatus(report.id, 'dismissed')}
                          disabled={saving === report.id}
                          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {report.status !== 'open' && (
                      <button
                        onClick={() => quickUpdateStatus(report.id, 'open')}
                        disabled={saving === report.id}
                        className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(report.id)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit Details
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {filter === "all"
            ? "No flags found. User flags will appear here when submitted."
            : `No ${filter} flags found.`
          }
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total flags)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
