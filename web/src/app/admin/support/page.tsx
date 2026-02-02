"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface RecentMessage {
  id: number;
  content: string;
  sender_id: number;
  is_read: boolean;
  message_type: string;
  created_at: string;
}

interface SupportConversation {
  id: number;
  user: User;
  isPending: boolean;
  messageCount: number;
  lastMessage: RecentMessage | null;
  recentMessages: RecentMessage[];
  last_message_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  pending: number;
  answered: number;
}

type FilterType = "all" | "pending" | "answered";

const AvatarCircle = ({
  name,
  url,
  size = 40,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
}) => {
  const initials = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold border border-gray-200 overflow-hidden`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
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

const formatTimeAgo = (dateString: string | null) => {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

function SupportPageContent() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, answered: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>(
    (searchParams.get("filter") as FilterType) || "all"
  );
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter });
      const res = await fetch(`/api/admin/support?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      setConversations(json.conversations || []);
      setStats(json.stats || { total: 0, pending: 0, answered: 0 });
    } catch (e: any) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleSendReply = async (conversationId: number) => {
    if (!replyText.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: replyText.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setReplyText("");
      setSelectedConversation(null);
      load(); // Reload to update the conversation list
      alert("Reply sent successfully!");
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">TOP Support Dashboard</h2>
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
          <h2 className="text-2xl font-semibold">TOP Support Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage all support conversations with users
          </p>
        </div>
        <Link
          href="/admin/conversations"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
        >
          All Conversations
        </Link>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm text-gray-600">Total Support Conversations</div>
            <div className="text-3xl font-bold mt-2">{stats.total}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="text-sm text-orange-600 font-medium">Pending Replies</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">{stats.pending}</div>
            <div className="text-xs text-orange-600 mt-1">Needs your attention</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-sm text-green-600 font-medium">Answered</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.answered}</div>
            <div className="text-xs text-green-600 mt-1">Last response from TOP Support</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === "pending"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => setFilter("answered")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === "answered"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Answered ({stats.answered})
        </button>
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
          No support conversations found.
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`bg-white border rounded-lg p-5 ${
                conv.isPending ? "border-orange-300 bg-orange-50/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <AvatarCircle
                    name={conv.user.username}
                    url={conv.user.avatar_url}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/admin/users/${conv.user.id}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {conv.user.username}
                      </Link>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                        {conv.user.role}
                      </span>
                      {conv.isPending && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded font-medium">
                          Pending Reply
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{conv.user.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {conv.messageCount} messages • Last: {formatTimeAgo(conv.last_message_at)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/conversations/${conv.id}`}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    View Full Chat
                  </Link>
                  <button
                    onClick={() =>
                      setSelectedConversation(
                        selectedConversation === conv.id ? null : conv.id
                      )
                    }
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {selectedConversation === conv.id ? "Cancel" : "Quick Reply"}
                  </button>
                </div>
              </div>

              {/* Recent Messages */}
              <div className="space-y-2 bg-gray-50 rounded-lg p-3 mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-2">
                  Recent Messages:
                </div>
                {conv.recentMessages.slice(0, 3).map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="font-medium text-gray-700">
                      {msg.sender_id === conv.user.id ? conv.user.username : "TOP Support"}:
                    </span>{" "}
                    <span className="text-gray-600">
                      {msg.message_type === "IMAGE" ? "📷 Image" : msg.content}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatTimeAgo(msg.created_at)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick Reply Form */}
              {selectedConversation === conv.id && (
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Send reply as TOP Support:
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendReply(conv.id)}
                      disabled={sending || !replyText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {sending ? "Sending..." : "Send Reply"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConversation(null);
                        setReplyText("");
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">TOP Support Dashboard</h2>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      }
    >
      <SupportPageContent />
    </Suspense>
  );
}
