# Top Care Fashion Database Schema Documentation

## Overview

This document provides a detailed description of the database structure for the Top Care Fashion project. The database uses PostgreSQL, managed through Prisma ORM, and is deployed on the Supabase platform.

- **Database Type**: PostgreSQL 17.6.1
- **ORM**: Prisma
- **Platform**: Supabase
- **Project ID**: ilykxrtilsbymlncunua
- **Region**: ap-southeast-1

## Database Statistics

- **Total Tables**: 28 tables (27 business tables + 1 system table `_prisma_migrations`)
- **Main Business Tables**: 27 tables
- **Enum Types**: 19 enum types defined (15 actively used, 4 potentially unused)
- **Total Indexes**: 148 indexes (27 primary keys + 121 functional indexes)
- **Unique Indexes**: 52 indexes (27 primary keys + 25 unique constraint indexes)
- **Functional Indexes**: 121 indexes (25 unique indexes + 96 regular indexes)
- **Unique Constraints**: 35 constraints (27 primary keys + 8 unique constraints)

---

## Table Structure Details

### 1. users (User Table)

User account information table, storing basic user information and preferences.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | User ID |
| username | String(64) | UNIQUE, NOT NULL | Username |
| email | String(191) | UNIQUE, NOT NULL | Email address |
| dob | DateTime? | | Date of birth |
| gender | Gender? | | Gender (Men/Women/Unisex) |
| role | UserRole | DEFAULT: USER | User role (USER/ADMIN) |
| status | UserStatus | DEFAULT: ACTIVE | Account status (ACTIVE/SUSPENDED) |
| is_premium | Boolean | DEFAULT: false | Whether user is premium member |
| premium_until | DateTime? | | Premium membership expiration date |
| average_rating | Decimal(3,2)? | | Average rating |
| total_reviews | Int | DEFAULT: 0 | Total number of reviews |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| supabase_user_id | String(UUID)? | UNIQUE | Supabase user ID |
| avatar_url | String? | | Avatar URL |
| phone_number | String(20)? | | Phone number |
| phone | String(20)? | | Phone (backup field) |
| bio | String? | | Biography |
| location | String(100)? | | Location |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |
| preferred_styles | Json? | | Preferred styles (JSON) |
| preferred_size_top | String(50)? | | Preferred top size |
| preferred_size_bottom | String(50)? | | Preferred bottom size |
| preferred_size_shoe | String(50)? | | Preferred shoe size |
| preferred_brands | Json? | | Preferred brands (JSON) |
| mix_match_used_count | Int? | DEFAULT: 0 | Mix Match usage count |
| free_promotions_used | Int? | DEFAULT: 0 | Free promotions used count |
| free_promotions_reset_at | DateTime? | | Free promotions reset time |
| last_sign_in_at | DateTime? | | Last sign-in time |
| country | String(64)? | | Country |
| likes_visibility | VisibilitySetting | DEFAULT: PUBLIC | Likes visibility |
| follows_visibility | VisibilitySetting | DEFAULT: PUBLIC | Follows visibility |

**Unique Constraints**:
- `users_username_key`: username UNIQUE
- `users_email_key`: email UNIQUE
- `users_supabase_user_id_key`: supabase_user_id UNIQUE

**Indexes**:
- `users_username_key`: username (unique index)
- `users_email_key`: email (unique index)
- `users_supabase_user_id_key`: supabase_user_id (unique index)
- `idx_users_supabase_user_id`: supabase_user_id (non-unique index for queries)
- `idx_users_pref_styles`: preferred_styles (GIN index for JSONB queries)
- `idx_users_pref_brands`: preferred_brands (GIN index for JSONB queries)

**Relationships**:
- One-to-many: cart_items, conversations (initiator/participant), faq, feedback, listing_clicks, listing_promotions, listings (seller), messages (sender/receiver), notifications, orders (buyer/seller), reviews (reviewer/reviewee), saved_outfits, transactions (buyer/seller), user_addresses, user_follows (follower/following), user_likes, user_payment_methods, premium_subscriptions

---

### 2. listing_categories (Listing Categories Table)

Product category table with hierarchical structure support.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Category ID |
| name | String(100) | UNIQUE, NOT NULL | Category name |
| description | String(255)? | | Category description |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| is_public | Boolean? | DEFAULT: true | Whether public |
| slug | String(100)? | UNIQUE | URL-friendly identifier |
| icon_url | String(500)? | | Icon URL |
| parent_id | Int? | FK → listing_categories.id | Parent category ID |
| sort_order | Int? | DEFAULT: 0 | Sort order |
| is_active | Boolean? | DEFAULT: true | Whether active |
| ai_keywords | Json? | | AI keywords (JSON) |
| ai_weight_boost | Float? | DEFAULT: 1.0 | AI weight boost |

**Unique Constraints**:
- `listing_categories_name_key`: name UNIQUE
- `listing_categories_slug_key`: slug UNIQUE (if provided)

**Relationships**:
- Self-referential: parent_id → listing_categories (many-to-one)
- One-to-many: listings

---

### 3. listings (Listings Table)

Product/listings table, storing all listed product information.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Listing ID |
| name | String(120) | NOT NULL | Product name |
| description | String? | | Product description |
| category_id | Int? | FK → listing_categories.id | Category ID |
| seller_id | Int? | FK → users.id | Seller ID |
| listed | Boolean | DEFAULT: true | Whether listed |
| sold | Boolean | DEFAULT: false | Whether sold |
| price | Decimal(10,2) | NOT NULL | Price |
| image_url | String? | | Main image URL |
| image_urls | Json? | | Image URL list (JSON) |
| brand | String(100)? | | Brand |
| size | String(50)? | | Size |
| condition_type | ConditionType | DEFAULT: GOOD | Condition (NEW/LIKE_NEW/GOOD/FAIR/POOR) |
| tags | Json? | | Tags (JSON) |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| sold_at | DateTime? | | Sold timestamp |
| original_price | Decimal(10,2)? | | Original price |
| material | String(100)? | | Material |
| weight | Decimal(8,2)? | | Weight |
| dimensions | String(50)? | | Dimensions |
| sku | String(50)? | | SKU code |
| inventory_count | Int? | DEFAULT: 1 | Inventory count |
| views_count | Int? | DEFAULT: 0 | View count |
| likes_count | Int? | DEFAULT: 0 | Like count |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |
| gender | Gender? | DEFAULT: Unisex | Gender |
| shipping_option | String(50)? | | Shipping option |
| shipping_fee | Decimal(10,2)? | | Shipping fee |
| location | String(100)? | | Location |
| clicks_count | Int | DEFAULT: 0 | Click count |

**Indexes**:
- `listings_category_id_idx`: category_id (foreign key index)
- `listings_seller_id_idx`: seller_id (foreign key index)
- `idx_listings_tags_gin`: tags (GIN index with jsonb_path_ops for JSONB queries)
- `idx_listings_tags_gin_ops`: tags (GIN index for JSONB queries)
- `idx_listings_tags_textsearch`: tags (B-tree index on lower(tags::text) for text search)
- `idx_listings_gender`: gender (for gender-based filtering)
- `idx_listings_brand_lower`: brand (B-tree index on lower(brand) for case-insensitive brand search)
- `idx_listings_active`: id (partial index: WHERE listed = true AND sold = false)
- `idx_listings_active_gender`: (gender, id) (partial composite index: WHERE listed = true AND sold = false)

**Relationships**:
- Many-to-one: category → listing_categories, seller → users
- One-to-many: cart_items, conversations, listing_clicks, listing_stats_daily, listing_promotions, notifications, orders, saved_outfits (base/top/bottom/shoe), transactions, user_likes

---

### 4. listing_promotions (Listing Promotions Table)

Product promotion information table, recording promotion campaigns and performance.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Promotion ID |
| listing_id | Int | FK → listings.id, NOT NULL | Listing ID |
| seller_id | Int | FK → users.id, NOT NULL | Seller ID |
| status | PromotionStatus | DEFAULT: ACTIVE | Status (ACTIVE/EXPIRED/SCHEDULED) |
| started_at | DateTime | DEFAULT: now() | Start time |
| ends_at | DateTime? | | End time |
| views | Int | DEFAULT: 0 | View count |
| clicks | Int | DEFAULT: 0 | Click count |
| view_uplift_percent | Int | DEFAULT: 0 | View uplift percentage |
| click_uplift_percent | Int | DEFAULT: 0 | Click uplift percentage |
| boost_weight | Decimal(4,2) | DEFAULT: 1.50 | Weight boost |
| used_free_credit | Boolean | DEFAULT: false | Whether free credit used |
| paid_amount | Decimal(6,2) | DEFAULT: 0.00 | Paid amount |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime | DEFAULT: now() | Update timestamp |

**Indexes**:
- `idx_listing_promotions_seller_id`: seller_id (foreign key index)
- `idx_listing_promotions_listing_id`: listing_id (foreign key index)
- `idx_promotions_listing_id`: listing_id (duplicate index for promotion queries)
- `idx_listing_promotions_status`: status (status filter index)
- `idx_listing_promotions_active_boosted`: (listing_id, status, ends_at) WHERE status = 'ACTIVE' (partial index for active promotions)
- `idx_listing_promotions_paid_amount`: paid_amount WHERE paid_amount > 0 (partial index for paid promotions)

**Relationships**:
- Many-to-one: listing → listings, seller → users

---

### 5. premium_subscriptions (Premium Subscriptions Table)

User premium subscription information table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Subscription ID |
| user_id | Int | FK → users.id, NOT NULL | User ID |
| plan_duration | String(10) | NOT NULL | Plan duration |
| paid_amount | Decimal(6,2) | DEFAULT: 0.00 | Paid amount |
| started_at | DateTime | DEFAULT: now() | Start time |
| ends_at | DateTime | NOT NULL | End time |
| status | String(20) | DEFAULT: "ACTIVE" | Status |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime | DEFAULT: now() | Update timestamp |

**Indexes**:
- idx_premium_subscriptions_user_id: user_id
- idx_premium_subscriptions_status: status
- idx_premium_subscriptions_created_at: created_at (DESC)
- idx_premium_subscriptions_ends_at: ends_at

**Relationships**:
- Many-to-one: user → users

---

### 6. user_addresses (User Addresses Table)

User shipping address table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Address ID |
| user_id | Int? | FK → users.id | User ID |
| type | String(20)? | DEFAULT: "home" | Address type |
| name | String(100) | NOT NULL | Recipient name |
| phone | String(20) | NOT NULL | Contact phone |
| line1 | String(200) | NOT NULL | Address line 1 |
| line2 | String(200)? | | Address line 2 |
| city | String(100) | NOT NULL | City |
| state | String(100) | NOT NULL | State/Province |
| postal_code | String(20) | NOT NULL | Postal code |
| country | String(100) | NOT NULL | Country |
| is_default | Boolean? | DEFAULT: false | Whether default address |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |

**Indexes**:
- idx_user_addresses_user_id: user_id

**Relationships**:
- Many-to-one: user → users

---

### 7. user_payment_methods (User Payment Methods Table)

User payment methods table, storing user payment card information.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Payment method ID |
| user_id | Int? | FK → users.id | User ID |
| type | String(50) | NOT NULL | Payment type |
| label | String(100) | NOT NULL | Label |
| brand | String(50)? | | Brand |
| last4 | String(4)? | | Last 4 digits of card |
| expiry_month | Int? | | Expiry month |
| expiry_year | Int? | | Expiry year |
| is_default | Boolean? | DEFAULT: false | Whether default |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |

**Indexes**:
- idx_user_payment_methods_user_id: user_id

**Relationships**:
- Many-to-one: user → users
- One-to-many: orders

---

### 8. cart_items (Cart Items Table)

User shopping cart items table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Cart item ID |
| user_id | Int? | FK → users.id | User ID |
| listing_id | Int? | FK → listings.id | Listing ID |
| quantity | Int | DEFAULT: 1 | Quantity |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |

**Unique Constraints**:
- UNIQUE(user_id, listing_id): Only one record per user per listing

**Indexes**:
- idx_cart_items_listing_id: listing_id
- idx_cart_items_user_id: user_id

**Relationships**:
- Many-to-one: user → users, listing → listings

---

### 9. orders (Orders Table)

Order information table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Order ID |
| buyer_id | Int | FK → users.id, NOT NULL | Buyer ID |
| seller_id | Int | FK → users.id, NOT NULL | Seller ID |
| listing_id | Int | FK → listings.id, NOT NULL | Listing ID |
| status | OrderStatus | DEFAULT: IN_PROGRESS | Order status |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime | DEFAULT: now() | Update timestamp |
| order_number | String(50)? | UNIQUE | Order number |
| total_amount | Decimal(10,2)? | | Total amount |
| shipping_method | String(100)? | | Shipping method |
| notes | String? | | Notes |
| buyer_name | String(100)? | | Buyer name |
| buyer_phone | String(20)? | | Buyer phone |
| shipping_address | String? | | Shipping address |
| payment_method | String(50)? | | Payment method |
| payment_details | Json? | | Payment details (JSON) |
| payment_method_id | Int? | FK → user_payment_methods.id | Payment method ID |
| commission_rate | Decimal(5,4)? | | Commission rate |
| commission_amount | Decimal(10,2)? | | Commission amount |
| quantity | Int? | DEFAULT: 1 | Quantity |

**Indexes**:
- `idx_orders_buyer_id`: buyer_id (foreign key index)
- `orders_buyer_id_idx`: buyer_id (duplicate index for buyer queries)
- `idx_orders_seller_id`: seller_id (foreign key index)
- `orders_seller_id_idx`: seller_id (duplicate index for seller queries)
- `orders_listing_id_idx`: listing_id (foreign key index)
- `idx_orders_created_at`: created_at (time-based index for sorting)
- `idx_orders_status`: status (status filter index)
- `orders_status_idx`: status (duplicate status index)
- `idx_orders_payment_method_id`: payment_method_id (payment method index)
- `orders_order_number_key`: order_number UNIQUE (unique constraint index)

**Relationships**:
- Many-to-one: buyer → users, seller → users, listing → listings, payment_method_ref → user_payment_methods
- One-to-many: reviews, transactions

---

### 10. transactions (Transactions Table)

Transaction records table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Transaction ID |
| buyer_id | Int | FK → users.id, NOT NULL | Buyer ID |
| seller_id | Int | FK → users.id, NOT NULL | Seller ID |
| listing_id | Int | FK → listings.id, UNIQUE, NOT NULL | Listing ID |
| quantity | Int | DEFAULT: 1 | Quantity |
| price_each | Decimal(10,2) | NOT NULL | Unit price |
| status | TxStatus | DEFAULT: PENDING | Transaction status |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| order_id | Int? | FK → orders.id | Order ID |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |

**Indexes**:
- `transactions_buyer_id_idx`: buyer_id (foreign key index)
- `transactions_seller_id_idx`: seller_id (foreign key index)
- `transactions_listing_id_idx`: listing_id (foreign key index)
- `idx_transactions_listing_id`: listing_id (duplicate index)
- `transactions_listing_id_key`: listing_id UNIQUE (unique constraint index)
- `idx_transactions_order_id`: order_id (foreign key index)
- `idx_transactions_created_at`: created_at (time-based index)
- `idx_tx_buyer_listing_time`: (buyer_id, listing_id, created_at DESC) (composite time index for buyer transaction history)

**Relationships**:
- Many-to-one: buyer → users, seller → users, listing → listings, orders → orders

---

### 11. reviews (Reviews Table)

User reviews table, supporting mutual reviews between buyers and sellers.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Review ID |
| transaction_id | Int? | | Transaction ID |
| reviewer_id | Int | FK → users.id, NOT NULL | Reviewer ID |
| reviewee_id | Int | FK → users.id, NOT NULL | Reviewee ID |
| rating | Int | NOT NULL | Rating |
| comment | String? | | Review comment |
| reviewer_type | ReviewerType | NOT NULL | Reviewer type (BUYER/SELLER) |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| order_id | Int? | FK → orders.id | Order ID |
| is_public | Boolean? | DEFAULT: true | Whether public |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |
| images | Json? | | Review images (JSON) |

**Unique Constraints**:
- UNIQUE(transaction_id, reviewer_id): Only one review per transaction per reviewer
- UNIQUE(transaction_id, reviewer_type): Only one review per transaction per type

**Indexes**:
- idx_reviews_reviewer_id: reviewer_id
- idx_reviews_reviewee_id: reviewee_id
- idx_reviews_order_id: order_id

**Relationships**:
- Many-to-one: reviewer → users, reviewee → users, order → orders

---

### 12. feedback (Feedback Table)

User feedback table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Feedback ID |
| user_id | Int? | FK → users.id | User ID |
| user_email | String(191)? | | User email |
| user_name | String(100)? | | User name |
| message | String | NOT NULL | Feedback message |
| rating | Int? | | Rating |
| tags | Json? | | Tags (JSON) |
| featured | Boolean | DEFAULT: false | Whether featured |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| is_public | Boolean? | DEFAULT: true | Whether public |
| type | String(20)? | DEFAULT: "general" | Feedback type |
| title | String(200)? | | Title |
| priority | String(10)? | DEFAULT: "medium" | Priority |
| status | String(20)? | DEFAULT: "open" | Status |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |

**Indexes**:
- idx_feedback_user_id: user_id
- idx_feedback_status: status
- idx_feedback_type: type

**Relationships**:
- Many-to-one: user → users

---

### 13. faq (FAQ Table)

Frequently asked questions table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | FAQ ID |
| user_id | Int? | FK → users.id | User ID |
| user_email | String(191)? | | User email |
| question | String | NOT NULL | Question |
| answer | String? | | Answer |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| answered_at | DateTime? | | Answer timestamp |
| is_public | Boolean? | DEFAULT: true | Whether public |
| category | String(50)? | | Category |

**Indexes**:
- idx_faq_user_id: user_id
- idx_faq_category: category

**Relationships**:
- Many-to-one: user → users

---

### 14. landing_content (Landing Content Table)

Homepage content configuration table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, DEFAULT: 1 | Content ID (singleton) |
| hero_title | String(200) | NOT NULL | Hero title |
| hero_subtitle | String(300) | NOT NULL | Hero subtitle |
| updated_at | DateTime | DEFAULT: now() | Update timestamp |
| hero_carousel_images | Json? | | Hero carousel images (JSON) |
| mixmatch_title | String(100)? | | Mix Match title |
| mixmatch_desc | String(300)? | | Mix Match description |
| ailisting_title | String(100)? | | AI listing title |
| ailisting_desc | String(300)? | | AI listing description |
| ailisting_images | Json? | | AI listing images (JSON) |
| search_title | String(100)? | | Search title |
| search_desc | String(300)? | | Search description |
| search_images | Json? | | Search images (JSON) |
| mixmatch_images | Json? | | Mix Match images (JSON) |
| feature_cards | Json? | | Feature cards (JSON) |

---

### 15. site_stats (Site Stats Table)

Website statistics data table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, DEFAULT: 1 | Stats ID (singleton) |
| total_users | Int | DEFAULT: 0 | Total users |
| total_listings | Int | DEFAULT: 0 | Total listings |
| total_sold | Int | DEFAULT: 0 | Total sold |
| avg_rating | Decimal(2,1) | DEFAULT: 4.8 | Average rating |
| updated_at | DateTime | DEFAULT: now() | Update timestamp |

---

### 16. pricing_plans (Pricing Plans Table)

Pricing plans table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Plan ID |
| plan_type | PlanType | NOT NULL | Plan type (FREE/PREMIUM) |
| name | String(50) | NOT NULL | Plan name |
| description | String(100)? | | Description |
| price_monthly | Decimal(6,2) | DEFAULT: 0 | Monthly price |
| price_quarterly | Decimal(6,2)? | | Quarterly price |
| price_annual | Decimal(6,2)? | | Annual price |
| listing_limit | Int? | | Listing limit |
| promotion_price | Decimal(6,2) | NOT NULL | Promotion price |
| promotion_discount | Decimal(5,2)? | | Promotion discount |
| commission_rate | Decimal(5,2) | NOT NULL | Commission rate |
| mixmatch_limit | Int? | | Mix Match limit |
| free_promotion_credits | Int? | | Free promotion credits |
| seller_badge | String(100)? | | Seller badge |
| features | Json? | | Features list (JSON) |
| is_popular | Boolean | DEFAULT: false | Whether popular |
| active | Boolean | DEFAULT: true | Whether active |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |

---

### 17. reports (Reports Table)

User reports table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Report ID |
| target_type | ReportTargetType | NOT NULL | Target type (LISTING/USER) |
| target_id | String(64) | NOT NULL | Target ID |
| reporter | String(191) | NOT NULL | Reporter |
| reason | String | NOT NULL | Reason |
| status | ReportStatus | DEFAULT: OPEN | Status (OPEN/RESOLVED/DISMISSED) |
| notes | String? | | Notes |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| resolved_at | DateTime? | | Resolution timestamp |

**Indexes**:
- idx_reports_status: status
- idx_reports_target_type: target_type

---

### 18. user_follows (User Follows Table)

User follow relationships table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Follow ID |
| follower_id | Int | FK → users.id, NOT NULL | Follower ID |
| following_id | Int | FK → users.id, NOT NULL | Following ID |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |

**Unique Constraints**:
- UNIQUE(follower_id, following_id): Only one follow relationship per user pair

**Indexes**:
- idx_user_follows_created_at: created_at
- idx_user_follows_follower_id: follower_id
- idx_user_follows_following_id: following_id

**Relationships**:
- Many-to-one: follower → users, following → users

---

### 19. user_likes (User Likes Table)

User likes for listings table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Like ID |
| user_id | Int | FK → users.id, NOT NULL | User ID |
| listing_id | Int | FK → listings.id, NOT NULL | Listing ID |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |

**Unique Constraints**:
- UNIQUE(user_id, listing_id): Only one like per user per listing

**Indexes**:
- `idx_user_likes_user_id`: user_id (foreign key index)
- `user_likes_user_id_idx`: user_id (duplicate index for user queries)
- `idx_user_likes_listing_id`: listing_id (foreign key index)
- `user_likes_listing_id_idx`: listing_id (duplicate index for listing queries)
- `idx_user_likes_user_listing`: (user_id, listing_id) (composite index)
- `user_likes_user_id_listing_id_key`: (user_id, listing_id) UNIQUE (unique constraint index)
- `idx_user_likes_created_at`: created_at (time-based index)
- `idx_likes_user_listing_time`: (user_id, listing_id, created_at DESC) (composite time index for chronological like queries)

**Relationships**:
- Many-to-one: user → users, listing → listings

---

### 20. conversations (Conversations Table)

User conversations/chat table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Conversation ID |
| initiator_id | Int | FK → users.id, NOT NULL | Initiator ID |
| participant_id | Int | FK → users.id, NOT NULL | Participant ID |
| listing_id | Int? | FK → listings.id | Associated listing ID |
| type | ConversationType | DEFAULT: ORDER | Conversation type (ORDER/SUPPORT/GENERAL) |
| status | ConversationStatus | DEFAULT: ACTIVE | Status (ACTIVE/ARCHIVED/DELETED) |
| last_message_at | DateTime? | | Last message timestamp |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime | DEFAULT: now() | Update timestamp |

**Unique Constraints**:
- UNIQUE(initiator_id, participant_id, listing_id): Unique conversation per user pair and listing

**Indexes**:
- idx_conversations_initiator_id: initiator_id
- idx_conversations_last_message_at: last_message_at
- idx_conversations_listing_id: listing_id
- idx_conversations_participant_id: participant_id

**Relationships**:
- Many-to-one: initiator → users, participant → users, listing → listings
- One-to-many: messages, notifications

---

### 21. messages (Messages Table)

Conversation messages table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Message ID |
| conversation_id | Int | FK → conversations.id, NOT NULL | Conversation ID |
| sender_id | Int | FK → users.id, NOT NULL | Sender ID |
| receiver_id | Int | FK → users.id, NOT NULL | Receiver ID |
| content | String | NOT NULL | Message content |
| message_type | MessageType | DEFAULT: TEXT | Message type (TEXT/IMAGE/SYSTEM) |
| is_read | Boolean | DEFAULT: false | Whether read |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| idempotencyKey | String? | UNIQUE | Idempotency key |

**Indexes**:
- idx_messages_conversation_id: conversation_id
- idx_messages_created_at: created_at
- idx_messages_receiver_id: receiver_id
- idx_messages_sender_id: sender_id

**Relationships**:
- Many-to-one: conversation → conversations, sender → users, receiver → users

---

### 22. notifications (Notifications Table)

User notifications table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Notification ID |
| user_id | Int | FK → users.id, NOT NULL | User ID |
| type | String(20) | NOT NULL | Notification type |
| title | String(255) | NOT NULL | Title |
| message | String? | | Message content |
| image_url | String? | | Image URL |
| is_read | Boolean? | DEFAULT: false | Whether read |
| order_id | String(64)? | | Order ID |
| listing_id | Int? | FK → listings.id | Listing ID |
| related_user_id | Int? | FK → users.id | Related user ID |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |
| conversation_id | Int? | FK → conversations.id | Conversation ID |

**Indexes**:
- idx_notifications_created_at: created_at
- idx_notifications_type: type
- idx_notifications_user_id: user_id
- idx_notifications_conversation_id: conversation_id

**Relationships**:
- Many-to-one: user → users, listing → listings, related_user → users, conversation → conversations

---

### 23. saved_outfits (Saved Outfits Table)

User saved outfits table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Outfit ID |
| user_id | Int | FK → users.id, NOT NULL | User ID |
| outfit_name | String(100)? | | Outfit name |
| base_item_id | Int? | FK → listings.id | Base item ID |
| top_item_id | Int? | FK → listings.id | Top item ID |
| bottom_item_id | Int? | FK → listings.id | Bottom item ID |
| shoe_item_id | Int? | FK → listings.id | Shoe item ID |
| accessory_ids | Int[] | DEFAULT: [] | Accessory IDs array |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |
| ai_rating | Int? | | AI rating |
| style_name | String(100)? | | Style name |
| color_harmony_score | Int? | | Color harmony score |
| color_harmony_feedback | String? | | Color harmony feedback |
| style_tips | String? | | Style tips |
| vibe | String(50)? | | Vibe |

**Indexes**:
- idx_saved_outfits_user_id: user_id

**Relationships**:
- Many-to-one: user → users, base_item/top_item/bottom_item/shoe_item → listings

---

### 24. listing_clicks (Listing Clicks Table)

Listing click records table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | BigInt | PK, Auto | Click ID |
| listing_id | Int | FK → listings.id, NOT NULL | Listing ID |
| user_id | Int? | FK → users.id | User ID |
| clicked_at | DateTime | DEFAULT: now() | Click timestamp |
| bucket_10s | BigInt? | | 10-second bucket (for time aggregation) |

**Indexes**:
- `idx_listing_clicks_listing_id`: listing_id (foreign key index)
- `idx_listing_clicks_clicked_at`: clicked_at (time-based index)
- `listing_clicks_clicked_at_idx`: clicked_at DESC (descending time index)
- `listing_clicks_listing_id_idx`: listing_id (duplicate index for listing queries)
- `listing_clicks_user_id_idx`: user_id (for user-specific queries)
- `idx_listing_clicks_user_listing`: (user_id, listing_id) (composite index)
- `idx_clicks_user_listing_time`: (user_id, listing_id, clicked_at DESC) (composite time index)
- `listing_clicks_unique_user_10s`: (listing_id, user_id, bucket_10s) UNIQUE WHERE user_id IS NOT NULL (unique partial index)
- `idx_listing_clicks_user_bucket_unique`: (listing_id, user_id, bucket_10s) UNIQUE WHERE user_id IS NOT NULL AND bucket_10s IS NOT NULL (unique partial index)
- `idx_listing_clicks_anon_bucket_unique`: (listing_id, bucket_10s) UNIQUE WHERE user_id IS NULL AND bucket_10s IS NOT NULL (unique partial index for anonymous clicks)

**Relationships**:
- Many-to-one: listing → listings, user → users

---

### 25. listing_stats_daily (Listing Stats Daily Table)

Daily listing statistics data table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Stats ID |
| listing_id | Int | FK → listings.id, NOT NULL | Listing ID |
| date | DateTime(Date) | NOT NULL | Date |
| views | Int | DEFAULT: 0 | View count |
| likes | Int | DEFAULT: 0 | Like count |
| clicks | Int | DEFAULT: 0 | Click count |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime | DEFAULT: now() | Update timestamp |

**Unique Constraints**:
- UNIQUE(listing_id, date): Only one stats record per listing per day

**Indexes**:
- `idx_listing_stats_daily_listing_id`: listing_id (foreign key index)
- `idx_listing_stats_daily_date`: date (date filter index)
- `idx_listing_stats_daily_listing_date`: (listing_id, date) UNIQUE (unique constraint index)
- `idx_listing_stats_daily_lookup`: (listing_id, date) (composite index for date range queries)

**Relationships**:
- Many-to-one: listing → listings

---

### 26. releases (Releases Table)

Application version releases table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Release ID |
| version | String(50) | NOT NULL | Version number |
| platform | String(20) | NOT NULL | Platform |
| file_url | String | NOT NULL | File URL |
| file_name | String(255) | NOT NULL | File name |
| file_size | BigInt? | | File size |
| release_notes | String? | | Release notes |
| is_current | Boolean? | DEFAULT: false | Whether current version |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |

**Unique Constraints**:
- UNIQUE(version, platform): Unique per platform per version

**Indexes**:
- idx_releases_version_platform: (version, platform)
- idx_releases_current: is_current
- idx_releases_platform: platform

---

### 27. brand_mappings (Brand Mappings Table)

Brand name mapping table for standardizing user-provided brand names.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | Int | PK, Auto | Mapping ID |
| user_brand_name | String | UNIQUE, NOT NULL | User-provided brand name |
| db_brand_name | String? | | Standardized database brand name |
| created_at | DateTime? | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime? | DEFAULT: now() | Update timestamp |

**Unique Constraints**:
- `brand_mappings_user_brand_name_key`: user_brand_name UNIQUE

**Indexes**:
- `idx_brand_mappings_user_brand`: user_brand_name (index for efficient brand lookups)
- `brand_mappings_user_brand_name_key`: user_brand_name UNIQUE (unique constraint index)

**Relationships**:
- No foreign key relationships (standalone mapping table)

---

## Enum Types

### 1. Gender
- `Men` - Male
- `Women` - Female
- `Unisex` - Unisex

### 2. UserRole
- `USER` - Regular user
- `ADMIN` - Administrator

### 3. UserStatus
- `ACTIVE` - Active
- `SUSPENDED` - Suspended

### 4. ConditionType
- `NEW` - New
- `LIKE_NEW` - Like new
- `GOOD` - Good
- `FAIR` - Fair
- `POOR` - Poor

### 5. TxStatus
- `PENDING` - Pending
- `PAID` - Paid
- `SHIPPED` - Shipped
- `COMPLETED` - Completed
- `CANCELLED` - Cancelled

### 6. OrderStatus
- `IN_PROGRESS` - In progress
- `TO_SHIP` - To ship
- `SHIPPED` - Shipped
- `DELIVERED` - Delivered
- `RECEIVED` - Received
- `COMPLETED` - Completed
- `REVIEWED` - Reviewed
- `CANCELLED` - Cancelled

### 7. ReviewerType
- `BUYER` - Buyer
- `SELLER` - Seller

### 8. PlanType
- `FREE` - Free
- `PREMIUM` - Premium

### 9. PromotionStatus
- `ACTIVE` - Active
- `EXPIRED` - Expired
- `SCHEDULED` - Scheduled

### 10. ReportTargetType
- `LISTING` - Listing
- `USER` - User

### 11. ReportStatus
- `OPEN` - Open
- `RESOLVED` - Resolved
- `DISMISSED` - Dismissed

### 12. ConversationType
- `ORDER` - Order related
- `SUPPORT` - Support
- `GENERAL` - General

### 13. ConversationStatus
- `ACTIVE` - Active
- `ARCHIVED` - Archived
- `DELETED` - Deleted

### 14. MessageType
- `TEXT` - Text
- `IMAGE` - Image
- `SYSTEM` - System

### 15. VisibilitySetting
- `PUBLIC` - Public
- `FOLLOWERS_ONLY` - Followers only
- `PRIVATE` - Private

### 16. AddressType
- `HOME` - Home address
- `WORK` - Work address
- `OTHER` - Other address type

**Note**: This enum is defined but may not be actively used in the current schema.

### 17. CartItemStatus
- `ACTIVE` - Active cart item
- `REMOVED` - Removed from cart
- `PURCHASED` - Purchased item

**Note**: This enum is defined but may not be actively used in the current schema.

### 18. PaymentMethodType
- `CREDIT_CARD` - Credit card
- `DEBIT_CARD` - Debit card
- `PAYPAL` - PayPal
- `APPLE_PAY` - Apple Pay
- `GOOGLE_PAY` - Google Pay

**Note**: This enum is defined but may not be actively used in the current schema (payment methods use String type).

### 19. notificationtype
- `ORDER` - Order notifications
- `LIKE` - Like notifications
- `FOLLOW` - Follow notifications
- `REVIEW` - Review notifications
- `SYSTEM` - System notifications

**Note**: This enum is defined but may not be actively used in the current schema (notifications use String type).

---

## Enum Usage Summary

**Actively Used Enums** (15):
- Gender, UserRole, UserStatus, ConditionType, TxStatus, OrderStatus, ReviewerType, PlanType, PromotionStatus, ReportTargetType, ReportStatus, ConversationType, ConversationStatus, MessageType, VisibilitySetting

**Defined but Possibly Unused Enums** (4):
- AddressType, CartItemStatus, PaymentMethodType, notificationtype

---

## Entity Relationship Diagram

### Core Entity Relationships

```
users (Users)
├── listings (Listings) [seller_id]
├── orders (Orders) [buyer_id, seller_id]
├── transactions (Transactions) [buyer_id, seller_id]
├── reviews (Reviews) [reviewer_id, reviewee_id]
├── conversations (Conversations) [initiator_id, participant_id]
├── messages (Messages) [sender_id, receiver_id]
├── user_follows (User Follows) [follower_id, following_id]
├── user_likes (User Likes) [user_id]
├── cart_items (Cart Items) [user_id]
├── user_addresses (User Addresses) [user_id]
├── user_payment_methods (Payment Methods) [user_id]
└── premium_subscriptions (Premium Subscriptions) [user_id]

listings (Listings)
├── listing_categories (Categories) [category_id]
├── listing_promotions (Promotions) [listing_id]
├── listing_clicks (Clicks) [listing_id]
├── listing_stats_daily (Daily Stats) [listing_id]
├── saved_outfits (Saved Outfits) [base/top/bottom/shoe_item_id]
└── user_likes (User Likes) [listing_id]

orders (Orders)
├── users (Buyer/Seller) [buyer_id, seller_id]
├── listings (Listings) [listing_id]
├── user_payment_methods (Payment Methods) [payment_method_id]
├── reviews (Reviews) [order_id]
└── transactions (Transactions) [order_id]
```

---

## Indexing Strategy

### Index Statistics

- **Total Indexes**: 148 indexes
- **Primary Key Indexes**: 27 indexes (one per business table)
- **Functional Indexes**: 121 indexes (non-primary key indexes)
- **Unique Indexes**: 52 indexes (27 primary keys + 25 unique constraint indexes)
- **Regular Indexes**: 96 indexes (non-unique, non-primary key indexes)
- **Unique Constraints**: 35 constraints (27 primary keys + 8 unique constraints)

### Main Index Types

1. **Foreign Key Indexes**: All foreign key fields are indexed to optimize join queries
2. **Unique Indexes**: 52 indexes (27 primary keys + 25 unique constraint indexes) to ensure data uniqueness
3. **Unique Constraints**: 35 constraints (27 primary keys + 8 unique constraints, some constraints may have multiple indexes)
4. **Composite Indexes**: Multi-field indexes (e.g., user_id + listing_id, listing_id + date, buyer_id + listing_id + created_at)
5. **GIN Indexes**: JSONB field indexes for full-text search:
   - `listings.tags` (with jsonb_path_ops and standard GIN)
   - `users.preferred_styles`
   - `users.preferred_brands`
6. **Expression Indexes**: Indexes on computed expressions:
   - `idx_listings_brand_lower`: lower(brand) for case-insensitive search
   - `idx_listings_tags_textsearch`: lower(tags::text) for text search
7. **Time Indexes**: Created_at, updated_at, clicked_at indexes for time range queries and sorting
8. **Partial Indexes**: Conditional indexes for filtered queries:
   - `idx_listings_active`: WHERE listed = true AND sold = false
   - `idx_listings_active_gender`: WHERE listed = true AND sold = false (with gender)
   - `idx_listing_promotions_active_boosted`: WHERE status = 'ACTIVE'
   - `idx_listing_promotions_paid_amount`: WHERE paid_amount > 0
   - `idx_listing_clicks_*_bucket_unique`: WHERE user_id IS NOT NULL/NULL with bucket_10s
9. **Descending Indexes**: Indexes with DESC sort for reverse chronological queries
10. **Covering Indexes**: Indexes with INCLUDE columns for query optimization

### Key Indexes

#### Listings Table (9 indexes)
- `listings_category_id_idx`: Foreign key index for category joins
- `listings_seller_id_idx`: Foreign key index for seller joins
- `idx_listings_tags_gin`: GIN index with jsonb_path_ops for efficient JSONB tag queries
- `idx_listings_tags_gin_ops`: GIN index for general JSONB tag queries
- `idx_listings_tags_textsearch`: B-tree index on lower(tags::text) for text search
- `idx_listings_gender`: Gender-based filtering
- `idx_listings_brand_lower`: Case-insensitive brand search
- `idx_listings_active`: Partial index for active listings (WHERE listed = true AND sold = false)
- `idx_listings_active_gender`: Partial composite index for active listings filtered by gender

#### Users Table (6 indexes)
- `users_username_key`: Unique index for username
- `users_email_key`: Unique index for email
- `users_supabase_user_id_key`: Unique index for Supabase user ID
- `idx_users_supabase_user_id`: Index on Supabase user ID for queries
- `idx_users_pref_styles`: GIN index on preferred_styles JSONB for preference queries
- `idx_users_pref_brands`: GIN index on preferred_brands JSONB for brand preference queries

#### Listing Clicks Table (10 indexes)
- Multiple indexes for click tracking including:
  - Composite indexes for user-listing-time queries
  - Partial unique indexes for anonymous and user-based bucket aggregation
  - Time-based indexes for chronological queries

#### User Likes Table (8 indexes)
- `user_likes_user_id_listing_id_key`: Composite unique index
- `idx_user_likes_user_listing`: Composite index for user-listing queries
- `idx_likes_user_listing_time`: Composite time index for chronological like queries
- Multiple single-column indexes for user_id and listing_id

#### Orders Table (10 indexes)
- Multiple indexes on buyer_id, seller_id, status, created_at, listing_id
- Unique index on order_number
- Payment method index

#### Transactions Table (8 indexes)
- `idx_tx_buyer_listing_time`: Composite time index for buyer transaction history
- Unique index on listing_id
- Multiple indexes on buyer_id, seller_id, listing_id, order_id, created_at

#### Listing Promotions Table (6 indexes)
- `idx_listing_promotions_seller_id`: Foreign key index for seller joins
- `idx_listing_promotions_listing_id`: Foreign key index for listing joins
- `idx_promotions_listing_id`: Duplicate index for promotion queries
- `idx_listing_promotions_status`: Status filter index
- `idx_listing_promotions_active_boosted`: Partial composite index (listing_id, status, ends_at) WHERE status = 'ACTIVE' for active promotions
- `idx_listing_promotions_paid_amount`: Partial index on paid_amount WHERE paid_amount > 0 for paid promotions

#### Listing Stats Daily Table (4 indexes)
- `idx_listing_stats_daily_listing_id`: Foreign key index for listing joins
- `idx_listing_stats_daily_date`: Date filter index for date range queries
- `idx_listing_stats_daily_listing_date`: Composite unique index (listing_id, date)
- `idx_listing_stats_daily_lookup`: Composite index (listing_id, date) for efficient date range lookups

---

## Data Integrity Constraints

### Foreign Key Constraints

- All foreign key relationships have appropriate `onDelete` and `onUpdate` behaviors
- Most relationships use `CASCADE` deletion to ensure data consistency
- Critical business data (e.g., orders) use `RESTRICT` to prevent accidental deletion

### Unique Constraints

**User Table**:
- `users.username`: Username unique
- `users.email`: Email unique
- `users.supabase_user_id`: Supabase user ID unique

**Category Table**:
- `listing_categories.name`: Category name unique
- `listing_categories.slug`: Category slug unique

**Cart Table**:
- `cart_items(user_id, listing_id)`: Cart item unique (one item per user per listing)

**Follow Table**:
- `user_follows(follower_id, following_id)`: Follow relationship unique (one follow per user pair)

**Like Table**:
- `user_likes(user_id, listing_id)`: Like relationship unique (one like per user per listing)

**Conversation Table**:
- `conversations(initiator_id, participant_id, listing_id)`: Conversation unique (one conversation per user pair per listing)

**Review Table**:
- `reviews(transaction_id, reviewer_id)`: Review unique (one review per transaction per reviewer)
- `reviews(transaction_id, reviewer_type)`: Review unique (one review per transaction per reviewer type)

**Order Table**:
- `orders.order_number`: Order number unique

**Transaction Table**:
- `transactions.listing_id`: Listing ID unique (one transaction per listing)

**Listing Stats Table**:
- `listing_stats_daily(listing_id, date)`: Stats unique (one stats record per listing per day)

**Release Table**:
- `releases(version, platform)`: Release unique (one release per version per platform)

**Message Table**:
- `messages.idempotencyKey`: Idempotency key unique (for message deduplication)

**Brand Mappings Table**:
- `brand_mappings.user_brand_name`: User brand name unique (for brand name mapping)

**Note**: Some unique constraints may have multiple indexes created for performance optimization. The total count of unique constraints (35) includes all primary keys and unique constraints, while unique indexes (52) includes all indexes enforcing uniqueness, including those created for performance.

---

## Special Table Notes

### Singleton Tables

- `landing_content`: ID fixed at 1, stores homepage configuration
- `site_stats`: ID fixed at 1, stores website statistics

### Statistics Tables

- `listing_stats_daily`: Daily aggregated listing statistics (views, likes, clicks per listing per day)
- `listing_clicks`: Records each click for detailed analysis with 10-second bucket aggregation for performance
- `listing_promotions`: Promotion analytics with view/click tracking and uplift calculations

### JSON Field Usage

Multiple tables use JSON fields to store flexible data:
- `users.preferred_styles`, `users.preferred_brands`
- `listings.image_urls`, `listings.tags`
- `orders.payment_details`
- `reviews.images`
- `feedback.tags`
- `pricing_plans.features`
- `landing_content.*_images`, `landing_content.feature_cards`

---

## Database Migrations

The database uses Prisma Migrate for version management. Migration files are located at:
```
web/prisma/migrations/
```

### Migration History

- Initial migration: `20250924140010_init`
- Mobile app support: `20250127000000_mobile_app_support`
- Other migration files: See `web/prisma/migrations/` directory

---

## Additional Database Objects

### Views and Materialized Views

The database contains additional views and materialized views that are not defined in the Prisma schema but are used for analytics and performance optimization:

- **listing_card_v**: View for listing card display
- **listing_activity_scores_fast**: Materialized view for fast activity score queries
- **listing_activity_scores_main**: Materialized view for main activity score queries
- **listing_recommendations_fast**: Materialized view for fast recommendation queries
- **listing_recommendations_main**: Materialized view for main recommendation queries
- **listing_recommendations_main_fair**: Materialized view for fair score-based recommendations
- **listing_recommendations_with_boost**: View for recommendations with promotion boost
- **listing_coclicks**: View or table for co-click analysis

### Additional Database Objects

**Note**: Views and materialized views are managed separately from Prisma migrations and may be created via SQL migrations or database functions.

---

## Row-Level Security (RLS)

### Current RLS Status

**Tables with RLS Enabled** (17 tables):
- `users` - Users can read own user row
- `cart_items` - Users can manage own cart
- `listings` - Sellers can manage own listings, public can read active listings
- `orders` - Users can view own orders (as buyer or seller)
- `reviews` - Public can read, reviewers can update own reviews
- `transactions` - Users can view own transactions
- `user_addresses` - Users can manage own addresses
- `user_likes` - Users can view, insert, and delete own likes
- `user_payment_methods` - Users can manage own payment methods
- `conversations` - ✅ Participants can view own conversations, backend has full access
- `messages` - ✅ Senders and receivers can view messages, backend has full access
- `notifications` - ✅ Users can view own notifications, backend can manage all
- `saved_outfits` - ✅ Users can manage own outfits, backend has full access
- `user_follows` - ✅ Public can view public follows, users can manage own follows
- `premium_subscriptions` - ✅ Users can view own subscriptions, backend can manage all
- `listing_promotions` - ✅ Sellers can manage own promotions, public can view active promotions
- `reports` - ✅ Users can view own reports, admins can manage reports

**Tables without RLS** (10 tables):
- `listing_clicks` - Contains user behavior data
- `listing_categories` - Public data, should restrict writes
- `faq` - Public data, should restrict writes
- `feedback` - Public data, should restrict writes
- `pricing_plans` - Public data, should restrict writes
- `site_stats` - Public data, should restrict writes
- `landing_content` - Public data, should restrict writes
- `releases` - Public data, should restrict writes
- `listing_stats_daily` - Statistics data, should restrict writes
- `brand_mappings` - Mapping data, should restrict writes (public read, admin write)
- `_prisma_migrations` - System table (excluded from RLS)

### RLS Policies Summary

**Current Policies**:
1. **User Data Protection**: Users can only access their own data (cart_items, user_addresses, user_payment_methods, user_likes, saved_outfits, premium_subscriptions)
2. **Listing Access**: Public can read active listings, sellers can manage own listings
3. **Order Access**: Users can view own orders (as buyer or seller)
4. **Review Access**: Public can read reviews, reviewers can update own reviews
5. **Transaction Access**: Users can view own transactions
6. **Conversation & Message Access**: Participants can view own conversations and messages
7. **Notification Access**: Users can view own notifications
8. **Social Access**: Public can view public follows, users can manage own follows
9. **Promotion Access**: Sellers can manage own promotions, public can view active promotions
10. **Report Access**: Users can view own reports, admins can manage reports
11. **Backend Access**: Service role has full access to all tables (listings, transactions, reviews, conversations, messages, notifications, saved_outfits, user_follows, premium_subscriptions, listing_promotions, reports)