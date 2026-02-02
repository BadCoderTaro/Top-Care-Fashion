import React, { useMemo, useState, useEffect, useRef, useCallback } from "react"
import {
	Alert,
	Dimensions,
	Image,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
	Share,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RouteProp } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import Header from "../../../components/Header"
import Icon from "../../../components/Icon"
import Avatar from "../../../components/Avatar"
import ASSETS from "../../../constants/assetUrls"
import type { BagItem, ListingItem } from "../../../types/shop"
import type { BuyStackParamList } from "./index"
import { likesService, cartService, messagesService } from "../../../src/services"
import { flagsService } from "../../../src/services/flagsService"
import { useAuth } from "../../../contexts/AuthContext"
import { apiClient } from "../../../src/services/api"
import { listingStatsService } from "../../../src/services/listingStatsService"

const { width: WINDOW_WIDTH } = Dimensions.get("window")
const IMAGE_SIZE = Math.min(WINDOW_WIDTH - 48, 360)

const REPORT_CATEGORIES = [
	{ id: "counterfeit", label: "Counterfeit item or other intellectual property infringement" },
	{ id: "prohibited", label: "Prohibited or dangerous item" },
	{ id: "inappropriate", label: "Nudity, violence or hate speech" },
	{ id: "outside_payment", label: "Request to be paid outside of the TOP app" },
	{ id: "unavailable", label: "Item isn't available to buy" },
	{ id: "dislike", label: "I just don't like it" },
	{ id: "illegal", label: "Violates a specific law or regulation" },
	{ id: "other", label: "Something else" },
]

const formatGenderLabel = (value?: string | null) => {
	if (!value) return "Unisex"

	// Handle enum values directly (Men, Women, Unisex)
	if (value === "Men" || value === "Women" || value === "Unisex") {
		return value
	}

	// Handle legacy lowercase values
	const lower = value.toLowerCase()
	if (lower === "men" || lower === "male") return "Men"
	if (lower === "women" || lower === "female") return "Women"
	if (lower === "unisex") return "Unisex"

	// Fallback: capitalize first letter
	return value.charAt(0).toUpperCase() + value.slice(1)
}

const formatSizeLabel = (value?: string | null) => {
	if (!value || value === "Select" || value === "null") return "Not specified"

	// Return as-is for valid sizes
	return value
}

const formatDateString = (value?: string | null) => {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return date.toLocaleDateString()
}

export default function ListingDetailScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<BuyStackParamList>>()
	const route = useRoute<RouteProp<BuyStackParamList, "ListingDetail">>()
	const { listingId, isOwnListing: isOwnListingParam = false } = route.params || {}
	const insets = useSafeAreaInsets()

	const { user } = useAuth()
	const [item, setItem] = useState<ListingItem | null>(null)
	const [isLoadingListing, setIsLoadingListing] = useState(true)
	const [showMenu, setShowMenu] = useState(false)
	const [flagModalVisible, setFlagModalVisible] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
	const [flagDetails, setFlagDetails] = useState("")
	const [isSubmittingFlag, setIsSubmittingFlag] = useState(false)
	const [isLiked, setIsLiked] = useState(false)
	const [isLoadingLike, setIsLoadingLike] = useState(false)
	const [isAddingToCart, setIsAddingToCart] = useState(false)
	const [purchaseQuantity, setPurchaseQuantity] = useState(1) // 🔥 购买数量
	const [previewIndex, setPreviewIndex] = useState<number | null>(null)
	const [listingStats, setListingStats] = useState<{
		views: number | null
		likes: number
		clicks: number | null
	} | null>(null)
	const recordedClickIdRef = useRef<string | null>(null)

	// ✅ 获取 listing ID
	const getListingId = useMemo(() => {
		return listingId ? String(listingId) : null
	}, [listingId])

	// ✅ 加载 listing 数据的函数
	const loadListingById = useCallback(
		async (id: string) => {
			try {
				setIsLoadingListing(true)
				console.log("🔍 Loading listing by ID:", id)

				const response = await apiClient.get<{ listing: ListingItem }>(`/api/listings/${id}`)
				if (response.data?.listing) {
					setItem(response.data.listing)
					console.log("✅ Listing loaded successfully:", response.data.listing)
				} else {
					console.error("❌ No listing data in response")
					Alert.alert("Error", "Failed to load listing details")
					navigation.goBack()
				}
			} catch (error) {
				console.error("❌ Error loading listing:", error)
				Alert.alert("Error", "Failed to load listing details")
				navigation.goBack()
			} finally {
				setIsLoadingListing(false)
			}
		},
		[navigation]
	)

	// ✅ 通过 API 加载 listing 数据
	useEffect(() => {
		if (!listingId) {
			console.error("❌ ListingDetailScreen: listingId is required")
			Alert.alert("Error", "Listing ID is required")
			return
		}

		loadListingById(String(listingId))
	}, [listingId, loadListingById])

	// ✅ 记录点击追踪（当用户点击进入详情页时）
	useEffect(() => {
		const stableId = listingId ? String(listingId) : null
		if (!stableId) {
			return
		}

		// 如果已经记录过这个ID，直接跳过（防止React StrictMode重复调用）
		if (recordedClickIdRef.current === stableId) {
			console.log(`[Click] Already recorded for listing ${stableId}, skipping`)
			return
		}

		// 立即设置ref，防止并发调用（必须在同步阶段完成）
		recordedClickIdRef.current = stableId

		console.log(`[Click] Recording click for listing ${stableId}`)

		// 异步记录点击（不阻塞渲染）
		const recordClick = async () => {
			try {
				await listingStatsService.recordClick(stableId)
				console.log(`[Click] Successfully recorded click for listing ${stableId}`)
			} catch (error) {
				console.warn(`[Click] Failed to record click for listing ${stableId}:`, error)
				// 如果失败，重置ref以便重试（但只在ref还是这个ID时才重置）
				if (recordedClickIdRef.current === stableId) {
					recordedClickIdRef.current = null
				}
			}
		}

		recordClick()
	}, [listingId]) // 只依赖 listingId

	// ✅ 加载统计信息（如果是卖家）
	useEffect(() => {
		const loadStats = async () => {
			// 优先使用 getListingId，如果不存在则使用 item?.id（item 可能是异步加载的）
			const id = getListingId || item?.id?.toString()
			if (!id) return

			// 检查是否为卖家
			const isOwnListing =
				isOwnListingParam || (item?.sellerId && user?.id && item.sellerId === user.id)
			if (isOwnListing) {
				try {
					const stats = await listingStatsService.getListingStats(id)
					setListingStats(stats.stats)
				} catch (error) {
					console.warn("Failed to load listing stats:", error)
				}
			}
		}

		if (getListingId || item) {
			loadStats()
		}
	}, [getListingId, item, isOwnListingParam, user?.id])

	// 调试：查看加载的 item 数据
	if (__DEV__) {
		console.log("🔍 ListingDetailScreen - ListingId:", listingId)
		console.log("🔍 ListingDetailScreen - Item:", item)
		console.log("🔍 ListingDetailScreen - Loading:", isLoadingListing)
	}

	// 安全处理 item 数据，兼容 images 和 imageUrls 字段
	const safeItem = useMemo(() => {
		if (!item) return null

		// 调试：查看原始item数据
		console.log("🔍 Debug - Original item:", item)
		console.log("🔍 Debug - Original item.seller:", item.seller)
		console.log("🔍 Debug - Original item.shippingFee:", item.shippingFee)
		console.log("🔍 Debug - Original item.shippingOption:", item.shippingOption)
		console.log("🔍 Debug - Original item.location:", item.location)

		const legacyImagesField = (item as { imageUrls?: unknown }).imageUrls
		const legacyImages = Array.isArray(legacyImagesField)
			? legacyImagesField.filter((img): img is string => typeof img === "string")
			: []

		const result = {
			...item,
			// 🔥 添加 listing_id 字段，用于创建订单
			listing_id: item.id,
			// 兼容处理：优先使用 images，如果没有则使用 imageUrls
			images: Array.isArray(item.images) && item.images.length > 0 ? item.images : legacyImages,
		}

		// 调试：查看转换后的safeItem
		console.log("🔍 Debug - Converted safeItem:", result)
		console.log("🔍 Debug - Converted safeItem.seller:", result.seller)
		console.log("🔍 Debug - Converted safeItem.shippingFee:", result.shippingFee)
		console.log("🔍 Debug - Converted safeItem.shippingOption:", result.shippingOption)
		console.log("🔍 Debug - Converted safeItem.location:", result.location)

		return result
	}, [item])

	const defaultBag = useMemo<BagItem[]>(
		() =>
			safeItem
				? [
						{
							item: safeItem,
							quantity: purchaseQuantity,
						},
				  ]
				: [],
		[safeItem, purchaseQuantity]
	)
	const subtotal = useMemo(
		() =>
			defaultBag.reduce((sum, current) => {
				const price =
					typeof current.item.price === "number"
						? current.item.price
						: parseFloat(current.item.price || "0")
				return sum + price * current.quantity
			}, 0),
		[defaultBag]
	)
	// 🔥 使用真实的 shipping fee 数据
	const shippingFee = useMemo(() => {
		console.log("🔍 Debug - safeItem?.shippingFee:", safeItem?.shippingFee)
		console.log("🔍 Debug - safeItem?.shippingOption:", safeItem?.shippingOption)
		console.log("🔍 Debug - safeItem?.location:", safeItem?.location)

		if (!safeItem?.shippingFee) {
			console.log("⚠️ Shipping fee is null or undefined, returning 0")
			return 0
		}

		const fee =
			typeof safeItem.shippingFee === "number" ? safeItem.shippingFee : Number(safeItem.shippingFee)

		console.log("✅ Using shipping fee:", fee)
		return fee
	}, [safeItem?.shippingFee])

	// 🔥 检查是否应该禁用购买按钮（库存不足或为0）
	const isOutOfStock = useMemo(() => {
		if (safeItem?.availableQuantity === undefined || safeItem?.availableQuantity === null) {
			return false // 如果库存字段不存在，允许购买（向后兼容）
		}
		return safeItem.availableQuantity <= 0 || purchaseQuantity > safeItem.availableQuantity
	}, [safeItem?.availableQuantity, purchaseQuantity])

	const genderLabel = useMemo(() => formatGenderLabel(safeItem?.gender), [safeItem?.gender])
	const likesCount = safeItem?.likesCount ?? 0
	const listedOn = useMemo(() => formatDateString(safeItem?.createdAt), [safeItem?.createdAt])
	const updatedOn = useMemo(() => formatDateString(safeItem?.updatedAt), [safeItem?.updatedAt])
	const shippingDescription = useMemo(() => {
		if (!safeItem?.shippingOption || safeItem.shippingOption === "Select") {
			return "Please contact seller for shipping options and rates."
		}

		const feeValue =
			typeof safeItem.shippingFee === "number"
				? safeItem.shippingFee
				: safeItem.shippingFee
				? Number(safeItem.shippingFee)
				: 0

		let description = safeItem.shippingOption

		if (feeValue > 0) {
			description += ` • Shipping fee: $${feeValue.toFixed(2)}`
		}

		if (safeItem.shippingOption === "Meet-up" && safeItem.location) {
			description += `\n📍 Meet-up location: ${safeItem.location}`
		}

		return description
	}, [safeItem?.shippingOption, safeItem?.shippingFee, safeItem?.location])
	const imageUris = useMemo(() => {
		if (!Array.isArray(safeItem?.images)) return []
		return safeItem.images.filter((uri): uri is string => typeof uri === "string" && uri.length > 0)
	}, [safeItem?.images])

	useEffect(() => {
		if (previewIndex !== null && imageUris.length === 0) {
			setPreviewIndex(null)
		}
	}, [imageUris.length, previewIndex])

	const previewActiveIndex =
		previewIndex !== null ? Math.min(previewIndex, Math.max(imageUris.length - 1, 0)) : 0
	const previewVisible = previewIndex !== null && imageUris.length > 0

	const sizeLabel = useMemo(() => formatSizeLabel(safeItem?.size), [safeItem?.size])

	const detailMetaCards = useMemo(() => {
		if (!safeItem) return []

		const normalize = (value?: string | null) => (typeof value === "string" ? value.trim() : "")

		const cards: Array<{ id: string; label: string; value: string; placeholder?: boolean }> = [
			{
				id: "size",
				label: "Size",
				value: sizeLabel,
			},
			{
				id: "condition",
				label: "Condition",
				value:
					safeItem.condition && safeItem.condition !== "Select"
						? safeItem.condition
						: "Not specified",
			},
			{
				id: "gender",
				label: "Gender",
				value: genderLabel,
			},
		]

		const brandValue = normalize(safeItem.brand)
		if (brandValue && brandValue !== "Select") {
			cards.push({ id: "brand", label: "Brand", value: brandValue })
		}

		const materialValue = normalize(safeItem.material)
		if (materialValue && materialValue !== "Select" && materialValue !== "Polyester") {
			cards.push({ id: "material", label: "Material", value: materialValue })
		}

		if (!brandValue || brandValue === "Select") {
			if (!materialValue || materialValue === "Select" || materialValue === "Polyester") {
				cards.push({
					id: "additional",
					label: "Additional Details",
					value: "Not provided by seller",
					placeholder: true,
				})
			}
		}

		return cards
	}, [safeItem, genderLabel, sizeLabel])

	// 检查是否是自己的商品
	const isOwnListingFinalComputed = useMemo(() => {
		console.log("🔍 Debug - Current user:", user)
		console.log("🔍 Debug - SafeItem seller:", safeItem?.seller)
		console.log("🔍 Debug - User ID:", user?.id)
		console.log("🔍 Debug - Seller ID:", safeItem?.seller?.id)
		console.log("🔍 Debug - User ID type:", typeof user?.id)
		console.log("🔍 Debug - Seller ID type:", typeof safeItem?.seller?.id)

		// 确保类型一致进行比较
		const userId = user?.id ? Number(user.id) : null
		const sellerId = safeItem?.seller?.id ? Number(safeItem.seller.id) : null

		console.log("🔍 Debug - Converted User ID:", userId)
		console.log("🔍 Debug - Converted Seller ID:", sellerId)
		console.log("🔍 Debug - IDs match:", userId && sellerId && userId === sellerId)

		const result = !!(userId && sellerId && userId === sellerId)
		console.log("🔍 Debug - isOwnListingFinal result:", result)
		return result
	}, [user, safeItem])

	// 🔥 优先使用传入的isOwnListing参数，否则使用计算的结果
	const isOwnListingFinal = isOwnListingParam || isOwnListingFinalComputed

	// 检查Like状态
	useEffect(() => {
		const checkLikeStatus = async () => {
			// 仅在登录用户且不是自己的商品时检查点赞状态，避免未登录产生401
			if (!safeItem?.id || isOwnListingFinal || !user) return

			try {
				const listingId = Number(safeItem.id)
				if (Number.isNaN(listingId)) return
				const liked = await likesService.getLikeStatus(listingId)
				setIsLiked(liked)
			} catch (error) {
				console.error("Error checking like status:", error)
			}
		}

		checkLikeStatus()
	}, [safeItem?.id, isOwnListingFinal, user?.id])

	// 处理Like按钮点击
	const handleLikeToggle = async () => {
		if (!safeItem?.id || isLoadingLike || isOwnListingFinal) return

		setIsLoadingLike(true)
		try {
			const listingId = Number(safeItem.id)
			if (Number.isNaN(listingId)) return
			const newLikedStatus = await likesService.toggleLike(listingId, isLiked)
			setIsLiked(newLikedStatus)
		} catch (error) {
			console.error("Error toggling like:", error)
			Alert.alert("Error", "Failed to update like status. Please try again.")
		} finally {
			setIsLoadingLike(false)
		}
	}

	// 处理Add to Cart按钮点击
	const handleAddToCart = async () => {
		if (!safeItem?.id || isAddingToCart || isOwnListingFinal) return

		// 🔥 检查库存是否足够（同时检查 undefined 和 null）
		if (safeItem.availableQuantity !== undefined && safeItem.availableQuantity !== null) {
			if (purchaseQuantity > safeItem.availableQuantity) {
				Alert.alert("Insufficient Stock", `Only ${safeItem.availableQuantity} item(s) available.`, [
					{ text: "OK" },
				])
				return
			}

			if (safeItem.availableQuantity <= 0) {
				Alert.alert("Out of Stock", "This item is currently out of stock.", [{ text: "OK" }])
				return
			}
		}

		setIsAddingToCart(true)
		try {
			// 🔥 先检查商品是否已经在购物车中
			const cartItems = await cartService.getCartItems()
			const itemAlreadyInCart = cartItems.some(
				(cartItem) =>
					cartItem.item.id === safeItem.id.toString() ||
					cartItem.item.listing_id?.toString() === safeItem.id.toString()
			)

			if (itemAlreadyInCart) {
				// 🔥 商品已经在购物车中，显示提示信息
				Alert.alert("Already in Cart", "This item is already in your cart.", [
					{ text: "OK", style: "default" },
				])
				return
			}

			// 🔥 商品不在购物车中，添加到购物车（使用选择的数量）
			await cartService.addToCart(safeItem.id.toString(), purchaseQuantity)
			Alert.alert("Success", `${purchaseQuantity} item(s) added to cart successfully!`)
			setPurchaseQuantity(1) // 重置数量
		} catch (error) {
			console.error("Error adding to cart:", error)
			Alert.alert("Error", "Failed to add item to cart. Please try again.")
		} finally {
			setIsAddingToCart(false)
		}
	}

	const handleFlag = () => {
		setShowMenu(false)
		setFlagModalVisible(true)
	}

	const handleSubmitFlag = async () => {
		if (!safeItem) {
			Alert.alert("Error", "Unable to submit flag for this listing. Please try again later.")
			return
		}
		if (!selectedCategory) {
			Alert.alert("Notice", "Please select a flag category")
			return
		}
		if (!flagDetails.trim()) {
			Alert.alert("Notice", "Please fill in flag details")
			return
		}

		try {
			setIsSubmittingFlag(true)
			await flagsService.submitFlag({
				targetType: "listing",
				targetId: String(safeItem.id ?? ""),
				category: selectedCategory,
				details: flagDetails,
				flaggedListingId: safeItem.id ?? undefined,
				flaggedUsername:
					typeof safeItem.seller?.id !== "undefined"
						? String(safeItem.seller?.id)
						: safeItem.seller?.name,
			})
			Alert.alert("Flag Submitted", "Thank you for your feedback. We will review it shortly.", [
				{
					text: "OK",
					onPress: () => {
						setFlagModalVisible(false)
						setSelectedCategory(null)
						setFlagDetails("")
					},
				},
			])
		} catch (error) {
			console.error("Error submitting flag:", error)
			const message =
				error instanceof Error && error.message
					? error.message
					: "Failed to submit flag. Please try again."
			Alert.alert("Error", message)
		} finally {
			setIsSubmittingFlag(false)
		}
	}

	const handleCancelFlag = () => {
		setFlagModalVisible(false)
		setSelectedCategory(null)
		setFlagDetails("")
	}

	const handleShare = async () => {
		setShowMenu(false)
		try {
			if (safeItem) {
				await Share.share({
					message: `Check out this find on TOP: ${safeItem.title} for $${
						typeof safeItem.price === "number"
							? safeItem.price.toFixed(2)
							: parseFloat(safeItem.price || "0").toFixed(2)
					}`,
				})
			}
		} catch {
			// no-op if the share sheet fails or is dismissed
		}
	}

	// 如果数据未加载完成，显示加载状态
	if (!safeItem) {
		return (
			<View style={styles.screen}>
				<Header title="" showBack />
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading item details...</Text>
				</View>
			</View>
		)
	}

	return (
		<View style={styles.screen}>
			<Modal
				transparent
				animationType="fade"
				visible={showMenu}
				onRequestClose={() => setShowMenu(false)}
			>
				<TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
					<View style={styles.menuBackdrop}>
						<TouchableWithoutFeedback>
							<View style={styles.menuCard}>
								<TouchableOpacity style={styles.menuItem} onPress={handleFlag}>
									<Icon name="flag-outline" size={18} color="#111" />
									<Text style={styles.menuItemText}>Flag</Text>
								</TouchableOpacity>
								<View style={styles.menuDivider} />
								<TouchableOpacity style={styles.menuItem} onPress={handleShare}>
									<Icon name="share-social-outline" size={18} color="#111" />
									<Text style={styles.menuItemText}>Share</Text>
								</TouchableOpacity>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>

			{/* Flag Modal */}
			<Modal
				visible={flagModalVisible}
				transparent
				animationType="fade"
				onRequestClose={handleCancelFlag}
			>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						style={styles.keyboardAvoidingView}
					>
						<View style={styles.modalContainer}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Flag Listing</Text>
								<TouchableOpacity onPress={handleCancelFlag}>
									<Icon name="close" size={24} color="#111" />
								</TouchableOpacity>
							</View>

							<ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
								<Text style={styles.sectionTitle}>Select Flag Category</Text>
								<View style={styles.categoriesContainer}>
									{Array.isArray(REPORT_CATEGORIES) &&
										REPORT_CATEGORIES.map((category) => (
											<TouchableOpacity
												key={category.id}
												style={[
													styles.categoryItem,
													selectedCategory === category.id
														? styles.categoryItemSelected
														: undefined,
												]}
												onPress={() => setSelectedCategory(category.id)}
											>
												<View style={styles.categoryRadio}>
													{selectedCategory === category.id && (
														<View style={styles.categoryRadioInner} />
													)}
												</View>
												<Text
													style={[
														styles.categoryLabel,
														selectedCategory === category.id
															? styles.categoryLabelSelected
															: undefined,
													]}
												>
													{category.label}
												</Text>
											</TouchableOpacity>
										))}
								</View>

								<Text style={styles.sectionTitle}>Flag Details</Text>
								<TextInput
									style={styles.textInput}
									placeholder="Please describe your reason for flagging..."
									placeholderTextColor="#999"
									multiline
									numberOfLines={6}
									textAlignVertical="top"
									value={flagDetails}
									onChangeText={setFlagDetails}
								/>
							</ScrollView>

							<View style={styles.modalFooter}>
								<TouchableOpacity
									style={[styles.modalButton, styles.cancelButton]}
									onPress={handleCancelFlag}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.modalButton,
										styles.submitButton,
										isSubmittingFlag ? { opacity: 0.6 } : undefined,
									]}
									onPress={handleSubmitFlag}
									disabled={isSubmittingFlag}
								>
									<Text style={styles.submitButtonText}>
										{isSubmittingFlag ? "Submitting..." : "Submit Flag"}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			<Header
				title=""
				showBack
				rightAction={
					<View style={styles.headerActions}>
						<TouchableOpacity
							onPress={() => safeItem && navigation.navigate("MixMatch", { baseItem: safeItem })}
							style={styles.headerIconBtn}
						>
							<Icon name="color-palette-outline" size={22} color="#111" />
						</TouchableOpacity>
						<TouchableOpacity onPress={() => setShowMenu(true)} style={styles.headerIconBtn}>
							<Icon name="ellipsis-vertical" size={20} color="#111" />
						</TouchableOpacity>
					</View>
				}
			/>
			<Modal
				visible={previewVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setPreviewIndex(null)}
			>
				<View style={styles.previewOverlay}>
					<ScrollView
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						contentOffset={{ x: previewActiveIndex * WINDOW_WIDTH, y: 0 }}
						style={styles.previewScroll}
					>
						{imageUris.map((uri, idx) => (
							<View
								key={`${safeItem?.id ?? "listing"}-preview-${idx}`}
								style={styles.previewImageContainer}
							>
								<Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
							</View>
						))}
					</ScrollView>
					<View style={styles.previewTopBar}>
						<Text style={styles.previewCounter}>
							{previewActiveIndex + 1} / {imageUris.length}
						</Text>
						<TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewIndex(null)}>
							<Icon name="close" size={22} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
					<View style={styles.previewThumbRow}>
						{imageUris.map((uri, idx) => (
							<TouchableOpacity
								key={`${safeItem?.id ?? "listing"}-thumb-${idx}`}
								onPress={() => setPreviewIndex(idx)}
								style={[
									styles.previewThumb,
									previewActiveIndex === idx ? styles.previewThumbActive : undefined,
								]}
							>
								<Image source={{ uri }} style={styles.previewThumbImage} />
							</TouchableOpacity>
						))}
					</View>
				</View>
			</Modal>
			<ScrollView
				contentContainerStyle={[styles.container, { paddingBottom: 120 + insets.bottom }]}
			>
				<ScrollView
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.imageCarousel}
				>
					{imageUris.map((uri, index) => (
						<TouchableOpacity
							key={`${safeItem?.id ?? "listing"}-${index}`}
							activeOpacity={0.9}
							onPress={() => setPreviewIndex(index)}
						>
							<Image
								source={{ uri }}
								style={styles.image}
								onError={() => console.warn(`Failed to load image: ${uri}`)}
							/>
						</TouchableOpacity>
					))}
					{imageUris.length === 0 && (
						<Image
							source={{ uri: "https://via.placeholder.com/300x300/f4f4f4/999999?text=No+Image" }}
							style={styles.image}
						/>
					)}
				</ScrollView>

				<View style={styles.sectionCard}>
					<View style={styles.titleRow}>
						<View style={{ flex: 1 }}>
							<Text style={styles.title}>{safeItem?.title || "Loading..."}</Text>
							<Text style={styles.price}>
								$
								{typeof safeItem?.price === "number"
									? safeItem.price.toFixed(2)
									: parseFloat(safeItem?.price || "0").toFixed(2)}
							</Text>
						</View>
						<View style={styles.likeButtonWrapper}>
							<TouchableOpacity
								accessibilityRole="button"
								style={[
									styles.iconButton,
									isLiked ? styles.iconButtonLiked : undefined,
									isOwnListingFinal ? styles.iconButtonDisabled : undefined,
								]}
								onPress={handleLikeToggle}
								disabled={!!(isLoadingLike || isOwnListingFinal)}
							>
								<Icon
									name={isLiked ? "heart" : "heart-outline"}
									size={22}
									color={isOwnListingFinal ? "#999" : isLiked ? "#F54B3D" : "#111"}
								/>
							</TouchableOpacity>
							{likesCount > 0 && (
								<View style={styles.likeBadge}>
									<Text style={styles.likeBadgeText}>{likesCount > 99 ? "99+" : likesCount}</Text>
								</View>
							)}
						</View>
						{/* Mix & Match chip aligned with like icon and same height */}
						<TouchableOpacity
							accessibilityRole="button"
							style={[styles.mixChipBtn, isOwnListingFinal ? styles.mixChipBtnDisabled : undefined]}
							onPress={() =>
								!isOwnListingFinal &&
								safeItem &&
								navigation.navigate("MixMatch", { baseItem: safeItem })
							}
							disabled={!!isOwnListingFinal}
						>
							<Text
								style={[
									styles.mixChipText,
									isOwnListingFinal ? styles.mixChipTextDisabled : undefined,
								]}
							>
								Mix & Match
							</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.metaGrid}>
						{detailMetaCards.map((info) => (
							<View
								key={info.id}
								style={[styles.metaPill, info.placeholder ? styles.metaPillPlaceholder : undefined]}
							>
								<Text style={styles.metaLabel}>{info.label}</Text>
								<Text
									style={[
										styles.metaValue,
										info.placeholder ? styles.metaValuePlaceholder : undefined,
									]}
								>
									{info.value}
								</Text>
							</View>
						))}
					</View>

					<Text style={styles.description}>
						{safeItem?.description || "No description available"}
					</Text>

					{/* Tags Section */}
					{safeItem?.tags && Array.isArray(safeItem.tags) && safeItem.tags.length > 0 && (
						<View style={styles.tagsSection}>
							<Text style={styles.tagsLabel}>Tags</Text>
							<View style={styles.tagsContainer}>
								{safeItem.tags.map((tag, index) => (
									<View key={index} style={styles.tagChip}>
										<Text style={styles.tagText}>{tag}</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{(listedOn || updatedOn) && (
						<View style={styles.infoSection}>
							<Text style={styles.infoHeading}>Listing Info</Text>
							{listedOn && <Text style={styles.infoText}>Listed on {listedOn}</Text>}
							{updatedOn && <Text style={styles.infoText}>Last updated {updatedOn}</Text>}
						</View>
					)}

					{/* Statistics Section (for sellers) */}
					{listingStats && (listingStats.views !== null || listingStats.clicks !== null) && (
						<View style={styles.statsSection}>
							<Text style={styles.statsHeading}>Statistics</Text>
							<View style={styles.statsGrid}>
								{listingStats.views !== null && (
									<View style={styles.statItem}>
										<Text style={styles.statValue}>{listingStats.views}</Text>
										<Text style={styles.statLabel}>Views</Text>
									</View>
								)}
								<View style={styles.statItem}>
									<Text style={styles.statValue}>{listingStats.likes}</Text>
									<Text style={styles.statLabel}>Likes</Text>
								</View>
								{listingStats.clicks !== null && (
									<View style={styles.statItem}>
										<Text style={styles.statValue}>{listingStats.clicks}</Text>
										<Text style={styles.statLabel}>Clicks</Text>
									</View>
								)}
							</View>
						</View>
					)}
				</View>

				<View style={styles.sectionCard}>
					<Text style={styles.sectionHeading}>Seller</Text>
					<View style={styles.sellerRow}>
						<TouchableOpacity
							style={[styles.sellerInfo, isOwnListingFinal ? styles.sellerInfoDisabled : undefined]}
							disabled={isOwnListingFinal}
							onPress={() => {
								if (!safeItem?.seller || isOwnListingFinal) return
								navigation.navigate("UserProfile", {
									username: safeItem.seller.name,
									avatar: safeItem.seller.avatar,
									rating: safeItem.seller.rating,
									sales: safeItem.seller.sales,
								})
							}}
						>
							<Avatar
								source={
									safeItem?.seller?.avatar &&
									typeof safeItem.seller.avatar === "string" &&
									safeItem.seller.avatar.trim() !== "" &&
									safeItem.seller.avatar.startsWith("http")
										? { uri: safeItem.seller.avatar }
										: ASSETS.avatars.default
								}
								style={styles.sellerAvatar}
								isPremium={safeItem?.seller?.isPremium}
								self={Boolean(isOwnListingFinal)}
							/>
							<View style={{ flex: 1 }}>
								<Text style={styles.sellerName}>{safeItem?.seller?.name || "Unknown Seller"}</Text>
								<View style={styles.sellerMeta}>
									<Icon name="star" size={13} color="#f5a623" />
									<Text style={styles.sellerMetaText}>
										{safeItem?.seller?.rating?.toFixed(1) || "0.0"}
									</Text>
									<Text style={styles.sellerMetaText}>|</Text>
									<Text style={styles.sellerMetaText}>{safeItem?.seller?.sales || 0} sales</Text>
								</View>
							</View>
						</TouchableOpacity>
						{!isOwnListingFinal ? (
							<TouchableOpacity
								style={styles.messageBtn}
								onPress={async () => {
									console.log("🔍 Message button pressed!")
									console.log("🔍 SafeItem:", safeItem)
									console.log("🔍 Seller:", safeItem?.seller)
									console.log("🔍 messagesService:", messagesService)
									console.log(
										"🔍 messagesService methods:",
										Object.getOwnPropertyNames(Object.getPrototypeOf(messagesService))
									)

									// 🔥 确保seller ID和listing ID都是有效的数字
									const sellerId = safeItem?.seller?.id ? Number(safeItem.seller.id) : null
									const listingId = safeItem?.id ? parseInt(safeItem.id) : null

									console.log("🔍 Seller ID:", sellerId, "Type:", typeof sellerId)
									console.log("🔍 Listing ID:", listingId, "Type:", typeof listingId)

									if (!sellerId || isNaN(sellerId) || !listingId || isNaN(listingId)) {
										console.log("❌ Invalid seller ID or listing ID!")
										console.log("❌ Seller ID:", sellerId, "Listing ID:", listingId)
										Alert.alert("Error", "Unable to find seller or listing information")
										return
									}

									try {
										// 创建或获取与卖家的对话
										console.log("🔍 Creating conversation with seller...")
										console.log("🔍 SafeItem details:", {
											id: safeItem.id,
											title: safeItem.title,
											seller: safeItem.seller,
										})
										console.log("🔍 Final parameters:", {
											sellerId,
											listingId,
										})

										const conversation = await messagesService.getOrCreateSellerConversation(
											sellerId,
											listingId
										)

										console.log("✅ Conversation created/found:", conversation)

										// 准备 Chat 路由参数，供不同导航路径复用
										const chatParams = {
											sender: safeItem.seller.name || "Seller",
											kind: "order" as const,
											conversationId: conversation.id,
											fromListing: true,
											order: {
												id: safeItem.id || "new-order",
												listing_id: Number(safeItem.id), // 🔥 添加 listing_id 用于跳转回商品详情
												product: {
													title: safeItem.title || "Item",
													price: Number(safeItem.price) || 0,
													size: safeItem.size,
													image: safeItem.images?.[0] || "",
												},
												seller: {
													name: safeItem.seller.name || "Seller",
													avatar: safeItem.seller.avatar,
												},
												buyer: {
													name: user?.username || "You",
													avatar: user?.avatar_url ?? "https://i.pravatar.cc/100?img=32",
												},
												status: "Inquiry",
											},
										}

										console.log("🔍 Navigating to Chat screen with params:", chatParams)

										let rootNavigation: any = navigation
										let currentNav: any = navigation
										while (currentNav?.getParent?.()) {
											const parent = currentNav.getParent()
											if (!parent) break
											currentNav = parent
										}
										rootNavigation = currentNav ?? navigation

										if (rootNavigation?.navigate) {
											rootNavigation.navigate("ChatStandalone", chatParams)
											console.log("✅ Navigation via root ChatStandalone screen")
										} else {
											;(navigation as any).navigate("ChatStandalone", chatParams)
											console.log("✅ Navigation via local ChatStandalone fallback")
										}
									} catch (error) {
										console.error("❌ Error creating conversation:", error)
										Alert.alert("Error", "Failed to start conversation. Please try again.")
									}
								}}
							>
								<Icon name="chatbubble-ellipses-outline" size={18} color="#000" />
								<Text style={styles.messageText}>Message</Text>
							</TouchableOpacity>
						) : (
							<View style={styles.ownerBadge}>
								<Icon name="information-circle-outline" size={16} color="#666" />
								<Text style={styles.ownerBadgeText}>Your listing</Text>
							</View>
						)}
					</View>
				</View>

				<View style={styles.sectionCard}>
					<Text style={styles.sectionHeading}>Shipping</Text>
					<Text style={styles.description}>{shippingDescription}</Text>
				</View>
			</ScrollView>

			<View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
				{!isOwnListingFinal && (
					<>
						{/* 🔥 数量选择器 */}
						<View style={styles.quantityContainer}>
							<Text style={styles.quantityLabel}>Quantity:</Text>
							<View style={styles.quantitySelector}>
								<TouchableOpacity
									style={[
										styles.quantityButton,
										purchaseQuantity <= 1 && styles.quantityButtonDisabled,
									]}
									onPress={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
									disabled={purchaseQuantity <= 1}
								>
									<Icon name="remove" size={20} color={purchaseQuantity <= 1 ? "#ccc" : "#111"} />
								</TouchableOpacity>
								<Text style={styles.quantityValue}>{purchaseQuantity}</Text>
								<TouchableOpacity
									style={[
										styles.quantityButton,
										safeItem.availableQuantity !== undefined &&
											purchaseQuantity >= safeItem.availableQuantity &&
											styles.quantityButtonDisabled,
									]}
									onPress={() => {
										const maxQty = safeItem.availableQuantity ?? 999
										setPurchaseQuantity(Math.min(maxQty, purchaseQuantity + 1))
									}}
									disabled={
										safeItem.availableQuantity !== undefined &&
										purchaseQuantity >= safeItem.availableQuantity
									}
								>
									<Icon
										name="add"
										size={20}
										color={
											safeItem.availableQuantity !== undefined &&
											purchaseQuantity >= safeItem.availableQuantity
												? "#ccc"
												: "#111"
										}
									/>
								</TouchableOpacity>
							</View>
							{safeItem.availableQuantity !== undefined && safeItem.availableQuantity > 0 && (
								<Text style={styles.stockInfo}>{safeItem.availableQuantity} available</Text>
							)}
						</View>
						{/* 🔥 按钮行 */}
						<View style={styles.buttonRow}>
							<TouchableOpacity
								style={[
									styles.secondaryButton,
									isAddingToCart || isOutOfStock ? styles.secondaryButtonDisabled : undefined,
								]}
								onPress={handleAddToCart}
								disabled={isAddingToCart || isOutOfStock}
							>
								<Icon
									name="bag-add-outline"
									size={20}
									color={isAddingToCart || isOutOfStock ? "#999" : "#111"}
								/>
								<Text
									style={[
										styles.secondaryText,
										isAddingToCart || isOutOfStock ? styles.secondaryTextDisabled : undefined,
									]}
								>
									{isAddingToCart ? "Adding..." : isOutOfStock ? "Out of Stock" : "Add to Bag"}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.primaryButton,
									isOutOfStock ? styles.primaryButtonDisabled : undefined,
								]}
								disabled={isOutOfStock}
								onPress={async () => {
									console.log("🔍 Buy Now button pressed from ListingDetailScreen")

									// 🔥 检查库存是否足够
									if (
										safeItem.availableQuantity !== undefined &&
										safeItem.availableQuantity !== null
									) {
										if (purchaseQuantity > safeItem.availableQuantity) {
											Alert.alert(
												"Insufficient Stock",
												`Only ${safeItem.availableQuantity} item(s) available.`,
												[{ text: "OK" }]
											)
											return
										}

										if (safeItem.availableQuantity <= 0) {
											Alert.alert("Out of Stock", "This item is currently out of stock.", [
												{ text: "OK" },
											])
											return
										}
									}

									// 🔥 创建或获取与卖家的对话，以便下单后能回到聊天界面
									try {
										console.log("🔍 Creating conversation with seller...")
										console.log("🔍 SafeItem details:", {
											id: safeItem.id,
											title: safeItem.title,
											seller: safeItem.seller,
										})

										const sellerIdRaw = safeItem?.seller?.id
										if (!sellerIdRaw) {
											Alert.alert("Error", "Unable to identify the seller for this listing.")
											return
										}
										const sellerId = Number(sellerIdRaw)
										if (Number.isNaN(sellerId)) {
											Alert.alert("Error", "Invalid seller information for this listing.")
											return
										}
										const listingId = parseInt(safeItem.id)

										console.log("🔍 Final parameters:", {
											sellerId,
											listingId,
										})

										const conversation = await messagesService.getOrCreateSellerConversation(
											sellerId,
											listingId
										)

										console.log("✅ Conversation created/found:", conversation)

										// 🔥 导航到CheckoutScreen，传递conversationId
										navigation.navigate("Checkout", {
											items: defaultBag,
											subtotal,
											shipping: shippingFee,
											conversationId: conversation.id.toString(), // 🔥 传递conversationId
										})
									} catch (error) {
										console.error("❌ Error creating conversation:", error)
										// 如果创建对话失败，仍然可以继续结账流程
										navigation.navigate("Checkout", {
											items: defaultBag,
											subtotal,
											shipping: shippingFee,
										})
									}
								}}
							>
								<Text
									style={[
										styles.primaryText,
										isOutOfStock ? styles.primaryTextDisabled : undefined,
									]}
								>
									{isOutOfStock ? "Out of Stock" : "Buy Now"}
								</Text>
							</TouchableOpacity>
						</View>
					</>
				)}
				{isOwnListingFinal && (
					<View style={styles.ownListingMessage}>
						<Text style={styles.ownListingText}>This is your own listing</Text>
					</View>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#fff" },
	container: {
		rowGap: 16,
	},
	imageCarousel: {
		columnGap: 12,
		paddingHorizontal: 16,
	},
	image: {
		width: IMAGE_SIZE,
		height: IMAGE_SIZE,
		borderRadius: 16,
		backgroundColor: "#f2f2f2",
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 12,
	},
	headerIconBtn: {
		paddingHorizontal: 4,
		paddingVertical: 4,
	},
	menuBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.08)",
		paddingTop: 60,
		paddingRight: 16,
		alignItems: "flex-end",
	},
	menuCard: {
		width: 180,
		borderRadius: 14,
		backgroundColor: "#fff",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "#d9d9d9",
		paddingVertical: 8,
		shadowColor: "#000",
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 8 },
		shadowRadius: 16,
		elevation: 5,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	menuItemText: {
		fontSize: 15,
		fontWeight: "500",
		color: "#111",
	},
	menuDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "#e5e5e5",
		marginVertical: 4,
	},
	sectionCard: {
		marginHorizontal: 16,
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 18,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 12,
		elevation: 2,
		rowGap: 12,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 12,
	},
	title: { fontSize: 20, fontWeight: "700" },
	price: { fontSize: 18, fontWeight: "700", color: "#111" },
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#ddd",
		alignItems: "center",
		justifyContent: "center",
	},
	iconButtonLiked: {
		borderColor: "#F54B3D",
		backgroundColor: "#FFF5F5",
	},
	iconButtonDisabled: {
		backgroundColor: "#f5f5f5",
		opacity: 0.6,
	},
	likeButtonWrapper: {
		position: "relative",
	},
	likeBadge: {
		position: "absolute",
		top: -4,
		right: -4,
		minWidth: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: "#111",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
	},
	likeBadgeText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
	mixChipBtn: {
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#111",
		paddingHorizontal: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	mixChipText: { fontSize: 13, fontWeight: "700", color: "#111" },
	mixChipBtnDisabled: {
		backgroundColor: "#f5f5f5",
		opacity: 0.6,
	},
	mixChipTextDisabled: {
		color: "#999",
	},
	metaGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		columnGap: 12,
		rowGap: 12,
	},
	metaPill: {
		width: "48%",
		flexGrow: 1,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: "#f6f6f6",
		alignItems: "center",
		justifyContent: "center",
	},
	metaLabel: {
		fontSize: 12,
		color: "#666",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	metaValue: { fontSize: 14, fontWeight: "600", color: "#111", marginTop: 4, textAlign: "center" },
	metaPillPlaceholder: {
		borderWidth: 1,
		borderColor: "#e5e5e5",
		borderStyle: "dashed",
		backgroundColor: "#fff",
	},
	metaValuePlaceholder: {
		color: "#999",
		fontStyle: "italic",
	},
	description: {
		fontSize: 14,
		color: "#333",
		lineHeight: 20,
	},
	tagsSection: {
		marginTop: 16,
	},
	tagsLabel: {
		fontSize: 12,
		color: "#999",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	tagsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	tagChip: {
		backgroundColor: "#f0f0f0",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	tagText: {
		fontSize: 13,
		color: "#666",
		fontWeight: "500",
	},
	infoSection: {
		rowGap: 4,
	},
	infoHeading: {
		fontSize: 13,
		fontWeight: "600",
		color: "#666",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	infoText: {
		fontSize: 13,
		color: "#444",
	},
	statsSection: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
	},
	statsHeading: {
		fontSize: 13,
		fontWeight: "600",
		color: "#666",
		textTransform: "uppercase",
		letterSpacing: 0.4,
		marginBottom: 12,
	},
	statsGrid: {
		flexDirection: "row",
		justifyContent: "space-around",
		gap: 16,
	},
	statItem: {
		alignItems: "center",
		flex: 1,
	},
	statValue: {
		fontSize: 20,
		fontWeight: "700",
		color: "#111",
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
		color: "#666",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	sectionHeading: {
		fontSize: 16,
		fontWeight: "700",
	},
	sellerRow: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 12,
	},
	sellerInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		columnGap: 12,
	},
	sellerInfoDisabled: {
		opacity: 0.5,
	},
	sellerAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#e8e8e8",
	},
	sellerName: {
		fontSize: 15,
		fontWeight: "600",
	},
	sellerMeta: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 4,
		marginTop: 2,
	},
	sellerMetaText: {
		fontSize: 13,
		color: "#666",
	},
	messageBtn: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "#ccc",
	},
	messageText: {
		fontSize: 13,
		fontWeight: "600",
	},
	ownerBadge: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: "#f4f4f4",
	},
	ownerBadgeText: {
		fontSize: 12,
		color: "#666",
		fontWeight: "600",
	},
	bottomBar: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: "column", // 🔥 改为垂直布局以支持数量选择器
		paddingHorizontal: 16,
		paddingTop: 12,
		backgroundColor: "#fff",
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "#ddd",
	},
	// 🔥 数量选择器样式
	quantityContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	quantityLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#111",
	},
	quantitySelector: {
		flexDirection: "row",
		alignItems: "center",
		columnGap: 16,
	},
	quantityButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#111",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#fff",
	},
	quantityButtonDisabled: {
		borderColor: "#ddd",
		backgroundColor: "#f9f9f9",
	},
	quantityValue: {
		fontSize: 16,
		fontWeight: "600",
		color: "#111",
		minWidth: 30,
		textAlign: "center",
	},
	stockInfo: {
		fontSize: 12,
		color: "#666",
	},
	buttonRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	secondaryButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		columnGap: 8,
		paddingVertical: 14,
		borderRadius: 28,
		borderWidth: 1,
		borderColor: "#111",
		marginRight: 12,
	},
	secondaryText: {
		fontSize: 15,
		fontWeight: "700",
		color: "#111",
	},
	secondaryButtonDisabled: {
		backgroundColor: "#f5f5f5",
		opacity: 0.6,
	},
	secondaryTextDisabled: {
		color: "#999",
	},
	primaryButton: {
		flex: 1,
		backgroundColor: "#111",
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
	},
	primaryButtonDisabled: {
		backgroundColor: "#ccc",
		opacity: 0.6,
	},
	primaryText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#fff",
	},
	primaryTextDisabled: {
		color: "#999",
	},
	// Flag Modal Styles
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	modalContainer: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: "85%",
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#e5e5e5",
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#111",
	},
	modalContent: {
		paddingHorizontal: 20,
		paddingVertical: 20,
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#111",
		marginBottom: 12,
	},
	categoriesContainer: {
		rowGap: 10,
		marginBottom: 24,
	},
	categoryItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: "#e5e5e5",
		backgroundColor: "#fff",
	},
	categoryItemSelected: {
		borderColor: "#111",
		backgroundColor: "#f5f5f5",
	},
	categoryRadio: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: "#ccc",
		marginRight: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	categoryRadioInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#111",
	},
	categoryLabel: {
		fontSize: 15,
		color: "#666",
		fontWeight: "500",
	},
	categoryLabelSelected: {
		color: "#111",
		fontWeight: "600",
	},
	textInput: {
		borderWidth: 1,
		borderColor: "#e5e5e5",
		borderRadius: 10,
		padding: 12,
		fontSize: 15,
		color: "#111",
		minHeight: 120,
		backgroundColor: "#f9f9f9",
		includeFontPadding: false,
	},
	modalFooter: {
		flexDirection: "row",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "#e5e5e5",
		columnGap: 12,
	},
	modalButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelButton: {
		backgroundColor: "#f5f5f5",
		borderWidth: 1,
		borderColor: "#ddd",
	},
	cancelButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#666",
	},
	submitButton: {
		backgroundColor: "#111",
	},
	submitButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#fff",
	},
	keyboardAvoidingView: {
		flex: 1,
		justifyContent: "flex-end",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	loadingText: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
	},
	ownListingMessage: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 16,
	},
	ownListingText: {
		fontSize: 16,
		color: "#666",
		fontStyle: "italic",
	},
	previewOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.95)",
		justifyContent: "center",
	},
	previewScroll: {
		flexGrow: 0,
	},
	previewImageContainer: {
		width: WINDOW_WIDTH,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 16,
	},
	previewImage: {
		width: WINDOW_WIDTH - 32,
		height: WINDOW_WIDTH - 32,
	},
	previewTopBar: {
		position: "absolute",
		top: 40,
		left: 0,
		right: 0,
		paddingHorizontal: 24,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	previewCounter: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	},
	previewCloseBtn: {
		padding: 8,
	},
	previewThumbRow: {
		position: "absolute",
		bottom: 40,
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "center",
	},
	previewThumb: {
		width: 48,
		height: 48,
		borderRadius: 8,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.4)",
		marginHorizontal: 6,
	},
	previewThumbActive: {
		borderColor: "#FFFFFF",
	},
	previewThumbImage: {
		width: "100%",
		height: "100%",
	},
})
