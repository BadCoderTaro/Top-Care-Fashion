export type UserStatus = "active" | "suspended";

export type UserAccount = {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  role: "User" | "Admin";
  is_premium: boolean;
  premium_until?: string;
  dob?: string | null;
  gender?: "Male" | "Female" | null;
  average_rating?: number; // Average rating as a user (1.00-5.00)
  total_reviews: number; // Total number of reviews received
  createdAt: string; // ISO
  avatar_url?: string | null;
};

export type ListingCategory = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  isActive?: boolean;
  sortOrder?: number;
  aiKeywords?: string[];
  aiWeightBoost?: number;
  listingCount?: number;
};

export type Listing = {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  listed: boolean;
  sold: boolean; // True when listing has been sold
  price: number;
  imageUrl?: string | null;
  imageUrls?: string[];
  brand?: string | null;
  size?: string | null;
  conditionType?: "new" | "like_new" | "good" | "fair" | "poor";
  tags?: string[];
  createdAt: string;
  soldAt?: string | null; // When the listing was sold
  // Transaction info (if exists)
  txStatus?: "pending" | "paid" | "shipped" | "completed" | "cancelled";
  txId?: string | null;
  // Boost info
  isBoosted?: boolean;
  boostEndsAt?: string | null;
  // Stats
  viewsCount?: number;
  clicksCount?: number;
  likesCount?: number;
};

export type Transaction = {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  quantity: number;
  priceEach: number;
  status: "pending" | "paid" | "shipped" | "completed" | "cancelled";
  createdAt: string;
  
  // Additional info for display
  buyerName?: string;
  buyerEmail?: string | null;
  sellerName?: string;
  sellerEmail?: string | null;
  listingName?: string;
  listingDescription?: string | null;
  listingImageUrl?: string | null;
  listingBrand?: string | null;
  listingSize?: string | null;
  listingCondition?: string | null;
};

export type Review = {
  id: string;
  transactionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  reviewerType: "buyer" | "seller";
  createdAt: string;
  
  // Additional info for display
  reviewerName?: string;
  revieweeName?: string;
  listingName?: string;
  listingId?: string;
};

export type Report = {
  id: string;
  targetType: "listing" | "user";
  targetId: string;
  reporter: string;
  reporterId?: string; // User ID of the reporter
  reason: string;
  status: "open" | "resolved" | "dismissed";
  notes?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type Feedback = {
  id: string;
  userId?: string; // Associated user ID
  userEmail?: string;
  userName?: string; // Display name
  message: string;
  rating?: number; // 1-5 rating
  tags?: string[]; // Tags for categorization
  featured: boolean; // Featured on homepage
  createdAt: string;
  isPublic?: boolean; // Whether feedback is public
  type?: string; // Feedback type (general, bug, feature, etc.)
  title?: string; // Feedback title
  priority?: string; // Priority level (low, medium, high)
  status?: string; // Status (open, in_progress, closed)
  updatedAt?: string; // Last updated timestamp
};

// Legacy type for backward compatibility
export type Testimonial = {
  id: string;
  user: string;
  text: string;
  rating: number;
  tags: string[];
  featured: boolean;
  ts: number;
};

export type FaqQuery = {
  id: string;
  userId?: string; // Associated user ID
  userEmail?: string; // Contact email
  question: string;
  answer?: string;
  category?: string; // FAQ category
  createdAt: string;
  answeredAt?: string;
};

export type LandingContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroCarouselImages?: string[];
  featureCards?: {
    title?: string;
    desc?: string;
    images?: string[];
  }[];
  aiFeatures?: {
    mixmatch?: {
      title?: string;
      desc?: string;
      // New unified field (preferred)
      images?: string[];
      // Legacy fields (will be removed after DB migration), kept optional for backward compatibility
      girlImages?: string[];
      boyImages?: string[];
    };
    ailisting?: {
      title?: string;
      desc?: string;
      images?: string[];
    };
    search?: {
      title?: string;
      desc?: string;
      images?: string[];
    };
  };
  updatedAt?: string;
};
