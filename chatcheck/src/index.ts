import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createClient } from "@supabase/supabase-js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"

// 环境变量配置
const API_BASE =
	process.env.API_BASE_URL ||
	process.env.NEXT_PUBLIC_API_URL ||
	"https://top-care-fashion.vercel.app"
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY =
	process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ""
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const SUPPORT_USER_ID = parseInt(process.env.SUPPORT_USER_ID || "59")
const USER_AGENT = "chatcheck-mcp/1.0"

// 验证必需的环境变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error("⚠️ 错误: SUPABASE_URL 和 SUPABASE_ANON_KEY 必须设置")
	process.exit(1)
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
	console.error("⚠️ 错误: ADMIN_EMAIL 和 ADMIN_PASSWORD 必须设置")
	console.error("   请在 MCP 配置中设置管理员邮箱和密码")
	process.exit(1)
}

// 创建 Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Access token 缓存
let cachedAccessToken: string | null = null
let tokenExpiresAt: number = 0

// 获取有效的 access token
async function getAccessToken(): Promise<string> {
	// 如果 token 还有效，直接返回
	if (cachedAccessToken && Date.now() < tokenExpiresAt) {
		return cachedAccessToken
	}

	// 使用 email/password 登录获取新的 token
	const { data, error } = await supabase.auth.signInWithPassword({
		email: ADMIN_EMAIL,
		password: ADMIN_PASSWORD,
	})

	if (error) {
		throw new Error(`Failed to sign in: ${error.message}`)
	}

	if (!data.session?.access_token) {
		throw new Error("No session returned from sign in")
	}

	// 缓存 token 和过期时间
	cachedAccessToken = data.session.access_token
	// Supabase token 通常有效期为 1 小时，我们设置 55 分钟过期
	tokenExpiresAt = Date.now() + 55 * 60 * 1000

	if (!cachedAccessToken) {
		throw new Error("Failed to cache access token")
	}

	return cachedAccessToken
}

// 类型定义
interface SupportConversation {
	id: number
	user: {
		id: number
		username: string
		email: string
		avatar_url: string | null
		role: string
	}
	isPending: boolean
	messageCount: number
	lastMessage: {
		id: number
		content: string
		sender_id: number
		is_read: boolean
		message_type: string
		created_at: string
	} | null
	recentMessages: Array<{
		id: number
		content: string
		sender_id: number
		is_read: boolean
		message_type: string
		created_at: string
	}>
	last_message_at: string | null
	created_at: string
}

interface SupportChatResponse {
	conversations: SupportConversation[]
	stats: {
		total: number
		pending: number
		answered: number
	}
	pagination: {
		page: number
		limit: number
		totalCount: number
		totalPages: number
	}
}

// API 调用辅助函数
async function fetchSupportChats(
	filter: "all" | "pending" | "answered" = "pending",
	page: number = 1,
	limit: number = 50
): Promise<SupportChatResponse> {
	const url = new URL(`${API_BASE}/api/admin/support`)
	url.searchParams.set("filter", filter)
	url.searchParams.set("page", page.toString())
	url.searchParams.set("limit", limit.toString())

	const accessToken = await getAccessToken()

	const headers: HeadersInit = {
		"User-Agent": USER_AGENT,
		"Content-Type": "application/json",
		Authorization: `Bearer ${accessToken}`,
	}

	const response = await fetch(url.toString(), { headers })

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Failed to fetch support chats: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return response.json()
}

async function fetchConversationMessages(conversationId: number): Promise<any> {
	const url = `${API_BASE}/api/messages/${conversationId}`

	const accessToken = await getAccessToken()

	const headers: HeadersInit = {
		"User-Agent": USER_AGENT,
		"Content-Type": "application/json",
		Authorization: `Bearer ${accessToken}`,
	}

	const response = await fetch(url, { headers })

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Failed to fetch messages: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return response.json()
}

async function sendSupportReply(conversationId: number, content: string): Promise<any> {
	const url = `${API_BASE}/api/admin/support`

	const accessToken = await getAccessToken()

	const headers: HeadersInit = {
		"User-Agent": USER_AGENT,
		"Content-Type": "application/json",
		Authorization: `Bearer ${accessToken}`,
	}

	const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify({ conversationId, content }),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Failed to send reply: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return response.json()
}

// Create server instance
const server = new Server(
	{
		name: "chatcheck",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	}
)

// 注册工具 1: 获取待处理的 support chat - 使用 setRequestHandler
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			{
				name: "get_pending_support_chats",
				description:
					"获取待处理的 support chat 列表。返回需要回复的用户对话，包括用户信息、最后一条消息和最近的对话历史。",
				inputSchema: {
					type: "object",
					properties: {
						limit: {
							type: "number",
							description: "返回的最大对话数量，默认 50",
						},
						page: {
							type: "number",
							description: "页码，从 1 开始，默认 1",
						},
					},
				},
			},
			{
				name: "get_all_support_chats",
				description:
					"获取所有 support chat（包括已回复和待处理的）。可以用于查看完整的 support 对话列表。",
				inputSchema: {
					type: "object",
					properties: {
						filter: {
							type: "string",
							enum: ["all", "pending", "answered"],
							description:
								"过滤类型：'all' 所有对话，'pending' 仅待处理，'answered' 仅已回复。默认 'all'",
						},
						limit: {
							type: "number",
							description: "返回的最大对话数量，默认 50",
						},
						page: {
							type: "number",
							description: "页码，从 1 开始，默认 1",
						},
					},
				},
			},
			{
				name: "get_conversation_messages",
				description: "获取指定 conversation 的完整消息历史。用于查看对话的详细内容。",
				inputSchema: {
					type: "object",
					properties: {
						conversationId: {
							type: "number",
							description: "对话 ID",
						},
					},
					required: ["conversationId"],
				},
			},
			{
				name: "reply_to_support_chat",
				description: "回复指定的 support chat。以 TOP Support 的身份发送消息给用户。",
				inputSchema: {
					type: "object",
					properties: {
						conversationId: {
							type: "number",
							description: "对话 ID",
						},
						content: {
							type: "string",
							description: "要发送的消息内容",
						},
					},
					required: ["conversationId", "content"],
				},
			},
		],
	}
})

// 工具处理函数
async function handleGetPendingSupportChats(args: any) {
	const limit = args?.limit || 50
	const page = args?.page || 1
	const data = await fetchSupportChats("pending", page, limit)

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						summary: `找到 ${data.stats.pending} 个待处理的 support chat`,
						conversations: data.conversations.map((conv) => ({
							id: conv.id,
							user: {
								username: conv.user.username,
								email: conv.user.email,
								id: conv.user.id,
							},
							isPending: conv.isPending,
							lastMessage: conv.lastMessage
								? {
										content: conv.lastMessage.content,
										sender_id: conv.lastMessage.sender_id,
										created_at: conv.lastMessage.created_at,
								  }
								: null,
							messageCount: conv.messageCount,
							recentMessages: conv.recentMessages.slice(0, 3).map((msg) => ({
								content: msg.content,
								sender_id: msg.sender_id,
								created_at: msg.created_at,
							})),
							last_message_at: conv.last_message_at,
						})),
						stats: data.stats,
						pagination: data.pagination,
					},
					null,
					2
				),
			},
		],
	}
}

async function handleGetAllSupportChats(args: any) {
	const filter = args?.filter || "all"
	const limit = args?.limit || 50
	const page = args?.page || 1
	const data = await fetchSupportChats(filter as "all" | "pending" | "answered", page, limit)

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						summary: `找到 ${data.stats.total} 个 support chat（待处理: ${data.stats.pending}, 已回复: ${data.stats.answered}）`,
						conversations: data.conversations.map((conv) => ({
							id: conv.id,
							user: {
								username: conv.user.username,
								email: conv.user.email,
								id: conv.user.id,
							},
							isPending: conv.isPending,
							lastMessage: conv.lastMessage
								? {
										content: conv.lastMessage.content,
										sender_id: conv.lastMessage.sender_id,
										created_at: conv.lastMessage.created_at,
								  }
								: null,
							messageCount: conv.messageCount,
							recentMessages: conv.recentMessages.slice(0, 3).map((msg) => ({
								content: msg.content,
								sender_id: msg.sender_id,
								created_at: msg.created_at,
							})),
							last_message_at: conv.last_message_at,
						})),
						stats: data.stats,
						pagination: data.pagination,
					},
					null,
					2
				),
			},
		],
	}
}

async function handleGetConversationMessages(args: any) {
	const conversationId = args?.conversationId
	if (!conversationId) {
		throw new Error("conversationId is required")
	}

	const data = await fetchConversationMessages(conversationId)

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						conversation: data.conversation,
						messages: data.messages || [],
						messageCount: data.messages?.length || 0,
					},
					null,
					2
				),
			},
		],
	}
}

async function handleReplyToSupportChat(args: any) {
	const conversationId = args?.conversationId
	const content = args?.content

	if (!conversationId || !content) {
		throw new Error("conversationId and content are required")
	}

	const data = await sendSupportReply(conversationId, content)

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						success: true,
						message: {
							id: data.message.id,
							content: data.message.content,
							created_at: data.message.created_at,
						},
						summary: `成功回复 conversation ${conversationId}`,
					},
					null,
					2
				),
			},
		],
	}
}

// 工具调用处理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params

	try {
		switch (name) {
			case "get_pending_support_chats":
				return await handleGetPendingSupportChats(args)
			case "get_all_support_chats":
				return await handleGetAllSupportChats(args)
			case "get_conversation_messages":
				return await handleGetConversationMessages(args)
			case "reply_to_support_chat":
				return await handleReplyToSupportChat(args)
			default:
				throw new Error(`Unknown tool: ${name}`)
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Error: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
			isError: true,
		}
	}
})

// 启动服务器
async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error("ChatCheck MCP Server running on stdio")
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
