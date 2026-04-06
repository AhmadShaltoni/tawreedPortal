@AGENTS.md

---

# 🧠 توريد (Tawreed) - B2B Grocery Marketplace

> **The Brain of the Project** - This document is the central source of truth for understanding, developing, and maintaining the Tawreed platform.

---

## 1. 📋 Project Vision

### What is Tawreed?

Tawreed (توريد) is a **B2B curated marketplace platform** designed specifically for the grocery industry, connecting:

- **Grocery Store Owners (Buyers)** - Small to medium retailers who browse and purchase products
- **Wholesale Distributors (Suppliers)** - Large distributors who list and sell products in bulk
- **Super Admin** - Platform administrators who manage products, categories, users, and orders

### The Problem We Solve

Traditional B2B procurement in the grocery sector is:
- Fragmented across multiple platforms
- Lacks quality control and curation
- Poor user experience and mobile support
- No centralized management system

### Our Solution

Tawreed provides:
1. **Curated Product Catalog** - Admin-managed products with categories
2. **Mobile-First Shopping** - Complete mobile app support via API
3. **Streamlined Ordering** - Direct purchase without RFQ complexity
4. **Comprehensive Management** - Full admin dashboard for platform control

### Product Categories

- Sugar
- Rice
- Candy & Snacks
- Dairy Products
- Beverages
- Canned Goods
- Cooking Oil
- Flour & Grains
- Spices
- Cleaning Products
- Personal Care
- Other

---

## 2. 🏗️ Architecture Decisions

### Why Next.js (App Router)?

- **Server Components** - Reduced client-side JavaScript, better performance
- **Server Actions** - Simplified backend logic without separate API layer
- **Built-in Auth** - Seamless integration with NextAuth
- **TypeScript First** - End-to-end type safety
- **SEO Friendly** - Server-side rendering for landing pages

### Why Prisma ORM?

- **Type Safety** - Generated types from schema
- **Migration System** - Version-controlled database changes
- **Developer Experience** - Intuitive query API
- **PostgreSQL Support** - Robust, scalable relational database

### Why NextAuth (Auth.js)?

- **Session Management** - JWT-based, scalable authentication
- **Role-Based Access** - Easy to implement buyer/supplier roles
- **Secure by Default** - Built-in CSRF protection, secure cookies
- **Extensible** - Can add OAuth providers later

### Why Tailwind CSS?

- **Utility-First** - Rapid UI development
- **Consistent Design** - Design tokens via CSS variables
- **Mobile-First** - Easy responsive design
- **Tree Shaking** - Only ships used styles

### Package Dependencies

```json
{
  "frameworks": {
    "next": "16.2.1",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "database": {
    "@prisma/client": "5.22.0",
    "prisma": "5.22.0"
  },
  "auth": {
    "next-auth": "5.0.0-beta.30",
    "@auth/prisma-adapter": "2.11.1"
  },
  "ui": {
    "tailwindcss": "4",
    "lucide-react": "1.7.0"
  },
  "utilities": {
    "zod": "4.3.6",
    "bcryptjs": "3.0.3",
    "clsx": "2.1.1"
  }
}
```

---

## 3. 📁 Folder Structure Explanation

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth handlers
│   │   └── v1/            # Mobile API endpoints (JWT auth)
│   │       ├── auth/      # Mobile authentication
│   │       ├── products/  # Product CRUD
│   │       ├── categories/# Category management
│   │       ├── cart/      # Shopping cart
│   │       ├── orders/    # Order management
│   │       └── notifications/ # Push notifications
│   ├── admin/             # Super Admin dashboard (12 pages)
│   │   ├── categories/    # Category management
│   │   ├── products/      # Product management
│   │   ├── orders/        # Order oversight
│   │   └── users/         # User management
│   ├── buyer/             # Buyer dashboard & pages
│   ├── supplier/          # Supplier dashboard & pages
│   ├── login/             # Authentication pages
│   ├── register/
│   ├── globals.css        # Global styles & design tokens
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
│
├── actions/               # Server Actions (business logic)
│   ├── auth.ts           # Register, login, logout
│   ├── products.ts       # Product CRUD operations
│   ├── categories.ts     # Category management
│   ├── admin-orders.ts   # Admin order management
│   ├── users.ts          # User management
│   ├── requests.ts       # Create, get, cancel requests
│   ├── offers.ts         # Create, accept, reject offers
│   ├── orders.ts         # Order management
│   └── dashboard.ts      # Stats & notifications
│
├── components/            # Reusable UI components
│   ├── layout/           # Header, Footer, Sidebar, UserMenu
│   └── ui/               # Button, Input, Card, Badge, etc.
│
├── lib/                   # Core utilities & configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client singleton
│   ├── i18n.ts           # Internationalization handler
│   ├── LanguageContext.tsx # Language context provider
│   ├── utils.ts          # Helper functions
│   ├── validations.ts    # Zod schemas
│   └── translations/     # Translation files
│       ├── ar.ts         # Arabic translations (default)
│       └── en.ts         # English translations
│
├── prisma/                # Database layer
│   └── schema.prisma     # Database schema
│
├── types/                 # TypeScript type definitions
│   └── index.ts          # All types, enums, labels
│
└── public/               # Static assets
```

### Key Design Principle

**Separation of Concerns:**
- `app/` - Routes and page components (UI)
- `actions/` - Business logic (Server Actions)
- `components/` - Reusable UI building blocks
- `lib/` - Configuration and utilities
- `prisma/` - Database schema and migrations

---

## 4. 📐 Coding Standards

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files (components) | PascalCase | `Button.tsx`, `UserMenu.tsx` |
| Files (utilities) | camelCase | `utils.ts`, `validations.ts` |
| Files (pages) | lowercase | `page.tsx`, `layout.tsx` |
| Components | PascalCase | `export function Button()` |
| Functions | camelCase | `async function createRequest()` |
| Server Actions | camelCase | `export async function loginUser()` |
| Types/Interfaces | PascalCase | `interface RequestWithRelations` |
| Enums | SCREAMING_SNAKE | `enum RequestStatus { OPEN }` |
| Constants | SCREAMING_SNAKE | `const CATEGORY_LABELS` |
| CSS classes | kebab-case | Handled by Tailwind |

### Component Structure

```tsx
// 1. Imports (external first, then internal)
import { useState } from 'react'
import { Button } from '@/components/ui'

// 2. Types/Interfaces
interface Props {
  title: string
}

// 3. Component
export function MyComponent({ title }: Props) {
  // 3a. Hooks
  const [state, setState] = useState()
  
  // 3b. Handlers
  const handleClick = () => {}
  
  // 3c. Render
  return <div>{title}</div>
}
```

### Server Actions Pattern

```tsx
'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { schema } from '@/lib/validations'
import type { ActionResponse } from '@/types'

export async function myAction(formData: FormData): Promise<ActionResponse> {
  // 1. Get current user
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Not authenticated' }
  
  // 2. Validate input
  const validated = schema.safeParse(Object.fromEntries(formData))
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors }
  }
  
  // 3. Business logic
  // 4. Return result
  return { success: true }
}
```

### State Management

- **Server State** - Fetched in Server Components, passed as props
- **Form State** - Managed with React hooks (`useState`, `useActionState`)
- **UI State** - Local component state
- **No global state library** - Keep it simple for MVP

---

## 5. 🎨 UI System

### Color Palette

```css
/* Primary colors - Deep Blue */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;  /* Main brand color */

/* Secondary colors - Orange */
--secondary-400: #fb923c;
--secondary-500: #f97316;  /* Accent color */
--secondary-600: #ea580c;

/* Background */
--background: #f9fafb;     /* Light gray */
--foreground: #111827;
--card-background: #ffffff;
```

### Typography

#### Font Families

| Font | Purpose | Usage |
|------|---------|-------|
| **Rubik** | Arabic text | Body text, headings (RTL-optimized) |
| **Zain** | Logo only | Brand name (weight: 800) |
| **Geist Sans** | English text | System fallback for Latin characters |
| **Geist Mono** | Code | Monospace content |

#### Font Classes

```css
.font-arabic {
  font-family: "Rubik", system-ui, sans-serif;
}

.font-zain-logo {
  font-family: "Zain", system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.font-zain-title {
  font-family: "Rubik", system-ui, sans-serif;
  font-weight: 500;
}

.font-zain-regular {
  font-family: "Rubik", system-ui, sans-serif;
  font-weight: 400;
}
```

#### Heading Sizes

```
h1: text-2xl to text-4xl, font-bold
h2: text-lg to text-xl, font-semibold
h3: text-base, font-medium
body: text-base or text-sm
small: text-xs or text-sm, text-gray-500
```

### Spacing

- Use Tailwind's spacing scale (4, 6, 8, 12, 16, etc.)
- Consistent padding: `p-4` to `p-6` for cards
- Section gaps: `space-y-6` or `gap-6`

### Components

| Component | Purpose |
|-----------|---------|
| Button | Actions (primary, secondary, outline, ghost, danger) |
| Input | Text input with label and error |
| Select | Dropdown selection |
| Textarea | Multi-line input |
| Card | Content container (CardHeader, CardContent, CardFooter) |
| Badge | Status indicators |
| StatusBadge | Predefined status colors |
| LanguageToggle | Language switcher (AR/EN) with Globe icon |

### Layout Components

| Component | Purpose |
|-----------|---------|
| Header | Server component, fetches session |
| HeaderClient | Navigation, logo, auth buttons, language toggle |
| Sidebar | Role-specific navigation |
| Footer | Brand info, quick links, contact |
| UserMenu | Dropdown with dashboard, profile, logout |

#### Header Layout Structure

```tsx
<header>
  <div className="flex items-center h-16">
    {/* Logo & Navigation Group - Always together */}
    <div className="flex items-center gap-8">
      <Logo />
      <Navigation />  {/* Features, How It Works, About */}
    </div>
    
    {/* Auth & Language - Pushed to end */}
    <div className="ms-auto">
      <LanguageToggle />
      <AuthButtons /> {/* or UserMenu if logged in */}
    </div>
  </div>
</header>
```

### Landing Page Components

| Component | Location | Purpose |
|-----------|----------|---------|
| LandingContent | `/components/LandingContent.tsx` | Main landing page content |
| CountUpNumber | Inside LandingContent | Animated number counter with IntersectionObserver |

#### CountUpNumber Animation

```tsx
// Animated counting numbers with visibility detection
function CountUpNumber({ value, duration = 3000 }: { value: string; duration?: number }) {
  // Uses IntersectionObserver to start animation when visible
  // Resets and replays when user scrolls away and back
  // Supports formats: "472+", "12,000+"
  // Uses easeOutQuart for smooth animation
}
```

### Form Components (Page-Specific)

| Component | Location | Purpose |
|-----------|----------|---------|
| SubmitOfferForm | `/app/supplier/requests/[id]/` | Supplier submits offer with pricing |
| OfferActions | `/app/buyer/requests/[id]/` | Accept/Reject offer buttons |
| UpdateOrderStatusForm | `/app/supplier/orders/[id]/` | Update order status dropdown |

---

## 6. 🗄️ Database Schema Explanation

### Entity Relationship

```
# Curated Marketplace Schema
User (1) ─────< (N) Order (as buyer)
User (1) ─────< (N) Order (as supplier)
User (1) ─────< (N) CartItem
User (1) ─────< (N) Notification

Category (1) ──< (N) Product
Product (1) ───< (N) CartItem
Product (1) ───< (N) OrderItem

Order (1) ─────< (N) OrderItem

# Legacy RFQ System (Still Supported)
User (1) ─────< (N) Request
User (1) ─────< (N) Offer
Request (1) ───< (N) Offer
Request (1) ───< (1) Order
Offer (1) ─────< (1) Order
```

### Core Ecommerce Models

#### Category
- Admin-managed product categories
- Hierarchical structure with `sortOrder`
- Bilingual names (Arabic/English)
- Slug for URL-friendly routing

#### Product
- Admin-curated product catalog
- Pricing, inventory, and specifications
- Image support and status management
- Connected to categories and suppliers

#### CartItem
- User shopping cart functionality
- Quantity management
- Automatic total calculation

#### OrderItem
- Individual items within orders
- Snapshot of product details at time of purchase
- Quantity and pricing preserved

### Enhanced Models

#### User
- Central entity for authentication
- `role`: BUYER | SUPPLIER | ADMIN
- Contains business information (name, address, city)
- Enhanced with admin role for platform management

#### Order (Enhanced)
- Now supports both direct purchases and RFQ-based orders
- Enhanced status tracking with history
- Supports multiple order items
- Admin oversight capabilities

#### Notification (Enhanced)
- Extended types: ORDER_UPDATE, NEW_ORDER, ORDER_STATUS_CHANGE, SYSTEM
- Mobile push notification support
- Enhanced linking system

### Legacy RFQ Models (Still Supported)

#### Request (RFQ)
- Legacy system for custom quotations
- Still functional for complex B2B negotiations
- Status workflow: OPEN → IN_PROGRESS → CLOSED/CANCELLED/EXPIRED

#### Offer
- Supplier responses to RFQ requests
- Status: PENDING → ACCEPTED/REJECTED/WITHDRAWN/EXPIRED
- Creates Order when accepted

---

## 7. ✨ Feature Breakdown

### Authentication Flow (Enhanced)

1. **Web Registration** (`/register`)
   - Choose role (Buyer/Supplier)
   - Provide personal & business information
   - Password hashed with bcrypt
   - Session-based authentication

2. **Mobile Authentication** (`/api/v1/auth`)
   - JWT token-based for mobile apps
   - Refresh token support
   - Device registration

3. **Admin Access**
   - Super Admin role with full platform control
   - Admin login: admin@tawreed.jo / Admin@123

### Super Admin Flow (NEW)

1. **Admin Dashboard** (`/admin`)
   - Platform overview statistics
   - Revenue analytics with JOD formatting
   - User activity monitoring

2. **Product Management** (`/admin/products`)
   - Create, edit, delete products
   - Inventory management
   - Image upload and processing
   - Bulk operations

3. **Category Management** (`/admin/categories`)
   - Hierarchical category structure
   - Drag-and-drop reordering
   - Bilingual name support

4. **Order Oversight** (`/admin/orders`)
   - Monitor all platform orders
   - Status management and updates
   - Customer service tools

5. **User Management** (`/admin/users`)
   - User verification and approval
   - Role management
   - Account suspension/activation

### Mobile API Support (NEW)

1. **Product Catalog** (`/api/v1/products`)
   - RESTful product browsing
   - Category filtering
   - Search and pagination

2. **Shopping Cart** (`/api/v1/cart`)
   - Add/remove items
   - Quantity updates
   - Cart persistence

3. **Order Processing** (`/api/v1/orders`)
   - Place orders directly
   - Order tracking
   - Status notifications

4. **Push Notifications** (`/api/v1/notifications`)
   - Real-time order updates
   - System announcements
   - Marketing messages

### Enhanced Buyer Flow

1. **Product Browsing** (NEW)
   - Browse curated product catalog
   - Category-based navigation
   - Search and filter products
   - Add to cart functionality

2. **Direct Ordering** (NEW)
   - Shopping cart experience
   - Instant checkout
   - Order confirmation

3. **Legacy RFQ Support**
   - Still supports custom quotation requests
   - For complex or custom orders
   - Maintains existing workflow

### Enhanced Supplier Flow

1. **Product Listing** (NEW)
   - List products in admin-managed catalog
   - Inventory updates
   - Pricing management

2. **Order Fulfillment** (NEW)
   - Receive direct orders from buyers
   - Update order status
   - Shipping coordination

3. **Legacy RFQ Support**
   - Continue responding to RFQ requests
   - Maintain existing quotation workflow

### Enhanced Notification System

- Mobile push notification support
- Real-time order status updates
- Admin system announcements
- Multi-channel delivery (web + mobile)
- Notification preferences management

---

## 8. 🚀 Future Improvements

### Short Term (Phase 2) - Enhancement

1. **Advanced Search & Filtering**
   - Elasticsearch integration
   - Advanced product filters
   - Saved searches and alerts

2. **Enhanced Admin Features**
   - Bulk product import/export
   - Advanced analytics dashboard
   - User behavior insights

3. **Mobile App Development**
   - React Native implementation
   - Leverage existing API infrastructure
   - Offline cart functionality

### Medium Term (Phase 3) - Expansion

1. **Payment Integration**
   - JOD payment processing
   - Invoice generation
   - Credit terms for verified buyers

2. **Advanced E-commerce Features**
   - Product recommendations
   - Wishlist functionality
   - Bulk ordering tools

3. **Supplier Tools**
   - Inventory management dashboard
   - Sales analytics
   - Automated reordering

### Long Term (Phase 4) - Scale

1. **AI & Machine Learning**
   - Demand forecasting
   - Dynamic pricing
   - Product matching algorithms

2. **Logistics Integration**
   - Third-party delivery services
   - Route optimization
   - Warehouse management

3. **Regional Expansion**
   - Multi-currency support
   - Regional supplier networks
   - Localized payment methods

4. **Enterprise Features**
   - White-label solutions
   - API marketplace
   - B2B integrations (ERP, POS systems)

---

## 9. 🔧 Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm/pnpm/yarn

### Environment Variables

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/souq?schema=public"
AUTH_SECRET="your-secret-key-min-32-chars"
AUTH_URL="http://localhost:3000"
```

### Commands

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 10. 🌐 Internationalization (i18n)

### Supported Languages

| Language | Code | Direction | Status |
|----------|------|-----------|--------|
| Arabic | `ar` | RTL | Default |
| English | `en` | LTR | Supported |

### Folder Structure

```
lib/
├── i18n.ts                # Core i18n utilities & types
├── LanguageContext.tsx    # React context for language state
└── translations/
    ├── ar.ts              # Arabic translations (default)
    └── en.ts              # English translations
```

### How Translation Works

1. **Translation Files** (`lib/translations/ar.ts`, `lib/translations/en.ts`)
   - Export an object with nested keys for each section
   - Arabic is the primary file that defines the TypeScript types
   - English imports the type from Arabic to ensure consistency

2. **i18n Handler** (`lib/i18n.ts`)
   - Exports `getTranslations(lang)` function
   - Exports `getDirection(lang)` for RTL/LTR
   - Exports `interpolate()` for variable substitution

3. **Language Context** (`lib/LanguageContext.tsx`)
   - Provides `useLanguage()` hook for components
   - Returns: `{ lang, setLang, dir, t, toggleLanguage }`
   - Persists language choice in localStorage

### Usage in Components

```tsx
'use client'

import { useLanguage } from '@/lib/LanguageContext'

export function MyComponent() {
  const { t, dir } = useLanguage()

  return (
    <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
      <h1>{t.nav.dashboard}</h1>
      <p>{t.common.loading}</p>
    </div>
  )
}
```

### Adding New Translations

1. Add the key to `lib/translations/ar.ts`:
   ```ts
   export const ar = {
     mySection: {
       newKey: 'النص العربي',
     },
   }
   ```

2. Add the same key to `lib/translations/en.ts`:
   ```ts
   export const en: TranslationKeys = {
     mySection: {
       newKey: 'English text',
     },
   }
   ```

### Adding New Languages

1. Create new file: `lib/translations/fr.ts` (for French)
2. Import the type from Arabic: `import type { TranslationKeys } from './ar'`
3. Export the translations: `export const fr: TranslationKeys = { ... }`
4. Register in `lib/i18n.ts`:
   ```ts
   import { fr } from './translations/fr'
   export const translations = { ar, en, fr }
   ```
5. Add to `languages` array in `lib/i18n.ts`

### RTL/LTR Handling

- **Root Layout**: Sets `dir` and `lang` attributes on `<html>`
- **Components**: Use `dir` from `useLanguage()` for conditional styling
- **CSS Classes**: Use conditional classes like:
  ```tsx
  className={`flex ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
  ```
- **Icons**: Some icons need flipping in RTL:
  ```tsx
  <ArrowRight className={dir === 'rtl' ? 'rtl-flip' : ''} />
  ```

### Important Rules

1. **Never hardcode UI text** - Always use translation keys
2. **Always test both languages** - Especially for RTL layout
3. **Keep translations organized** - Group by feature/page
4. **Use interpolation for variables**:
   ```ts
   // In translation file
   greeting: 'Hello {name}!'
   
   // In component
   import { interpolate } from '@/lib/i18n'
   interpolate(t.greeting, { name: 'User' })
   ```

---

## 11. 📝 Update Log

| Date | Changes |
|------|---------|
| Initial | Project setup, database schema, authentication, buyer/supplier flows, dashboards (RFQ-based) |
| i18n Update | Rebranded from "Souq" to "توريد" (Tawreed), added Arabic/English i18n support, RTL/LTR handling, language toggle |
| Header Update | Grouped Logo and Navigation together (not centered), Navigation appears after Logo in both RTL/LTR |
| Mobile UI Update | Stats section now visible on mobile as separate section below Hero with glassmorphism design, Header not sticky anymore, "Get Started" button smaller on mobile, Sign In button hidden on mobile, Footer phone number RTL alignment fix |
| Deployment Update | Added `prisma generate` to build script and postinstall for Netlify compatibility |
| **Major Transformation** | **Complete transformation from RFQ marketplace to Curated B2B Marketplace with Admin Dashboard** |
| Database Enhancement | Added 4 new models: Category, Product, CartItem, OrderItem. Enhanced Order model for direct purchases |
| Admin Dashboard | Complete Super Admin system: 12 pages for managing products, categories, orders, users with full CRUD operations |
| Mobile API | RESTful API v1 with JWT authentication, complete mobile app support (products, cart, orders, notifications) |
| Server Actions | 4 new action files: products.ts, categories.ts, admin-orders.ts, users.ts for admin operations |
| Currency Fix | Fixed JOD currency formatting (was incorrectly using JD), now properly displays Jordanian Dinar |
| Database Setup | Successful PostgreSQL setup, migrations, and seeding with 12 categories + admin user (admin@tawreed.jo) |
| **Deployment Success** | **Project fully operational with database, admin access, and complete marketplace functionality** |
| **Currency Runtime Fix** | **Fixed JOD currency format error (JD→JOD) and locale (en-SA→ar-JO) - All marketplace features now operational** |

---

## 12. ✅ Implementation Status

### ✅ **FULLY IMPLEMENTED - CURATED MARKETPLACE**

| Feature | Status | Notes |
|---------|--------|-------|
| **Database Schema** | ✅ | **9 models**: User, Request, Offer, Order, Notification + **Category, Product, CartItem, OrderItem** |
| **Admin Dashboard** | ✅ | **12 complete pages**: dashboard, products, categories, orders, users with full CRUD |
| **Mobile API (JWT)** | ✅ | **Complete RESTful API v1** with auth, products, cart, orders, notifications |
| **Authentication** | ✅ | NextAuth v5 + JWT for mobile, role-based access (BUYER/SUPPLIER/ADMIN) |
| **Product Management** | ✅ | Full CRUD with images, inventory, categories, admin-controlled |
| **Category System** | ✅ | Hierarchical categories with drag-drop reordering, bilingual names |
| **Direct Ordering** | ✅ | Shopping cart → checkout → order (bypasses RFQ complexity) |
| **Admin User Management** | ✅ | User verification, role changes, account status control |
| **Order Oversight** | ✅ | Admin can view, update, manage all platform orders |
| **Currency Support** | ✅ | **JOD (Jordanian Dinar)** formatting with Arabic locale |
| **Database Setup** | ✅ | **PostgreSQL operational** with seeded data (12 categories + admin user) |
| **i18n (AR/EN)** | ✅ | **Enhanced translations** for admin dashboard and ecommerce features |

### ✅ **LEGACY FEATURES MAINTAINED**

| Feature | Status | Notes |
|---------|--------|-------|
| RFQ System | ✅ | Original Request/Offer workflow still functional |
| Buyer Dashboard | ✅ | Enhanced with new ecommerce features |
| Supplier Dashboard | ✅ | Enhanced with direct order management |
| Landing Page | ✅ | Animated, responsive, bilingual |
| Notifications | ✅ | Enhanced with new order types and mobile support |

### ✅ **DEPLOYMENT READY**

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | ✅ | PostgreSQL running, migrated, seeded |
| **Admin Access** | ✅ | **admin@tawreed.jo** / **Admin@123** |
| **Development Server** | ✅ | **http://localhost:3000** operational |
| **API Endpoints** | ✅ | **27 endpoints** across 6 modules |
| **File Structure** | ✅ | **35+ new files** added for transformation |

### 📋 **IMMEDIATE NEXT STEPS**

| Feature | Priority | Effort |
|---------|----------|--------|
| Product Image Upload | High | Medium |
| Advanced Search/Filter | High | Medium |
| Email Notifications | Medium | Low |
| Payment Integration | High | High |
| Mobile App (React Native) | High | High |
| Analytics Enhancement | Medium | Medium |
| Mobile App | 4 | High |
| AI Features | 4 | Low |

---

## 13. 📖 Translation Keys Structure

### Main Sections

```typescript
{
  brand: string,           // "توريد"
  brandTagline: string,    // "سوق الجملة للبقالة B2B"
  
  nav: {                   // Navigation
    features, howItWorks, about, signIn, getStarted,
    dashboard, profile, signOut, settings
  },
  
  roles: {                 // User roles
    buyer, supplier, admin
  },
  
  hero: {                  // Landing hero section
    title, subtitle, description, imBuyer, imSupplier,
    activeRequests, registeredSuppliers, successfulOrders
  },
  
  features: {              // Landing features
    title, subtitle, easyProcurement, bestPrices, 
    verifiedPartners, fastDelivery, growingNetwork, wideSelection
  },
  
  howItWorks: {            // How it works section
    title, subtitle, forBuyers, forSuppliers,
    createRequest, receiveOffers, acceptAndTrack,
    browseRequests, submitOffers, fulfillOrders
  },
  
  categories: {            // Product categories
    title, subtitle, sugar, rice, dairy, beverages,
    snacks, cookingOil, flourAndGrains, cannedGoods,
    spices, cleaning, personalCare, more
  },
  
  cta: {                   // Call to action
    title, subtitle, getStartedFree, noSetupFees,
    freeToRegister, cancelAnytime
  },
  
  footer: {                // Footer
    description, quickLinks, forBuyers, forSuppliers,
    howItWorks, contact, email, phone, location, copyright
  },
  
  login: {                 // Login page
    title, subtitle, email, password, rememberMe,
    forgotPassword, signIn, newToTawreed, createAccount
  },
  
  register: {              // Registration page
    title, subtitle, imBuyer, imSupplier, fullName,
    emailAddress, phoneNumber, password, businessInfo,
    businessName, city, businessAddress, agreeToTerms
  },
  
  sidebar: {               // Dashboard sidebar
    loggedInAs, dashboard, myRequests, orders,
    notifications, browseRequests, myOffers, settings
  },
  
  dashboard: {             // Dashboard common
    welcomeBack, buyerSubtitle, supplierSubtitle,
    newRequest, browseRequests
  },
  
  buyerDashboard: {...},   // Buyer-specific stats & labels
  supplierDashboard: {...}, // Supplier-specific stats & labels
  requests: {...},         // Request management
  createRequest: {...},    // Create request form
  offers: {...},           // Offer management
  orders: {...},           // Order management
  common: {...},           // Common labels (loading, error, etc.)
  status: {...},           // Status labels
  validation: {...}        // Validation messages
}
```

---

**Remember: Update this document whenever you make significant changes to the project!**

