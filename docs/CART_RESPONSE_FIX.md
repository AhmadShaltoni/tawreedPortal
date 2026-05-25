# Cart Response Format Fix

## المشكلة التي تم حلها
**Problem**: GET /api/v1/cart endpoint كان يرجع raw objects (variant, productUnit) بدل البيانات المُنسقة  
**Solution**: تم تحسين `formatCartItem()` و `CART_ITEM_INCLUDE` للتأكد من:
1. تحميل جميع البيانات المطلوبة من Prisma بشكل صحيح
2. معالجة الحالات الـ edge cases (units قد تكون undefined)
3. ترجيع الـ response بالـ format الموحد

## التغييرات المُنفذة

### 1. **lib/cart-utils.ts** - تحسينات على `formatCartItem()`
```typescript
// BEFORE: Direct access without null checks
const selectedUnit = item.productUnit || item.variant.units.find(...)

// AFTER: Safe access with fallback
const variant = item.variant
const units = Array.isArray(variant?.units) ? variant.units : []
const selectedUnit = item.productUnit || units.find((u: any) => u.isDefault)
```

**فوائد**:
- ✅ معالجة آمنة للـ undefined values
- ✅ تجنب runtime errors عند عدم وجود units
- ✅ دعم كلا الخيارين: مختار من productUnit أو مختار افتراضي من variant.units

### 2. **lib/cart-utils.ts** - تحسينات على `CART_ITEM_INCLUDE`
```typescript
// BEFORE: Using bare `true` for relations
productUnit: true,
variantOption: true,

// AFTER: Explicit select for all needed fields
productUnit: {
  select: {
    id: true,
    unit: true,
    label: true,
    labelEn: true,
    piecesPerUnit: true,
    price: true,
    compareAtPrice: true,
  },
},
variantOption: {
  select: {
    id: true,
    name: true,
    nameEn: true,
    stock: true,
    priceOverride: true,
  },
},
```

**فوائد**:
- ✅ تحديد واضح للحقول المطلوبة
- ✅ تقليل حجم البيانات المُرسلة
- ✅ أمان أفضل (لا تُرسل حقول حساسة مثل passwords)

## Response Format الجديد

### GET /api/v1/cart
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cart-item-uuid",
        "quantity": 2,
        "product": {
          "id": "product-uuid",
          "name": "سكر أبيض",
          "nameEn": "White Sugar",
          "image": "https://...",
          "category": { "id": "...", "name": "..." },
          "brand": { "id": "...", "name": "..." }
        },
        "selectedVariant": {
          "id": "variant-uuid",
          "size": "1 كيلو",
          "sizeEn": "1 KG",
          "stock": 100
        },
        "selectedOption": {
          "id": "option-uuid",
          "name": "نكهة الفانيليا",
          "nameEn": "Vanilla Flavor",
          "stock": 50,
          "priceOverride": 5.50
        } // null إذا لم يتم اختيار نكهة
        ,
        "selectedUnit": {
          "id": "unit-uuid",
          "unit": "PIECE",
          "label": "قطعة",
          "labelEn": "Piece",
          "piecesPerUnit": 1,
          "price": 3.50,
          "compareAtPrice": 4.00
        },
        "pricing": {
          "pricePerUnit": 5.50,
          "compareAtPricePerUnit": null,
          "subtotal": 11.00
        }
      }
    ],
    "total": 25.50,
    "itemCount": 2
  }
}
```

### POST /api/v1/cart
عند إضافة item إلى السلة، يتم ترجيع الـ item المُضاف بنفس format:
```json
{
  "success": true,
  "data": {
    "item": { /* same format as GET items */ }
  }
}
```

### PATCH /api/v1/cart/{itemId}
عند تحديث الكمية، يتم ترجيع الـ item المُحدث:
```json
{
  "success": true,
  "data": {
    "item": { /* same format as GET items */ }
  }
}
```

## الـ Endpoints المُحدثة

| Endpoint | Method | Status | Response Format |
|----------|--------|--------|------------------|
| `/api/v1/cart` | GET | ✅ | `{ items, total, itemCount }` |
| `/api/v1/cart` | POST | ✅ | `{ item }` |
| `/api/v1/cart/{itemId}` | PATCH | ✅ | `{ item }` |
| `/api/v1/cart/{itemId}` | DELETE | ✅ | `{ message }` |
| `/api/v1/orders` | GET | ✅ | `{ orders, pagination }` |
| `/api/v1/orders/{id}` | GET | ✅ | `{ order }` |

## اختبار الإصلاح

### Test Case 1: إضافة item بدون flavor
```bash
POST /api/v1/cart
{
  "variantId": "uuid",
  "quantity": 2
}

# Response يجب أن يحتوي على:
# - selectedVariant مع size و sizeEn
# - selectedOption = null (لم نختر flavor)
# - selectedUnit مع pricing
```

### Test Case 2: إضافة item مع flavor
```bash
POST /api/v1/cart
{
  "variantId": "uuid",
  "variantOptionId": "uuid",  # flavor
  "quantity": 1
}

# Response يجب أن يحتوي على:
# - selectedVariant مع size
# - selectedOption مع name و priceOverride
# - selectedUnit مع pricing
```

### Test Case 3: الحصول على السلة
```bash
GET /api/v1/cart

# Response يجب أن يحتوي على array من الـ items
# كل item بـ format الجديد
# + total و itemCount
```

## فوائس التحديث

1. **وضوح الـ Selection**: كل اختيار المستخدم (size/flavor/unit) منفصل وواضح في الـ response
2. **Pricing الصحيح**: يحسب السعر بناءً على:
   - `priceOverride` من الـ flavor إن وجد
   - أو سعر الـ unit العادي
3. **منع الـ Merge**: products مع نفس size لكن flavors مختلفة لا يتم merge
4. **Data Completeness**: جميع البيانات المطلوبة للـ frontend موجودة:
   - معلومات المنتج
   - اختيار الـ size
   - اختيار الـ flavor (إن وجد)
   - اختيار الـ unit
   - تفاصيل الأسعار

## الملفات المُعدّلة

- ✅ `lib/cart-utils.ts` - تحسين `formatCartItem()` و `CART_ITEM_INCLUDE`
- ✅ `app/api/v1/cart/route.ts` - استخدام الـ formatter الجديد
- ✅ `app/api/v1/cart/[itemId]/route.ts` - استخدام الـ formatter الجديد
- ✅ `app/api/v1/orders/route.ts` - منسق بشكل صحيح من قبل
- ✅ `app/api/v1/orders/[id]/route.ts` - منسق بشكل صحيح من قبل

## ملاحظات مهمة

⚠️ **تأكد من**:
1. إعادة تحميل الـ server بعد التحديث: `npm run dev`
2. اختبار جميع الـ cases: بدون flavor، مع flavor، مع units مختلفة
3. التحقق من الـ pricing calculations
4. اختبار الـ cart persistence عند refresh الصفحة

✅ **تم التحقق من**:
- `npm run build` نجح بدون errors
- TypeScript compilation نجح
- جميع الـ endpoints تستخدم الـ formatter الجديد
