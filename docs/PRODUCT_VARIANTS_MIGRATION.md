# Product Variants System - Migration Guide for Frontend Developers

**Date:** April 16, 2026  
**Status:** ✅ Complete Implementation  
**Scope:** Admin Dashboard & Mobile API

---

## Overview

The product system has been refactored from a **flat structure** (one product = one price/stock) to a **hierarchical structure** (one product = multiple variants = multiple selling units).

### What Changed?

```
BEFORE: Product → Selling Units
Product {
  id, name, price, stock, unit, sku, barcode, minOrderQuantity
  units: ProductUnit[]
}

AFTER: Product → Variants → Selling Units
Product {
  id, name, description, categoryId, isActive
  variants: ProductVariant[] {
    id, size, sku, barcode, stock, minOrderQuantity, isDefault
    units: ProductUnit[] {
      id, unit, label, price, compareAtPrice, isDefault
    }
  }
}
```

---

## Data Structure Changes

### Product Model

| Field | Before | After | Notes |
|-------|--------|-------|-------|
| `id` | ✅ | ✅ | No change |
| `name` | ✅ | ✅ | No change |
| `price` | ✅ Exists | ❌ REMOVED | Price now in `variants[].units[].price` |
| `stock` | ✅ Exists | ❌ REMOVED | Stock now in `variants[].stock` |
| `unit` | ✅ Exists | ❌ REMOVED | Unit now in `variants[].units[].unit` |
| `sku` | ✅ Exists | ❌ REMOVED | SKU now in `variants[].sku` |
| `barcode` | ✅ Exists | ❌ REMOVED | Barcode now in `variants[].barcode` |
| `minOrderQuantity` | ✅ Exists | ❌ REMOVED | Min qty now in `variants[].minOrderQuantity` |
| `variants` | ❌ N/A | ✅ NEW | Array of product sizes/variations |
| `units` | ✅ Exists | ❌ REMOVED | Units now in `variants[].units` |

### New: ProductVariant Model

```typescript
ProductVariant {
  id: string
  productId: string
  size: string               // e.g., "2kg", "4kg"
  sizeEn: string | null      // English size label
  sku: string | null         // Variant-specific SKU
  barcode: string | null     // Variant-specific barcode
  stock: number              // Stock count for this variant
  minOrderQuantity: number   // Min qty for this variant
  isDefault: boolean         // Variant selected by default
  isActive: boolean          // Variant availability
  sortOrder: number          // Display order
  units: ProductUnit[]       // Selling units for this variant
}
```

### ProductUnit Model

| Field | Before | After | Notes |
|-------|--------|-------|-------|
| `productId` | ✅ | ❌ REMOVED | Changed to `variantId` |
| `variantId` | N/A | ✅ NEW | Foreign key to ProductVariant |

---

## API Endpoint Changes

### 1️⃣ GET /api/v1/products - List Products

#### BEFORE
```json
{
  "products": [
    {
      "id": "prod_1",
      "name": "سكر أبيض",
      "price": 15.50,
      "stock": 100,
      "unit": "KG",
      "sku": "SUGAR-001",
      "barcode": "1234567890",
      "minOrderQuantity": 5,
      "units": [
        {
          "id": "unit_1",
          "unit": "PIECE",
          "label": "قطعة",
          "price": 15.50,
          "isDefault": true
        },
        {
          "id": "unit_2",
          "unit": "DOZEN",
          "label": "دزينة",
          "piecesPerUnit": 12,
          "price": 180.00,
          "isDefault": false
        }
      ]
    }
  ]
}
```

#### AFTER
```json
{
  "products": [
    {
      "id": "prod_1",
      "name": "سكر أبيض",
      "nameEn": "White Sugar",
      "description": "سكر أبيض نقي...",
      "descriptionEn": "Pure white sugar...",
      "image": "https://...",
      "categoryId": "cat_1",
      "isActive": true,
      "sortOrder": 0,
      "category": {
        "id": "cat_1",
        "name": "السكريات",
        "nameEn": "Sugar",
        "slug": "sugar"
      },
      "variants": [
        {
          "id": "var_1",
          "size": "2 كيلو",
          "sizeEn": "2kg",
          "sku": "SUGAR-2KG",
          "barcode": "1234567890",
          "stock": 50,
          "minOrderQuantity": 5,
          "isDefault": true,
          "isActive": true,
          "sortOrder": 0,
          "units": [
            {
              "id": "unit_1",
              "unit": "PIECE",
              "label": "قطعة",
              "labelEn": "Piece",
              "piecesPerUnit": 1,
              "price": 15.50,
              "compareAtPrice": 18.00,
              "isDefault": true,
              "sortOrder": 0
            },
            {
              "id": "unit_2",
              "unit": "DOZEN",
              "label": "دزينة",
              "labelEn": "Dozen",
              "piecesPerUnit": 12,
              "price": 180.00,
              "compareAtPrice": 220.00,
              "isDefault": false,
              "sortOrder": 1
            }
          ]
        },
        {
          "id": "var_2",
          "size": "4 كيلو",
          "sizeEn": "4kg",
          "sku": "SUGAR-4KG",
          "barcode": "0987654321",
          "stock": 30,
          "minOrderQuantity": 3,
          "isDefault": false,
          "isActive": true,
          "sortOrder": 1,
          "units": [
            {
              "id": "unit_3",
              "unit": "PIECE",
              "label": "قطعة",
              "labelEn": "Piece",
              "piecesPerUnit": 1,
              "price": 28.00,
              "compareAtPrice": null,
              "isDefault": true,
              "sortOrder": 0
            }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 2️⃣ GET /api/v1/products/[id] - Get Single Product

#### BEFORE
```bash
GET /api/v1/products/prod_1

{
  "id": "prod_1",
  "name": "سكر أبيض",
  "price": 15.50,
  "stock": 100,
  "unit": "KG",
  "units": [...]  // See above
}
```

#### AFTER
```bash
GET /api/v1/products/prod_1

{
  "id": "prod_1",
  "name": "سكر أبيض",
  "nameEn": "White Sugar",
  "description": "...",
  "descriptionEn": "...",
  "image": "...",
  "categoryId": "cat_1",
  "isActive": true,
  "category": { ... },
  "variants": [
    {
      "id": "var_1",
      "size": "2 كيلو",
      "sizeEn": "2kg",
      "stock": 50,
      "minOrderQuantity": 5,
      "isDefault": true,
      "units": [...]  // See above
    },
    {
      "id": "var_2",
      "size": "4 كيلو",
      "sizeEn": "4kg",
      "stock": 30,
      "minOrderQuantity": 3,
      "isDefault": false,
      "units": [...]
    }
  ]
}
```

---

## Cart & Checkout Changes

### 3️⃣ POST /api/v1/cart - Add to Cart

#### BEFORE
```bash
POST /api/v1/cart

{
  "productId": "prod_1",           ← Product ID
  "quantity": 10,
  "productUnitId": "unit_1"        ← Optional: specific unit
}
```

#### AFTER
```bash
POST /api/v1/cart

{
  "variantId": "var_1",            ← Variant ID (new)
  "quantity": 10,
  "productUnitId": "unit_1"        ← Same: specific unit
}
```

**Key Change:** Use `variantId` instead of `productId`

### 4️⃣ GET /api/v1/cart - Get Cart Items

#### BEFORE
```json
{
  "items": [
    {
      "id": "cart_1",
      "buyerId": "user_1",
      "productId": "prod_1",
      "product": {
        "id": "prod_1",
        "name": "سكر أبيض",
        "price": 15.50,
        "stock": 100,
        "units": [...]
      },
      "productUnitId": "unit_1",
      "productUnit": {
        "id": "unit_1",
        "unit": "PIECE",
        "price": 15.50
      },
      "quantity": 10,
      "createdAt": "2026-04-16T10:00:00Z"
    }
  ],
  "total": 155.00,
  "itemCount": 1
}
```

#### AFTER
```json
{
  "items": [
    {
      "id": "cart_1",
      "buyerId": "user_1",
      "variantId": "var_1",
      "variant": {
        "id": "var_1",
        "size": "2 كيلو",
        "sizeEn": "2kg",
        "stock": 50,
        "minOrderQuantity": 5,
        "isDefault": true,
        "product": {
          "id": "prod_1",
          "name": "سكر أبيض",
          "nameEn": "White Sugar",
          "description": "...",
          "categoryId": "cat_1",
          "isActive": true
        },
        "units": [
          {
            "id": "unit_1",
            "unit": "PIECE",
            "label": "قطعة",
            "price": 15.50,
            "isDefault": true
          },
          {
            "id": "unit_2",
            "unit": "DOZEN",
            "label": "دزينة",
            "piecesPerUnit": 12,
            "price": 180.00,
            "isDefault": false
          }
        ]
      },
      "productUnitId": "unit_1",
      "productUnit": {
        "id": "unit_1",
        "unit": "PIECE",
        "label": "قطعة",
        "price": 15.50,
        "isDefault": true
      },
      "quantity": 10,
      "createdAt": "2026-04-16T10:00:00Z"
    }
  ],
  "total": 155.00,
  "itemCount": 1
}
```

**Key Changes:**
- `productId` → `variantId`
- `product` → `variant` (with nested `product`)
- Variant includes all sizes, units, and stock information

### 5️⃣ POST /api/v1/orders - Create Order

#### BEFORE
```bash
POST /api/v1/orders

{
  "deliveryAddress": "123 Main St",
  "deliveryCity": "Amman",
  "buyerNotes": "Please deliver after 5pm",
  "couponCode": "SAVE10"
}

# Cart items are automatically included from user's cart
# Each cart item includes: product details, unit price, quantity
```

#### AFTER
```bash
POST /api/v1/orders

{
  "deliveryAddress": "123 Main St",
  "deliveryCity": "Amman",
  "buyerNotes": "Please deliver after 5pm",
  "couponCode": "SAVE10"
}

# Same request format, but now:
# - Cart items are resolved through variant→product
# - Order items snapshot: variantSize, variantSizeEn
# - Stock decrement happens at variant level
```

#### Order Response (NEW FIELDS)

```json
{
  "order": {
    "id": "order_1",
    "orderNumber": "ORD-20260416-001",
    "buyerId": "user_1",
    "totalPrice": 155.00,
    "status": "PENDING",
    "items": [
      {
        "id": "item_1",
        "productId": "prod_1",
        "productName": "سكر أبيض",
        "productNameEn": "White Sugar",
        "productImage": "...",
        "variantSize": "2 كيلو",           ← NEW
        "variantSizeEn": "2kg",           ← NEW
        "quantity": 10,
        "unit": "PIECE",
        "pricePerUnit": 15.50,
        "totalPrice": 155.00,
        "unitLabel": "قطعة",
        "unitLabelEn": "Piece"
      }
    ],
    "deliveryAddress": "123 Main St",
    "deliveryCity": "Amman",
    "buyerNotes": "...",
    "createdAt": "2026-04-16T10:00:00Z",
    "statusHistory": [...]
  }
}
```

---

## Frontend Implementation Examples

### React Component: Product Display (BEFORE)

```jsx
function ProductCard({ product }) {
  return (
    <div>
      <h2>{product.name}</h2>
      <p>Price: {formatCurrency(product.price)}</p>
      <p>Stock: {product.stock}</p>
      
      <select>
        {product.units.map(unit => (
          <option key={unit.id} value={unit.id}>
            {unit.label} - {formatCurrency(unit.price)}
          </option>
        ))}
      </select>
      
      <button onClick={() => addToCart(product.id, 1)}>
        Add to Cart
      </button>
    </div>
  )
}
```

### React Component: Product Display (AFTER)

```jsx
function ProductCard({ product }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0])
  const [selectedUnit, setSelectedUnit] = useState(selectedVariant.units[0])

  return (
    <div>
      <h2>{product.name}</h2>
      
      {/* NEW: Variant Selection */}
      <select value={selectedVariant.id} onChange={(e) => {
        const variant = product.variants.find(v => v.id === e.target.value)
        setSelectedVariant(variant)
        setSelectedUnit(variant.units[0])
      }}>
        {product.variants.map(variant => (
          <option key={variant.id} value={variant.id}>
            {variant.size} - {variant.stock > 0 ? `In Stock (${variant.stock})` : 'Out of Stock'}
          </option>
        ))}
      </select>

      {/* Unit Selection */}
      <select value={selectedUnit.id} onChange={(e) => {
        const unit = selectedVariant.units.find(u => u.id === e.target.value)
        setSelectedUnit(unit)
      }}>
        {selectedVariant.units.map(unit => (
          <option key={unit.id} value={unit.id}>
            {unit.label} - {formatCurrency(unit.price)}
          </option>
        ))}
      </select>

      <p>Stock: {selectedVariant.stock}</p>
      <p>Min Order: {selectedVariant.minOrderQuantity}</p>

      {/* CHANGED: variantId instead of productId */}
      <button onClick={() => addToCart(selectedVariant.id, 1)}>
        Add to Cart
      </button>
    </div>
  )
}
```

### React Component: Cart Item (BEFORE)

```jsx
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const product = item.product
  const unit = item.productUnit
  
  return (
    <div>
      <h3>{product.name}</h3>
      <p>{unit.label} - {formatCurrency(unit.price)}</p>
      <p>Quantity: {item.quantity}</p>
      
      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
      <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
      <button onClick={() => onRemove(item.id)}>Remove</button>
    </div>
  )
}
```

### React Component: Cart Item (AFTER)

```jsx
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const variant = item.variant
  const product = variant.product
  const unit = item.productUnit

  return (
    <div>
      <h3>{product.name}</h3>
      <p className="text-sm text-gray-600">
        Size: {variant.size}  {/* NEW: Show variant size */}
      </p>
      <p>{unit.label} - {formatCurrency(unit.price)}</p>
      <p>Quantity: {item.quantity}</p>
      
      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
      <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
      <button onClick={() => onRemove(item.id)}>Remove</button>
    </div>
  )
}
```

### TypeScript Types (AFTER)

```typescript
interface ProductVariant {
  id: string
  size: string
  sizeEn: string | null
  sku: string | null
  barcode: string | null
  stock: number
  minOrderQuantity: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  units: ProductUnit[]
}

interface ProductUnit {
  id: string
  unit: string
  label: string
  labelEn: string | null
  piecesPerUnit: number
  price: number
  compareAtPrice: number | null
  isDefault: boolean
  sortOrder: number
}

interface Product {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  image: string | null
  categoryId: string
  isActive: boolean
  sortOrder: number
  category: {
    id: string
    name: string
    nameEn: string | null
    slug: string
  }
  variants: ProductVariant[]
}

interface CartItem {
  id: string
  buyerId: string
  variantId: string  // Changed from productId
  variant: ProductVariant & { product: Product }
  productUnitId: string | null
  productUnit: ProductUnit | null
  quantity: number
  createdAt: string
}
```

---

## Migration Checklist for Frontend

- [ ] Update product display to show variants
- [ ] Add variant selection UI before adding to cart
- [ ] Change `addToCart(productId, ...)` → `addToCart(variantId, ...)`
- [ ] Update cart display to show variant size
- [ ] Update order summary to show variant information
- [ ] Test adding multiple variants of same product to cart
- [ ] Verify stock checks work at variant level
- [ ] Update price calculation (get price from `unit.price` not `product.price`)
- [ ] Update stock display (show `variant.stock` not `product.stock`)
- [ ] Test minimum order quantity validation per variant
- [ ] Test product filters and search with new structure
- [ ] Update TypeScript types in your project
- [ ] Test checkout flow end-to-end

---

## Key Points to Remember

1. **No more `productId` in cart** — Use `variantId` instead
2. **Prices are per unit** — Calculate from `unit.price`, not product level
3. **Stock is per variant** — Check `variant.stock`, not product stock
4. **Each variant has its own units** — Don't assume units are shared
5. **Always include variant details in UI** — Show size to user when displaying cart items
6. **Minimum quantities vary by variant** — Check `variant.minOrderQuantity`

---

## Support & Questions

If you need clarification on any of these changes, refer to:
- API Contract: `/docs/API_CONTRACT.md`
- Database Schema: `/prisma/schema.prisma`
- Server Actions: `/actions/products.ts`
- Mobile API Routes: `/app/api/v1/`

---

**Generated:** April 16, 2026  
**System:** Tawreed B2B Marketplace v2.0
