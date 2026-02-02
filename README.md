# [<img src="https://github.com/user-attachments/assets/d94348ad-6089-40e2-a0c9-ebfb2cd787c6" alt="logo_brandcolor" height="42"/>](https://top-care-fashion.vercel.app) Care Fashion

[![Top Care Fashion](https://img.shields.io/badge/Production-Site-F54B3D?style=for-the-badge)](https://top-care-fashion.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)

**A modern AI-powered fashion marketplace platform combining peer-to-peer commerce with  intelligent styling features**

🌐 **[Live Production Site](https://top-care-fashion.vercel.app/)** • [Features](#features) • [Architecture](#architecture) • [Getting Started](#quick-start) • [Documentation](#documentation)

</div>

---

## About

**Top Care Fashion** is a full-stack fashion marketplace that revolutionizes the way users buy, sell, and discover fashion. Built with cutting-edge technologies, it combines traditional e-commerce functionality with AI-powered features to create a unique shopping experience.

> 🌐 **Production Environment**: The application is live and deployed at **[https://top-care-fashion.vercel.app/](https://top-care-fashion.vercel.app/)**

## Click the link below to see the marketing video and demostration made by me

https://drive.google.com/drive/folders/1pFBveWCW8WeDb6JM9T-ureswBHHlxG7A?usp=drive_link

### What Makes It Special

- **AI-Powered Styling**: Leverage Google Cloud Vision and Gemini AI for outfit recommendations, product classification, and content moderation
- **Mix & Match Feature**: Create and save outfit combinations with AI-powered style analysis and recommendations
- **Premium Subscription Model**: Tiered pricing with enhanced features for power users
- **Cross-Platform**: Unified experience across web (Next.js) and mobile (React Native/Expo)
- **Enterprise-Grade Security**: Supabase Auth with Row-Level Security (RLS) on 17 tables
- **Serverless Architecture**: Scalable deployment on Vercel with edge network optimization

---

## Quick Start

### Prerequisites

- **Node.js** 18+ LTS
- **npm** 9+ or **pnpm** 8+
- **Expo CLI** (for mobile development): `npm install -g expo-cli`
- **Supabase Account** (for database and authentication)
- **Google Cloud Account** (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Atmospenguin/Top-Care-Fashion.git
   cd Top-Care-Fashion
   ```

2. **Install dependencies**
   ```bash
   # Web application
   cd web
   npm install

   # Mobile application
   cd ../mobile
   npm install
   ```

3. **Environment setup**

   **Web (.env.local)**
   ```bash
   cd web
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://..."              # Connection pooling URL
   DIRECT_URL="postgresql://..."                # Direct connection for migrations

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

   # Google Cloud AI (optional, for AI features)
   GOOGLE_CLOUD_API_KEY="your-google-api-key"
   ```

   **Mobile (.env.local)**
   ```bash
   cd mobile
   cp .env.example .env.local
   ```

4. **Database setup**
   ```bash
   cd web
   npx prisma generate
   npx prisma db push
   ```

5. **Start development servers**
   ```bash
   # Web (runs on http://localhost:3000)
   cd web
   npm run dev

   # Mobile (runs on Expo Go app)
   cd mobile
   npx expo start
   ```

---

## Architecture

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Tech Stack

#### **Frontend**
- **Web**: Next.js 15.5.2 with App Router (React 19.1.0)
- **Mobile**: React Native 0.81.5 + Expo 54.0.23
- **Styling**: TailwindCSS 4.0 with custom design tokens
- **UI Components**: Geist design system
- **Type System**: TypeScript 5.9.3 (strict mode)

#### **Backend**
- **API**: Next.js API Routes (119 endpoints)
- **ORM**: Prisma 6.19.0
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (email/password, JWT)
- **File Storage**: Supabase Storage (bucket-based)

#### **AI/ML Services**
- **Google Cloud Vision API** (v5.3.4) - Image classification, content safety
- **Google Generative AI (Gemini)** (v0.24.1) - Product descriptions, outfit analysis

#### **Deployment**
- **Web**: Vercel (serverless functions + edge network)
- **Mobile**: Expo EAS Build (iOS + Android)
- **Database**: Supabase PostgreSQL with connection pooling
- **CDN**: Vercel Edge Network

### Project Structure

```
Top-Care-Fashion/
├── web/                           # Next.js web application
│   ├── src/
│   │   ├── app/                  # Next.js 15 App Router
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── signin/           # Authentication pages
│   │   │   ├── register/
│   │   │   ├── profile/          # User profiles
│   │   │   ├── admin/            # Admin dashboard (13 sections)
│   │   │   └── api/              # API routes (119 endpoints)
│   │   │       ├── auth/         # Authentication APIs
│   │   │       ├── listings/     # Product catalog APIs
│   │   │       ├── orders/       # Order management
│   │   │       ├── ai/           # AI service integration
│   │   │       ├── messages/     # Messaging system
│   │   │       └── admin/        # Admin-only endpoints
│   │   ├── components/           # React components
│   │   ├── lib/                  # Utilities (auth, db, permissions)
│   │   └── types/                # TypeScript definitions
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (40+ models)
│   │   └── migrations/           # Database migrations
│   ├── public/                   # Static assets
│   ├── next.config.ts            # Next.js configuration
│   └── package.json              # Dependencies
│
├── mobile/                        # React Native mobile app
│   ├── App.tsx                   # Main entry (navigation setup)
│   ├── screens/
│   │   ├── auth/                 # Auth screens (login, register, etc.)
│   │   └── main/                 # Main app screens
│   │       ├── HomeStack/        # Home feed
│   │       ├── DiscoverStack/    # Product discovery
│   │       ├── BuyStack/         # Shopping/purchases
│   │       ├── SellStack/        # Listing management
│   │       ├── InboxStack/       # Messages & notifications
│   │       └── MyTopStack/       # User profile
│   ├── src/
│   │   ├── services/             # API integration (25+ services)
│   │   ├── config/               # App configuration
│   │   └── hooks/                # Custom React hooks
│   ├── app.json                  # Expo configuration
│   ├── eas.json                  # EAS Build config
│   └── package.json              # Dependencies
│
└── docs/                          # Documentation
    ├── ARCHITECTURE.md            # Detailed architecture docs
    ├── TEST_ACCOUNTS.md           # Test user credentials
    └── Plans & Pricing.md         # Subscription details
```

### Architecture Pattern

**Monolithic Architecture with Separation of Concerns**

- **Client-Server Model**: Clear frontend/backend separation
- **API-First Design**: RESTful APIs for all operations
- **Serverless Functions**: Vercel-deployed Next.js API routes
- **Layered Architecture**: Presentation → API → Business Logic → Data Access

---

## Features

### E-Commerce Core

#### Product Marketplace
- Browse and search products with advanced filters
- Multi-category hierarchical classification
- Product condition ratings (NEW, LIKE_NEW, GOOD, FAIR, POOR)
- Multiple image uploads per listing
- Inventory management
- Shopping cart with multi-item checkout

#### Order Management
- Complete order lifecycle (8 status states)
- Order tracking for buyers and sellers
- Commission-based transactions
- Multiple payment methods support
- Shipping address management

### AI-Powered Features

#### Mix & Match Outfit Builder
- Create outfit combinations from marketplace items
- AI-powered outfit rating and analysis
- Style tips and recommendations
- Color harmony scoring
- Vibe suggestions (casual, formal, streetwear, etc.)
- Save and share outfit collections

#### Product Intelligence
- **AI Classification**: Automatic category detection from images
- **AI Descriptions**: Auto-generate product descriptions
- **Content Safety**: NSFW detection and moderation
- **Style Analysis**: Fashion trend and compatibility insights

### Social Features

- User profiles with bio, location, preferences
- Follow/follower system with visibility controls
- Like and favorite products
- User reviews and ratings (bilateral: buyer ↔ seller)
- Seller badges (standard and premium)
- Real-time messaging between users
- Activity feeds and notifications

### Premium Subscription

Three subscription tiers with enhanced features:

| Feature | Free | Premium |
|---------|------|---------|
| Monthly Listings | 2 | Unlimited |
| Mix & Match Uses | 3/month | Unlimited |
| Commission Rate | 10% | 5% |
| Promotion Discount | 0% | 30% off |
| Monthly Credits | $0 | Free promotion |
| Seller Badge | Standard | Premium |

**Pricing**:
- Monthly: $6.90/mo
- Quarterly: $18.90 ($6.30/mo)
- Annual: $59.90 ($4.99/mo)

### Notifications & Messaging

- Push notifications (mobile via Expo)
- In-app notification center
- Real-time chat conversations
- Message types: TEXT, IMAGE, SYSTEM
- Unread message counters
- Conversation status (ACTIVE, ARCHIVED, DELETED)

### Admin Dashboard

Comprehensive admin panel with 13 management sections:

1. **Dashboard** - Platform analytics and quick stats
2. **User Management** - User accounts, status, permissions
3. **Listing Management** - Product moderation and visibility
4. **Image Library** - Asset management
5. **Conversations** - Platform messaging oversight
6. **Support Tickets** - Customer support management
7. **Categories** - Category and subcategory management
8. **Feedback** - Testimonial moderation
9. **FAQ Management** - Help center content
10. **Promotions** - Boost campaigns and analytics
11. **Reports** - Content abuse and user reports
12. **Statistics** - Platform-wide metrics
13. **Content Management** - Landing page CMS

---

## Database

For complete database documentation, see [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)

### Database Overview

- **Database Type**: PostgreSQL 17.6.1
- **ORM**: Prisma 6.19.0
- **Platform**: Supabase
- **Region**: ap-southeast-1
- **Connection**: Connection pooling via PgBouncer

### Database Statistics

- **Total Tables**: 28 tables (27 business tables + 1 system table)
- **Main Business Tables**: 27 tables
- **Prisma Models**: 27 models
- **Enum Types**: 19 enum types (15 actively used, 4 potentially unused)
- **Total Indexes**: 148 indexes (27 primary keys + 121 functional indexes)
- **Functional Indexes**: 121 indexes (25 unique indexes + 96 regular indexes)
- **Unique Indexes**: 52 indexes (27 primary keys + 25 unique constraint indexes)
- **Unique Constraints**: 35 constraints (27 primary keys + 8 unique constraints)
- **Foreign Keys**: Comprehensive referential integrity
- **JSON Fields**: 10+ JSON columns for flexible data storage

### Schema Overview

The database consists of **27 Prisma models** organized into logical domains:

#### Core Commerce Models
- **users** (31 fields) - User accounts, authentication, preferences, premium status, visibility settings
- **listings** (30 fields) - Product catalog with images, analytics, condition ratings, inventory management
- **listing_categories** (12 fields) - Hierarchical categories with AI keywords, slug support, parent-child relationships
- **orders** (20 fields) - Complete order lifecycle with 8 status states, commission tracking, payment integration
- **transactions** (10 fields) - Payment processing records with status workflow
- **cart_items** (6 fields) - Shopping cart storage with unique user-listing constraints

#### User Management & Profiles
- **user_addresses** (14 fields) - Shipping addresses with type classification, default address support
- **user_payment_methods** (11 fields) - Stored payment options with card metadata (last4, expiry)
- **user_follows** (4 fields) - Social graph (followers/following) with unique constraints
- **user_likes** (4 fields) - Favorited listings with timestamp tracking
- **saved_outfits** (16 fields) - Mix & Match outfit collections with AI ratings, color harmony, style tips
- **premium_subscriptions** (9 fields) - Subscription tracking with duration, status, expiration dates

#### Communication & Social
- **conversations** (9 fields) - Chat threads between users with type classification (ORDER/SUPPORT/GENERAL)
- **messages** (9 fields) - Individual messages with read status, idempotency keys, type support (TEXT/IMAGE/SYSTEM)
- **notifications** (13 fields) - Push and system notifications with read status, related entities
- **reviews** (12 fields) - Bilateral user ratings and feedback (buyer ↔ seller) with images support

#### Commerce Features
- **listing_promotions** (15 fields) - Boost campaigns with analytics (views, clicks, uplift percentages)
- **pricing_plans** (18 fields) - Subscription plan definitions with monthly/quarterly/annual pricing
- **listing_clicks** (5 fields) - Detailed click tracking with 10-second bucket aggregation
- **listing_stats_daily** (8 fields) - Daily aggregated metrics (views, likes, clicks) per listing

#### Content & Support
- **faq** (9 fields) - Frequently asked questions with categories, public/private visibility
- **feedback** (15 fields) - Customer testimonials with ratings, tags, priority, status workflow
- **landing_content** (15 fields) - CMS for landing page (singleton table with hero, features, carousel images)
- **reports** (9 fields) - Content/user abuse reports with status tracking (OPEN/RESOLVED/DISMISSED)
- **site_stats** (6 fields) - Platform-wide statistics (singleton table with aggregated metrics)
- **releases** (10 fields) - Mobile app version management with platform support (iOS/Android)
- **brand_mappings** (5 fields) - Brand name mapping for standardizing user-provided brand names

#### Special Tables

### Database Features

#### Indexing Strategy
- **Total Indexes**: 141 indexes (29 primary keys + 112 functional indexes)
- **Foreign Key Indexes**: All foreign keys indexed for optimal join performance
- **Unique Indexes**: 49 indexes (29 primary keys + 20 unique constraints)
- **Composite Indexes**: Multi-field indexes (user_id + listing_id, listing_id + date)
- **GIN Indexes**: JSONB field indexes (listings.tags, users.preferred_styles, users.preferred_brands) for full-text search
- **Time-based Indexes**: Created_at, updated_at indexes for time-range queries
- **Partial Indexes**: Conditional indexes (e.g., active listings, paid promotions)

#### Data Integrity
- **Foreign Key Constraints**: Cascading deletes for related data, RESTRICT for critical records
- **Unique Constraints**: Username, email, cart items, follows, likes, conversations
- **Check Constraints**: Enum validation, status state validation
- **Default Values**: Timestamps, counters, status defaults

#### Advanced Features
- **JSON Columns**: Flexible schema for preferences, tags, images, payment details, features
- **PostgreSQL Enums**: Type-safe enums (Gender, UserRole, OrderStatus, ConditionType, etc.)
- **Row-Level Security (RLS)**: Enabled on 17 tables for data isolation and access control
- **Timestamps**: Created_at and updated_at on all tables for audit trails
- **Soft Deletes**: Status-based soft deletes (ARCHIVED, DELETED) for conversations
- **Aggregation Support**: Daily stats tables for performance optimization

#### Key Relationships
- **Users** → 17+ one-to-many relationships (listings, orders, reviews, messages, etc.)
- **Listings** → 10+ relationships (category, seller, promotions, stats, outfits)
- **Orders** → Multiple relationships (buyer, seller, listing, payment method, reviews)
- **Hierarchical Categories** → Self-referential parent-child relationships

### Database Migration

Database migrations are managed via Prisma Migrate:

```bash
# Generate Prisma Client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Database GUI
npx prisma studio
```

Migration files are located in `web/prisma/migrations/` with versioned SQL files.


---

## Development

### Web Development

```bash
cd web

# Development server with Turbopack
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Database operations
npx prisma studio              # Database GUI
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema changes
npx prisma migrate dev         # Create migration
```

### Mobile Development

```bash
cd mobile

# Start Expo development server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Build for production
eas build --platform ios
eas build --platform android
eas build --platform all
```

### Testing

```bash
# Web tests (Vitest)
cd web
npm run test

# Mobile tests
cd mobile
npm run test
```

---

## API Documentation

The platform exposes **119 REST API endpoints** organized by feature domain.

### Key Endpoint Categories

#### Authentication (`/api/auth/`)
- User registration with email verification
- Login/logout with JWT tokens
- Password reset and change
- Email verification resend
- Username/email availability check

#### Listings (`/api/listings/`)
- Browse products with filters (price, size, condition, brand, category)
- Create, update, delete listings
- Upload product images
- Promote/boost listings
- Track clicks and views

#### Orders (`/api/orders/`)
- Create and manage orders
- Order status updates (8 states)
- Order history for buyers/sellers
- Review submission and retrieval

#### AI Features (`/api/ai/`)
- Product classification from images
- Auto-generate descriptions
- Content safety checking (NSFW detection)

#### Messaging (`/api/messages/`, `/api/conversations/`)
- Create conversations
- Send/receive messages
- Mark messages as read
- Conversation management

#### Social (`/api/likes/`, `/api/users/`)
- Like/unlike products
- Follow/unfollow users
- User search and discovery

#### Admin (`/api/admin/`)
- Dashboard statistics
- User management
- Listing moderation
- Transaction oversight
- Content management

For complete API documentation, see [ARCHITECTURE.md](docs/ARCHITECTURE.md#7-api-structure--endpoints).

---

## Security

### Authentication & Authorization

- **Supabase Auth** - Industry-standard authentication service
- **JWT Tokens** - Secure session management
- **Row-Level Security (RLS)** - Database-level access control on 17 tables (user data, conversations, messages, notifications, etc.)
- **Role-Based Access Control (RBAC)** - USER vs ADMIN roles
- **Email Verification** - Required before account activation

### Security Measures

- **Input Validation** - All API endpoints validate input
- **SQL Injection Prevention** - Prisma ORM parameterized queries
- **XSS Protection** - React escapes output by default
- **CSRF Protection** - Built into Next.js framework
- **HTTPS Enforcement** - All production traffic encrypted
- **Environment Variables** - Secrets never committed to git
- **Secure Cookies** - httpOnly, secure, sameSite flags
- **Content Moderation** - AI-powered NSFW detection
- **Rate Limiting** - Can be added at API gateway level

---

## Deployment

### Web Application

**Platform**: Vercel

> 🌐 **Production URL**: **[https://top-care-fashion.vercel.app/](https://top-care-fashion.vercel.app/)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd web
vercel --prod
```

**Environment Variables** (configure in Vercel dashboard):
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct database connection
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase instance URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `GOOGLE_CLOUD_API_KEY` - Google Cloud API key (optional)

### Mobile Application

**Platform**: Expo EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
cd mobile
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

```

**Over-the-Air Updates**:
```bash
eas update --branch production
```

---

## Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Comprehensive architecture documentation
- **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - Complete database structure documentation
- **[Test Accounts](./docs/TEST_ACCOUNTS.md)** - Sample user credentials for testing
- **[Plans & Pricing](./docs/Plans%20&%20Pricing.md)** - Subscription tier details
- **[Functional Hierarchy](./docs/Functional%20Hierarchy.txt)** - Feature breakdown

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript strict mode conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Run linting before committing: `npm run lint`
- Ensure all tests pass: `npm run test`

---

## Known Issues

- Mobile app may require clearing Expo cache if dependencies change
- Some AI features require Google Cloud API key
- Premium subscription payments are implemented but may need payment gateway integration

---

## License

This project is proprietary software. All rights reserved.

---

## Brand Guidelines

### Colors
- **Primary**: #F54B3D (Vibrant Red)
- **Text**: #1A1A1A (Dark Gray)
- **Background**: #FFFFFF (White)
- **Accent**: #F54B3D variants

### Typography
- **Font Family**: Geist (system font fallback)
- **Headings**: Geist Bold
- **Body**: Geist Regular

### Logo Assets
Available in multiple formats:
- SVG (brand color, white, icon-only)
- PNG (multiple sizes)
- Location: `public/` directory

---

## Acknowledgments

- **Next.js Team** - For the incredible React framework
- **Vercel** - For seamless deployment platform
- **Supabase** - For backend infrastructure
- **Expo** - For simplifying React Native development
- **Google Cloud** - For AI/ML services
- **Prisma** - For the excellent ORM

---

## Project Stats

- **Total API Endpoints**: 119
- **Database Models**: 27 main business models
- **Database Tables**: 28 total (27 business + 1 system)
- **Enum Types**: 19 enum types (15 actively used)
- **Database Indexes**: 148 total (121 functional + 27 primary keys)
- **Frontend Components**: 100+
- **Lines of Code**: 118785 total
- **Supported Platforms**: Web, iOS, Android
- **Languages**: TypeScript, JavaScript, SQL
- **Development Time**: 2 months and 15 days

---

<div align="center">


[Back to Top](#top-care-fashion)

</div>
