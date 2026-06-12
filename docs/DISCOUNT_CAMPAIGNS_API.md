# حملات الخصم - دليل مبرمج تطبيق الهاتف
# Discount Campaigns - Mobile Developer Guide

---

## 📋 نظرة عامة (Overview)

حملات الخصم هي نظام مستقل يسمح للمسؤول بتطبيق خصومات مؤقتة أو دائمة على المنتجات.
الخصم يتم حسابه تلقائياً عند طلب المنتجات من الـ API **بدون تعديل السعر الأصلي في قاعدة البيانات**.

**نقطة مهمة جداً للمبرمجين:** لا يحتاج تطبيق الهاتف لأي تعديل!
الخصم يتم تطبيقه تلقائياً على الأسعار في كل مكان:
- `/api/v1/products` - قائمة المنتجات
- `/api/v1/products/[id]` - تفاصيل منتج
- `/api/v1/marketing-sections/[slug]` - أقسام التسويق
- `/api/v1/home` - الصفحة الرئيسية
- `/api/v1/search` - نتائج البحث
- `/api/v1/cart` - سلة المشتريات

---

## 🎯 كيف يعمل النظام

### المبدأ الأساسي:
```
السعر الأصلي = 10 JOD (محفوظ في قاعدة البيانات - لا يتغير)
الخصم الفعال = 20%
السعر المعروض = 8 JOD (محسوب عند طلب الـ API)
```

### عند وجود خصم فعال:
- `price` ← السعر بعد الخصم (المعروض للمستخدم)
- `compareAtPrice` ← السعر الأصلي (المشطوب)
- `discountPercent` ← نسبة الخصم (جديد)

### عند عدم وجود خصم:
- `price` ← السعر العادي
- `compareAtPrice` ← null أو السعر الأصلي إذا كان هناك خصم يدوي سابق

---

## 🔗 API Endpoints

### Base URL
```
https://your-domain.com/api/v1
```

---

## 1. عرض حملات الخصم الفعالة

```
GET /api/v1/discount-campaigns
```

### Response:
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "clx1abc123",
        "name": "خصم نهاية الأسبوع",
        "nameEn": "Weekend Discount",
        "discountPercent": 5,
        "startDate": "2026-06-12T00:00:00.000Z",
        "endDate": "2026-06-19T00:00:00.000Z",
        "scope": "SPECIFIC_PRODUCTS",
        "collectionId": null,
        "categoryId": null,
        "collection": null,
        "category": null,
        "_count": { "products": 50 }
      },
      {
        "id": "clx2def456",
        "name": "خصم المشروبات",
        "nameEn": "Beverages Discount",
        "discountPercent": 15,
        "startDate": "2026-06-01T00:00:00.000Z",
        "endDate": null,
        "scope": "CATEGORY",
        "collectionId": null,
        "categoryId": "cat_beverages",
        "collection": null,
        "category": { "id": "cat_beverages", "name": "مشروبات", "nameEn": "Beverages", "slug": "beverages" },
        "_count": { "products": 0 }
      },
      {
        "id": "clx3ghi789",
        "name": "تخفيضات الصيف",
        "nameEn": "Summer Sale",
        "discountPercent": 20,
        "startDate": "2026-06-10T00:00:00.000Z",
        "endDate": "2026-06-13T23:59:59.000Z",
        "scope": "ALL_PRODUCTS",
        "collectionId": null,
        "categoryId": null,
        "collection": null,
        "category": null,
        "_count": { "products": 0 }
      }
    ]
  }
}
```

---

## 2. كيف يظهر الخصم في المنتجات

### في قائمة المنتجات (Card View):
```
GET /api/v1/products?view=card
```

```json
{
  "products": [
    {
      "id": "prod_001",
      "name": "سكر ناعم",
      "nameEn": "Fine Sugar",
      "image": "https://...",
      "brand": { "id": "...", "name": "العلالي" },
      "primaryCategory": { "id": "...", "name": "سكر" },
      "startingPrice": 1.43,
      "compareAtPrice": 1.50,
      "hasDiscount": true,
      "discountPercent": 5,
      "inStock": true
    }
  ]
}
```

**الحقول الجديدة:**
| Field | Type | Description |
|-------|------|-------------|
| `compareAtPrice` | number? | السعر الأصلي قبل الخصم (لعرضه مشطوباً) |
| `discountPercent` | number? | نسبة الخصم المطبقة (null = لا يوجد خصم حملة) |

### في تفاصيل المنتج:
```
GET /api/v1/products/[id]
```

```json
{
  "product": {
    "id": "prod_001",
    "name": "سكر ناعم",
    "discountPercent": 5,
    "variants": [
      {
        "id": "var_001",
        "size": "2 كيلو",
        "units": [
          {
            "id": "unit_001",
            "unit": "PIECE",
            "label": "قطعة",
            "price": 1.43,
            "compareAtPrice": 1.50,
            "isDefault": true
          },
          {
            "id": "unit_002",
            "unit": "CARTON",
            "label": "كرتونة (12 قطعة)",
            "price": 15.20,
            "compareAtPrice": 16.00,
            "isDefault": false
          }
        ]
      }
    ]
  }
}
```

### في سلة المشتريات:
```
GET /api/v1/cart
```

```json
{
  "items": [
    {
      "id": "cart_001",
      "quantity": 3,
      "product": { "id": "prod_001", "name": "سكر ناعم" },
      "selectedUnit": {
        "price": 1.43,
        "compareAtPrice": 1.50
      },
      "pricing": {
        "pricePerUnit": 1.43,
        "compareAtPricePerUnit": 1.50,
        "subtotal": 4.29,
        "discountPercent": 5
      }
    }
  ],
  "total": 4.29
}
```

---

## 📊 أنواع نطاقات الخصم (Scopes)

| Scope | Description (AR) | Description (EN) |
|-------|-------------------|-------------------|
| `ALL_PRODUCTS` | خصم على جميع منتجات المتجر | Discount on all store products |
| `SPECIFIC_PRODUCTS` | خصم على منتجات محددة | Discount on selected products only |
| `COLLECTION` | خصم على كل منتجات قسم تسويقي | Discount on all products in a marketing section |
| `CATEGORY` | خصم على كل منتجات فئة | Discount on all products in a category |

---

## ⚙️ قواعد العمل (Business Rules)

1. **السعر الأصلي لا يتغير أبداً** - الخصم محسوب ديناميكياً
2. **الخصم الأعلى يفوز** - إذا كان منتج في حملتين (5% و 10%)، يطبق 10%
3. **انتهاء تلقائي** - عند وصول `endDate`، ينتهي الخصم تلقائياً ويعود السعر الأصلي
4. **يمكن إيقاف الخصم يدوياً** - الأدمن يستطيع تعليق الحملة في أي وقت
5. **الخصم يظهر في كل مكان** - المنتجات، البحث، السلة، أقسام التسويق
6. **لا تعديل على تطبيق الهاتف** - الـ API يتكفل بكل الحسابات

---

## 📱 كيفية عرض الخصم في التطبيق

### عرض السعر المخفض:
```dart
// تحقق إذا كان هناك خصم
if (product.discountPercent != null && product.discountPercent > 0) {
  // عرض السعر الأصلي مشطوب
  Text(
    '${product.compareAtPrice} JOD',
    style: TextStyle(
      decoration: TextDecoration.lineThrough,
      color: Colors.grey,
    ),
  );
  
  // عرض السعر المخفض
  Text(
    '${product.startingPrice} JOD',
    style: TextStyle(
      color: Colors.red,
      fontWeight: FontWeight.bold,
    ),
  );
  
  // شارة الخصم
  Container(
    padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(
      color: Colors.red,
      borderRadius: BorderRadius.circular(4),
    ),
    child: Text(
      '-${product.discountPercent}%',
      style: TextStyle(color: Colors.white, fontSize: 10),
    ),
  );
}
```

### في بطاقة المنتج:
```
┌──────────────────────┐
│  ┌─────┐             │
│  │-5%  │   صورة      │
│  └─────┘             │
│                      │
│  سكر ناعم            │
│  ██ 1.43 JOD         │
│  ▬▬ 1.50 JOD ▬▬     │ ← مشطوب
└──────────────────────┘
```

---

## 🧪 اختبار سريع

```bash
# عرض حملات الخصم الفعالة
curl https://your-domain.com/api/v1/discount-campaigns

# عرض منتجات مع الخصم المطبق
curl https://your-domain.com/api/v1/products?view=card

# تفاصيل منتج (الأسعار ستكون مخفضة إذا كان ضمن حملة)
curl https://your-domain.com/api/v1/products/PRODUCT_ID
```

---

## 📝 ملخص

| Endpoint | التغيير |
|----------|---------|
| `GET /api/v1/discount-campaigns` | **جديد** - عرض حملات الخصم الفعالة |
| `GET /api/v1/products` | يرجع `discountPercent` و `compareAtPrice` عند وجود خصم |
| `GET /api/v1/products/[id]` | أسعار units مخفضة تلقائياً + `discountPercent` |
| `GET /api/v1/marketing-sections/[slug]` | أسعار units مخفضة تلقائياً |
| `GET /api/v1/home` | أسعار المنتجات في الأقسام الرئيسية مخفضة |
| `GET /api/v1/search` | أسعار نتائج البحث مخفضة |
| `GET /api/v1/cart` | أسعار السلة تعكس الخصم + `discountPercent` في pricing |

**لا يحتاج تطبيق الهاتف لأي تعديل في منطق السلة أو الطلب!**

---

**آخر تحديث:** يونيو 2026
