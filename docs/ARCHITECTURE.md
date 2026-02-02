# Top Care Fashion - Architecture Documentation

**Version**: 1.1
**Last Updated**: 2025-11-14
**Status**: Production

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Project Structure](#4-project-structure)
5. [Database Architecture](#5-database-architecture)
6. [API Architecture](#6-api-architecture)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [AI/ML Integration](#8-aiml-integration)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Mobile Architecture](#10-mobile-architecture)
11. [Admin Panel Architecture](#11-admin-panel-architecture)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Security Architecture](#13-security-architecture)
14. [Performance Optimization](#14-performance-optimization)
15. [Scalability Considerations](#15-scalability-considerations)
16. [Monitoring & Observability](#16-monitoring--observability)
17. [Development Workflow](#17-development-workflow)

---

## 1. System Overview

### 1.1 Project Description

**Top Care Fashion** is a comprehensive fashion marketplace platform that enables peer-to-peer commerce with advanced AI-powered features. The platform supports web and mobile applications with a unified backend.

### 1.2 Core Objectives

- **Marketplace**: Enable users to buy and sell fashion items securely
- **AI Integration**: Provide intelligent styling recommendations and product analysis
- **Cross-Platform**: Deliver consistent experience across web and mobile
- **Scalability**: Support growing user base with serverless architecture
- **Community**: Build social features for fashion discovery

### 1.3 Key Stakeholders

- **End Users**: Buyers and sellers on the platform
- **Administrators**: Platform moderators and support staff
- **Developers**: Internal development team
- **Third-Party Services**: Supabase, Google Cloud, Vercel, Expo

### 1.4 System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Supabase │  │  Google  │  │  Vercel  │  │   Expo   │   │
│  │   Auth   │  │ Cloud AI │  │   CDN    │  │   EAS    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                 Top Care Fashion Platform                    │
│                            │                                  │
│  ┌────────────────┐       │       ┌────────────────┐        │
│  │   Web Client   │       │       │  Mobile Client │        │
│  │   (Next.js)    │◄──────┴──────►│ (React Native) │        │
│  └────────────────┘               └────────────────┘        │
│           │                               │                  │
│           └───────────┬───────────────────┘                  │
│                       │                                      │
│              ┌────────▼────────┐                            │
│              │   API Layer     │                            │
│              │ (Next.js Routes)│                            │
│              └────────┬────────┘                            │
│                       │                                      │
│           ┌───────────┴───────────┐                         │
│           │                       │                         │
│    ┌──────▼──────┐       ┌───────▼────────┐               │
│    │  Business   │       │   AI Service   │               │
│    │    Logic    │       │   Integration  │               │
│    └──────┬──────┘       └───────┬────────┘               │
│           │                       │                         │
│           └───────────┬───────────┘                         │
│                       │                                      │
│              ┌────────▼────────┐                            │
│              │  Data Access    │                            │
│              │  (Prisma ORM)   │                            │
│              └────────┬────────┘                            │
│                       │                                      │
│              ┌────────▼────────┐                            │
│              │   PostgreSQL    │                            │
│              │   (Supabase)    │                            │
│              └─────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Frontend Technologies

#### Web Application
```yaml
Framework: Next.js 15.5.2
  - App Router architecture
  - React 19.1.0
  - Server Components + Client Components
  - Turbopack build system

Styling:
  - TailwindCSS 4.0
  - PostCSS for processing
  - Custom design tokens
  - Responsive design utilities

UI Framework:
  - Geist design system
  - Custom components
  - Accessible by default

Type System:
  - TypeScript 5.9.3
  - Strict mode enabled
  - Full type coverage
```

#### Mobile Application
```yaml
Framework: React Native 0.81.5
  - Expo 54.0.23 managed workflow
  - Expo Router for navigation
  - React 19.x

Navigation:
  - React Navigation 7.x
  - Native Stack Navigator
  - Bottom Tabs Navigator
  - Material Top Tabs

UI Components:
  - Expo Vector Icons (Ionicons)
  - React Native SVG
  - Custom styled components

State Management:
  - React Context API
  - Local state with useState/useReducer
  - No external state management library
```

### 2.2 Backend Technologies

```yaml
Runtime: Node.js 18+ LTS

API Framework:
  - Next.js API Routes
  - Edge-compatible handlers
  - Middleware support

ORM: Prisma 6.19.0
  - PostgreSQL client
  - Type-safe queries
  - Migration system
  - Schema introspection

Database: PostgreSQL 17.6.1
  - Hosted on Supabase
  - Connection pooling (PgBouncer)
  - Row-Level Security (RLS)
  - JSON/JSONB support

Authentication: Supabase Auth
  - Email/password authentication
  - JWT token management
  - Session handling
  - Email verification

File Storage: Supabase Storage
  - Bucket-based organization
  - Image optimization
  - CDN delivery
  - Access control policies
```

### 2.3 AI/ML Services

```yaml
Google Cloud Vision API v5.3.4:
  - Image classification
  - Label detection
  - Safe search detection
  - Object detection

Google Generative AI (Gemini) v0.24.1:
  - Text generation
  - Product descriptions
  - Outfit analysis
  - Style recommendations
```

### 2.4 Development Tools

```yaml
Build Tools:
  - Turbopack (Next.js built-in)
  - Webpack (fallback)
  - esbuild for dependencies

Testing:
  - Vitest 3.2.4
  - React Testing Library
  - Playwright (E2E, optional)

Code Quality:
  - ESLint 9.x
  - Prettier 3.6.2
  - TypeScript compiler
  - Husky (git hooks, optional)

DevOps:
  - Git version control
  - GitHub Actions (CI/CD, optional)
  - Vercel deployment
  - Expo EAS Build
```

### 2.5 External Services

```yaml
Infrastructure:
  - Vercel: Web hosting and edge functions
  - Expo: Mobile app distribution
  - Supabase: Database, auth, storage

Monitoring (Potential):
  - Vercel Analytics
  - Sentry (error tracking)
  - LogRocket (session replay)

Email:
  - Supabase Email Service
  - Transactional emails
  - Verification emails
```

---

## 3. Architecture Patterns

### 3.1 Overall Architecture

**Pattern**: Monolithic with Separation of Concerns

The application follows a monolithic architecture where all components are deployed together, but maintains clear separation between:
- Presentation layer (UI)
- API layer (business logic)
- Data access layer (database)
- Integration layer (external services)

### 3.2 Design Patterns

#### 3.2.1 Client-Server Pattern
- Clear separation between client (web/mobile) and server (API)
- Stateless HTTP communication
- JWT-based authentication

#### 3.2.2 Layered Architecture
```
┌─────────────────────────────────────┐
│      Presentation Layer             │
│  (Next.js Pages, React Components)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         API Layer                   │
│    (Next.js API Routes)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Business Logic Layer           │
│   (Services, Utilities)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Data Access Layer              │
│      (Prisma ORM)                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Database                    │
│      (PostgreSQL)                   │
└─────────────────────────────────────┘
```

#### 3.2.3 Repository Pattern
Prisma ORM acts as a repository layer, abstracting database operations:
```typescript
// Example: User repository operations
const user = await prisma.users.findUnique({
  where: { id: userId },
  include: { premium_subscriptions: true }
})
```

#### 3.2.4 Service Locator Pattern
Centralized API services in mobile app:
```typescript
// mobile/src/services/
- authService.ts
- listingsService.ts
- ordersService.ts
- aiService.ts
```

#### 3.2.5 Context Pattern
React Context for global state:
```typescript
// AuthContext provides user state across components
const { user, login, logout } = useAuth()
```

#### 3.2.6 Middleware Pattern
Request/response processing:
```typescript
// Authentication middleware
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')
  if (!token) return NextResponse.redirect('/signin')
  // ... verify token
}
```

### 3.3 API Design Pattern

**RESTful API with Resource-Based URLs**

```
GET    /api/listings          → List all products
GET    /api/listings/:id      → Get single product
POST   /api/listings          → Create product
PUT    /api/listings/:id      → Update product
DELETE /api/listings/:id      → Delete product
```

**Response Format Standardization**:
```typescript
// Success response
{
  success: true,
  data: { /* payload */ }
}

// Error response
{
  error: "Error message",
  status: 400 | 401 | 403 | 404 | 500
}

// Paginated response
{
  success: true,
  data: {
    items: [],
    total: 100,
    page: 1,
    limit: 20,
    hasMore: true
  }
}
```

### 3.4 Data Flow Architecture

#### 3.4.1 Read Operations
```
User Request → API Route → Prisma Query → PostgreSQL
                           ↓
                    Transform Data
                           ↓
                    JSON Response → Client
```

#### 3.4.2 Write Operations
```
User Request → Validation → API Route → Prisma Mutation
                                          ↓
                                    PostgreSQL
                                          ↓
                              Update Related Tables
                                          ↓
                              Success Response → Client
```

#### 3.4.3 AI Integration Flow
```
User Upload Image → API Route → Process Image
                                      ↓
                              Google Cloud Vision
                                      ↓
                              Classification Result
                                      ↓
                              Store in Database
                                      ↓
                              Return to Client
```

---

## 4. Project Structure

### 4.1 Web Application Structure

```
web/
├── src/
│   ├── app/                          # Next.js 15 App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   ├── globals.css               # Global styles
│   │   │
│   │   ├── (auth)/                   # Authentication routes group
│   │   │   ├── signin/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── verify-email/
│   │   │   │   └── page.tsx
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── profile/                  # User profile pages
│   │   │   ├── page.tsx              # Own profile
│   │   │   ├── [username]/           # Other user profiles
│   │   │   │   └── page.tsx
│   │   │   ├── edit/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── admin/                    # Admin dashboard
│   │   │   ├── layout.tsx            # Admin layout with sidebar
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── listings/
│   │   │   ├── listing-images/
│   │   │   ├── conversations/
│   │   │   ├── support/
│   │   │   ├── categories/
│   │   │   ├── feedback/
│   │   │   ├── faq/
│   │   │   ├── promotions/
│   │   │   ├── reports/
│   │   │   ├── stats/
│   │   │   └── content/
│   │   │
│   │   ├── faq/                      # Public FAQ page
│   │   │   └── page.tsx
│   │   │
│   │   └── api/                      # API Routes (119 endpoints)
│   │       ├── auth/                 # Authentication APIs
│   │       │   ├── register/route.ts
│   │       │   ├── signin/route.ts
│   │       │   ├── signout/route.ts
│   │       │   ├── me/route.ts
│   │       │   ├── forgot-password/route.ts
│   │       │   └── reset-password/route.ts
│   │       │
│   │       ├── listings/             # Product APIs
│   │       │   ├── route.ts          # GET, POST
│   │       │   ├── [id]/route.ts     # GET, PUT, DELETE
│   │       │   ├── my/route.ts
│   │       │   ├── boosted/route.ts
│   │       │   ├── draft/route.ts
│   │       │   ├── brands/route.ts
│   │       │   └── upload-image/route.ts
│   │       │
│   │       ├── orders/               # Order management
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   └── [id]/reviews/route.ts
│   │       │
│   │       ├── cart/                 # Shopping cart
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       │
│   │       ├── profile/              # Profile APIs
│   │       │   ├── route.ts
│   │       │   ├── [username]/route.ts
│   │       │   ├── avatar/route.ts
│   │       │   ├── premium/route.ts
│   │       │   └── follows/route.ts
│   │       │
│   │       ├── messages/             # Messaging
│   │       │   ├── [conversationId]/route.ts
│   │       │   └── [id]/route.ts
│   │       │
│   │       ├── conversations/        # Conversation management
│   │       │   ├── route.ts
│   │       │   └── check/route.ts
│   │       │
│   │       ├── notifications/        # Notifications
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       │
│   │       ├── ai/                   # AI services
│   │       │   ├── classify/route.ts
│   │       │   ├── describe/route.ts
│   │       │   └── safe/route.ts
│   │       │
│   │       ├── outfits/              # Mix & Match
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   ├── analyze/route.ts
│   │       │   └── match/route.ts
│   │       │
│   │       ├── likes/                # Social features
│   │       │   ├── route.ts
│   │       │   └── [listingId]/route.ts
│   │       │
│   │       ├── users/                # User discovery
│   │       │   ├── route.ts
│   │       │   ├── [username]/route.ts
│   │       │   └── [id]/follow/route.ts
│   │       │
│   │       ├── feedback/             # Feedback system
│   │       │   ├── route.ts
│   │       │   └── tags/route.ts
│   │       │
│   │       ├── reports/              # Content reports
│   │       │   └── route.ts
│   │       │
│   │       ├── admin/                # Admin APIs
│   │       │   ├── dashboard/route.ts
│   │       │   ├── users/route.ts
│   │       │   ├── listings/route.ts
│   │       │   └── transactions/route.ts
│   │       │
│   │       ├── categories/route.ts
│   │       ├── pricing-plans/route.ts
│   │       ├── releases/route.ts
│   │       ├── landing-content/route.ts
│   │       ├── health/route.ts
│   │       └── db-status/route.ts
│   │
│   ├── components/                   # React components
│   │   ├── AuthContext.tsx           # Auth state provider
│   │   ├── NavBar.tsx                # Navigation bar
│   │   ├── AIFeatures.tsx            # AI features carousel
│   │   └── admin/                    # Admin components
│   │       ├── AdminGuard.tsx
│   │       ├── SearchBar.tsx
│   │       ├── Pagination.tsx
│   │       ├── ConversationTable.tsx
│   │       ├── FeatureCardManager.tsx
│   │       └── ImageListManager.tsx
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── auth.ts                   # Auth helpers
│   │   ├── db.ts                     # Database connection
│   │   ├── supabase.ts               # Supabase client
│   │   ├── jwt.ts                    # JWT utilities
│   │   ├── userPermissions.ts        # Authorization logic
│   │   ├── categories.ts             # Category helpers
│   │   └── utils.ts                  # General utilities
│   │
│   ├── types/                        # TypeScript types
│   │   ├── index.ts
│   │   └── api.ts
│   │
│   └── middleware.ts                 # Next.js middleware
│
├── prisma/
│   ├── schema.prisma                 # Database schema (778 lines)
│   └── migrations/                   # Migration files
│
├── public/                           # Static assets
│   ├── images/
│   └── icons/
│
├── .env.example                      # Environment template
├── .env.local                        # Local environment (gitignored)
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # TailwindCSS config
├── postcss.config.mjs                # PostCSS config
├── package.json                      # Dependencies
└── README.md                         # Documentation
```

### 4.2 Mobile Application Structure

```
mobile/
├── App.tsx                           # Main entry point
│
├── screens/                          # Screen components
│   ├── auth/                         # Authentication screens
│   │   ├── SplashScreen.tsx
│   │   ├── LandingScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   └── OnboardingPreferenceScreen.tsx
│   │
│   └── main/                         # Main app screens
│       ├── HomeStack/
│       │   ├── HomeScreen.tsx
│       │   ├── ListingDetailScreen.tsx
│       │   ├── UserProfileScreen.tsx
│       │   └── SearchScreen.tsx
│       │
│       ├── DiscoverStack/
│       │   ├── DiscoverScreen.tsx
│       │   ├── CategoryScreen.tsx
│       │   └── BrandScreen.tsx
│       │
│       ├── BuyStack/
│       │   ├── BuyScreen.tsx
│       │   ├── CartScreen.tsx
│       │   ├── CheckoutScreen.tsx
│       │   └── OrdersScreen.tsx
│       │
│       ├── SellStack/
│       │   ├── SellScreen.tsx
│       │   ├── CreateListingScreen.tsx
│       │   ├── MyListingsScreen.tsx
│       │   └── ListingAnalyticsScreen.tsx
│       │
│       ├── InboxStack/
│       │   ├── InboxScreen.tsx
│       │   ├── ConversationScreen.tsx
│       │   └── NotificationsScreen.tsx
│       │
│       ├── MyTopStack/
│       │   ├── ProfileScreen.tsx
│       │   ├── EditProfileScreen.tsx
│       │   ├── SettingsScreen.tsx
│       │   ├── SavedOutfitsScreen.tsx
│       │   └── LikesScreen.tsx
│       │
│       └── PremiumStack/
│           ├── PremiumScreen.tsx
│           ├── SubscriptionScreen.tsx
│           └── BenefitsScreen.tsx
│
├── src/
│   ├── services/                     # API service layer
│   │   ├── api.ts                    # Base API config
│   │   ├── authService.ts
│   │   ├── listingsService.ts
│   │   ├── ordersService.ts
│   │   ├── cartService.ts
│   │   ├── profileService.ts
│   │   ├── messagesService.ts
│   │   ├── conversationsService.ts
│   │   ├── notificationsService.ts
│   │   ├── aiService.ts
│   │   ├── outfitsService.ts
│   │   ├── likesService.ts
│   │   ├── usersService.ts
│   │   ├── feedbackService.ts
│   │   └── reportsService.ts
│   │
│   ├── config/                       # Configuration
│   │   ├── constants.ts
│   │   └── theme.ts
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useListings.ts
│   │   └── useNotifications.ts
│   │
│   └── utils/                        # Utility functions
│       ├── storage.ts
│       ├── validators.ts
│       └── formatters.ts
│
├── contexts/
│   └── AuthContext.tsx               # Auth context provider
│
├── assets/                           # Static assets
│   ├── images/
│   ├── icons/
│   ├── splash.png
│   └── adaptive-icon.png
│
├── app.json                          # Expo configuration
├── eas.json                          # EAS Build config
├── babel.config.js                   # Babel config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
└── README.md                         # Documentation
```

---

## 5. Database Architecture

### 5.1 Database Schema Overview

The database consists of **28 tables** (27 business tables + 1 system table `_prisma_migrations`) organized into logical domains.

#### 5.1.1 Entity-Relationship Diagram (High-Level)

```
┌─────────┐         ┌──────────┐         ┌─────────┐
│  users  │────────►│ listings │◄────────│ listing │
│         │         │          │         │categories│
└────┬────┘         └────┬─────┘         └─────────┘
     │                   │
     │                   ├──────┐
     │                   │      │
     ▼                   ▼      ▼
┌─────────┐         ┌────────┐┌────────┐
│ premium │         │ orders ││ cart   │
│subscrip.│         │        ││ items  │
└─────────┘         └───┬────┘└────────┘
                        │
                        ▼
                   ┌────────┐
                   │ order  │
                   │ items  │
                   └────────┘

┌──────────────┐   ┌──────────┐   ┌────────────┐
│conversations │──►│ messages │   │notifications│
└──────────────┘   └──────────┘   └────────────┘

┌────────────┐   ┌─────────┐   ┌─────────┐
│ user_likes │   │ reviews │   │ feedback│
└────────────┘   └─────────┘   └─────────┘

┌──────────────┐   ┌─────────────┐
│ saved_outfits│   │   reports   │
└──────────────┘   └─────────────┘
```

### 5.2 Core Tables

#### 5.2.1 users
```prisma
model users {
  id                      Int                 @id @default(autoincrement())
  username                String(64)          @unique
  email                   String(191)         @unique
  dob                     DateTime?
  gender                  Gender?
  role                    UserRole            @default(USER)
  status                  UserStatus          @default(ACTIVE)
  is_premium              Boolean             @default(false)
  premium_until           DateTime?
  average_rating          Decimal(3,2)?
  total_reviews           Int                 @default(0)
  created_at              DateTime            @default(now())
  supabase_user_id        String(UUID)?       @unique
  avatar_url              String?
  phone_number            String(20)?
  phone                   String(20)?
  bio                     String?
  location                String(100)?
  updated_at              DateTime?           @default(now())
  preferred_styles        Json?
  preferred_size_top      String(50)?
  preferred_size_bottom   String(50)?
  preferred_size_shoe     String(50)?
  preferred_brands        Json?
  mix_match_used_count    Int?                @default(0)
  free_promotions_used    Int?                @default(0)
  free_promotions_reset_at DateTime?
  last_sign_in_at         DateTime?
  country                 String(64)?
  likes_visibility        VisibilitySetting   @default(PUBLIC)
  follows_visibility      VisibilitySetting   @default(PUBLIC)

  // Relations
  listings                listings[]
  orders_as_buyer         orders[]            @relation("buyer")
  orders_as_seller        orders[]            @relation("seller")
  cart_items              cart_items[]
  messages_sent           messages[]          @relation("sender")
  messages_received       messages[]          @relation("receiver")
  // ... more relations
}

enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

enum Gender {
  Men
  Women
  Unisex
}

enum VisibilitySetting {
  PUBLIC
  FOLLOWERS_ONLY
  PRIVATE
}
```

#### 5.2.2 listings
```prisma
model listings {
  id                Int               @id @default(autoincrement())
  name              String(120)
  description       String?
  category_id       Int?
  seller_id         Int?
  listed            Boolean           @default(true)
  sold              Boolean           @default(false)
  price             Decimal(10,2)
  image_url         String?
  image_urls        Json?
  brand             String(100)?
  size              String(50)?
  condition_type    ConditionType     @default(GOOD)
  tags              Json?
  created_at        DateTime          @default(now())
  sold_at           DateTime?
  original_price    Decimal(10,2)?
  material          String(100)?
  weight            Decimal(8,2)?
  dimensions        String(50)?
  sku               String(50)?
  inventory_count   Int?              @default(1)
  views_count       Int?              @default(0)
  likes_count       Int?              @default(0)
  updated_at        DateTime?         @default(now())
  gender            Gender?           @default(Unisex)
  shipping_option   String(50)?
  shipping_fee      Decimal(10,2)?
  location          String(100)?
  clicks_count      Int               @default(0)

  // Relations
  category          listing_categories? @relation(fields: [category_id], references: [id])
  seller            users?            @relation(fields: [seller_id], references: [id])
  cart_items        cart_items[]
  likes             user_likes[]
  // ... more relations
}

enum ConditionType {
  NEW
  LIKE_NEW
  GOOD
  FAIR
  POOR
}
```

#### 5.2.3 orders
```prisma
model orders {
  id                Int                 @id @default(autoincrement())
  buyer_id          Int
  seller_id         Int
  listing_id        Int
  status            OrderStatus         @default(IN_PROGRESS)
  created_at        DateTime            @default(now())
  updated_at        DateTime            @default(now())
  order_number      String(50)?         @unique
  total_amount      Decimal(10,2)?
  shipping_method   String(100)?
  notes             String?
  buyer_name        String(100)?
  buyer_phone       String(20)?
  shipping_address  String?
  payment_method    String(50)?
  payment_details   Json?
  payment_method_id Int?
  commission_rate   Decimal(5,4)?
  commission_amount Decimal(10,2)?
  quantity          Int?                @default(1)

  // Relations
  buyer             users               @relation("buyer", fields: [buyer_id], references: [id])
  seller            users               @relation("seller", fields: [seller_id], references: [id])
  listing           listings            @relation(fields: [listing_id], references: [id])
  payment_method_ref user_payment_methods? @relation(fields: [payment_method_id], references: [id])
  transactions      transactions[]
  reviews           reviews[]
}

enum OrderStatus {
  IN_PROGRESS
  TO_SHIP
  SHIPPED
  DELIVERED
  RECEIVED
  COMPLETED
  REVIEWED
  CANCELLED
}
```

#### 5.2.4 saved_outfits
```prisma
model saved_outfits {
  id                      Int         @id @default(autoincrement())
  user_id                 Int
  outfit_name             String(100)?
  base_item_id            Int?
  top_item_id             Int?
  bottom_item_id          Int?
  shoe_item_id            Int?
  accessory_ids           Int[]       @default([])
  created_at              DateTime?   @default(now())
  updated_at              DateTime?   @default(now())
  ai_rating               Int?
  style_name              String(100)?
  color_harmony_score     Int?
  color_harmony_feedback  String?
  style_tips              String?
  vibe                    String(50)?

  // Relations
  user                    users       @relation(fields: [user_id], references: [id])
  base_item               listings?   @relation("BaseItem", fields: [base_item_id], references: [id])
  top_item                listings?   @relation("TopItem", fields: [top_item_id], references: [id])
  bottom_item             listings?   @relation("BottomItem", fields: [bottom_item_id], references: [id])
  shoe_item               listings?   @relation("ShoeItem", fields: [shoe_item_id], references: [id])
}
```

### 5.3 Database Indexes

Strategic indexes for performance optimization:

```prisma
// Users
@@index([email])
@@index([username])
@@index([status])
@@index([is_premium])
@@index([created_at])

// Listings
@@index([seller_id])
@@index([category_id])
@@index([listed])
@@index([sold])
@@index([created_at])
@@index([price])
@@index([brand])
@@index([gender])

// Orders
@@index([buyer_id])
@@index([seller_id])
@@index([status])
@@index([created_at])

// Messages
@@index([conversation_id])
@@index([sender_id])
@@index([receiver_id])
@@index([created_at])
@@index([is_read])

// Notifications
@@index([user_id])
@@index([is_read])
@@index([created_at])
```

### 5.4 Database Relationships

#### One-to-Many Relationships
- users → listings (one seller has many listings via seller_id)
- users → orders (as buyer or seller)
- listings → orders (one listing can have multiple orders)
- conversations → messages

#### Many-to-Many Relationships
- users ↔ users (followers/following via user_follows)
- users ↔ listings (likes via user_likes)

#### One-to-One Relationships
- users → premium_subscriptions (optional)

### 5.5 Data Integrity

#### Foreign Key Constraints
```prisma
// Example: Cascade delete
model listings {
  seller_id Int?
  seller    users? @relation(fields: [seller_id], references: [id], onDelete: Cascade)
}
```

#### Default Values
```prisma
listed      Boolean  @default(true)
sold        Boolean  @default(false)
created_at  DateTime @default(now())
is_premium  Boolean  @default(false)
```

#### Unique Constraints
```prisma
email    String @unique
username String @unique
```

---

## 6. API Architecture

### 6.1 API Overview

The platform exposes **119 REST API endpoints** organized by feature domain. All APIs follow RESTful conventions.

### 6.2 API Categories

#### 6.2.1 Authentication APIs (`/api/auth/`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | User registration | No |
| `/api/auth/signin` | POST | User login | No |
| `/api/auth/signout` | POST | User logout | Yes |
| `/api/auth/me` | POST | Current user info | Yes |
| `/api/auth/check-availability` | POST | Check username/email | No |
| `/api/auth/forgot-password` | POST | Request password reset | No |
| `/api/auth/reset-password` | POST | Reset password | No |
| `/api/auth/change-password` | POST | Change password | Yes |
| `/api/auth/resend-verification` | POST | Resend verification email | No |

**Example Request**:
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "user@example.com",
      "role": "USER",
      "is_premium": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 6.2.2 Listings APIs (`/api/listings/`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/listings` | GET | Browse all listings | No |
| `/api/listings` | POST | Create listing | Yes |
| `/api/listings/:id` | GET | Get single listing | No |
| `/api/listings/:id` | PUT | Update listing | Yes (owner) |
| `/api/listings/:id` | DELETE | Delete listing | Yes (owner) |
| `/api/listings/my` | GET | User's listings | Yes |
| `/api/listings/boosted` | GET | Promoted listings | No |
| `/api/listings/draft` | GET | Draft listings | Yes |
| `/api/listings/brands` | GET | Available brands | No |
| `/api/listings/upload-image` | POST | Upload product image | Yes |
| `/api/listings/boost` | POST | Promote listing | Yes |

**Query Parameters** (GET `/api/listings`):
```typescript
{
  search?: string          // Search term
  category?: number        // Category ID
  minPrice?: number        // Minimum price
  maxPrice?: number        // Maximum price
  size?: string           // Product size
  condition?: string      // Condition type
  brand?: string          // Brand name
  gender?: string         // Gender filter
  page?: number           // Page number (default: 1)
  limit?: number          // Items per page (default: 20)
  sortBy?: string         // Sort field (default: created_at)
  sortOrder?: 'asc'|'desc' // Sort order (default: desc)
}
```

#### 6.2.3 Orders APIs (`/api/orders/`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/orders` | GET | User's order history | Yes |
| `/api/orders` | POST | Create order | Yes |
| `/api/orders/:id` | GET | Order details | Yes |
| `/api/orders/:id` | PUT | Update order status | Yes |
| `/api/orders/:id/reviews` | GET | Get order reviews | Yes |
| `/api/orders/:id/reviews` | POST | Submit review | Yes |
| `/api/orders/:id/reviews/check` | GET | Check if reviewed | Yes |

**Order Status Workflow**:
```
IN_PROGRESS → TO_SHIP → SHIPPED → DELIVERED →
RECEIVED → COMPLETED → REVIEWED

                ↓ (anytime)
             CANCELLED
```

#### 6.2.4 AI APIs (`/api/ai/`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/ai/classify` | POST | Classify product image | Yes |
| `/api/ai/describe` | POST | Generate description | Yes |
| `/api/ai/safe` | POST | Content safety check | Yes |

**Example Request**:
```http
POST /api/ai/classify
Content-Type: application/json
Authorization: Bearer <token>

{
  "imageUrl": "https://example.com/image.jpg"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "category": "Dresses",
    "subcategory": "Casual Dresses",
    "confidence": 0.95,
    "labels": ["dress", "summer", "floral", "cotton"]
  }
}
```

#### 6.2.5 Outfits APIs (`/api/outfits/`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/outfits` | GET | User's saved outfits | Yes |
| `/api/outfits` | POST | Save outfit | Yes |
| `/api/outfits/:id` | GET | Outfit details | Yes |
| `/api/outfits/:id` | DELETE | Delete outfit | Yes |
| `/api/outfits/analyze` | POST | AI outfit analysis | Yes |
| `/api/outfits/match` | POST | Get style recommendations | Yes |

#### 6.2.6 Messaging APIs (`/api/messages/`, `/api/conversations/`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/conversations` | GET | User's conversations | Yes |
| `/api/conversations` | POST | Create conversation | Yes |
| `/api/conversations/check` | GET | Check if exists | Yes |
| `/api/messages/:conversationId` | GET | Get messages | Yes |
| `/api/messages/:conversationId` | POST | Send message | Yes |
| `/api/messages/:id` | PUT | Mark as read | Yes |

#### 6.2.7 Admin APIs (`/api/admin/`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/admin/dashboard` | GET | Dashboard stats | Admin |
| `/api/admin/users` | GET | All users | Admin |
| `/api/admin/users/:id` | PUT | Update user | Admin |
| `/api/admin/listings` | GET | All listings | Admin |
| `/api/admin/listings/:id` | PUT | Moderate listing | Admin |
| `/api/admin/transactions` | GET | All transactions | Admin |
| `/api/admin/reports` | GET | Content reports | Admin |
| `/api/admin/reports/:id` | PUT | Handle report | Admin |

### 6.3 API Response Formats

#### Success Response
```typescript
interface SuccessResponse<T> {
  success: true
  data: T
}
```

#### Error Response
```typescript
interface ErrorResponse {
  error: string
  status: 400 | 401 | 403 | 404 | 500
  details?: string
}
```

#### Paginated Response
```typescript
interface PaginatedResponse<T> {
  success: true
  data: {
    items: T[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}
```

### 6.4 API Authentication

#### Authentication Headers
```http
Authorization: Bearer <jwt_token>
Cookie: auth_token=<jwt_token>
```

#### Token Validation
```typescript
// Middleware extracts and validates token
const token = request.headers.get('authorization')?.replace('Bearer ', '')
const session = await verifyToken(token)
```

### 6.5 API Rate Limiting

**Current Status**: Not implemented
**Recommended**: Implement at API gateway level

**Suggested Limits**:
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Admin: Unlimited

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

#### 7.1.1 Registration Flow

```
User submits email + password
         ↓
Validate input (email format, password strength)
         ↓
Check email/username availability
         ↓
Create user in Supabase Auth
         ↓
Send verification email
         ↓
Create user record in database (users table)
         ↓
Return success response
         ↓
User verifies email (clicks link)
         ↓
Account activated
```

**Implementation** (`web/src/app/api/auth/register/route.ts`):
```typescript
export async function POST(request: Request) {
  const { email, password, username } = await request.json()

  // Validate input
  if (!email || !password || !username) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Create user in database
  const user = await prisma.users.create({
    data: {
      email,
      username,
      // ... other fields
    }
  })

  return NextResponse.json({ success: true, data: { user } })
}
```

#### 7.1.2 Login Flow

```
User submits email + password
         ↓
Validate credentials with Supabase Auth
         ↓
Check if email is verified
         ↓
Generate JWT token
         ↓
Fetch user record from database
         ↓
Set httpOnly cookie with token
         ↓
Return user data + token
         ↓
Client stores token (mobile) or uses cookie (web)
```

**Implementation** (`web/src/app/api/auth/signin/route.ts`):
```typescript
export async function POST(request: Request) {
  const { email, password } = await request.json()

  // Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Check email verification
  if (!authData.user.email_confirmed_at) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
  }

  // Fetch user from database
  const user = await prisma.users.findUnique({
    where: { email },
    include: { premium_subscriptions: true }
  })

  // Set cookie
  const response = NextResponse.json({
    success: true,
    data: { user, token: authData.session.access_token }
  })

  response.cookies.set('auth_token', authData.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })

  return response
}
```

#### 7.1.3 Session Management

**Web (Cookie-based)**:
```typescript
// Set cookie on login
response.cookies.set('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax'
})

// Read cookie in middleware
const token = request.cookies.get('auth_token')
```

**Mobile (Token-based)**:
```typescript
// Store token in secure storage
await AsyncStorage.setItem('auth_token', token)

// Include in API requests
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### 7.2 Authorization

#### 7.2.1 Role-Based Access Control (RBAC)

**Roles**:
- `USER`: Regular user (default)
- `ADMIN`: Administrator with full access

**Permission Checks** (`web/src/lib/userPermissions.ts`):
```typescript
export function canCreateListing(user: User): boolean {
  // Free users: max 2 listings
  // Premium users: unlimited
  if (user.is_premium) {
    return true
  }

  const listingCount = user.listings?.length || 0
  return listingCount < 2
}

export function canUseMixAndMatch(user: User): boolean {
  // Free users: 3 uses per month
  // Premium users: unlimited
  if (user.is_premium) {
    return true
  }

  // Check usage count for current month
  return usageThisMonth < 3
}

export function getCommissionRate(user: User): number {
  return user.is_premium ? 0.05 : 0.10 // 5% or 10%
}
```

#### 7.2.2 Middleware Protection

**Next.js Middleware** (`web/src/middleware.ts`):
```typescript
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const pathname = request.nextUrl.pathname

  // Public routes
  const publicPaths = ['/signin', '/register', '/faq']
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (!token) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Verify token
  const session = await verifyToken(token)
  if (!session) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Admin routes - require admin role
  if (pathname.startsWith('/admin')) {
    const user = await getUserById(session.userId)
    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

#### 7.2.3 API Route Protection

```typescript
// Helper to get authenticated user
export async function getSessionUser(request: Request): Promise<User | null> {
  // Try cookie first (web)
  const cookies = request.headers.get('cookie')
  let token = parseCookie(cookies, 'auth_token')

  // Try Authorization header (mobile)
  if (!token) {
    const authHeader = request.headers.get('authorization')
    token = authHeader?.replace('Bearer ', '')
  }

  if (!token) return null

  // Verify token
  const session = await verifyToken(token)
  if (!session) return null

  // Fetch user
  const user = await prisma.users.findUnique({
    where: { id: session.userId }
  })

  return user
}

// Usage in API route
export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Proceed with authenticated request
  // ...
}
```

#### 7.2.4 Resource Ownership

```typescript
// Check if user owns resource
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listing = await prisma.listings.findUnique({
    where: { id: parseInt(params.id) }
  })

  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check ownership or admin
  if (listing.seller_id !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete listing
  await prisma.listings.delete({
    where: { id: parseInt(params.id) }
  })

  return NextResponse.json({ success: true })
}
```

### 7.3 Password Security

- **Hashing**: Handled by Supabase Auth (bcrypt)
- **Requirements**: Minimum 6 characters (configurable)
- **Reset**: Email-based token verification
- **Change**: Requires current password

### 7.4 Email Verification

```typescript
// Email verification required before login
const { data: authData, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

if (authData.user && !authData.user.email_confirmed_at) {
  return NextResponse.json({
    error: 'Please verify your email before logging in'
  }, { status: 403 })
}
```

---

## 8. AI/ML Integration

### 8.1 AI Services Overview

The platform integrates **Google Cloud AI** services for intelligent fashion features.

### 8.2 Google Cloud Vision API

**Purpose**: Image classification, object detection, content safety

#### 8.2.1 Product Classification

**Endpoint**: `/api/ai/classify`

**Flow**:
```
User uploads product image
         ↓
Send image URL to Google Cloud Vision
         ↓
Receive label detections
         ↓
Map labels to product categories
         ↓
Return category suggestions with confidence scores
```

**Implementation**:
```typescript
import vision from '@google-cloud/vision'

export async function POST(request: Request) {
  const { imageUrl } = await request.json()

  // Initialize Vision API client
  const client = new vision.ImageAnnotatorClient({
    apiKey: process.env.GOOGLE_CLOUD_API_KEY
  })

  // Perform label detection
  const [result] = await client.labelDetection(imageUrl)
  const labels = result.labelAnnotations

  // Map labels to categories
  const category = mapLabelsToCategory(labels)

  return NextResponse.json({
    success: true,
    data: {
      category: category.name,
      subcategory: category.subcategory,
      confidence: category.confidence,
      labels: labels.map(l => l.description)
    }
  })
}

function mapLabelsToCategory(labels) {
  const keywords = {
    'Dresses': ['dress', 'gown', 'frock'],
    'Tops': ['shirt', 'blouse', 't-shirt', 'top'],
    'Bottoms': ['pants', 'jeans', 'trousers', 'skirt'],
    'Shoes': ['shoe', 'sneaker', 'boot', 'sandal'],
    // ... more mappings
  }

  for (const [category, words] of Object.entries(keywords)) {
    for (const label of labels) {
      if (words.some(w => label.description.toLowerCase().includes(w))) {
        return {
          name: category,
          confidence: label.score
        }
      }
    }
  }

  return { name: 'Uncategorized', confidence: 0 }
}
```

#### 8.2.2 Content Safety Check

**Endpoint**: `/api/ai/safe`

**Purpose**: Detect inappropriate content (NSFW, violence, etc.)

**Implementation**:
```typescript
export async function POST(request: Request) {
  const { imageUrl } = await request.json()

  const client = new vision.ImageAnnotatorClient({
    apiKey: process.env.GOOGLE_CLOUD_API_KEY
  })

  // Perform safe search detection
  const [result] = await client.safeSearchDetection(imageUrl)
  const safeSearch = result.safeSearchAnnotation

  const isSafe =
    safeSearch.adult !== 'LIKELY' &&
    safeSearch.adult !== 'VERY_LIKELY' &&
    safeSearch.violence !== 'LIKELY' &&
    safeSearch.violence !== 'VERY_LIKELY'

  return NextResponse.json({
    success: true,
    data: {
      isSafe,
      details: {
        adult: safeSearch.adult,
        violence: safeSearch.violence,
        racy: safeSearch.racy
      }
    }
  })
}
```

### 8.3 Google Generative AI (Gemini)

**Purpose**: Text generation, product descriptions, outfit analysis

#### 8.3.1 Product Description Generation

**Endpoint**: `/api/ai/describe`

**Flow**:
```
User uploads product image
         ↓
Send image to Gemini API with prompt
         ↓
Gemini analyzes image and generates description
         ↓
Return formatted description
```

**Implementation**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  const { imageUrl } = await request.json()

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

  const prompt = `
    Analyze this fashion product image and generate a compelling product description.
    Include:
    - Product type and style
    - Notable features (color, pattern, material)
    - Suitable occasions
    - Style recommendations

    Keep it concise (2-3 sentences) and appealing.
  `

  const result = await model.generateContent([prompt, { inlineData: {
    data: await fetchImageAsBase64(imageUrl),
    mimeType: 'image/jpeg'
  }}])

  const description = result.response.text()

  return NextResponse.json({
    success: true,
    data: { description }
  })
}
```

#### 8.3.2 Outfit Analysis (Mix & Match)

**Endpoint**: `/api/outfits/analyze`

**Flow**:
```
User creates outfit with multiple items
         ↓
Fetch images for all items
         ↓
Send images to Gemini with analysis prompt
         ↓
Gemini analyzes:
  - Color harmony
  - Style compatibility
  - Occasion suitability
  - Overall rating
         ↓
Return analysis with suggestions
```

**Implementation**:
```typescript
export async function POST(request: Request) {
  const { items } = await request.json() // Array of listing IDs

  // Fetch listings
  const listings = await prisma.listings.findMany({
    where: { id: { in: items } }
  })

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

  const prompt = `
    Analyze this outfit combination and provide:
    1. Overall rating (1-10)
    2. Color harmony analysis
    3. Style compatibility (do the pieces work together?)
    4. Occasion suitability (casual, formal, streetwear, etc.)
    5. 3 specific style tips to improve the outfit

    Format as JSON:
    {
      "rating": 8.5,
      "colorHarmony": "The warm tones complement each other well...",
      "styleCompatibility": "The pieces create a cohesive look...",
      "occasion": "casual",
      "styleTips": ["tip1", "tip2", "tip3"]
    }
  `

  const images = listings.map(l => l.image_urls[0])
  const result = await model.generateContent([
    prompt,
    ...images.map(url => ({
      inlineData: {
        data: await fetchImageAsBase64(url),
        mimeType: 'image/jpeg'
      }
    }))
  ])

  const analysis = JSON.parse(result.response.text())

  return NextResponse.json({
    success: true,
    data: analysis
  })
}
```

### 8.4 AI Usage Limits

**Free Users**:
- Mix & Match: 3 uses per month
- Product classification: Unlimited
- Product description: 5 per month

**Premium Users**:
- All features: Unlimited

**Implementation**:
```typescript
async function checkAIUsageLimit(userId: number, feature: string): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { premium_subscriptions: true }
  })

  // Premium users have unlimited access
  if (user.is_premium) {
    return true
  }

  // Check usage for current month
  const usageCount = await getMonthlyUsageCount(userId, feature)

  const limits = {
    'mix_and_match': 3,
    'description_generation': 5
  }

  return usageCount < limits[feature]
}
```

### 8.5 AI Cost Optimization

- **Caching**: Cache AI responses for identical inputs
- **Batch Processing**: Process multiple items together when possible
- **Image Optimization**: Resize images before sending to reduce costs
- **Rate Limiting**: Prevent abuse with usage limits

---

## 9. Frontend Architecture

### 9.1 Next.js Web Application

#### 9.1.1 App Router Structure

Next.js 15 uses the App Router architecture with file-based routing:

```
app/
├── layout.tsx              # Root layout (applies to all pages)
├── page.tsx                # Landing page (/)
├── globals.css             # Global styles
│
├── (auth)/                 # Route group (doesn't affect URL)
│   ├── signin/page.tsx     # /signin
│   └── register/page.tsx   # /register
│
├── profile/
│   ├── page.tsx            # /profile (own profile)
│   ├── [username]/
│   │   └── page.tsx        # /profile/:username
│   └── edit/
│       └── page.tsx        # /profile/edit
│
└── admin/
    ├── layout.tsx          # Admin layout (sidebar, etc.)
    └── dashboard/
        └── page.tsx        # /admin/dashboard
```

#### 9.1.2 Server vs Client Components

**Server Components** (default):
- Fetch data on server
- No JavaScript sent to client
- Better performance and SEO

```typescript
// Server Component
export default async function ListingsPage() {
  // Fetch data on server
  const listings = await fetchListings()

  return (
    <div>
      {listings.map(l => <ListingCard key={l.id} listing={l} />)}
    </div>
  )
}
```

**Client Components** (opt-in with 'use client'):
- Interactive components
- Use React hooks
- Access browser APIs

```typescript
'use client'

import { useState } from 'react'

export default function LikeButton({ listingId }: { listingId: number }) {
  const [isLiked, setIsLiked] = useState(false)

  const handleLike = async () => {
    await fetch(`/api/likes/${listingId}`, { method: 'POST' })
    setIsLiked(!isLiked)
  }

  return (
    <button onClick={handleLike}>
      {isLiked ? '❤️' : '🤍'}
    </button>
  )
}
```

#### 9.1.3 Data Fetching Patterns

**Server-Side Fetching**:
```typescript
// Fetch data in Server Component
async function getListings() {
  const res = await fetch('http://localhost:3000/api/listings', {
    cache: 'no-store' // Always fresh data
  })
  return res.json()
}

export default async function Page() {
  const { data } = await getListings()
  return <ListingsGrid listings={data.items} />
}
```

**Client-Side Fetching**:
```typescript
'use client'

export default function Page() {
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => setListings(data.data.items))
  }, [])

  return <ListingsGrid listings={listings} />
}
```

#### 9.1.4 State Management

**Context API** for global state:

```typescript
// contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: number
  username: string
  email: string
  is_premium: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.data.user)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()
    if (data.success) {
      setUser(data.data.user)
    } else {
      throw new Error(data.error)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**Usage**:
```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  if (!user) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

#### 9.1.5 Styling Architecture

**TailwindCSS** for utility-first styling:

```typescript
// Example component
export function ProductCard({ product }) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <img
        src={product.image_urls[0]}
        alt={product.name}
        className="w-full h-64 object-cover rounded-t-lg"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {product.name}
        </h3>
        <p className="text-2xl font-bold text-primary mt-2">
          ${product.price}
        </p>
      </div>
    </div>
  )
}
```

**Custom Design Tokens** (`tailwind.config.ts`):
```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#F54B3D',
        secondary: '#1A1A1A',
        accent: '#FFD700'
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif']
      }
    }
  }
}
```

### 9.2 Component Architecture

**Atomic Design Pattern**:

```
components/
├── atoms/               # Basic building blocks
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Badge.tsx
│
├── molecules/           # Simple combinations
│   ├── SearchBar.tsx
│   ├── ProductCard.tsx
│   └── UserAvatar.tsx
│
├── organisms/           # Complex components
│   ├── NavBar.tsx
│   ├── ProductGrid.tsx
│   └── ChatWindow.tsx
│
└── templates/           # Page layouts
    ├── DashboardLayout.tsx
    └── ProfileLayout.tsx
```

**Example**: Building a Search Feature

```typescript
// atoms/Input.tsx
export function Input({ ...props }) {
  return (
    <input
      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
      {...props}
    />
  )
}

// atoms/Button.tsx
export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300'
  }

  return (
    <button
      className={`px-6 py-2 rounded-lg font-medium transition-colors ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}

// molecules/SearchBar.tsx
'use client'

import { Input } from '../atoms/Input'
import { Button } from '../atoms/Button'
import { useState } from 'react'

export function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <Button type="submit">Search</Button>
    </form>
  )
}
```

---

## 10. Mobile Architecture

### 10.1 React Native + Expo Structure

#### 10.1.1 Navigation Architecture

**Bottom Tab Navigator** (main navigation):

```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

const Tab = createBottomTabNavigator()

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline'
            } else if (route.name === 'Discover') {
              iconName = focused ? 'compass' : 'compass-outline'
            } else if (route.name === 'Buy') {
              iconName = focused ? 'cart' : 'cart-outline'
            } else if (route.name === 'Sell') {
              iconName = focused ? 'add-circle' : 'add-circle-outline'
            } else if (route.name === 'Inbox') {
              iconName = focused ? 'chatbubble' : 'chatbubble-outline'
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline'
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: '#F54B3D',
          tabBarInactiveTintColor: 'gray'
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Discover" component={DiscoverStack} />
        <Tab.Screen name="Buy" component={BuyStack} />
        <Tab.Screen name="Sell" component={SellStack} />
        <Tab.Screen name="Inbox" component={InboxStack} />
        <Tab.Screen name="Profile" component={MyTopStack} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
```

**Stack Navigator** (within each tab):

```typescript
// HomeStack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../screens/main/HomeStack/HomeScreen'
import ListingDetailScreen from '../screens/main/HomeStack/ListingDetailScreen'
import UserProfileScreen from '../screens/main/HomeStack/UserProfileScreen'

const Stack = createNativeStackNavigator()

export function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: 'Top Care Fashion' }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Product Details' }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  )
}
```

#### 10.1.2 API Service Layer

Centralized API services for mobile app:

```typescript
// src/services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'https://top-care-fashion.vercel.app'

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  // Get auth token
  const token = await AsyncStorage.getItem('auth_token')

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Make request
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

// src/services/authService.ts
import { apiRequest } from './api'
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function login(email: string, password: string) {
  const data = await apiRequest('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })

  // Store token
  await AsyncStorage.setItem('auth_token', data.data.token)

  return data.data.user
}

export async function logout() {
  await apiRequest('/api/auth/signout', { method: 'POST' })
  await AsyncStorage.removeItem('auth_token')
}

export async function getCurrentUser() {
  return await apiRequest('/api/auth/me', { method: 'POST' })
}

// src/services/listingsService.ts
import { apiRequest } from './api'

export async function getListings(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  return await apiRequest(`/api/listings?${queryString}`)
}

export async function getListingById(id: number) {
  return await apiRequest(`/api/listings/${id}`)
}

export async function createListing(data: any) {
  return await apiRequest('/api/listings', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function uploadListingImage(imageUri: string) {
  const formData = new FormData()
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'listing.jpg'
  })

  return await apiRequest('/api/listings/upload-image', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
```

#### 10.1.3 Screen Example

```typescript
// screens/main/HomeStack/HomeScreen.tsx
import React, { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { getListings } from '../../../src/services/listingsService'
import ProductCard from '../../../components/ProductCard'

export default function HomeScreen({ navigation }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    try {
      const data = await getListings({ limit: 20 })
      setListings(data.data.items)
    } catch (error) {
      console.error('Failed to load listings:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadListings()
  }

  const onProductPress = (listing) => {
    navigation.navigate('ListingDetail', { id: listing.id })
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#F54B3D" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        renderItem={({ item }) => (
          <ProductCard
            listing={item}
            onPress={() => onProductPress(item)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 16
  }
})
```

#### 10.1.4 State Management (Context API)

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as authService from '../src/services/authService'

interface User {
  id: number
  username: string
  email: string
  is_premium: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token')
      if (token) {
        const data = await authService.getCurrentUser()
        setUser(data.data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const userData = await authService.login(email, password)
    setUser(userData)
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 10.2 Expo Configuration

```json
// app.json
{
  "expo": {
    "name": "Top Care Fashion",
    "slug": "top-care-fashion",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.topc arefashion.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.topcarefashion.app"
    },
    "updates": {
      "url": "https://u.expo.dev/43fcbd20-cac5-45f7-810b-463059702c7a"
    },
    "extra": {
      "eas": {
        "projectId": "43fcbd20-cac5-45f7-810b-463059702c7a"
      }
    }
  }
}
```

```json
// eas.json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 11. Admin Panel Architecture

### 11.1 Admin Dashboard Overview

The admin panel provides comprehensive management capabilities across 13 sections.

### 11.2 Admin Layout

```typescript
// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user || user.role !== 'ADMIN') {
    redirect('/signin')
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
```

### 11.3 Admin Sections

#### 11.3.1 Dashboard (`/admin/dashboard`)

**Features**:
- Quick stats (users, listings, orders, revenue)
- Recent activity feed
- Platform health metrics

```typescript
// app/admin/dashboard/page.tsx
export default async function AdminDashboard() {
  const stats = await fetch('http://localhost:3000/api/admin/dashboard', {
    cache: 'no-store'
  }).then(res => res.json())

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.data.totalUsers}
          icon="👥"
          change="+12%"
        />
        <StatCard
          title="Total Listings"
          value={stats.data.totalListings}
          icon="📦"
          change="+8%"
        />
        <StatCard
          title="Orders"
          value={stats.data.totalOrders}
          icon="🛒"
          change="+15%"
        />
        <StatCard
          title="Revenue"
          value={`$${stats.data.revenue}`}
          icon="💰"
          change="+20%"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RecentActivity />
        <TopListings />
      </div>
    </div>
  )
}
```

#### 11.3.2 User Management (`/admin/users`)

**Features**:
- Browse all users
- Search and filter
- Update user status (ACTIVE/SUSPENDED)
- View user details
- Delete users

```typescript
// app/admin/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { SearchBar, Pagination } from '@/components/admin'

export default function UsersManagement() {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadUsers()
  }, [page])

  const loadUsers = async () => {
    const res = await fetch(`/api/admin/users?page=${page}&limit=20`)
    const data = await res.json()
    setUsers(data.data.items)
    setTotal(data.data.total)
  }

  const handleStatusChange = async (userId, status) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    loadUsers()
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">User Management</h1>

      <SearchBar onSearch={query => {/* search logic */}} />

      <table className="w-full mt-6">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Premium</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <select
                  value={user.status}
                  onChange={(e) => handleStatusChange(user.id, e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </td>
              <td>{user.is_premium ? '✅' : '❌'}</td>
              <td>
                <button>View</button>
                <button>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        page={page}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
```

#### 11.3.3 Content Management (`/admin/content`)

**Features**:
- Edit landing page content
- Manage hero section
- Update feature cards
- Manage carousel images

```typescript
// app/admin/content/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { FeatureCardManager, HeroEditor } from '@/components/admin'

export default function ContentManagement() {
  const [content, setContent] = useState(null)

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    const res = await fetch('/api/landing-content')
    const data = await res.json()
    setContent(data.data)
  }

  const updateHero = async (heroData) => {
    await fetch('/api/admin/content/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heroData)
    })
    loadContent()
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Content Management</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Hero Section</h2>
          <HeroEditor content={content?.hero} onUpdate={updateHero} />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Feature Cards</h2>
          <FeatureCardManager cards={content?.features} />
        </section>
      </div>
    </div>
  )
}
```

### 11.4 Admin API Security

All admin endpoints require admin role:

```typescript
// API route protection
export async function GET(request: Request) {
  const user = await getSessionUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed with admin operation
  // ...
}
```

---

## 12. Deployment Architecture

### 12.1 Web Deployment (Vercel)

#### 12.1.1 Deployment Flow

```
Git Push to GitHub
        ↓
Vercel detects change
        ↓
Checkout code
        ↓
Install dependencies (npm install)
        ↓
Generate Prisma client (npx prisma generate)
        ↓
Build Next.js app (npm run build)
        ↓
Deploy to Vercel Edge Network
        ↓
Deployment complete
        ↓
URL: https://top-care-fashion.vercel.app
```

#### 12.1.2 Vercel Configuration

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Image optimization for Supabase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ilykxrtilsbymlncunua.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Turbopack for faster builds
  experimental: {
    turbopack: true
  }
}

export default nextConfig
```

#### 12.1.3 Environment Variables (Vercel Dashboard)

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_CLOUD_API_KEY=...
```

#### 12.1.4 Build Commands

```json
// package.json
{
  "scripts": {
    "build": "prisma generate && next build --turbopack",
    "start": "next start",
    "dev": "next dev --turbopack"
  }
}
```

### 12.2 Mobile Deployment (Expo EAS)

#### 12.2.1 iOS Build

```bash
# Login to Expo
eas login

# Configure build
cd mobile
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### 12.2.2 Android Build

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

#### 12.2.3 Over-the-Air Updates

```bash
# Publish update without rebuilding
eas update --branch production --message "Bug fixes"
```

**Update Flow**:
```
Developer publishes update
        ↓
Uploaded to Expo servers
        ↓
App checks for updates on launch
        ↓
Downloads new JS bundle
        ↓
Applies update (no app store approval needed)
```

### 12.3 Database Deployment (Supabase)

**Connection Pooling**:
```
Application → PgBouncer → PostgreSQL
```

**Migrations**:
```bash
# Create migration
npx prisma migrate dev --name add_new_feature

# Apply to production
npx prisma migrate deploy
```

### 12.4 CI/CD Pipeline (Optional)

**GitHub Actions** workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: cd web && npm install

      - name: Run tests
        run: cd web && npm test

      - name: Build
        run: cd web && npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 12.5 Monitoring & Logging

**Vercel Analytics**:
- Page views
- Web Vitals
- Error tracking

**Potential Integrations**:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for infrastructure monitoring

---

## 13. Security Architecture

### 13.1 Security Layers

```
┌─────────────────────────────────────┐
│  Application Layer Security         │
│  - Input validation                 │
│  - Output encoding                  │
│  - CSRF protection                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Authentication Layer               │
│  - Supabase Auth                    │
│  - JWT tokens                       │
│  - Email verification               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Authorization Layer                │
│  - Role-based access control        │
│  - Resource ownership checks        │
│  - Permission validation            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Data Layer Security                │
│  - Row-Level Security (RLS)         │
│  - Encrypted connections            │
│  - Parameterized queries            │
└─────────────────────────────────────┘
```

### 13.2 Security Measures

#### 13.2.1 Input Validation

```typescript
// Example: Validate user registration
function validateRegistration(data: any) {
  const errors: string[] = []

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    errors.push('Invalid email format')
  }

  // Password strength
  if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters')
  }

  // Username validation
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
    errors.push('Username must be 3-20 alphanumeric characters')
  }

  return errors
}
```

#### 13.2.2 SQL Injection Prevention

Prisma ORM automatically escapes all inputs:

```typescript
// Safe - Prisma parameterizes queries
const user = await prisma.users.findUnique({
  where: { email: userInput } // Automatically escaped
})
```

#### 13.2.3 XSS Prevention

React automatically escapes output:

```typescript
// Safe - React escapes by default
<div>{userInput}</div>

// Dangerous - only use with trusted input
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

#### 13.2.4 CSRF Protection

Next.js provides built-in CSRF protection for API routes.

#### 13.2.5 HTTPS Enforcement

```typescript
// Vercel automatically enforces HTTPS in production
// Redirect HTTP to HTTPS
export function middleware(request: NextRequest) {
  if (request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`
    )
  }
}
```

#### 13.2.6 Secure Cookies

```typescript
response.cookies.set('auth_token', token, {
  httpOnly: true,        // Not accessible via JavaScript
  secure: true,          // Only sent over HTTPS
  sameSite: 'lax',       // CSRF protection
  maxAge: 60 * 60 * 24 * 7 // 7 days
})
```

#### 13.2.7 Content Security Policy

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}
```

### 13.3 Data Privacy

- User passwords never stored (handled by Supabase)
- Sensitive data encrypted at rest
- GDPR compliant (user data deletion on request)
- Privacy settings for user profiles (likes/follows visibility)

---

## 14. Performance Optimization

### 14.1 Database Optimization

**Indexes**:
- 50+ indexes on frequently queried columns
- Composite indexes for multi-column queries

**Connection Pooling**:
- PgBouncer for connection management
- Reduces database connection overhead

**Query Optimization**:
```typescript
// Bad - N+1 query problem
const listings = await prisma.listings.findMany()
for (const listing of listings) {
  const user = await prisma.users.findUnique({
    where: { id: listing.seller_id }
  }) // N additional queries
}

// Good - Use include
const listings = await prisma.listings.findMany({
  include: { seller: true } // Single query with join
})
```

### 14.2 Frontend Optimization

**Image Optimization**:
```typescript
// Next.js Image component
import Image from 'next/image'

<Image
  src={listing.image_urls[0]}
  alt={listing.name}
  width={300}
  height={400}
  loading="lazy"
  placeholder="blur"
/>
```

**Code Splitting**:
```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>
})
```

**Caching**:
```typescript
// Cache API responses
export async function GET() {
  const listings = await fetchListings()

  return NextResponse.json(listings, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    }
  })
}
```

### 14.3 API Optimization

**Pagination**:
- Limit results per page (default: 20)
- Use cursor-based pagination for large datasets

**Selective Fields**:
```typescript
// Only fetch required fields
const users = await prisma.users.findMany({
  select: {
    id: true,
    username: true,
    avatar_url: true
    // Exclude large fields like bio, description
  }
})
```

**Response Compression**:
- Vercel automatically compresses responses

---

## 15. Scalability Considerations

### 15.1 Current Architecture

- **Serverless Functions**: Auto-scales with Vercel
- **Database**: Supabase handles connection pooling
- **CDN**: Vercel Edge Network for global distribution

### 15.2 Scaling Strategies

**Horizontal Scaling**:
- Serverless functions scale automatically
- Database read replicas (Supabase supports)

**Caching Layers**:
- Add Redis for session storage
- Cache frequently accessed data

**CDN**:
- Already using Vercel Edge Network
- Consider CloudFront for additional regions

**Database Sharding**:
- Shard by user_id for very large datasets
- Currently not needed

---

## 16. Monitoring & Observability

### 16.1 Logging

**Application Logs**:
```typescript
console.log(`[INFO] User ${userId} created listing ${listingId}`)
console.error(`[ERROR] Failed to fetch listings:`, error)
```

**Vercel Logs**:
- Function logs accessible in Vercel dashboard
- Real-time log streaming

### 16.2 Error Tracking

**Potential Integration** (Sentry):
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})

// Capture errors
try {
  // ... code
} catch (error) {
  Sentry.captureException(error)
}
```

### 16.3 Performance Monitoring

**Vercel Analytics**:
- Core Web Vitals
- Page load times
- API response times

---

## 17. Development Workflow

### 17.1 Local Development

```bash
# Clone repository
git clone https://github.com/Atmospenguin/Top-Care-Fashion.git
cd Top-Care-Fashion

# Web development
cd web
npm install
cp .env.example .env.local
# Fill in environment variables
npx prisma generate
npx prisma db push
npm run dev

# Mobile development
cd mobile
npm install
cp .env.example .env.local
npx expo start
```

### 17.2 Git Workflow

```
main (production) ← merge PR
  ↑
development (staging) ← merge feature branches
  ↑
feature/new-feature ← development work
```

### 17.3 Testing Strategy

**Unit Tests**:
```typescript
// web/__tests__/auth.test.ts
import { validateEmail } from '@/lib/utils'

describe('validateEmail', () => {
  it('should validate correct email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('should reject invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

**Integration Tests**:
```typescript
// Test API endpoint
describe('POST /api/auth/signin', () => {
  it('should login user with valid credentials', async () => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.user).toBeDefined()
  })
})
```

### 17.4 Code Review Process

1. Create feature branch
2. Implement changes
3. Write tests
4. Create pull request
5. Code review by team
6. Address feedback
7. Merge to development
8. Test on staging
9. Merge to main (production)

---

## Appendix A: Database Schema Diagram

```
users ───────────────────┐
  │                       │
  ├── listings            │
  │     ├── cart_items    │
  │     └── user_likes    │
  │                       │
  ├── orders              │
  │     ├── (buyer)       │
  │     └── (seller)      │
  │                       │
  ├── messages            │
  │     ├── (sender)      │
  │     └── (receiver)    │
  │                       │
  ├── conversations       │
  ├── notifications       │
  ├── reviews             │
  ├── saved_outfits       │
  ├── user_addresses      │
  ├── user_follows        │
  └── premium_subscriptions
```

---

## Appendix B: API Endpoint Reference

See [Section 6](#6-api-architecture) for complete API documentation.

---

## Appendix C: Technology Versions

```yaml
Runtime:
  Node.js: 18+ LTS

Frontend:
  Next.js: 15.5.2
  React: 19.1.0
  React Native: 0.81.5
  Expo: 54.0.23
  TailwindCSS: 4.0
  TypeScript: 5.9.3

Backend:
  Prisma: 6.19.0
  PostgreSQL: 17.6.1

External Services:
  Supabase: Latest
  Google Cloud Vision: v5.3.4
  Google Generative AI: v0.24.1

Development Tools:
  Vitest: 3.2.4
  ESLint: 9.x
  Prettier: 3.6.2
```

---

## Appendix D: Glossary

- **RLS**: Row-Level Security - Database security feature
- **ORM**: Object-Relational Mapping - Database abstraction layer
- **JWT**: JSON Web Token - Authentication token format
- **RBAC**: Role-Based Access Control - Authorization pattern
- **CDN**: Content Delivery Network - Global content distribution
- **EAS**: Expo Application Services - Mobile build/deployment
- **OTA**: Over-The-Air - Mobile app updates without app store
- **Serverless**: Functions that scale automatically without managing servers