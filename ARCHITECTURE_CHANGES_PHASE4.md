# Architecture Changes - Phase 4 Implementation Summary

**Date:** May 21, 2026  
**Status:** ✅ Backend API Complete, ⏳ Frontend UI Pending  
**Session:** API Endpoints & Server Actions Update

---

## 📋 Overview

Phase 4 implemented comprehensive marketplace architecture supporting:
- **Multiple categories per product** (via ProductOnCategory junction)
- **Variant options** (flavors, sizes, colors with independent stock)
- **Brands** (with logo and product association)
- **Collections** (curated product groups with manual sorting)
- **Tags** (category-scoped filters with slug auto-generation)
- **Enhanced cart/order flow** (option-level pricing and stock)

All changes are **backward compatible** with existing cart/order data.

---

## 🔄 Backend Changes Completed

### 1. Database Schema (Previously Completed)

**New Models:**
- `Brand` - Product brands with logo and sorting
- `ProductOnCategory` - M2M junction (replaces simple categoryId)
- `Collection` - Curated product groups (FEATURED | SEASONAL | BESTSELLERS)
- `CollectionProduct` - Junction for manual collection sorting
- `Tag` - Category-scoped filters (admin-only)
- `ProductTag` - M2M junction for product-tag association
- `VariantOption` - Flavor/color/size options with independent stock & pricing

**Enhanced Models:**
- `Product`: Added `brandId` (FK)
- `ProductVariant`: Added `options` relationship
- `CartItem`: Added `variantOptionId` (FK), updated unique constraint
- `OrderItem`: Added `variantOptionName` & `variantOptionNameEn` (snapshots)

**Migration:** `20260521113908_add_brand_collection_tag_variant_option`

---

### 2. API Endpoints (NEW & UPDATED)

#### Product APIs

**GET /api/v1/products** (UPDATED)
- New query params: `?brandId=X&tagId=Y&collectionId=Z&view=card`
- Card view returns lightweight product data (for lists)
- Full view includes brand, categories, tags, variant options
- Response includes variant options array

**GET /api/v1/products/[id]** (UPDATED)
- Now includes: `brand`, `categories[]` (via junction), `tags[]`, `variants[].options[]`
- Removed stock-based product filtering (show out-of-stock products)
- Response includes full variant option details with stock & price overrides

#### Brand APIs (NEW)

**GET /api/v1/brands**
- Lists all active brands with product count
- Selects: `id, name, nameEn, slug, logo, _count.products`
- Ordered by sortOrder

**GET /api/v1/brands/[slug]/products**
- Returns card-level products for a brand
- Pagination: `?page=1&limit=20`
- Response format: `{ products: [], pagination: {} }`

#### Collection APIs (NEW)

**GET /api/v1/collections**
- Lists active collections (with optional `?showOnHome=true` filter)
- Includes first 10 products per collection (card format)
- Response: `{ collections: [] }`

**GET /api/v1/collections/[slug]**
- Full collection detail with all products (card format)
- Pagination: `?page=1&limit=20`
- Response: `{ collection: { ...details, products: [] }, pagination: {} }`

#### Home API (NEW)

**GET /api/v1/home**
- Aggregated home screen data
- Returns: `{ collections: [], brands: [], categories: [] }`
- Collections: marked with `showOnHome: true`, includes first 10 products
- Brands: active brands sorted by sortOrder
- Categories: top-level categories with children

#### Search API (NEW)

**GET /api/v1/search**
- Text search across product name, description, brand
- Query params: `?q=search_term&page=1&limit=20`
- Case-insensitive search
- Response: `{ products: [], pagination: { page, limit, total, totalPages } }`

#### Cart API (UPDATED)

**POST /api/v1/cart**
- New field: `variantOptionId` (optional UUID)
- Validation:
  - If variant has options: `variantOptionId` required
  - If variant has no options: `variantOptionId` must be null
- Stock check: 
  - With option: checks `VariantOption.stock`
  - Without option: checks `ProductVariant.stock`
- Response unchanged

#### Orders API (UPDATED)

**POST /api/v1/orders**
- Pricing: Uses `variantOption.priceOverride` if set, else `productUnit.price`
- Order items snapshot:
  - `variantOptionName` (Arabic)
  - `variantOptionNameEn` (English)
- Stock decrement:
  - If `cartItem.variantOptionId`: decrements `VariantOption.stock`
  - Otherwise: decrements `ProductVariant.stock`
- Response: Returns created order with all items

#### Categories API (UPDATED)

**GET /api/v1/categories**
- Flat mode now includes `tags[]` array per category
- Response structure:
  ```json
  {
    "categories": [{
      "id": "...",
      "name": "...",
      "tags": [{ "id": "...", "name": "...", "slug": "..." }]
    }],
    "breadcrumb": [...]
  }
  ```

---

### 3. Server Actions (UPDATED)

**[actions/products.ts](actions/products.ts)** — `createProduct()` & `updateProduct()`

**Input Changes (FormData):**
- `brandId` (string, optional)
- `categoryIds` (JSON array of strings)
- `tagIds` (JSON array of strings)
- `collectionIds` (JSON array of strings)

**Logic Changes:**
- **Create:**
  1. Creates primary category via ProductOnCategory with `isPrimary: true`
  2. Creates additional categories via ProductOnCategory
  3. Assigns tags via ProductTag junction
  4. Adds to collections via CollectionProduct junction
  5. Creates variants and units as before

- **Update:**
  1. Updates product including `brandId`
  2. Deletes and recreates ProductOnCategory records (to reorder)
  3. Deletes and recreates ProductTag records
  4. Deletes and recreates CollectionProduct records
  5. Deletes and recreates variants/units if provided

**Response:** `{ success: boolean, data?: { id: string }, error?: string, errors?: FieldErrors }`

---

### 4. Validation Schemas (UPDATED)

**[lib/validations.ts](lib/validations.ts)**

New schemas:
- `createBrandSchema` — name, nameEn, logo, sortOrder
- `updateBrandSchema` — all fields optional
- `createCollectionSchema` — name, nameEn, type, image, showOnHome
- `updateCollectionSchema` — all fields optional
- `createTagSchema` — categoryId, name, nameEn
- `updateTagSchema` — name, nameEn
- `variantOptionSchema` — name, nameEn, stock, priceOverride

Updated schemas:
- `addToCartSchema` — now includes `variantOptionId: z.string().optional()`

---

## 📱 Frontend Requirements

### 1. Admin Dashboard - New Pages

#### **Brands Management** (`/app/admin/brands/`)

**List Page:** `/admin/brands`
- Table columns: Logo | Name (AR) | Name (EN) | Product Count | Actions
- Actions: Edit | Delete | Reorder
- Button: "+ New Brand"
- Bulk reorder via drag-drop

**New/Edit Page:** `/admin/brands/new` & `/admin/brands/[id]/edit`
- Form fields:
  - Name (Arabic) - required
  - Name (English) - optional
  - Logo - image upload (Cloudinary)
  - Sort Order - numeric
- Submit button: Save Brand
- Validation: Name required, logo optional

**API Used:**
- `POST /actions/brands` → createBrand
- `PUT /actions/brands/[id]` → updateBrand
- `DELETE /actions/brands/[id]` → deleteBrand
- `GET /actions/brands` → getBrands
- `POST /actions/brands/reorder` → reorderBrands

---

#### **Collections Management** (`/app/admin/collections/`)

**List Page:** `/admin/collections`
- Table columns: Image | Name (AR) | Name (EN) | Type | Show on Home | Product Count | Actions
- Actions: Edit | Delete | Manage Products | Reorder
- Button: "+ New Collection"
- Type badges: FEATURED | SEASONAL | BESTSELLERS

**New/Edit Page:** `/admin/collections/new` & `/admin/collections/[id]/edit`
- Form fields:
  - Name (Arabic) - required
  - Name (English) - optional
  - Type - dropdown (FEATURED | SEASONAL | BESTSELLERS)
  - Image - image upload
  - Show on Home - checkbox
  - Sort Order - numeric
- Submit: Save Collection

**Product Picker Modal:** `/admin/collections/[id]/products`
- Search products by name
- Current products list with drag-drop reordering
- Add/remove buttons
- Selected product count

**API Used:**
- `POST /actions/collections` → createCollection
- `PUT /actions/collections/[id]` → updateCollection
- `DELETE /actions/collections/[id]` → deleteCollection
- `GET /actions/collections` → getCollections
- `POST /actions/collections/[id]/products` → addProductsToCollection
- `DELETE /actions/collections/[id]/products/[productId]` → removeProductFromCollection
- `POST /actions/collections/reorder-products` → reorderCollectionProducts
- `POST /actions/collections/reorder` → reorderCollections

---

#### **Tags Management** (Within Category Pages)

**UI Location:** `/admin/categories/[id]/tags` (new section)

**Tag Management Panel:**
- List current tags for category
- "+ New Tag" button
- Each tag: Edit | Delete | Reorder
- Drag-drop reordering

**Tag Form (Inline/Modal):**
- Name (Arabic) - required
- Name (English) - optional
- Slug - auto-generated from name (read-only)
- Sort Order - numeric
- Submit: Save Tag

**API Used:**
- `POST /actions/tags` → createTag
- `PUT /actions/tags/[id]` → updateTag
- `DELETE /actions/tags/[id]` → deleteTag
- `GET /actions/categories/[id]/tags` → getTagsByCategory
- `POST /actions/tags/reorder` → reorderTags
- `POST /actions/products/[id]/tags` → assignTagsToProduct

---

### 2. Admin Dashboard - Enhanced Product Forms

#### **Product Creation/Edit Form** (Enhanced)

**New Sections:**

1. **Brand Selection**
   - Dropdown: Brand (optional)
   - Populated from `/api/v1/brands`

2. **Multi-Category Selection**
   - Primary Category (required) - dropdown
   - Additional Categories - multi-select or list
   - Show category hierarchy (parent > child)
   - Max select indicator

3. **Tags Selection**
   - Multi-select checkboxes
   - Filtered by primary category
   - Fetched from `/actions/categories/[id]/tags`
   - Show/hide based on selected category

4. **Collections Selection**
   - Multi-select checkboxes
   - All collections shown
   - Fetched from `/actions/collections`

5. **Variant Options** (Enhanced)
   - For each variant, add "Variant Options" section
   - Table columns: Option Name (AR) | Option Name (EN) | Stock | Price Override | Actions
   - "+Add Option" button
   - Option form:
     - Name (Arabic) - required
     - Name (English) - optional
     - Stock - numeric (required)
     - Price Override - numeric (optional, overrides unit price)
     - Edit/Delete buttons
   - Validation: At least one option if "Has Options" checkbox enabled

**Form Data Structure (FormData):**
```javascript
formData.append('name', 'Product Name')
formData.append('nameEn', 'English Name')
formData.append('brandId', 'uuid-or-empty')
formData.append('categoryId', 'primary-category-uuid')
formData.append('categoryIds', JSON.stringify(['cat-1', 'cat-2', 'cat-3'])) // includes primary
formData.append('tagIds', JSON.stringify(['tag-1', 'tag-2']))
formData.append('collectionIds', JSON.stringify(['col-1', 'col-2']))

// Variants structure includes options:
formData.append('variants', JSON.stringify([
  {
    "size": "1L",
    "sizeEn": "1 Liter",
    "stock": 100,
    "minOrderQuantity": 1,
    "units": [...],
    "options": [
      { "name": "أحمر", "nameEn": "Red", "stock": 50, "priceOverride": 10 }
    ]
  }
]))
```

**Validation:**
- Brand: optional
- Primary category: required
- Additional categories: optional
- Tags: optional (only show if category has tags)
- Collections: optional
- Variant options: optional

---

### 3. Buyer Frontend - Updated Cart & Checkout

#### **Product Detail Page**

**Changes:**
- If variant has options: Show option selector
  - Radio buttons or dropdown for each option
  - Display option stock
  - Display price override if set
  - Update total price based on selected option
- If variant has no options: Show standard unit/quantity selector

**Add to Cart:**
- Required: `variantId, variantOptionId (if options exist), quantity, productUnitId`
- Error handling:
  - "Please select an option (flavor, color, etc.)"
  - "Only X items available for this option"
  - "Product option no longer available"

#### **Shopping Cart Page**

**Cart Item Display:**
- If item has option: Show option name next to variant size
  - Format: "Product - 1L - Red"
- Price calculation: Show option price override or default unit price
- Quantity update: Validate against option stock (if option exists)

**Edit Cart Item:**
- Allow changing quantity
- Allow changing selected option (if variant has options)
- Re-validate stock on change

**Remove Item:**
- Remove cart item with specific variant + unit + option combo

**Response Format from API:**
```json
{
  "items": [
    {
      "id": "...",
      "productName": "Product",
      "variantSize": "1L",
      "variantOptionName": "Red",
      "quantity": 5,
      "pricePerUnit": 10,
      "totalPrice": 50
    }
  ]
}
```

---

#### **Checkout Page**

**No Changes to UI**, but backend now:
- Validates option stock
- Snapshots option name in order
- Uses option price override for billing
- Decrements option stock (not variant stock)

**Order Confirmation:**
- Show selected options in order summary
- Format: "Product Name - Variant Size - Option Name (Quantity)"

---

### 4. Mobile App - API Consumption

#### **Home Screen**
- Call `GET /api/v1/home` once on load
- Display:
  - Collections with first 10 products (carousel or tabs)
  - Featured brands (grid or carousel)
  - Top-level categories with children

#### **Brand Browsing**
- Call `GET /api/v1/brands` to list brands
- Navigate to `GET /api/v1/brands/[slug]/products?page=1&limit=20`
- Show brand products in grid

#### **Collections**
- Call `GET /api/v1/collections?showOnHome=true` for home
- Call `GET /api/v1/collections` for all
- Navigate to `GET /api/v1/collections/[slug]` for detail

#### **Product Search**
- Call `GET /api/v1/search?q=query&page=1&limit=20`
- Show results in grid with pagination

#### **Product Detail**
- Call `GET /api/v1/products/[id]` for full details
- Display:
  - Brand info (name, logo)
  - All categories (via `categories[]` junction)
  - Tags (if category supports)
  - Variant options with stock & pricing
  - Collections containing product

#### **Category Browsing**
- Call `GET /api/v1/categories?tree=true` for tree
- Call `GET /api/v1/categories?parentId=X` for specific level
- **NEW:** Include tags in category response
- Show tags as filter chips

#### **Cart with Options**
- When adding: POST with `variantOptionId`
- When editing: Update `variantOptionId` + `quantity`
- Response includes option name & pricing

#### **Checkout**
- POST `/api/v1/orders` as before
- Backend handles option stock decrement
- Response order items include `variantOptionName`, `variantOptionNameEn`

---

## 📊 Data Flow Examples

### Example 1: Add Product with Multiple Options

**Admin Form:**
```
Product: "Apple Juice"
Brand: "FruitCo"
Primary Category: "Beverages"
Additional Categories: ["Drinks", "Organic"]
Tags: ["Fresh", "Natural"]
Collections: ["Summer Favorites"]

Variant: "1L Bottle"
  Options:
    - Red Apple (stock: 50, no price override)
    - Green Apple (stock: 40, price override: +1 JOD)
```

**Server Action:** `createProduct(formData)`
1. Creates Product with brandId
2. Creates ProductOnCategory: isPrimary=true for Beverages, isPrimary=false for others
3. Creates ProductTag: Fresh, Natural
4. Creates CollectionProduct: Summer Favorites
5. Creates ProductVariant: 1L Bottle with options
6. Creates VariantOption: Red Apple (stock 50), Green Apple (stock 40, priceOverride 1)

---

### Example 2: Buyer Adds to Cart with Option

**API Call:**
```
POST /api/v1/cart
{
  "variantId": "variant-uuid",
  "variantOptionId": "green-apple-uuid",
  "productUnitId": "1l-bottle-uuid",
  "quantity": 10
}
```

**Validation:**
- ✅ Variant active
- ✅ Option exists & belongs to variant
- ✅ Option stock >= 10
- ✅ Min order quantity satisfied

**Response:**
```json
{
  "cartItem": {
    "id": "...",
    "variantId": "...",
    "variantOptionId": "green-apple-uuid",
    "quantity": 10
  }
}
```

---

### Example 3: Checkout with Option Stock Decrement

**Before Checkout:** VariantOption stock = 40

**POST /api/v1/orders**
- Validates cart item option stock
- Creates OrderItem with snapshot: `variantOptionName: "Green Apple"`
- Uses price: `variantOption.priceOverride (1 JOD)` for billing
- Decrements: `VariantOption.stock` by 10

**After Checkout:** VariantOption stock = 30

---

## 🔗 Implementation Order (Recommended)

1. **Admin Brands UI** (2-3 hours)
   - Brand list, new, edit forms
   - Reordering

2. **Admin Collections UI** (3-4 hours)
   - Collection list, new, edit
   - Product picker modal
   - Reordering

3. **Admin Tags UI** (2 hours)
   - Tag management within category page
   - Reordering

4. **Admin Product Form Enhancement** (4-5 hours)
   - Multi-category selector
   - Brand dropdown
   - Tags multi-select
   - Collections multi-select
   - Variant options UI

5. **Buyer Cart/Checkout Updates** (3 hours)
   - Option selector on product detail
   - Cart item option display
   - Order summary with options

6. **Mobile Home Screen** (2-3 hours)
   - Collections carousel
   - Brands grid
   - Category list

7. **Mobile Brand/Collection Pages** (2 hours)
   - Brand product browsing
   - Collection detail

8. **Mobile Product Detail** (2 hours)
   - Option selector
   - Multi-category display
   - Tags display

---

## ✅ Checklist for Frontend Integration

- [ ] Test all 10 API endpoints with real data
- [ ] Admin Brands CRUD working
- [ ] Admin Collections CRUD + product picker working
- [ ] Admin Tags working in category page
- [ ] Admin Product form saves brandId, categoryIds, tagIds, collectionIds
- [ ] Admin Product form displays variant options
- [ ] Cart validates option selection & stock
- [ ] Order summary shows option names
- [ ] Mobile home screen loads collections/brands/categories
- [ ] Mobile search results include products by brand
- [ ] Mobile product detail displays all categories, tags, options
- [ ] Mobile cart handles option-level pricing & stock
- [ ] All forms validated server-side
- [ ] All forms have error messages
- [ ] RTL/LTR working on all new pages
- [ ] Images upload to Cloudinary correctly
- [ ] Slug auto-generation working (tags)
- [ ] Sort order working for brands, collections, tags

---

## 🔗 Related Files

**Backend Complete:**
- ✅ `prisma/schema.prisma` - Schema defined
- ✅ `types/index.ts` - TypeScript types
- ✅ `lib/validations.ts` - Zod schemas
- ✅ `lib/upload.ts` - Image upload helpers
- ✅ `actions/brands.ts`, `actions/collections.ts`, `actions/tags.ts`
- ✅ `app/api/v1/brands/*`, `app/api/v1/collections/*`, `app/api/v1/home/*`, `app/api/v1/search/*`
- ✅ `actions/products.ts` - Enhanced with multi-relations
- ✅ `app/api/v1/cart/route.ts`, `app/api/v1/orders/route.ts` - Option handling
- ✅ `app/api/v1/categories/route.ts` - Tags in response

**Frontend Needed:**
- ⏳ `app/admin/brands/*` - Brand management UI
- ⏳ `app/admin/collections/*` - Collection management UI
- ⏳ `app/admin/categories/[id]/tags` - Tag management within category
- ⏳ Enhanced product forms (NewProductForm, EditProductForm)
- ⏳ AdminSidebar.tsx - Add Brands & Collections nav items
- ⏳ Buyer product detail with option selector
- ⏳ Buyer cart with option display
- ⏳ Mobile home screen component
- ⏳ Mobile brand/collection browsing
- ⏳ Mobile option selector

---

## 🐛 Troubleshooting

**Q: "Product option not found" error when adding to cart**
- A: Ensure option belongs to selected variant. Check variantOptionId matches variant.id in VariantOption.variantId

**Q: Stock not decremented for options**
- A: Check OrderItem snapshot includes variantOptionName. Decrement logic checks variantOptionId presence.

**Q: Category not showing in product**
- A: Ensure ProductOnCategory record created with isPrimary=true for at least one category.

**Q: Collections not showing products**
- A: Ensure CollectionProduct records created. Check product isActive status.

**Q: Tags not appearing for category**
- A: Verify tags assigned to category via Tag.categoryId and ProductTag records created.

---

**End of Documentation**

Generated: May 21, 2026
Next: Admin UI Implementation Phase
