"use client";

import Link from "next/link";

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  role?: string;
}

interface LastMessage {
  id: number;
  content: string;
  sender_id: number;
  message_type: string;
  created_at: string;
}

interface Listing {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
}

export interface Conversation {
  id: number;
  type: string;
  status: string;
  initiator: User;
  participant: User;
  listing?: Listing | null;
  messageCount: number;
  lastMessage: LastMessage | null;
  last_message_at: string | null;
  created_at: string;
}

interface ConversationTableProps {
  conversations: Conversation[];
  loading?: boolean;
  emptyMessage?: string;
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

const getTypeColor = (type: string) => {
  switch (type) {
    case "SUPPORT":
      return "bg-blue-100 text-blue-800";
    case "ORDER":
      return "bg-purple-100 text-purple-800";
    case "GENERAL":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "ARCHIVED":
      return "bg-yellow-100 text-yellow-800";
    case "DELETED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
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

const truncateText = (text: string, maxLength: number = 60) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export default function ConversationTable({
  conversations,
  loading = false,
  emptyMessage = "No conversations found",
}: ConversationTableProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {conversations.map((conv) => (
        <Link
          key={conv.id}
          href={`/admin/conversations/${conv.id}`}
          className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: Participants Info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex -space-x-2">
                <AvatarCircle
                  name={conv.initiator.username}
                  url={conv.initiator.avatar_url}
                  size={40}
                />
                <AvatarCircle
                  name={conv.participant.username}
                  url={conv.participant.avatar_url}
                  size={40}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {conv.initiator.username} ↔ {conv.participant.username}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(conv.type)}`}>
                    {conv.type}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(conv.status)}`}>
                    {conv.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">
                    {conv.lastMessage?.sender_id === conv.initiator.id
                      ? conv.initiator.username
                      : conv.participant.username}
                    :
                  </span>{" "}
                  {conv.lastMessage
                    ? conv.lastMessage.message_type === "IMAGE"
                      ? "📷 Image"
                      : truncateText(conv.lastMessage.content)
                    : "No messages yet"}
                </div>

                {conv.listing && (
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Listing:</span> {conv.listing.name} (${conv.listing.price})
                  </div>
                )}
              </div>
            </div>

            {/* Right: Stats & Time */}
            <div className="flex flex-col items-end gap-2 text-right">
              <div className="text-xs text-gray-500">
                {formatTimeAgo(conv.last_message_at || conv.created_at)}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  {conv.messageCount} {conv.messageCount === 1 ? "message" : "messages"}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                ID: {conv.id}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
