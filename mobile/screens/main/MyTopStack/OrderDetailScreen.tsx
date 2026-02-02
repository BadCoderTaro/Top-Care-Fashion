import React, { useState, useEffect } from "react"
import {
	View,
	Text,
	StyleSheet,
	Image,
	ScrollView,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from "react-native"
import Header from "../../../components/Header"
import { useRoute, CommonActions } from "@react-navigation/native"
import type { RouteProp } from "@react-navigation/native"
import type { MyTopStackParamList } from "./index"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { ordersService, Order, OrderStatus, messagesService } from "../../../src/services"
import {
	PURCHASE_ORDERS as purchaseOrders,
	SOLD_ORDERS as soldOrders,
	DEFAULT_SHIPPING_ADDRESS,
} from "../../../mocks/shop"
import Avatar from "../../../components/Avatar"
import { DEFAULT_AVATAR } from "../../../constants/assetUrls"
import { useAuth } from "../../../contexts/AuthContext"

type Purchase = (typeof purchaseOrders)[number]
type Sold = (typeof soldOrders)[number]

// Helper function to map mock status to API status
function mapMockStatusToApiStatus(mockStatus: string): OrderStatus {
	switch (mockStatus) {
		case "InProgress":
			return "IN_PROGRESS"
		case "ToShip":
			return "TO_SHIP"
		case "Shipped":
			return "SHIPPED"
		case "Delivered":
			return "DELIVERED"
		case "Received":
			return "RECEIVED"
		case "Completed":
			return "COMPLETED"
		case "Reviewed":
			return "REVIEWED"
		case "Cancelled":
			return "CANCELLED"
		default:
			return "IN_PROGRESS"
	}
}

// Helper function to map API status to display status
function mapApiStatusToDisplayStatus(apiStatus: OrderStatus): string {
	switch (apiStatus) {
		case "IN_PROGRESS":
			return "InProgress"
		case "TO_SHIP":
			return "ToShip"
		case "SHIPPED":
			return "Shipped"
		case "DELIVERED":
			return "Delivered"
		case "RECEIVED":
			return "Received"
		case "COMPLETED":
			return "Completed"
		case "REVIEWED":
			return "Reviewed"
		case "CANCELLED":
			return "Cancelled"
		default:
			return "InProgress"
	}
}

// 🔒 安全的支付信息显示函数
const formatPaymentDetails = (paymentDetails: any) => {
	if (!paymentDetails) return null

	// 只显示安全的支付信息，隐藏敏感数据
	const safeInfo = []

	if (paymentDetails.brand) {
		safeInfo.push(`Brand: ${paymentDetails.brand}`)
	}

	if (paymentDetails.last4) {
		safeInfo.push(`Card: **** **** **** ${paymentDetails.last4}`)
	}

	if (paymentDetails.expiry) {
		safeInfo.push(`Expires: ${paymentDetails.expiry}`)
	}

	// 不显示CVV等敏感信息
	return safeInfo.length > 0 ? safeInfo.join("\n") : null
}

// 💳 买家视角的支付信息显示函数（只显示卡号尾号）
const formatBuyerPaymentDetails = (paymentDetails: any) => {
	if (!paymentDetails) return null

	// 买家视角：只显示卡号尾号，不显示brand和expires
	if (paymentDetails.last4) {
		return `Card: **** **** **** ${paymentDetails.last4}`
	}

	return null
}

export default function OrderDetailScreen() {
	const route = useRoute<RouteProp<MyTopStackParamList, "OrderDetail">>()
	const navigation = useNavigation<NativeStackNavigationProp<MyTopStackParamList>>()
	const { user } = useAuth()

	const params =
		(route.params as
			| { id?: string; source?: "purchase" | "sold"; conversationId?: string }
			| undefined) ?? {}
	const id = params.id
	const source = params.source ?? "purchase"
	const conversationId = params.conversationId

	console.log("🔍 OrderDetailScreen params:", params)
	console.log("🔍 OrderDetailScreen source:", source)

	const [order, setOrder] = useState<Order | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Load order data from API
	useEffect(() => {
		const loadOrder = async () => {
			if (!id) {
				setError("Order ID is required")
				setLoading(false)
				return
			}

			try {
				setLoading(true)
				setError(null)

				const orderId = parseInt(id)
				if (isNaN(orderId)) {
					throw new Error("Invalid order ID")
				}

				const orderData = await ordersService.getOrder(orderId)
				setOrder(orderData)
			} catch (err) {
				console.error("Error loading order:", err)
				setError(err instanceof Error ? err.message : "Failed to load order")

				// Fallback to mock data for development
				const foundOrder =
					source === "purchase"
						? purchaseOrders.find((o) => String(o.id) === String(id))
						: soldOrders.find((o) => String(o.id) === String(id))

				if (foundOrder) {
					// Convert mock data to API format for compatibility
					const mockOrder: Order = {
						id: parseInt(foundOrder.id) || 1,
						buyer_id: source === "purchase" ? user?.id || 1 : order?.buyer_id || 1,
						seller_id: source === "purchase" ? order?.seller_id || 2 : user?.id || 2,
						listing_id: 1,
						status: mapMockStatusToApiStatus(foundOrder.status),
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						buyer: {
							id: source === "purchase" ? user?.id || 1 : order?.buyer_id || 1,
							username: source === "purchase" ? "You" : (foundOrder as Sold).buyer?.name || "Buyer",
							avatar_url: source === "purchase" ? undefined : (foundOrder as Sold).buyer?.avatar,
						},
						seller: {
							id: source === "purchase" ? order?.seller_id || 2 : user?.id || 2,
							username:
								source === "purchase" ? (foundOrder as Purchase).seller?.name || "Seller" : "You",
							avatar_url:
								source === "purchase" ? (foundOrder as Purchase).seller?.avatar : undefined,
						},
						listing: {
							id: 1,
							name: foundOrder.product.title,
							description: foundOrder.product.description,
							price: foundOrder.product.price,
							image_url: foundOrder.product.images[0],
							image_urls: foundOrder.product.images,
							brand: foundOrder.product.brand ?? "",
							size: foundOrder.product.size ?? "",
							condition_type: foundOrder.product.condition ?? "UNKNOWN",
						},
						reviews: [],
					}
					setOrder(mockOrder)
				}
			} finally {
				setLoading(false)
			}
		}

		loadOrder()
	}, [id, source])

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#000" />
				<Text style={{ marginTop: 10 }}>Loading order...</Text>
			</View>
		)
	}

	if (error && !order) {
		return (
			<View style={styles.centered}>
				<Text style={{ color: "red", textAlign: "center" }}>{error}</Text>
			</View>
		)
	}

	if (!order) {
		return (
			<View style={styles.centered}>
				<Text>Order not found</Text>
			</View>
		)
	}

	// 🔥 根据登录用户与订单信息判定视角
	let isPurchase = false
	if (order) {
		if (user?.id && order.buyer_id && user.id === order.buyer_id) {
			isPurchase = true
		} else if (user?.id && order.seller_id && user.id === order.seller_id) {
			isPurchase = false
		} else if (source === "purchase") {
			isPurchase = true
		} else if (source === "sold") {
			isPurchase = false
		}
	} else {
		isPurchase = source !== "sold"
	}

	console.log("========== OrderDetailScreen 视角判断 ==========")
	console.log("🔍 Order ID:", order?.id)
	console.log("🔍 Order status:", order?.status)
	console.log("🔍 Current user:", { id: user?.id, username: user?.username })
	console.log("🔍 Order buyer:", { id: order?.buyer_id, username: order?.buyer?.username })
	console.log("🔍 Order seller:", { id: order?.seller_id, username: order?.seller?.username })
	console.log("🔍 Source param:", source)
	console.log("🔍 Result - isPurchase (买家视角):", isPurchase)
	console.log("🔍 Result - isSeller (卖家视角):", !isPurchase)
	console.log("===============================================")

	console.log("🔍 OrderDetailScreen order status:", order?.status)
	console.log(
		"🔍 OrderDetailScreen should show TO_SHIP buttons:",
		!isPurchase && order?.status === "TO_SHIP"
	)

	const resolvedQuantity = Number(order.quantity ?? 1)
	const unitPrice = Number(order.listing?.price ?? 0)
	const totalAmount = (() => {
		const rawTotal = (order as any).total_amount
		if (rawTotal !== undefined && rawTotal !== null) {
			const parsed = Number(rawTotal)
			if (!Number.isNaN(parsed)) {
				return parsed
			}
		}
		return unitPrice * resolvedQuantity
	})()
	const formattedTotalAmount = totalAmount.toFixed(2)

	// 🔥 判断评论状态
	const getReviewStatus = () => {
		if (!order?.reviews || !user?.id)
			return {
				hasReviews: false,
				hasUserReviewed: false,
				hasOtherReviewed: false,
				isMutualComplete: false,
			}

		const reviews = order.reviews
		const currentUserId = user.id
		// ✅ 使用 Number() 转换确保类型一致
		const hasBuyerReview = reviews.some(
			(review) => Number(review.reviewer_id) === Number(order.buyer_id)
		)
		const hasSellerReview = reviews.some(
			(review) => Number(review.reviewer_id) === Number(order.seller_id)
		)

		// 判断当前用户是否已评论
		const hasUserReviewed = reviews.some(
			(review) => Number(review.reviewer_id) === Number(currentUserId)
		)

		// 判断对方是否已评论
		const hasOtherReviewed = isPurchase
			? hasSellerReview // 买家视角：对方是卖家
			: hasBuyerReview // 卖家视角：对方是买家

		console.log("🔍 ReviewStatus Debug:", {
			currentUserId,
			currentUserIdType: typeof currentUserId,
			hasUserReviewed,
			hasOtherReviewed,
			isMutualComplete: hasBuyerReview && hasSellerReview,
			reviewsCount: reviews.length,
			reviews: reviews.map((r) => ({
				reviewer_id: r.reviewer_id,
				reviewer_id_type: typeof r.reviewer_id,
			})),
		})

		return {
			hasReviews: reviews.length > 0,
			hasUserReviewed,
			hasOtherReviewed,
			hasBuyerReview,
			hasSellerReview,
			isMutualComplete: hasBuyerReview && hasSellerReview,
		}
	}

	const reviewStatus = getReviewStatus()

	const handleCancel = async () => {
		if (!isPurchase || !order) return

		try {
			const updatedOrder = await ordersService.cancelOrder(order.id)
			setOrder(updatedOrder)
			Alert.alert("Order Cancelled", "Your order has been successfully cancelled.")
		} catch (error) {
			console.error("Error cancelling order:", error)
			Alert.alert("Error", "Failed to cancel order. Please try again.")
		}
	}

	const handleReceived = async () => {
		if (!isPurchase || !order) return

		try {
			console.log("🔍 OrderDetailScreen - Mark as Received - Order ID:", order.id)
			console.log("🔍 OrderDetailScreen - Mark as Received - Current status:", order.status)
			console.log("🔍 OrderDetailScreen - Mark as Received - isPurchase:", isPurchase)
			console.log("🔍 OrderDetailScreen - Mark as Received - conversationId:", conversationId)

			const updatedOrder = await ordersService.markAsReceived(order.id)
			console.log("🔍 OrderDetailScreen - Mark as Received - Updated order:", updatedOrder)
			console.log("🔍 OrderDetailScreen - Mark as Received - New status:", updatedOrder.status)

			setOrder(updatedOrder)

			// 🔥 发送系统消息到 ChatScreen - 根据用户角色发送不同视角的消息
			if (conversationId) {
				try {
					console.log(
						"🔍 OrderDetailScreen - Sending Mark as Received system message to conversationId:",
						conversationId
					)
					console.log("🔍 OrderDetailScreen - isPurchase:", isPurchase)

					// 根据 isPurchase 判断当前用户是买家还是卖家
					const messageContent = isPurchase
						? "I've confirmed received. Transaction completed." // 买家视角：我确认收货了
						: "Buyer confirmed received. Transaction completed." // 卖家视角：买家确认收货了

					console.log("🔍 OrderDetailScreen - Message content:", messageContent)

					await messagesService.sendMessage(conversationId, {
						content: messageContent,
						message_type: "SYSTEM",
					})
					console.log("✅ System message sent: Order confirmed received. Transaction completed.")
				} catch (messageError) {
					console.error("❌ Failed to send Mark as Received system message:", messageError)
				}
			} else {
				console.log(
					"❌ OrderDetailScreen - No conversationId available for Mark as Received system message"
				)
			}

			Alert.alert("Order marked as received", "You can now leave a review.")
		} catch (error) {
			console.error("Error marking order as received:", error)
			Alert.alert("Error", "Failed to mark order as received. Please try again.")
		}
	}

	// --- Seller side handlers ---
	const handleMarkShipped = async () => {
		if (isPurchase || !order) return

		try {
			const updatedOrder = await ordersService.markAsShipped(order.id)
			setOrder(updatedOrder)

			Alert.alert("Order marked as shipped", "Your buyer will be notified.")
		} catch (error) {
			console.error("Error marking order as shipped:", error)
			Alert.alert("Error", "Failed to mark order as shipped. Please try again.")
		}
	}

	const handleCancelSold = async () => {
		if (isPurchase || !order) return

		try {
			const updatedOrder = await ordersService.cancelOrder(order.id)
			setOrder(updatedOrder)

			Alert.alert("Order cancelled", "You have cancelled this order.")
		} catch (error) {
			console.error("Error cancelling order:", error)
			Alert.alert("Error", "Failed to cancel order. Please try again.")
		}
	}

	const handleMarkArrived = async () => {
		if (isPurchase || !order) return

		try {
			// 将订单状态更新为 DELIVERED（已送达）
			const updatedOrder = await ordersService.updateOrderStatus(order.id, { status: "DELIVERED" })
			setOrder(updatedOrder)

			Alert.alert("Package Arrived", "Your buyer has been notified that the package has arrived.")
		} catch (error) {
			console.error("Error marking package as arrived:", error)
			Alert.alert("Error", "Failed to mark package as arrived. Please try again.")
		}
	}

	return (
		<View style={{ flex: 1, backgroundColor: "#fff" }}>
			<Header
				title={`Order #${order.id}`}
				showBack
				onBackPress={() => {
					console.log("🔙 Back button pressed in OrderDetailScreen")

					// 🔍 调试：检查当前导航状态
					const state = navigation.getState()
					console.log("🔍 Current route name:", state.routes[state.index]?.name)
					console.log("🔍 Routes count:", state.routes.length)
					console.log("🔍 Can go back:", navigation.canGoBack())

					// 🔥 使用 CommonActions.reset 确保完全清理导航栈，避免来回跳转
					// ✅ 重置到 MyTopMain，确保 OrderDetail 被完全卸载
					navigation.dispatch(
						CommonActions.reset({
							index: 0,
							routes: [{ name: "MyTopMain" }],
						})
					)

					console.log("✅ Navigated back to MyTopMain using reset")
				}}
			/>

			<ScrollView contentContainerStyle={styles.container}>
				{/* 商品信息 */}
				<View style={styles.card}>
					<Image
						source={{
							uri:
								order.listing?.image_url ||
								(typeof order.listing?.image_urls === "string"
									? JSON.parse(order.listing.image_urls)[0]
									: order.listing?.image_urls?.[0]) ||
								"https://via.placeholder.com/100x120",
						}}
						style={styles.productImg}
					/>
					<View style={{ flex: 1, marginLeft: 12 }}>
						<Text style={styles.productTitle} numberOfLines={2}>
							{order.listing.name}
						</Text>
						<Text style={styles.productPrice}>${order.listing.price}</Text>
						<Text style={styles.productMeta}>Size: {order.listing.size || "N/A"}</Text>

						{/* 显示买家/卖家 */}
						{isPurchase ? (
							<View style={styles.userRow}>
								<Avatar
									source={
										order.seller.avatar_url
											? { uri: order.seller.avatar_url }
											: order.seller.avatar_path
											? { uri: order.seller.avatar_path }
											: DEFAULT_AVATAR
									}
									style={styles.userAvatar}
									isPremium={order.seller?.isPremium}
								/>
								<Text style={styles.userName}>{order.seller.username}</Text>
							</View>
						) : (
							<View style={styles.userRow}>
								<Avatar
									source={
										order.buyer.avatar_url
											? { uri: order.buyer.avatar_url }
											: order.buyer.avatar_path
											? { uri: order.buyer.avatar_path }
											: DEFAULT_AVATAR
									}
									style={styles.userAvatar}
									isPremium={order.buyer?.isPremium}
								/>
								<Text style={styles.userName}>{order.buyer.username}</Text>
							</View>
						)}
					</View>
				</View>

				{/* 状态显示 */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Order Status</Text>

					{order.status === "CANCELLED" ? (
						<Text style={styles.stepCancelled}>✗ Cancelled</Text>
					) : (
						<View style={styles.progressRow}>
							<Text style={[styles.step, styles.stepDone]}>✓ Paid</Text>
							<Text
								style={[
									styles.step,
									["SHIPPED", "DELIVERED", "RECEIVED", "COMPLETED", "REVIEWED"].includes(
										order.status
									)
										? styles.stepDone
										: ["IN_PROGRESS", "TO_SHIP"].includes(order.status)
										? styles.stepPending
										: styles.step,
								]}
							>
								{["IN_PROGRESS", "TO_SHIP"].includes(order.status) ? "… Pending" : "✓ Shipped"}
							</Text>
							<Text
								style={[
									styles.step,
									["DELIVERED", "RECEIVED", "COMPLETED", "REVIEWED"].includes(order.status)
										? styles.stepDone
										: order.status === "SHIPPED"
										? styles.stepPending
										: styles.step,
								]}
							>
								{order.status === "SHIPPED" ? "… In Transit" : "✓ Delivered"}
							</Text>
							{["RECEIVED", "COMPLETED", "REVIEWED"].includes(order.status) && (
								<Text style={[styles.step, styles.stepDone]}>✓ Received</Text>
							)}
						</View>
					)}
				</View>

				{/* 收货地址 / Buyer Info */}
				{isPurchase ? (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Shipping Address</Text>
						{order.shipping_address ? (
							<Text style={styles.text}>{order.shipping_address}</Text>
						) : (
							<>
								<Text style={styles.text}>Default Address</Text>
								<Text style={styles.text}>123 Main St, City, Country</Text>
							</>
						)}
					</View>
				) : (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Buyer Info</Text>
						<Text style={styles.text}>
							Name: {order.buyer_name || order.buyer.username || "N/A"}
						</Text>
						<Text style={styles.text}>
							Phone: {order.buyer_phone || order.buyer.phone_number || "N/A"}
						</Text>

						{/* Seller-side: Show real shipping address */}
						<Text style={[styles.sectionTitle, { marginTop: 10 }]}>Shipping Address</Text>
						{order.shipping_address ? (
							<Text style={styles.text}>{order.shipping_address}</Text>
						) : (
							<>
								<Text style={styles.text}>{DEFAULT_SHIPPING_ADDRESS.name}</Text>
								<Text style={styles.text}>{DEFAULT_SHIPPING_ADDRESS.phone}</Text>
								<Text style={styles.text}>
									{DEFAULT_SHIPPING_ADDRESS.line1}, {DEFAULT_SHIPPING_ADDRESS.city},{" "}
									{DEFAULT_SHIPPING_ADDRESS.country}
								</Text>
							</>
						)}

						{/* Seller-side: Real Payment Info */}
						<Text style={[styles.sectionTitle, { marginTop: 10 }]}>Payment Info</Text>
						<Text style={styles.text}>Quantity: ×{resolvedQuantity}</Text>
						<Text style={styles.text}>Total Paid: ${formattedTotalAmount}</Text>
						<Text style={styles.text}>Method: {order.payment_method || "N/A"}</Text>
						<Text style={styles.text}>Date: {new Date(order.created_at).toLocaleDateString()}</Text>
						<Text style={styles.text}>
							Transaction ID: {(order as any).order_number || `TXN-${order.id}`}
						</Text>
					</View>
				)}

				{/* 支付信息 */}
				{isPurchase && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Payment</Text>
						<Text style={styles.text}>
							Paid ${formattedTotalAmount} with {order.payment_method || "PayPal"}
						</Text>
						<Text style={styles.text}>Quantity: ×{resolvedQuantity}</Text>
						<Text style={styles.text}>Date: {new Date(order.created_at).toLocaleDateString()}</Text>
						<Text style={styles.text}>
							Transaction ID: {(order as any).order_number || `TXN-${order.id}`}
						</Text>
						{order.payment_details && formatBuyerPaymentDetails(order.payment_details) && (
							<Text style={styles.text}>{formatBuyerPaymentDetails(order.payment_details)}</Text>
						)}
					</View>
				)}
			</ScrollView>

			{/* 🧭 底部操作按钮逻辑 */}
			{isPurchase && (
				<>
					{/* 🟠 IN_PROGRESS → Cancel */}
					{order.status === "IN_PROGRESS" && (
						<View style={styles.footer}>
							<TouchableOpacity
								style={[styles.feedbackBtn, { backgroundColor: "#F54B3D" }]}
								onPress={handleCancel}
							>
								<Text style={styles.feedbackText}>Cancel Order</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* 🟢 DELIVERED → RECEIVED */}
					{order.status === "DELIVERED" && (
						<View style={styles.footer}>
							<TouchableOpacity
								style={[styles.feedbackBtn, { backgroundColor: "#000" }]}
								onPress={handleReceived}
							>
								<Text style={styles.feedbackText}>Order Received</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* 🟣 COMPLETED/REVIEWED → Review (根据评论状态显示不同按钮) */}
					{(order.status === "COMPLETED" || order.status === "REVIEWED") && (
						<View style={styles.footer}>
							{reviewStatus.isMutualComplete ? (
								// 两个人都评论了 -> View Mutual Review
								<TouchableOpacity
									style={[styles.feedbackBtn, { backgroundColor: "#2d7ef0" }]}
									onPress={() => {
										let rootNav: any = navigation
										while (rootNav.getParent && typeof rootNav.getParent === "function") {
											const parent = rootNav.getParent()
											if (!parent) break
											rootNav = parent
										}
										try {
											rootNav.navigate("MutualReview", { orderId: order.id })
										} catch (err) {
											console.error("❌ Failed to navigate to MutualReview:", err)
										}
									}}
								>
									<Text style={styles.feedbackText}>View Mutual Review</Text>
								</TouchableOpacity>
							) : reviewStatus.hasUserReviewed ? (
								// 只有我评论了 -> View Your Review
								<TouchableOpacity
									style={styles.feedbackBtn}
									onPress={() => {
										let rootNav: any = navigation
										while (rootNav.getParent && typeof rootNav.getParent === "function") {
											const parent = rootNav.getParent()
											if (!parent) break
											rootNav = parent
										}
										try {
											rootNav.navigate("ViewReview", { orderId: order.id })
										} catch (err) {
											console.error("❌ Failed to navigate to ViewReview:", err)
										}
									}}
								>
									<Text style={styles.feedbackText}>View Your Review</Text>
								</TouchableOpacity>
							) : (
								// 还没评论 -> Leave Review
								<TouchableOpacity
									style={styles.feedbackBtn}
									onPress={() => (navigation as any).navigate("Review", { orderId: order.id })}
								>
									<Text style={styles.feedbackText}>Leave Review</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
				</>
			)}

			{/* 🔥 COMPLETED/REVIEWED 状态 - 根据评论状态显示不同按钮 */}
			{!isPurchase && (order.status === "COMPLETED" || order.status === "REVIEWED") && (
				<View style={styles.footer}>
					{reviewStatus.isMutualComplete ? (
						// 两个人都评论了 -> View Mutual Review
						<TouchableOpacity
							style={[styles.feedbackBtn, { backgroundColor: "#2d7ef0" }]}
							onPress={() => {
								let rootNav: any = navigation
								while (rootNav.getParent && typeof rootNav.getParent === "function") {
									const parent = rootNav.getParent()
									if (!parent) break
									rootNav = parent
								}
								try {
									rootNav.navigate("MutualReview", { orderId: order.id })
								} catch (err) {
									console.error("❌ Failed to navigate to MutualReview:", err)
								}
							}}
						>
							<Text style={styles.feedbackText}>View Mutual Review</Text>
						</TouchableOpacity>
					) : reviewStatus.hasUserReviewed ? (
						// 只有我评论了 -> View Your Review
						<TouchableOpacity
							style={styles.feedbackBtn}
							onPress={() => {
								let rootNav: any = navigation
								while (rootNav.getParent && typeof rootNav.getParent === "function") {
									const parent = rootNav.getParent()
									if (!parent) break
									rootNav = parent
								}
								try {
									rootNav.navigate("ViewReview", { orderId: order.id })
								} catch (err) {
									console.error("❌ Failed to navigate to ViewReview:", err)
								}
							}}
						>
							<Text style={styles.feedbackText}>View Your Review</Text>
						</TouchableOpacity>
					) : (
						// 还没评论 -> Leave Review
						<TouchableOpacity
							style={styles.feedbackBtn}
							onPress={() => (navigation as any).navigate("Review", { orderId: order.id })}
						>
							<Text style={styles.feedbackText}>Leave Review</Text>
						</TouchableOpacity>
					)}
				</View>
			)}

			{/* 卖家视图操作区 - 只有 IN_PROGRESS 状态（卖家视角的TO_SHIP） */}
			{!isPurchase && ["IN_PROGRESS", "TO_SHIP"].includes(order.status) && (
				<View style={styles.footer}>
					<TouchableOpacity
						style={[styles.feedbackBtn, { backgroundColor: "black" }]}
						onPress={handleMarkShipped}
					>
						<Text style={styles.feedbackText}>Mark as Shipped</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.feedbackBtn, { backgroundColor: "#F54B3D", marginTop: 8 }]}
						onPress={handleCancelSold}
					>
						<Text style={styles.feedbackText}>Cancel Order</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* In Transit 状态 - 卖家标记为已送达 */}
			{!isPurchase && order.status === "SHIPPED" && (
				<View style={styles.footer}>
					<TouchableOpacity
						style={[styles.feedbackBtn, { backgroundColor: "#2d7ef0" }]}
						onPress={handleMarkArrived}
					>
						<Text style={styles.feedbackText}>Mark as Arrived</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { padding: 16, paddingBottom: 100 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	card: {
		flexDirection: "row",
		backgroundColor: "#fafafa",
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
	},
	productImg: { width: 100, height: 120, borderRadius: 8 },
	productTitle: { fontSize: 16, fontWeight: "600" },
	productPrice: { fontSize: 16, fontWeight: "700", marginTop: 4 },
	productMeta: { fontSize: 14, color: "#666", marginTop: 4 },
	userRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
	userAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
	userName: { fontSize: 14, color: "#333" },
	section: { marginBottom: 20 },
	sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
	text: { fontSize: 14, color: "#333", marginBottom: 2 },
	progressRow: { flexDirection: "row", justifyContent: "space-between" },
	step: { fontSize: 14 },
	stepDone: { color: "green", fontWeight: "600" },
	stepPending: { color: "orange", fontWeight: "600" },
	stepCancelled: { fontSize: 14, color: "red", fontWeight: "700" },
	footer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "#fff",
		padding: 16,
		borderTopWidth: 1,
		borderColor: "#eee",
	},
	feedbackBtn: {
		backgroundColor: "#000",
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		alignItems: "center",
		justifyContent: "center",
		minWidth: 120,
		width: "100%",
	},
	feedbackText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 16,
	},
})
