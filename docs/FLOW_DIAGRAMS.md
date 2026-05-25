# 📊 Cart & Orders Flow Diagram

## الـ Data Flow - السير الكامل

```
┌─────────────────────────────────────────────────────────────────┐
│                    🛒 Shopping Flow                             │
└─────────────────────────────────────────────────────────────────┘

1️⃣  ADDING TO CART
═══════════════════════════════════════════════════════════════════

Frontend                    API                     Database
   │                         │                          │
   ├─ POST /api/v1/cart ────→│                          │
   │  {                       │                          │
   │   variantId,            │─ Check if exists ───────→│
   │   variantOptionId,      │                          │
   │   quantity              │← Return existing or null │
   │  }                      │                          │
   │                         ├─ If exists: UPDATE ────→│
   │                         │   quantity               │
   │                         │                          │
   │                         ├─ If not: CREATE ───────→│ CartItem
   │                         │                          │ (variantId,
   │                         ├─ Apply formatter ◄────── │  variantOptionId,
   │  formatCartItem()       │   CART_ITEM_INCLUDE     │  productUnitId,
   │  ├─ Load variant        │                          │  quantity)
   │  ├─ Load options        │                          │
   │  ├─ Load units          │                          │
   │  └─ Calculate pricing   │                          │
   │                         │                          │
   │← Response {item} ◄──────┤                          │
   │  {                      │                          │
   │   selectedVariant: {},  │                          │
   │   selectedOption: {},   │                          │
   │   selectedUnit: {},     │                          │
   │   pricing: {}           │                          │
   │  }                      │                          │
   │                         │                          │


2️⃣  VIEWING CART
═══════════════════════════════════════════════════════════════════

Frontend                    API                     Database
   │                         │                          │
   ├─ GET /api/v1/cart ─────→│                          │
   │                         ├─ Query all items ──────→│
   │                         │  for user                │
   │                         │←─ Return CartItems ──────│
   │                         │                          │
   │                         ├─ For each item:          │
   │                         │   formatCartItem()       │
   │                         │   ├─ Load variant        │
   │                         │   ├─ Load product        │
   │                         │   ├─ Load options        │
   │                         │   ├─ Load units          │
   │                         │   └─ Format with select  │
   │                         │                          │
   │← Response {             │                          │
   │   items: [              │                          │
   │     {                   │                          │
   │       id,               │                          │
   │       quantity,         │                          │
   │       product {},       │                          │
   │       selectedVariant{},│                          │
   │       selectedOption{}, │                          │
   │       selectedUnit{},   │                          │
   │       pricing {}        │                          │
   │     },                  │                          │
   │     ...                 │                          │
   │   ],                    │                          │
   │   total: 25.50,         │                          │
   │   itemCount: 2          │                          │
   │ }                       │                          │


3️⃣  CHECKOUT & ORDER CREATION
═══════════════════════════════════════════════════════════════════

Frontend                    API                     Database
   │                         │                          │
   ├─ POST /api/v1/orders ──→│                          │
   │  {                       │                          │
   │   deliveryAddress,      │                          │
   │   deliveryCity,         │                          │
   │   buyerNotes,           │                          │
   │   couponCode            │                          │
   │  }                      │                          │
   │                         ├─ Validate coupon ──────→│
   │                         │  (if provided)           │
   │                         │                          │
   │                         ├─ Get cart items ───────→│
   │                         │                          │
   │                         ├─ Check stock ◄──────────│
   │                         │                          │
   │                         ├─ Calculate pricing ─────│
   │                         │  (with discount)         │
   │                         │                          │
   │                         ├─ Create Order ────────→ │ Order
   │                         │                          │ {totalPrice,
   │                         │ For each CartItem:      │  status,
   │                         │  Create OrderItem ─────→│  items}
   │                         │  (save snapshot:         │
   │                         │   variantSize,           │ OrderItem
   │                         │   variantSizeEn,         │ {productName,
   │                         │   variantOptionName,     │  variantSize,
   │                         │   unitLabel,             │  variantOption,
   │                         │   pricePerUnit,          │  unitLabel,
   │                         │   quantity,              │  quantity,
   │                         │   totalPrice)            │  pricePerUnit}
   │                         │                          │
   │                         ├─ Clear cart ──────────→│ Delete CartItems
   │                         │                          │
   │← Response {             │                          │
   │   order: {              │                          │
   │     id,                 │                          │
   │     totalPrice,         │                          │
   │     status,             │                          │
   │     items: []           │                          │
   │   }                     │                          │
   │ }                       │                          │


4️⃣  VIEWING ORDER DETAILS
═══════════════════════════════════════════════════════════════════

Frontend                    API                     Database
   │                         │                          │
   ├─ GET /api/v1/orders/{id}→│                        │
   │                         ├─ Query Order ─────────→│
   │                         │  with items             │
   │                         │←─ Return Order ────────│
   │                         │                          │
   │                         ├─ Format items:          │
   │                         │  For each OrderItem:    │
   │                         │  {                      │
   │                         │   selectedSize: {       │
   │                         │    size: variantSize,   │
   │                         │    sizeEn: variantSizeEn│
   │                         │   },                    │
   │                         │   selectedFlavor: {     │
   │                         │    name: variantOption, │
   │                         │    nameEn: variantOptionEn│
   │                         │   },                    │
   │                         │   selectedUnit: {       │
   │                         │    label: unitLabel,    │
   │                         │    labelEn: unitLabelEn,│
   │                         │    piecesPerUnit        │
   │                         │   },                    │
   │                         │   quantity,             │
   │                         │   pricing: {            │
   │                         │    pricePerUnit,        │
   │                         │    subtotal             │
   │                         │   }                     │
   │                         │  }                      │
   │                         │                          │
   │← Response {             │                          │
   │   order: {              │                          │
   │     id,                 │                          │
   │     totalPrice,         │                          │
   │     status,             │                          │
   │     items: [{           │                          │
   │       product {},       │                          │
   │       selectedSize {},  │                          │
   │       selectedFlavor {},│                          │
   │       selectedUnit {},  │                          │
   │       quantity,         │                          │
   │       pricing {}        │                          │
   │     }],                 │                          │
   │     statusHistory: []   │                          │
   │   }                     │                          │
   │ }                       │                          │
```

---

## 📐 Data Structure Evolution

```
BEFORE (Raw Objects):
═══════════════════════════════════════════════════════════════════

CartItem {
  id
  quantity
  variant: {          ← Raw object
    id
    size
    sizeEn
    stock
    product: {...}
    units: [...]
    options: [...]
  }
  productUnit: {...}  ← Raw object
  variantOption: {...}← Raw object
}


AFTER (Formatted Structure):
═══════════════════════════════════════════════════════════════════

FormattedCartItem {
  id
  quantity
  product: {
    id
    name
    nameEn
    image
    category {...}
    brand {...}
  }
  selectedVariant: {  ← Clear & organized
    id
    size
    sizeEn
    stock
  }
  selectedOption: {   ← null or populated
    id
    name
    nameEn
    stock
    priceOverride
  }
  selectedUnit: {     ← Clear structure
    id
    unit
    label
    labelEn
    piecesPerUnit
    price
    compareAtPrice
  }
  pricing: {          ← Calculated values
    pricePerUnit
    compareAtPricePerUnit
    subtotal
  }
}
```

---

## 🔄 Merge Prevention Logic

```
CART LOOKUP: variantId + variantOptionId + productUnitId
════════════════════════════════════════════════════════════════════

Scenario 1: Same product, same size, NO flavor
Product A (Size: 1KG, Flavor: None) → Item 1
Product A (Size: 1KG, Flavor: None) → INCREMENT QUANTITY
Result: 1 item, qty = 2

Scenario 2: Same product, same size, DIFFERENT flavors
Product A (Size: 1KG, Flavor: None)   → Item 1
Product A (Size: 1KG, Flavor: Vanilla) → Item 2
Result: 2 SEPARATE items ✅ (variantOptionId ≠ null)

Scenario 3: Same product, DIFFERENT sizes
Product A (Size: 1KG)  → Item 1
Product A (Size: 2KG)  → Item 2
Result: 2 SEPARATE items ✅ (variantId different)

Scenario 4: Different products
Product A → Item 1
Product B → Item 2
Result: 2 SEPARATE items ✅ (variantId different)
```

---

## 💰 Pricing Logic

```
PRICE CALCULATION:
════════════════════════════════════════════════════════════════════

Priority Order:
1. If VariantOption (Flavor) selected:
   → Use: variantOption.priceOverride
   
2. If NO Flavor but Unit selected:
   → Use: productUnit.price
   
3. Fallback (no unit):
   → Use: 0 (or variant.stock.price if exists)

Formula:
─────────────────────────────────────────────────────────────
pricePerUnit = variantOption?.priceOverride ?? productUnit?.price ?? 0
compareAtPrice = (has priceOverride) ? null : productUnit?.compareAtPrice
subtotal = pricePerUnit × quantity
total = SUM(all subtotals) - discounts
─────────────────────────────────────────────────────────────

Example 1: Product with Flavor
─────────────────────────────────────────────────────────────
Variant Price: 3.50
Flavor Addon: +2.00
──────────────────────
Price per Unit: 5.50 (override applies)
Quantity: 2
Subtotal: 11.00

Example 2: Product with Unit
─────────────────────────────────────────────────────────────
Variant: 1 KG
Unit: Carton (10 pieces)
Unit Price: 35.00
──────────────────────
Price per Unit: 35.00
Quantity: 2
Subtotal: 70.00
```

---

## ✅ Verification Checklist Flow

```
Request Processing:
════════════════════════════════════════════════════════════════════

    ↓
 RECEIVE REQUEST
    ↓
 AUTHENTICATE (JWT)
    ├─ Valid? → Continue
    └─ Invalid? → Return 401
    ↓
 VALIDATE INPUT (Zod)
    ├─ Valid? → Continue
    └─ Invalid? → Return 400 + errors
    ↓
 QUERY DATABASE
    ├─ Load via CART_ITEM_INCLUDE
    ├─ Get all relations
    └─ Handle NULL safely
    ↓
 FORMAT RESPONSE (formatCartItem)
    ├─ Handle null values
    ├─ Calculate pricing
    ├─ Build structure
    └─ Ensure all fields present
    ↓
 RETURN RESPONSE
    ├─ Success → { success: true, data: {...} }
    └─ Error → { success: false, error: "..." }
```

---

## 🎯 API Response Patterns

```
SUCCESS RESPONSES:
════════════════════════════════════════════════════════════════════

GET /api/v1/cart (200):
{
  "success": true,
  "data": {
    "items": [...],
    "total": 25.50,
    "itemCount": 2
  }
}

POST /api/v1/cart (201):
{
  "success": true,
  "data": {
    "item": { /* formatted */ }
  }
}

POST /api/v1/orders (201):
{
  "success": true,
  "data": {
    "order": { /* full order */ }
  }
}


ERROR RESPONSES:
════════════════════════════════════════════════════════════════════

Unauthorized (401):
{
  "success": false,
  "error": "Unauthorized"
}

Validation Error (400):
{
  "success": false,
  "error": "Validation failed",
  "errors": { "field": ["error message"] }
}

Business Logic Error (400):
{
  "success": false,
  "error": "Insufficient stock for 'Product - Size - Flavor'. Available: 3"
}

Not Found (404):
{
  "success": false,
  "error": "Cart item not found"
}
```

---

## 📱 Mobile App Integration

```
Mobile App ──→ JWT Auth ──→ /api/v1/auth/login
                                    ↓
                           JWT Token stored
                                    ↓
Mobile App ──→ Authenticated Request ──→ /api/v1/cart
             (with Bearer token)              ↓
                                   Same formatted response
                                    ↓
                          Render in Mobile UI
```

---

**Flow Diagram Created**: ✅  
**All endpoints illustrated**: ✅  
**Data structures shown**: ✅  
**Logic flows explained**: ✅
