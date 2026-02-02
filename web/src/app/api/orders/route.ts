import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyLegacyToken } from "@/lib/jwt"
import { createSupabaseServer } from "@/lib/supabase"
import { postSystemMessageOnce } from "@/lib/messages"
import { isPremiumUser, getCommissionRate, calculateCommission } from "@/lib/userPermissions"

// 支持legacy token的getCurrentUser函数
async function getCurrentUserWithLegacySupport(req: NextRequest) {
	try {
		const authHeader = req.headers.get("authorization")
		const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null

		if (!token) {
			console.log("❌ No token provided")
			return null
		}

		console.log("🔍 Token received:", token.substring(0, 50) + "...")

		// 优先尝试 legacy JWT
		const legacy = verifyLegacyToken(token)
		if (legacy.valid && legacy.payload?.uid) {
			const legacyUser = await prisma.users.findUnique({
				where: { id: Number(legacy.payload.uid) },
				select: {
					id: true,
					username: true,
					email: true,
					role: true,
					status: true,
					is_premium: true,
					dob: true,
					gender: true,
					avatar_url: true,
				},
			})
			if (legacyUser) {
				return {
					id: legacyUser.id,
					username: legacyUser.username,
					email: legacyUser.email,
					role: legacyUser.role,
					status: legacyUser.status,
					isPremium: Boolean(legacyUser.is_premium),
					dob: legacyUser.dob ? legacyUser.dob.toISOString().slice(0, 10) : null,
					gender: legacyUser.gender,
					avatar_url: legacyUser.avatar_url,
				}
			}
		}

		// 回退到Supabase认证
		console.log("🔍 Trying Supabase authentication...")
		const supabase = await createSupabaseServer()
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token)

		if (error) {
			console.log("❌ Supabase auth error:", error.message)
			return null
		}

		if (!user) {
			console.log("❌ No Supabase user found")
			return null
		}

		console.log("✅ Supabase user found:", user.email)

		const dbUser = await prisma.users.findUnique({
			where: { supabase_user_id: user.id },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				status: true,
				is_premium: true,
				dob: true,
				gender: true,
				avatar_url: true,
			},
		})

		if (dbUser) {
			console.log("✅ Local user found:", dbUser.username, "ID:", dbUser.id)
			return {
				id: dbUser.id,
				username: dbUser.username,
				email: dbUser.email,
				role: dbUser.role,
				status: dbUser.status,
				isPremium: Boolean(dbUser.is_premium),
				dob: dbUser.dob ? dbUser.dob.toISOString().slice(0, 10) : null,
				gender: dbUser.gender,
				avatar_url: dbUser.avatar_url,
			}
		} else {
			console.log("❌ No local user found for Supabase user:", user.email)
			return null
		}

		return null
	} catch (err) {
		console.error("❌ getCurrentUserWithLegacySupport failed:", err)
		return null
	}
}

// GET /api/orders - Get user's orders (as buyer or seller)
export async function GET(request: NextRequest) {
	try {
		console.log("🔍 Orders API - Starting request")
		const currentUser = await getCurrentUserWithLegacySupport(request)
		console.log("🔍 Orders API - Current user:", currentUser?.username || "null")

		if (!currentUser) {
			console.log("🔍 Orders API - No user, returning 401")
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const type = searchParams.get("type") // 'bought' or 'sold'
		const status = searchParams.get("status") // OrderStatus filter
		const page = parseInt(searchParams.get("page") || "1")
		const limit = parseInt(searchParams.get("limit") || "10")
		const offset = (page - 1) * limit

		let whereClause: any = {}

		if (type === "bought") {
			whereClause.buyer_id = currentUser.id
		} else if (type === "sold") {
			whereClause.seller_id = currentUser.id
		} else {
			// Return both bought and sold orders
			whereClause = {
				OR: [{ buyer_id: currentUser.id }, { seller_id: currentUser.id }],
			}
		}

		if (status) {
			whereClause.status = status
		}

		const orders = await prisma.orders.findMany({
			where: whereClause,
			include: {
				buyer: {
					select: {
						id: true,
						username: true,
						avatar_url: true,
					},
				},
				seller: {
					select: {
						id: true,
						username: true,
						avatar_url: true,
					},
				},
				listing: {
					select: {
						id: true,
						name: true,
						price: true,
						image_url: true,
						image_urls: true,
						brand: true,
						size: true,
						condition_type: true,
					},
				},
				reviews: {
					select: {
						id: true,
						reviewer_id: true,
						rating: true,
						comment: true,
						created_at: true,
					},
				},
			},
			orderBy: {
				created_at: "desc",
			},
			skip: offset,
			take: limit,
		})

		// 🔥 为每个订单获取对应的 conversationId
		const ordersWithConversations = await Promise.all(
			orders.map(async (order) => {
				let conversationId = null

				// 通过 listing_id 查找对应的 conversation
				const conversation = await prisma.conversations.findFirst({
					where: {
						listing_id: order.listing_id,
						OR: [
							{
								initiator_id: order.buyer_id,
								participant_id: order.seller_id,
							},
							{
								initiator_id: order.seller_id,
								participant_id: order.buyer_id,
							},
						],
					},
					select: {
						id: true,
					},
				})

				conversationId = conversation?.id?.toString() || null

				return {
					...order,
					conversationId,
				}
			})
		)

		const totalCount = await prisma.orders.count({
			where: whereClause,
		})

		return NextResponse.json({
			orders: ordersWithConversations,
			pagination: {
				page,
				limit,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limit),
			},
		})
	} catch (error) {
		console.error("❌ Orders API - Error details:", error)
		console.error("❌ Orders API - Error stack:", error instanceof Error ? error.stack : "No stack")
		return NextResponse.json(
			{
				error: "Failed to fetch orders",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
	try {
		console.log("🔍 Orders API - Starting POST request")
		const currentUser = await getCurrentUserWithLegacySupport(request)
		console.log(
			"🔍 Orders API - Current user:",
			currentUser?.username || "null",
			"ID:",
			currentUser?.id || "null"
		)
		if (!currentUser) {
			console.log("❌ Orders API - No user found, returning 401")
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		console.log("🔍 Orders API - Request body:", JSON.stringify(body, null, 2))
		const {
			listing_id,
			quantity, // 🔥 购买数量
			buyer_name,
			buyer_phone,
			shipping_address,
			payment_method,
			payment_method_id, // 🔥 后端支付方式 ID
			payment_details,
		} = body

		if (!listing_id) {
			console.log("❌ Orders API - No listing_id provided")
			return NextResponse.json({ error: "Listing ID is required" }, { status: 400 })
		}

		// 🔥 Convert listing_id to integer (Prisma expects Int, but client may send String)
		const listingIdInt = typeof listing_id === "string" ? parseInt(listing_id, 10) : listing_id
		if (isNaN(listingIdInt)) {
			console.log("❌ Orders API - Invalid listing_id format:", listing_id)
			return NextResponse.json({ error: "Invalid listing ID format" }, { status: 400 })
		}

		// 🔥 解析和验证购买数量
		const orderQuantity = quantity != null ? Number(quantity) : 1
		if (isNaN(orderQuantity) || orderQuantity < 1) {
			console.log("❌ Orders API - Invalid quantity:", quantity)
			return NextResponse.json({ error: "Invalid quantity. Must be at least 1." }, { status: 400 })
		}

		// Get the listing details
		console.log(
			"🔍 Orders API - Looking for listing ID:",
			listingIdInt,
			"(original:",
			listing_id,
			")"
		)
		const listing = await prisma.listings.findUnique({
			where: { id: listingIdInt },
			include: {
				seller: {
					select: {
						id: true,
						username: true,
					},
				},
			},
		})

		console.log(
			"🔍 Orders API - Found listing:",
			listing
				? `ID ${listing.id}, Seller: ${listing.seller?.username} (${listing.seller?.id}), Listed: ${listing.listed}, Sold: ${listing.sold}`
				: "null"
		)

		if (!listing) {
			console.log("❌ Orders API - Listing not found")
			return NextResponse.json({ error: "Listing not found" }, { status: 404 })
		}

		if (listing.seller_id === currentUser.id) {
			console.log("❌ Orders API - User trying to buy own listing")
			console.log("❌ Orders API - Seller ID:", listing.seller_id)
			console.log("❌ Orders API - Current User ID:", currentUser.id)
			return NextResponse.json({ error: "Cannot buy your own listing" }, { status: 400 })
		}

		if (listing.sold) {
			console.log("❌ Orders API - Listing already sold")
			return NextResponse.json({ error: "Listing is already sold" }, { status: 400 })
		}

		if (!listing.listed) {
			console.log("❌ Orders API - Listing not available")
			console.log("❌ Orders API - Listing listed status:", listing.listed)
			return NextResponse.json({ error: "Listing is not available" }, { status: 400 })
		}

		// 🔥 检查库存是否足够
		const currentStock = (listing as any).inventory_count ?? 0
		console.log(
			"🔍 Orders API - Checking stock. Current:",
			currentStock,
			"Requested:",
			orderQuantity
		)

		if (currentStock < orderQuantity) {
			console.log("❌ Orders API - Insufficient stock")
			return NextResponse.json(
				{
					error: "Insufficient stock",
					message: `Only ${currentStock} item(s) available.`,
					available: currentStock,
					requested: orderQuantity,
				},
				{ status: 400 }
			)
		}

		// Resolve seller id (some schemas may have nullable seller_id)
		const sellerId: number | null =
			(listing as any).seller_id ?? (listing as any).seller?.id ?? null
		if (sellerId === null || sellerId === undefined) {
			return NextResponse.json({ error: "Listing has no seller associated" }, { status: 400 })
		}

		// 🔥 获取卖家信息以计算佣金
		const seller = await prisma.users.findUnique({
			where: { id: sellerId },
			select: {
				is_premium: true,
				premium_until: true,
			},
		})

		if (!seller) {
			return NextResponse.json({ error: "Seller not found" }, { status: 400 })
		}

		// 🔥 计算佣金
		const sellerIsPremium = isPremiumUser(seller)
		const commissionRate = getCommissionRate(sellerIsPremium)
		const orderAmount = Number(listing.price) * orderQuantity
		const commissionAmount = calculateCommission(orderAmount, sellerIsPremium)

		console.log("💰 Commission calculation:", {
			sellerIsPremium,
			commissionRate,
			orderAmount,
			commissionAmount,
		})

		// --- 核心事务：原子扣减库存 + 创建订单 ---
		let order
		try {
			order = await prisma.$transaction(
				async (tx) => {
					// 1. 原子扣减库存
					// 使用 updateMany 配合 where 条件，确保扣减时库存依然足够
					const updateResult = await tx.listings.updateMany({
						where: {
							id: listingIdInt,
							inventory_count: { gte: orderQuantity },
							sold: false,
							listed: true,
						},
						data: {
							inventory_count: { decrement: orderQuantity },
						},
					})

					if (updateResult.count === 0) {
						throw new Error("INSUFFICIENT_STOCK")
					}

					// 2. 检查更新后的库存，如果为 0 则自动下架
					const updatedListing = await tx.listings.findUnique({
						where: { id: listingIdInt },
						select: { inventory_count: true },
					})

					if (updatedListing && (updatedListing.inventory_count ?? 0) <= 0) {
						await tx.listings.update({
							where: { id: listingIdInt },
							data: {
								sold: true,
								listed: false,
								sold_at: new Date(),
							},
						})
					}

					// 3. 创建订单
					return await tx.orders.create({
						data: {
							buyer_id: currentUser.id,
							seller_id: sellerId,
							listing_id: listing.id,
							order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
							status: "IN_PROGRESS",
							total_amount: orderAmount,
							quantity: orderQuantity,
							commission_rate: commissionRate,
							commission_amount: commissionAmount,
							buyer_name: buyer_name || null,
							buyer_phone: buyer_phone || null,
							shipping_address: shipping_address || null,
							payment_method: payment_method || null,
							payment_method_id: payment_method_id || null,
							payment_details: payment_details || null,
						},
						include: {
							buyer: {
								select: {
									id: true,
									username: true,
									avatar_url: true,
								},
							},
							seller: {
								select: {
									id: true,
									username: true,
									avatar_url: true,
								},
							},
							listing: {
								select: {
									id: true,
									name: true,
									price: true,
									image_url: true,
									image_urls: true,
									brand: true,
									size: true,
									condition_type: true,
								},
							},
						},
					})
				},
				{
					// 设置较短的超时时间，防止并发死锁
					timeout: 10000,
				}
			)
		} catch (txError: any) {
			if (txError.message === "INSUFFICIENT_STOCK") {
				return NextResponse.json(
					{
						error: "Insufficient stock",
						message: "The item was just purchased by someone else or has insufficient stock.",
					},
					{ status: 400 }
				)
			}
			throw txError // 重新抛出其他错误由外层 catch 处理
		}

		console.log("✅ Orders API - Order created and stock updated atomically:", order.id)

		// 🔥 创建或查找对话，并发送 PAID 系统消息
		try {
			// 查找买家和卖家之间的对话
			let conversation = await prisma.conversations.findFirst({
				where: {
					listing_id: listing.id,
					OR: [
						{ initiator_id: currentUser.id, participant_id: sellerId },
						{ initiator_id: sellerId, participant_id: currentUser.id },
					],
				},
			})

			// 如果不存在对话，创建一个新对话
			if (!conversation) {
				conversation = await prisma.conversations.create({
					data: {
						initiator_id: currentUser.id,
						participant_id: sellerId,
						listing_id: listing.id,
						type: "ORDER",
					},
				})
				console.log(`✅ Created new conversation ${conversation.id} for order ${order.id}`)
			} else {
				console.log(`✅ Found existing conversation ${conversation.id} for order ${order.id}`)
			}

			// 发送 PAID 系统消息（使用幂等逻辑）
			// 前端会根据当前用户身份动态转换显示内容
			await postSystemMessageOnce({
				conversationId: conversation.id,
				senderId: currentUser.id,
				receiverId: sellerId,
				content:
					"@Buyer has paid for the order.\nPlease pack the item and ship to the address provided on TOP.",
				actorName: currentUser.username,
				orderId: order.id, // 🔥 传入订单 ID
				messageType: "PAID", // 🔥 消息类型
			})
			console.log(
				`✅ PAID system message created for order ${order.id} in conversation ${conversation.id}`
			)

			// 🔔 创建下单通知给卖家
			try {
				await prisma.notifications.create({
					data: {
						user_id: sellerId, // 通知卖家
						type: "ORDER",
						title: "New order received",
						message: `@${currentUser.username} placed an order for your item.`,
						image_url: currentUser.avatar_url || null, // 显示买家头像
						order_id: order.id.toString(),
						related_user_id: currentUser.id, // 买家ID
						conversation_id: conversation.id,
					},
				})
				console.log(`🔔 Order notification created for seller ${sellerId}`)
			} catch (notifError) {
				console.error("❌ Failed to create order notification:", notifError)
				// 不阻止订单创建
			}
		} catch (msgError) {
			console.error("❌ Failed to create PAID system message:", msgError)
			// 不阻止订单创建，只记录错误
		}

		return NextResponse.json(order, { status: 201 })
	} catch (error) {
		console.error("❌ Error creating order:", error)
		console.error("❌ Error details:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : "No stack",
			error: error,
		})
		return NextResponse.json(
			{
				error: "Failed to create order",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}
