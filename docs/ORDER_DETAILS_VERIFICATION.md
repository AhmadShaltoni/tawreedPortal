# 📋 تحليل شامل - نقل تفاصيل الطلبات من الموبايل إلى الداشبورد

**التاريخ:** 31 مايو 2026  
**الحالة:** ✅ معظم التفاصيل يتم إرسالها، لكن **⚠️ النكهات لا تُعرض في الداشبورد**

---

## 1. البيانات المرسلة من تطبيق الموبايل → API

### POST `/api/v1/orders` - إنشاء الطلب

عند تأكيد الطلب من الموبايل، يتم إرسال **بيانات العربة (Cart Items)** التي تحتوي على:

```json
{
  "deliveryAddress": "عنوان التسليم",
  "deliveryCity": "عمّان",
  "buyerNotes": "ملاحظات من المشتري",
  "couponCode": "CODE123 (اختياري)"
}
```

### Cart Item Structure (البيانات المرسلة):

كل عنصر في العربة يحتوي على:

| الحقل | البيانات | المثال |
|-------|---------|--------|
| **productId** | رقم المنتج | `prod-123` |
| **variantId** | رقم حجم المنتج | `var-456` |
| **variantSize** | حجم المنتج | `"2 كيلو"` / `"2kg"` |
| **variantSizeEn** | الحجم بالإنجليزية | `"2kg"` |
| **quantity** | الكمية المطلوبة | `5` |
| **variantOptionId** | رقم النكهة/اللون | `opt-789` |
| **variantOptionName** | اسم النكهة | `"تفاح"` / `"Apple"` |
| **variantOptionNameEn** | النكهة بالإنجليزية | `"Apple"` |
| **productUnitId** | رقم الوحدة | `unit-101` |
| **unitLabel** | نوع الوحدة | `"كرتونة (36 قطعة)"` |
| **unitLabelEn** | الوحدة بالإنجليزية | `"Carton (36 pcs)"` |
| **piecesPerUnit** | عدد القطع في الوحدة | `36` |
| **price** | السعر للوحدة | `25.50 د.أ` |

---

## 2. البيانات المخزنة في قاعدة البيانات (OrderItem Model)

### Model Schema:

```prisma
model OrderItem {
  // Product snapshot
  productName       String
  productNameEn     String?
  productImage      String?
  
  // Variant snapshot (الحجم)
  variantSize       String?      // ✅ يتم حفظه
  variantSizeEn     String?      // ✅ يتم حفظه
  
  // Option snapshot (النكهة) - **⚠️ المشكلة هنا**
  variantOptionName     String?   // ⚠️ يتم حفظه لكن لا يتم عرضه!
  variantOptionNameEn   String?   // ⚠️ يتم حفظه لكن لا يتم عرضه!
  
  // Unit snapshot (الوحدة)
  unitLabel         String?      // ✅ يتم حفظه وعرضه
  unitLabelEn       String?      // ✅ يتم حفظه وعرضه
  piecesPerUnit     Int
  
  // Pricing
  quantity          Int          // ✅ يتم حفظه وعرضه
  unit              Unit         // ✅ يتم حفظه
  pricePerUnit      Float        // ✅ يتم حفظه وعرضه
  totalPrice        Float        // ✅ يتم حفظه وعرضه
}
```

### Confirmed: البيانات يتم حفظها بنجاح ✅

في `app/api/v1/orders/route.ts` عند `POST`، كل البيانات تُخزّن:

```typescript
items: {
  create: cartItems.map((item) => ({
    productId: item.variant.product.id,
    productName: item.variant.product.name,
    productNameEn: item.variant.product.nameEn,
    productImage: item.variant.product.image,
    
    // Variant (الحجم)
    variantSize: item.variant.size,
    variantSizeEn: item.variant.sizeEn,
    
    // Option (النكهة) ✅
    variantOptionName: item.variantOption?.name ?? null,      // ✅ يُحفظ
    variantOptionNameEn: item.variantOption?.nameEn ?? null,  // ✅ يُحفظ
    
    // Unit (الوحدة)
    unitLabel: item.productUnit?.label ?? null,
    unitLabelEn: item.productUnit?.labelEn ?? null,
    piecesPerUnit: item.productUnit?.piecesPerUnit ?? 1,
    
    // Pricing
    quantity: item.quantity,
    unit,
    pricePerUnit: unitPrice,
    totalPrice: unitPrice * item.quantity,
  })),
}
```

---

## 3. عرض البيانات في الداشبورد (Admin Dashboard)

### الملف: `app/admin/orders/[id]/OrderDetailClient.tsx`

#### ما يتم عرضه حالياً: ✅

```typescript
{order.items.map((item) => (
  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
      {/* الصورة ✅ */}
      <Image src={item.productImage || item.product.image} ... />
    </div>
    <div className="flex-1">
      {/* اسم المنتج ✅ */}
      <p className="font-medium text-gray-900">
        {lang === 'ar' ? item.productName : (item.productNameEn || item.productName)}
      </p>
      
      <div className="text-sm text-gray-600 space-y-0.5">
        {/* الحجم ✅ */}
        {item.variantSize && (
          <p>{lang === 'ar' ? item.variantSize : (item.variantSizeEn || item.variantSize)}</p>
        )}
        
        {/* الوحدة ✅ */}
        {item.unitLabel && (
          <p>{lang === 'ar' ? item.unitLabel : (item.unitLabelEn || item.unitLabel)}</p>
        )}
        
        {/* النكهة ❌ MISSING! */}
        {/* لا يوجد عرض للنكهة هنا */}
      </div>
      
      {/* السعر والكمية ✅ */}
      <p className="text-sm text-gray-500 mt-1">
        {item.quantity} × {formatCurrency(item.pricePerUnit)}
      </p>
    </div>
    
    {/* الإجمالي ✅ */}
    <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</p>
  </div>
))}
```

#### المشكلة: ⚠️ النكهات لا تُعرض

**البيانات موجودة في قاعدة البيانات:**
- `item.variantOptionName` ✅
- `item.variantOptionNameEn` ✅

**لكن لا تُعرض في الـ UI** ❌

---

## 4. الـ API Endpoint - GET `/api/v1/orders/[id]`

### الحالة: ✅ جيدة

في `app/api/v1/orders/[id]/route.ts`، البيانات تُرسل بشكل صحيح:

```typescript
const formattedItems = order.items.map((item) => ({
  id: item.id,
  product: item.product,
  
  // الحجم ✅
  selectedSize: {
    size: item.variantSize,
    sizeEn: item.variantSizeEn,
  },
  
  // النكهة ✅ يُرسل من API
  selectedFlavor: item.variantOptionName ? {
    name: item.variantOptionName,
    nameEn: item.variantOptionNameEn,
  } : null,
  
  // الوحدة ✅
  selectedUnit: {
    label: item.unitLabel,
    labelEn: item.unitLabelEn,
    piecesPerUnit: item.piecesPerUnit,
  },
  
  quantity: item.quantity,
  unit: item.unit,
  pricePerUnit: item.pricePerUnit,
  subtotal: item.totalPrice,
}))
```

**النتيجة:**
```json
{
  "items": [
    {
      "id": "item-123",
      "product": { "id": "prod-1", "name": "تفاح أحمر" },
      "selectedSize": { "size": "2 كيلو", "sizeEn": "2kg" },
      "selectedFlavor": {
        "name": "تفاح",
        "nameEn": "Apple"
      },
      "selectedUnit": {
        "label": "كرتونة (36 قطعة)",
        "labelEn": "Carton (36 pcs)",
        "piecesPerUnit": 36
      },
      "quantity": 5,
      "pricePerUnit": 25.50,
      "subtotal": 127.50
    }
  ]
}
```

---

## 5. ملخص التدفق الكامل

### ✅ ما يعمل بشكل صحيح:

| الخطوة | الحالة | الملاحظة |
|------|--------|---------|
| 1️⃣ الموبايل يرسل البيانات | ✅ | جميع التفاصيل موجودة (الحجم، النكهة، الوحدة) |
| 2️⃣ API يستقبل البيانات | ✅ | `POST /api/v1/orders` يعالجها |
| 3️⃣ حفظ في قاعدة البيانات | ✅ | جميع الحقول تُحفظ في OrderItem |
| 4️⃣ جلب البيانات (Admin API) | ✅ | `getAdminOrderById()` يجلب كل التفاصيل |
| 5️⃣ عرض في الداشبورد | ⚠️ | **النكهات لا تُعرض** (موجودة لكن مختفية) |

### ❌ المشاكل المكتشفة:

**المشكلة #1: النكهات (Flavors) لا تُعرض في OrderDetailClient**
- البيانات موجودة: `item.variantOptionName` و `item.variantOptionNameEn`
- لكن لا يوجد كود لعرضها في `OrderDetailClient.tsx`
- ✅ الحل: إضافة عرض النكهة في الـ UI

---

## 6. التعديلات المطلوبة

### التعديل #1: إضافة عرض النكهات في OrderDetailClient

**الملف:** `/app/admin/orders/[id]/OrderDetailClient.tsx`

**الموقع:** في قسم عرض تفاصيل العنصر (حوالي السطر 130-135)

**التعديل:**

```typescript
// قبل:
<div className="text-sm text-gray-600 space-y-0.5">
  {item.variantSize && (
    <p>{lang === 'ar' ? item.variantSize : (item.variantSizeEn || item.variantSize)}</p>
  )}
  {item.unitLabel && (
    <p>{lang === 'ar' ? item.unitLabel : (item.unitLabelEn || item.unitLabel)}</p>
  )}
</div>

// بعد:
<div className="text-sm text-gray-600 space-y-0.5">
  {/* الحجم */}
  {item.variantSize && (
    <p className="font-medium">{lang === 'ar' ? item.variantSize : (item.variantSizeEn || item.variantSize)}</p>
  )}
  
  {/* النكهة - جديد ✨ */}
  {item.variantOptionName && (
    <p className="text-blue-600">
      {lang === 'ar' ? `نكهة: ${item.variantOptionName}` : `Flavor: ${item.variantOptionNameEn || item.variantOptionName}`}
    </p>
  )}
  
  {/* الوحدة */}
  {item.unitLabel && (
    <p>{lang === 'ar' ? item.unitLabel : (item.unitLabelEn || item.unitLabel)}</p>
  )}
</div>
```

---

## 7. نموذج بيانات طلب فعلي

### مثال: طلب بـ تفاح أحمر، تفاح أخضر، وموز

```
╔════════════════════════════════════════════════════════════════╗
║                     تفاصيل الطلب #ORDER-001                   ║
╚════════════════════════════════════════════════════════════════╝

📦 العنصر 1:
├─ اسم المنتج: تفاح أحمر
├─ الحجم: 2 كيلو (2kg)
├─ نكهة: تفاح أحمر      ← ⚠️ لا يظهر حالياً
├─ الوحدة: كرتونة (36 قطعة)
├─ الكمية: 5 × 25.50 د.أ
└─ الإجمالي: 127.50 د.أ

📦 العنصر 2:
├─ اسم المنتج: تفاح أخضر
├─ الحجم: 1 كيلو (1kg)
├─ نكهة: تفاح أخضر      ← ⚠️ لا يظهر حالياً
├─ الوحدة: صندوق (24 قطعة)
├─ الكمية: 3 × 15.00 د.أ
└─ الإجمالي: 45.00 د.أ

📦 العنصر 3:
├─ اسم المنتج: موز
├─ الحجم: 1 كيلو (1kg)
├─ نكهة: لا توجد (منتج بدون نكهات)
├─ الوحدة: كيس (20 قطعة)
├─ الكمية: 2 × 12.00 د.أ
└─ الإجمالي: 24.00 د.أ

─────────────────────────────────────────────────────────────────
الإجمالي الكلي: 196.50 د.أ
```

---

## 8. الـ Response JSON من API (Mobile)

### GET `/api/v1/orders/123`

```json
{
  "order": {
    "id": "order-123",
    "orderNumber": "ORD-20260531-001",
    "status": "CONFIRMED",
    "totalPrice": 196.50,
    "deliveryAddress": "شارع الملك عبدالله، عمّان",
    "deliveryCity": "عمّان",
    "buyerNotes": "تسليم سريع من فضلك",
    "statusHistory": [
      {
        "status": "PENDING",
        "timestamp": "2026-05-31T10:00:00Z"
      },
      {
        "status": "CONFIRMED",
        "timestamp": "2026-05-31T10:15:00Z"
      }
    ],
    "items": [
      {
        "id": "item-001",
        "product": {
          "id": "prod-apple-red",
          "name": "تفاح أحمر",
          "nameEn": "Red Apple",
          "image": "/uploads/apple-red.jpg"
        },
        "selectedSize": {
          "size": "2 كيلو",
          "sizeEn": "2kg"
        },
        "selectedFlavor": {
          "name": "تفاح أحمر",
          "nameEn": "Red Apple"
        },
        "selectedUnit": {
          "label": "كرتونة (36 قطعة)",
          "labelEn": "Carton (36 pcs)",
          "piecesPerUnit": 36
        },
        "quantity": 5,
        "pricePerUnit": 25.50,
        "subtotal": 127.50
      },
      {
        "id": "item-002",
        "product": {
          "id": "prod-apple-green",
          "name": "تفاح أخضر",
          "nameEn": "Green Apple",
          "image": "/uploads/apple-green.jpg"
        },
        "selectedSize": {
          "size": "1 كيلو",
          "sizeEn": "1kg"
        },
        "selectedFlavor": {
          "name": "تفاح أخضر",
          "nameEn": "Green Apple"
        },
        "selectedUnit": {
          "label": "صندوق (24 قطعة)",
          "labelEn": "Box (24 pcs)",
          "piecesPerUnit": 24
        },
        "quantity": 3,
        "pricePerUnit": 15.00,
        "subtotal": 45.00
      },
      {
        "id": "item-003",
        "product": {
          "id": "prod-banana",
          "name": "موز",
          "nameEn": "Banana",
          "image": "/uploads/banana.jpg"
        },
        "selectedSize": {
          "size": "1 كيلو",
          "sizeEn": "1kg"
        },
        "selectedFlavor": null,
        "selectedUnit": {
          "label": "كيس (20 قطعة)",
          "labelEn": "Bag (20 pcs)",
          "piecesPerUnit": 20
        },
        "quantity": 2,
        "pricePerUnit": 12.00,
        "subtotal": 24.00
      }
    ]
  }
}
```

---

## 9. ملخص النتائج

### ✅ تم التحقق من:

1. **Mobile API (POST) ✅**
   - البيانات تُرسل بشكل صحيح من الموبايل
   - جميع التفاصيل موجودة (الحجم، النكهة، الوحدة، السعر)

2. **Database ✅**
   - جميع الحقول تُحفظ بنجاح في OrderItem
   - لا توجد أخطاء في الحفظ

3. **Admin API (GET) ✅**
   - البيانات تُجلب بشكل صحيح
   - النكهات موجودة في الـ response
   - الترجمة (AR/EN) تعمل

4. **Dashboard Display ⚠️**
   - معظم التفاصيل تُعرض بشكل صحيح
   - ❌ **النكهات لا تُعرض** (مختفية)

### 🎯 الإجراء المطلوب:

إضافة عرض النكهات (selectedFlavor) في `OrderDetailClient.tsx` - تعديل بسيط واحد فقط.

---

## 10. رابط الملفات المتأثرة

| الملف | الحالة | الإجراء |
|------|--------|--------|
| [app/api/v1/orders/route.ts](app/api/v1/orders/route.ts) | ✅ جيدة | لا يوجد تعديل |
| [app/api/v1/orders/[id]/route.ts](app/api/v1/orders/[id]/route.ts) | ✅ جيدة | لا يوجد تعديل |
| [actions/admin-orders.ts](actions/admin-orders.ts) | ✅ جيدة | لا يوجد تعديل |
| [app/admin/orders/[id]/OrderDetailClient.tsx](app/admin/orders/[id]/OrderDetailClient.tsx) | ⚠️ ناقصة | **يحتاج تعديل** |
| [prisma/schema.prisma](prisma/schema.prisma) | ✅ صحيح | لا يوجد تعديل |

