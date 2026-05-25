# Frontend Integration Guide - Cart & Orders

## نظرة عامة على البيانات المحفوظة والمُرسلة

### 1. في مرحلة السلة (Cart)

عندما يضيف المستخدم منتج بحجم معين ونكهة معينة إلى السلة:

```typescript
// البيانات المحفوظة في Database (CartItem)
{
  id: string,
  buyerId: string,
  variantId: string,        // الحجم (مثل: 1 كيلو، 2 كيلو)
  variantOptionId?: string, // النكهة (مثل: فانيليا، شوكولا) - اختياري
  productUnitId?: string,   // وحدة البيع (مثل: قطعة، دزينة، كرتونة) - اختياري
  quantity: number,         // الكمية
}
```

### 2. الـ Response من Cart API

عند استدعاء `GET /api/v1/cart`:

```typescript
{
  success: true,
  data: {
    items: [
      {
        id: "cart-item-1",
        quantity: 2,
        product: {
          id: "prod-1",
          name: "سكر أبيض",
          nameEn: "White Sugar",
          image: "https://...",
          category: {...},
          brand: {...}
        },
        // الحجم المختار (من variant)
        selectedVariant: {
          id: "var-1",
          size: "1 كيلو",
          sizeEn: "1 KG",
          stock: 100
        },
        // النكهة المختارة (من variantOption) - null إذا لم تُختر
        selectedOption: {
          id: "opt-1",
          name: "نكهة فانيليا",
          nameEn: "Vanilla",
          stock: 50,
          priceOverride: 5.50  // سعر إضافي للنكهة
        },
        // وحدة البيع المختارة (من productUnit)
        selectedUnit: {
          id: "unit-1",
          unit: "PIECE",
          label: "قطعة",
          labelEn: "Piece",
          piecesPerUnit: 1,
          price: 3.50,
          compareAtPrice: 4.00
        },
        // معلومات السعر
        pricing: {
          pricePerUnit: 5.50,  // السعر النهائي (من النكهة أو الوحدة)
          compareAtPricePerUnit: null,
          subtotal: 11.00      // pricePerUnit * quantity
        }
      }
    ],
    total: 25.50,
    itemCount: 2
  }
}
```

### 3. عند إنشاء طلب (Checkout)

البيانات المرسلة:
```typescript
POST /api/v1/orders
{
  couponCode?: "CODE123",
  deliveryAddress: "شارع النيل، عمّان",
  deliveryCity: "Amman",
  buyerNotes?: "توصيل سريع من فضلك"
}
```

### 4. البيانات المحفوظة في Order

عند حفظ الطلب في Database:

```typescript
// Order في Database
{
  id: string,
  buyerId: string,
  totalPrice: number,
  deliveryAddress: string,
  deliveryCity: string,
  buyerNotes?: string,
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED",
  items: [
    {
      id: string,
      productId: string,
      productName: string,
      productNameEn: string,
      productImage: string,
      // الحجم المختار - محفوظ كـ snapshot
      variantSize: "1 كيلو",
      variantSizeEn: "1 KG",
      // النكهة المختارة - محفوظة كـ snapshot
      variantOptionName?: "فانيليا",
      variantOptionNameEn?: "Vanilla",
      // وحدة البيع - محفوظة كـ snapshot
      unit: "PIECE",
      piecesPerUnit: 1,
      unitLabel: "قطعة",
      unitLabelEn: "Piece",
      quantity: 2,
      pricePerUnit: 5.50,
      totalPrice: 11.00
    }
  ]
}
```

### 5. الـ Response من Orders API

عند استدعاء `GET /api/v1/orders/{id}`:

```typescript
{
  success: true,
  data: {
    order: {
      id: "order-1",
      buyerId: "user-1",
      totalPrice: 25.50,
      deliveryAddress: "شارع النيل",
      deliveryCity: "Amman",
      status: "PENDING",
      items: [
        {
          id: "item-1",
          product: {
            id: "prod-1",
            name: "سكر أبيض",
            nameEn: "White Sugar",
            image: "https://..."
          },
          // الحجم الذي تم اختياره عند الشراء
          selectedSize: {
            size: "1 كيلو",
            sizeEn: "1 KG"
          },
          // النكهة التي تم اختيارها عند الشراء
          selectedFlavor: {
            name: "فانيليا",
            nameEn: "Vanilla"
          },
          // وحدة البيع
          selectedUnit: {
            label: "قطعة",
            labelEn: "Piece",
            piecesPerUnit: 1
          },
          quantity: 2,
          pricing: {
            pricePerUnit: 5.50,
            subtotal: 11.00
          }
        }
      ],
      buyerNotes: "توصيل سريع",
      statusHistory: [
        { status: "PENDING", timestamp: "2025-01-15T10:00:00Z", note: null }
      ]
    }
  }
}
```

## Frontend Implementation Checklist

### في صفحة السلة (Cart Page):

- [ ] عرض **Product Name** من `item.product.name`
- [ ] عرض **Product Image** من `item.product.image`
- [ ] عرض **Selected Size** من `item.selectedVariant.size` (عربي) أو `item.selectedVariant.sizeEn` (إنجليزي)
- [ ] عرض **Selected Flavor** من `item.selectedOption.name` (إن وجدت)
- [ ] عرض **Selected Unit** من `item.selectedUnit.label` (عربي) أو `item.selectedUnit.labelEn` (إنجليزي)
- [ ] عرض **Quantity** من `item.quantity`
- [ ] عرض **Price Per Unit** من `item.pricing.pricePerUnit`
- [ ] عرض **Subtotal** من `item.pricing.subtotal`
- [ ] عرض **Total** من `response.data.total`
- [ ] السماح بـ **Update Quantity** عبر `PATCH /api/v1/cart/{itemId}`
- [ ] السماح بـ **Remove Item** عبر `DELETE /api/v1/cart/{itemId}`

### في صفحة التفاصيل (Order Details Page):

- [ ] عرض **Order ID** من `order.id`
- [ ] عرض **Order Status** من `order.status` مع لون مناسب
- [ ] عرض **Delivery Address** من `order.deliveryAddress`
- [ ] عرض جميع **Order Items** مع:
  - [ ] **Product Info**: name, image
  - [ ] **Size**: من `item.selectedSize.size`
  - [ ] **Flavor** (if applicable): من `item.selectedFlavor.name`
  - [ ] **Unit**: من `item.selectedUnit.label`
  - [ ] **Quantity** و **Price**
- [ ] عرض **Order Total** من `order.totalPrice`
- [ ] عرض **Buyer Notes** من `order.buyerNotes` (if applicable)
- [ ] عرض **Status History** من `order.statusHistory` كـ timeline

## قواعس البيانات المهمة

### 1. **منع الـ Merge**
```
// هذان الـ items لا يتم merge حتى مع نفس الـ product و variant:
Item 1: Product "سكر" + Size "1 KG" + Flavor "None"
Item 2: Product "سكر" + Size "1 KG" + Flavor "Vanilla"

// السبب: variantOptionId مختلف (null vs uuid)
// النتيجة: يظهران كـ 2 items منفصلة في السلة
```

### 2. **حساب السعر الصحيح**
```
pricePerUnit = variantOption.priceOverride ?? productUnit.price ?? 0

// أولويات:
// 1. إذا اختار flavor، استخدم priceOverride من الـ flavor
// 2. وإلا، استخدم سعر الـ unit العادي
// 3. وإلا (fallback)، استخدم 0
```

### 3. **الـ Stock Check**
```
// إذا اختار flavor:
if (variantOption.stock < quantity) -> error

// وإلا:
if (variant.stock < quantity) -> error
```

## أمثلة للـ Display

### Cart Item Display Example:
```
┌─────────────────────────────────────┐
│ سكر أبيض - 1 كيلو - نكهة فانيليا   │
│ [Image]     الكمية: 2              │
│             3.50 د.أ × 2 = 7 د.أ   │
│                    [✕] [↑] [↓]    │
└─────────────────────────────────────┘
```

### Order Item Display Example:
```
┌─────────────────────────────────────┐
│ الطلب #ORDER-123                    │
│ الحالة: قيد المعالجة               │
├─────────────────────────────────────┤
│ سكر أبيض - 1 كيلو - نكهة فانيليا  │
│ الكمية: 2 قطع × 3.50 د.أ = 7 د.أ  │
├─────────────────────────────────────┤
│ الإجمالي: 25.50 د.أ                │
│ العنوان: شارع النيل، عمّان         │
│ ملاحظات: توصيل سريع من فضلك       │
└─────────────────────────────────────┘
```

## API الملخص السريع

| Operation | Endpoint | Method | Purpose |
|-----------|----------|--------|---------|
| Get Cart | `/api/v1/cart` | GET | جلب جميع items في السلة |
| Add to Cart | `/api/v1/cart` | POST | إضافة item جديد إلى السلة |
| Update Item | `/api/v1/cart/{itemId}` | PATCH | تحديث الكمية |
| Remove Item | `/api/v1/cart/{itemId}` | DELETE | حذف item من السلة |
| List Orders | `/api/v1/orders` | GET | جلب قائمة الطلبات |
| Order Details | `/api/v1/orders/{id}` | GET | جلب تفاصيل طلب معين |
| Create Order | `/api/v1/orders` | POST | إنشاء طلب جديد من السلة |
| Update Order | `/api/v1/orders/{id}` | PATCH | تحديث ملاحظات أو عنوان |
