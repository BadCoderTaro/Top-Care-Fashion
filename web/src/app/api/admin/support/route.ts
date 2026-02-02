import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

const SUPPORT_USER_ID = parseInt(process.env.SUPPORT_USER_ID || "59")

export async function GET(request: NextRequest) {
	const admin = await requireAdmin(request)
	if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

	try {
		const { searchParams } = new URL(request.url)

		// Pagination
		const page = parseInt(searchParams.get("page") || "1")
		const limit = parseInt(searchParams.get("limit") || "50")
		const skip = (page - 1) * limit

		// Filter for pending (unanswered) support requests
		const filter = searchParams.get("filter") // 'all', 'pending', 'answered'

		// Base where clause for TOP Support conversations
		const baseWhere: any = {
			type: "SUPPORT",
			OR: [{ initiator_id: SUPPORT_USER_ID }, { participant_id: SUPPORT_USER_ID }],
		}

		// Get all conversations with their last message for filtering and stats
		// This query is needed for both filtering and stats calculation
		const allConversationsForFilterAndStats = await prisma.conversations.findMany({
			where: baseWhere,
			select: {
				id: true,
				messages: {
					orderBy: { created_at: "desc" },
					take: 1,
					select: {
						sender_id: true,
					},
				},
			},
		})

		// Calculate stats (based on all conversations)
		const pendingCount = allConversationsForFilterAndStats.filter((conv) => {
			const lastMessage = conv.messages[0]
			return lastMessage ? lastMessage.sender_id !== SUPPORT_USER_ID : false
		}).length
		const totalCountForStats = allConversationsForFilterAndStats.length

		// If filter is specified, get conversation IDs that match the filter condition
		let conversationIds: number[] | undefined = undefined
		if (filter === "pending" || filter === "answered") {
			const filteredIds = allConversationsForFilterAndStats
				.filter((conv) => {
					const lastMessage = conv.messages[0]
					if (!lastMessage) return false
					if (filter === "pending") {
						return lastMessage.sender_id !== SUPPORT_USER_ID
					} else {
						// answered
						return lastMessage.sender_id === SUPPORT_USER_ID
					}
				})
				.map((conv) => conv.id)

			conversationIds = filteredIds
		}

		// Build where clause with optional ID filter
		const where: any = conversationIds
			? {
					...baseWhere,
					id: { in: conversationIds },
				}
			: baseWhere

		// Get total count for pagination (after filter, before pagination)
		const totalCount = conversationIds ? conversationIds.length : totalCountForStats

		// Fetch conversations with pagination
		const conversations = await prisma.conversations.findMany({
			where,
			include: {
				initiator: {
					select: {
						id: true,
						username: true,
						email: true,
						avatar_url: true,
						role: true,
					},
				},
				participant: {
					select: {
						id: true,
						username: true,
						email: true,
						avatar_url: true,
						role: true,
					},
				},
				messages: {
					orderBy: { created_at: "desc" },
					take: 5,
					select: {
						id: true,
						content: true,
						created_at: true,
						sender_id: true,
						is_read: true,
						message_type: true,
					},
				},
				_count: {
					select: { messages: true },
				},
			},
			orderBy: { last_message_at: "desc" },
			skip,
			take: limit,
		})

		// Format conversations
		const formattedConversations = conversations.map((conv) => {
			const lastMessage = conv.messages[0]
			const isPending = lastMessage ? lastMessage.sender_id !== SUPPORT_USER_ID : false

			// Determine the user (not TOP Support)
			const user = conv.initiator.id === SUPPORT_USER_ID ? conv.participant : conv.initiator

			return {
				id: conv.id,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					avatar_url: user.avatar_url,
					role: user.role,
				},
				isPending,
				messageCount: conv._count.messages,
				lastMessage: lastMessage
					? {
							id: lastMessage.id,
							content: lastMessage.content,
							sender_id: lastMessage.sender_id,
							is_read: lastMessage.is_read,
							message_type: lastMessage.message_type,
							created_at: lastMessage.created_at.toISOString(),
						}
					: null,
				recentMessages: conv.messages.map((msg) => ({
					id: msg.id,
					content: msg.content,
					sender_id: msg.sender_id,
					is_read: msg.is_read,
					message_type: msg.message_type,
					created_at: msg.created_at.toISOString(),
				})),
				last_message_at: conv.last_message_at?.toISOString() || null,
				created_at: conv.created_at.toISOString(),
			}
		})

		return NextResponse.json({
			conversations: formattedConversations,
			stats: {
				total: totalCountForStats,
				pending: pendingCount,
				answered: totalCountForStats - pendingCount,
			},
			pagination: {
				page,
				limit,
				totalCount,
				totalPages: Math.ceil(totalCount / limit),
			},
		})
	} catch (error) {
		console.error("Error fetching support conversations:", error)
		return NextResponse.json({ error: "Failed to fetch support conversations" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	const admin = await requireAdmin(request)
	if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

	try {
		const body = await request.json()
		const { conversationId, content } = body

		if (!conversationId || !content) {
			return NextResponse.json(
				{ error: "conversationId and content are required" },
				{ status: 400 }
			)
		}

		const convId = parseInt(conversationId)

		// Verify conversation exists and is a support conversation
		const conversation = await prisma.conversations.findUnique({
			where: { id: convId },
			include: {
				initiator: true,
				participant: true,
			},
		})

		if (!conversation) {
			return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
		}

		if (conversation.type !== "SUPPORT") {
			return NextResponse.json({ error: "Not a support conversation" }, { status: 400 })
		}

		// Determine receiver (the user, not TOP Support)
		const receiverId =
			conversation.initiator_id === SUPPORT_USER_ID
				? conversation.participant_id
				: conversation.initiator_id

		// Create message as TOP Support
		const message = await prisma.messages.create({
			data: {
				conversation_id: convId,
				sender_id: SUPPORT_USER_ID,
				receiver_id: receiverId,
				content: content.trim(),
				message_type: "TEXT",
				is_read: false,
			},
			include: {
				sender: {
					select: {
						id: true,
						username: true,
						avatar_url: true,
					},
				},
			},
		})

		// Update conversation's last_message_at
		await prisma.conversations.update({
			where: { id: convId },
			data: { last_message_at: new Date() },
		})

		return NextResponse.json({
			success: true,
			message: {
				id: message.id,
				content: message.content,
				sender_id: message.sender_id,
				sender: message.sender,
				created_at: message.created_at.toISOString(),
			},
		})
	} catch (error) {
		console.error("Error sending support message:", error)
		return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
	}
}
