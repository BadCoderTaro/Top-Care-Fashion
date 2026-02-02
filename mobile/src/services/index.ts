// 统一导出所有服务
export { apiClient } from './api';
export { listingsService, ListingsService } from './listingsService';
export { listingStatsService } from './listingStatsService';
export { authService, AuthService } from './authService';
export { userService, UserService } from './userService';
export { feedbackService } from './feedbackService';
export { ordersService } from './ordersService';
export { likesService } from './likesService';
export { cartService } from './cartService';
export { messagesService } from './messagesService';
export { reviewsService } from './reviewsService';
export { flagsService } from './flagsService';
export { notificationService } from './notificationService';
export { premiumService, PremiumServiceType } from './premiumService';
export { benefitsService, BenefitsServiceType } from './benefitsService';
export { paymentMethodsService } from './paymentMethodsService';
export { addressService } from './addressService';
export { NotificationHelper } from './notificationHelper';
export { localNotificationService } from './localNotificationService';
export { pollingService } from './pollingService';
export { categoryService } from './categoryService';

// 导出类型
export type { ApiResponse, ApiError } from '../config/api';
export type { ListingsQueryParams, DraftListingRequest } from './listingsService';
export type { User, SignInRequest, SignUpRequest, AuthResponse } from './authService';
export type { UpdateProfileRequest } from './userService';
export type {
  Feedback,
  FeedbackType,
  FeedbackPriority,
  CreateFeedbackRequest
} from './feedbackService';
export type { 
  Order, 
  Review, 
  OrderStatus, 
  OrdersQueryParams, 
  OrdersResponse, 
  CreateOrderRequest, 
  UpdateOrderRequest, 
  CreateReviewRequest 
} from './ordersService';
export type { LikedListing, LikeStatus } from './likesService';
export type { 
  CartItem, 
  CartResponse, 
  AddToCartRequest, 
  UpdateCartItemRequest 
} from './cartService';
export type { 
  Conversation, 
  Message, 
  ConversationDetail,
  CreateConversationParams, 
  SendMessageParams 
} from './messagesService';
export type {
  Notification,
  NotificationParams
} from './notificationService';
export type {
  FlagTargetType,
  SubmitFlagParams,
  SubmitFlagResponse,
  UserFlagSummary
} from './flagsService';
export type { UserBenefitsPayload, MixMatchUsageResult } from './benefitsService';
export type {
  PaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest
} from './paymentMethodsService';
export type {
  ShippingAddress,
  CreateAddressRequest,
  UpdateAddressRequest
} from './addressService';

