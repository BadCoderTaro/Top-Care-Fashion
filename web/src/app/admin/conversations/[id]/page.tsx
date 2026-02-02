"use client";

import { useEffect, useState, Suspense } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  role: string;
  status: string;
}

interface Listing {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
  listed: boolean;
  sold: boolean;
  seller_id: number;
}

interface Message {
  id: number;
  content: string;
  message_type: string;
  is_read: boolean;
  sender: {
    id: number;
    username: string;
    avatar_url: string | null;
    role: string;
  };
  receiver: {
    id: number;
    username: string;
    avatar_url: string | null;
  };
  created_at: string;
}

interface ConversationDetail {
  id: number;
  type: string;
  status: string;
  initiator: User;
  participant: User;
  listing: Listing | null;
  messages: Message[];
  messageCount: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

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

function ConversationDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, [resolvedParams.id]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/conversations/${resolvedParams.id}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Conversation not found");
        }
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      setConversation(json.conversation);
    } catch (e: any) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/conversations/${resolvedParams.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete conversation");
      }

      alert("Conversation deleted successfully");
      router.push("/admin/conversations");
    } catch (e: any) {
      alert(`Error: ${e.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/conversations"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Conversations
          </Link>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/conversations"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Conversations
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error || "Conversation not found"}</div>
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
        <div className="flex items-center gap-4">
          <Link
            href="/admin/conversations"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Conversations
          </Link>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
        >
          {deleting ? "Deleting..." : "Delete Conversation"}
        </button>
      </div>

      {/* Conversation Info */}
      <div className="bg-white border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Conversation #{conversation.id}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                conversation.type === "SUPPORT"
                  ? "bg-blue-100 text-blue-800"
                  : conversation.type === "ORDER"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {conversation.type}
            </span>
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                conversation.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : conversation.status === "ARCHIVED"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {conversation.status}
            </span>
          </div>
        </div>

        {/* Participants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Initiator</h3>
            <div className="flex items-center gap-3">
              <AvatarCircle
                name={conversation.initiator.username}
                url={conversation.initiator.avatar_url}
                size={56}
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/users/${conversation.initiator.id}`}
                  className="font-medium text-blue-600 hover:underline block truncate"
                >
                  {conversation.initiator.username}
                </Link>
                <div className="text-sm text-gray-600 truncate">
                  {conversation.initiator.email}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                    {conversation.initiator.role}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      conversation.initiator.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {conversation.initiator.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Participant</h3>
            <div className="flex items-center gap-3">
              <AvatarCircle
                name={conversation.participant.username}
                url={conversation.participant.avatar_url}
                size={56}
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/users/${conversation.participant.id}`}
                  className="font-medium text-blue-600 hover:underline block truncate"
                >
                  {conversation.participant.username}
                </Link>
                <div className="text-sm text-gray-600 truncate">
                  {conversation.participant.email}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                    {conversation.participant.role}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      conversation.participant.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {conversation.participant.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listing Info (if ORDER type) */}
        {conversation.listing && (
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Related Listing</h3>
            <div className="flex items-center gap-3">
              {conversation.listing.image_url && (
                <img
                  src={conversation.listing.image_url}
                  alt={conversation.listing.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="font-medium">{conversation.listing.name}</div>
                <div className="text-sm text-gray-600">
                  Price: ${conversation.listing.price}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    conversation.listing.listed
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {conversation.listing.listed ? "Listed" : "Unlisted"}
                  </span>
                  {conversation.listing.sold && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">
                      Sold
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Seller ID: {conversation.listing.seller_id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4 border-t">
          <div>
            <span className="text-gray-500">Total Messages:</span>
            <div className="font-medium">{conversation.messageCount}</div>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <div className="font-medium">
              {new Date(conversation.created_at).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Last Message:</span>
            <div className="font-medium">
              {conversation.last_message_at
                ? new Date(conversation.last_message_at).toLocaleString()
                : "Never"}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>
            <div className="font-medium">
              {new Date(conversation.updated_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Messages ({conversation.messages.length})
        </h3>

        {conversation.messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No messages in this conversation yet.
          </div>
        ) : (
          <div className="space-y-4">
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <AvatarCircle
                  name={message.sender.username}
                  url={message.sender.avatar_url}
                  size={40}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {message.sender.username}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                      {message.sender.role}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                    {!message.is_read && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Unread
                      </span>
                    )}
                  </div>
                  <div className="text-gray-700">
                    {message.message_type === "IMAGE" ? (
                      <span className="italic text-gray-500">📷 Image message</span>
                    ) : message.message_type === "SYSTEM" ? (
                      <span className="italic text-gray-500">🔔 {message.content}</span>
                    ) : (
                      message.content
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    To: {message.receiver.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Conversation Details</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    }>
      <ConversationDetailContent params={params} />
    </Suspense>
  );
}
