"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Feedback } from "@/types/admin";

interface ExtendedFeedback extends Feedback {
  selected?: boolean;
  associatedUserName?: string;
}

interface NewFeedback {
  userId?: string;
  userEmail?: string;
  userName?: string;
  message: string;
  rating?: number;
  tags: string[];
  featured: boolean;
  isPublic?: boolean;
  type?: string;
  title?: string;
  priority?: string;
  status?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<ExtendedFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<ExtendedFeedback | null>(null);
  const [filter, setFilter] = useState<"all" | "featured" | "with-rating" | "with-user" | "anonymous">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeedback, setNewFeedback] = useState<NewFeedback>({
    message: '',
    tags: [],
    featured: false,
    isPublic: true,
    type: 'general',
    priority: 'medium',
    status: 'open'
  });
  const [saving, setSaving] = useState(false);
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
      const res = await fetch(`/api/admin/feedback?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setFeedbacks((json.feedbacks || []).map((f: Feedback) => ({ ...f, selected: false })));
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

  const deleteFeedback = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(id);
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        load();
      } else {
        console.error('Failed to delete feedback');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
    } finally {
      setDeleting(null);
    }
  };

  const addFeedback = async () => {
    if (!newFeedback.message) return;
    
    // Validate featured feedback requirements
    if (newFeedback.featured && !newFeedback.userName) {
      alert('User name is required for featured feedback');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newFeedback)
      });

      if (res.ok) {
        setNewFeedback({
          message: '',
          tags: [],
          featured: false,
          isPublic: true,
          type: 'general',
          priority: 'medium',
          status: 'open'
        });
        setShowAddForm(false);
        load();
      } else {
        console.error('Failed to add feedback');
      }
    } catch (error) {
      console.error('Error adding feedback:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    switch (filter) {
      case "featured": return feedback.featured;
      case "with-rating": return feedback.rating !== null && feedback.rating !== undefined;
      case "with-user": return feedback.userId || feedback.userEmail;
      case "anonymous": return !feedback.userId && !feedback.userEmail;
      default: return true;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Feedback Management</h2>
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
        <h2 className="text-xl font-semibold">Feedback Management</h2>
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
        <h2 className="text-xl font-semibold">Feedback Management</h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Showing {feedbacks.length} of {pagination.totalCount} feedback • {feedbacks.filter(f => f.featured).length} featured • {feedbacks.filter(f => f.rating).length} with ratings
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Add New
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: "all", label: "All" },
          { key: "featured", label: "Featured" },
          { key: "with-rating", label: "With Rating" },
          { key: "with-user", label: "With User" },
          { key: "anonymous", label: "Anonymous" }
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
            <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
              {tab.key === "all" ? feedbacks.length :
               tab.key === "featured" ? feedbacks.filter(f => f.featured).length :
               tab.key === "with-rating" ? feedbacks.filter(f => f.rating).length :
               tab.key === "with-user" ? feedbacks.filter(f => f.userId || f.userEmail).length :
               feedbacks.filter(f => !f.userId && !f.userEmail).length}
            </span>
          </button>
        ))}
      </div>

      {/* Add New Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Add New Item</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
              <input
                type="text"
                value={newFeedback.title || ''}
                onChange={(e) => setNewFeedback({...newFeedback, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief title for the feedback"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  title="Feedback type"
                  value={newFeedback.type || 'general'}
                  onChange={(e) => setNewFeedback({...newFeedback, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="complaint">Complaint</option>
                  <option value="praise">Praise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  title="Priority level"
                  value={newFeedback.priority || 'medium'}
                  onChange={(e) => setNewFeedback({...newFeedback, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  title="Feedback status"
                  value={newFeedback.status || 'open'}
                  onChange={(e) => setNewFeedback({...newFeedback, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="flex items-center pt-8">
                  <input
                    type="checkbox"
                    checked={newFeedback.isPublic ?? true}
                    onChange={(e) => setNewFeedback({...newFeedback, isPublic: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Public (visible to users)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID (Optional)</label>
              <input
                type="text"
                value={newFeedback.userId || ''}
                onChange={(e) => setNewFeedback({...newFeedback, userId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Associate with a user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
              <input
                type="text"
                value={newFeedback.userName || ''}
                onChange={(e) => setNewFeedback({...newFeedback, userName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Display name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating (Optional)</label>
              <select
                title="Rating selection"
                value={newFeedback.rating || ''}
                onChange={(e) => setNewFeedback({...newFeedback, rating: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No rating</option>
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={newFeedback.tags.join(', ')}
                onChange={(e) => setNewFeedback({
                  ...newFeedback, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. mixmatch, ailisting, premium"
              />
              <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newFeedback.featured}
                  onChange={(e) => setNewFeedback({...newFeedback, featured: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Featured on homepage</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input
                type="email"
                value={newFeedback.userEmail || ''}
                onChange={(e) => setNewFeedback({...newFeedback, userEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea
                value={newFeedback.message}
                onChange={(e) => setNewFeedback({...newFeedback, message: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the message..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addFeedback}
                disabled={saving || !newFeedback.message || (newFeedback.featured && !newFeedback.userName)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="grid gap-4">
        {filteredFeedbacks.map((feedback) => (
          <div key={feedback.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-medium">
                      {feedback.title ? `${feedback.title}` : `Feedback #${feedback.id}`}
                    </h3>
                    {feedback.featured && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        Featured
                      </span>
                    )}
                    {feedback.status && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        feedback.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        feedback.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                        feedback.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {feedback.status === 'in_progress' ? 'In Progress' : feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                      </span>
                    )}
                    {feedback.priority && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        feedback.priority === 'high' ? 'bg-red-100 text-red-800' :
                        feedback.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        Priority: {feedback.priority.charAt(0).toUpperCase() + feedback.priority.slice(1)}
                      </span>
                    )}
                    {feedback.type && (
                      <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                        {feedback.type === 'bug' ? 'Bug Report' :
                         feedback.type === 'feature' ? 'Feature Request' :
                         feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                      </span>
                    )}
                    {feedback.rating && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        ★ {feedback.rating}
                      </span>
                    )}
                    {feedback.userId && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        User: {feedback.associatedUserName ? (
                          <Link
                            href={`/admin/users/${feedback.userId}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {feedback.associatedUserName}
                          </Link>
                        ) : (
                          <Link
                            href={`/admin/users/${feedback.userId}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {feedback.userId}
                          </Link>
                        )}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      feedback.userEmail
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {feedback.userEmail ? 'Registered' : 'Anonymous'}
                    </span>
                    {feedback.isPublic === false && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        Private
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-3 space-y-1">
                    {feedback.userEmail && (
                      <p className="text-gray-600">
                        <strong>Email:</strong> {feedback.userEmail}
                      </p>
                    )}
                    {feedback.userName && (
                      <p className="text-gray-600">
                        <strong>Name:</strong> {feedback.userName}
                      </p>
                    )}
                    {feedback.rating && (
                      <p className="text-gray-600">
                        <strong>Rating:</strong> 
                        <span className="ml-2 text-yellow-500">
                          {"★".repeat(feedback.rating)}{"☆".repeat(5 - feedback.rating)}
                        </span>
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md mb-3">
                    <p className="text-gray-900 whitespace-pre-wrap">{feedback.message}</p>
                  </div>
                  
                  {feedback.tags && feedback.tags.length > 0 && (
                    <div className="mb-3">
                      <strong className="text-gray-600 text-sm">Tags:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {feedback.tags.map((tag, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <div className="font-medium">{feedback.id}</div>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <div className="font-medium">
                    {formatDate(feedback.createdAt)}
                  </div>
                </div>
                {feedback.updatedAt && (
                  <div>
                    <span className="text-gray-500">Updated:</span>
                    <div className="font-medium">
                      {formatDate(feedback.updatedAt)}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Visibility:</span>
                  <div className="font-medium">
                    {feedback.isPublic === false ? 'Private' : 'Public'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => setSelectedFeedback(feedback)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Full Details
                </button>
                <div className="flex items-center space-x-3">
                  {feedback.userEmail && (
                    <button
                      onClick={() => {
                        window.location.href = `mailto:${feedback.userEmail}?subject=Re: Your feedback&body=Hi,\n\nThank you for your feedback about our platform.\n\nBest regards,\nTop Care Fashion Team`;
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Reply via Email
                    </button>
                  )}
                  <button
                    onClick={() => deleteFeedback(feedback.id)}
                    disabled={deleting === feedback.id}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting === feedback.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFeedbacks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {filter === "all"
            ? "No items found. User feedback will appear here when submitted."
            : filter === "featured"
            ? "No featured feedback found."
            : filter === "with-rating"
            ? "No feedback with ratings found."
            : filter === "with-user"
            ? "No feedback from registered users found."
            : "No anonymous feedback found."
          }
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total feedback)
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

      {/* Details Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedFeedback(null)}>
          <div className="bg-white rounded-lg p-6 w-[min(90vw,600px)] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Feedback Details
              </h3>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {selectedFeedback.title && (
                <div>
                  <span className="font-medium text-gray-700">Title:</span>
                  <div className="text-lg font-semibold mt-1">{selectedFeedback.title}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">ID:</span>
                  <div>{selectedFeedback.id}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <div className="capitalize">{selectedFeedback.status?.replace('_', ' ') || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <div className="capitalize">{selectedFeedback.type || 'General'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>
                  <div className="capitalize">{selectedFeedback.priority || 'Medium'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Featured:</span>
                  <div>{selectedFeedback.featured ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Visibility:</span>
                  <div>{selectedFeedback.isPublic === false ? 'Private' : 'Public'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <div>{selectedFeedback.userEmail || 'Not provided'}</div>
                </div>
                {selectedFeedback.userId && (
                  <div>
                    <span className="font-medium text-gray-700">User:</span>
                    <div>
                      <Link
                        href={`/admin/users/${selectedFeedback.userId}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {selectedFeedback.associatedUserName || selectedFeedback.userId}
                      </Link>
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <div>{selectedFeedback.userName || 'Not provided'}</div>
                </div>
                {selectedFeedback.rating && (
                  <div>
                    <span className="font-medium text-gray-700">Rating:</span>
                    <div className="text-yellow-500">
                      {"★".repeat(selectedFeedback.rating)}{"☆".repeat(5 - selectedFeedback.rating)}
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <div>{formatDate(selectedFeedback.createdAt)}</div>
                </div>
                {selectedFeedback.updatedAt && (
                  <div>
                    <span className="font-medium text-gray-700">Updated:</span>
                    <div>{formatDate(selectedFeedback.updatedAt)}</div>
                  </div>
                )}
              </div>
              
              {selectedFeedback.tags && selectedFeedback.tags.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Tags:</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedFeedback.tags.map((tag, index) => (
                      <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <span className="font-medium text-gray-700">Message:</span>
                <div className="mt-2 p-4 bg-gray-50 rounded-md">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.message}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                {selectedFeedback.userEmail && (
                  <button
                    onClick={() => {
                      window.location.href = `mailto:${selectedFeedback.userEmail}?subject=Re: Your feedback&body=Hi,\n\nThank you for your feedback about our platform.\n\nBest regards,\nTop Care Fashion Team`;
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Reply via Email
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedFeedback(null);
                    deleteFeedback(selectedFeedback.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}