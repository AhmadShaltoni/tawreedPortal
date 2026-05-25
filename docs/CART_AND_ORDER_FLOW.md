# 🛒 دليل شامل: السلة والطلبات مع النكهات والأحجام

> **للمطورين الـ frontend**: كل اختيار من الزبون (الحجم، النكهة، الوحدة) يُحفظ ويُعرض بوضوح في السلة والطلب.

---

## 📋 نظرة عامة

عند إضافة منتج للسلة، الزبون يختار:

1. **الحجم (Size)**: مثل "1 لتر" أو "2 كيلو" `[selectedVariant]`
2. **النكهة (Flavor)**: مثل "طبيعي" أو "بدون سكر" `[selectedOption]` (اختياري)
3. **وحدة البيع (Unit)**: مثل "قطعة" أو "دزينة" `[selectedUnit]`
4. **الكمية (Quantity)**: عدد الوحدات

جميع هذه الاختيارات **تظهر في السلة** و **تُحفظ في الطلب**.

---

## 🛍️ 1. إضافة منتج للسلة

### الطلب

```bash
POST /api/v1/cart
Authorization: Bearer {token}
Content-Type: application/json

{
  "variantId": "var-1l",           // الحجم المختار
  "variantOptionId": "opt-sugar-free",  // النكهة المختارة (اختياري)
  "productUnitId": "unit-dozen",   // وحدة البيع المختارة (اختياري)
  "quantity": 2                    // الكمية
}
```

### الرد: `201 Created`

```json
{
  "success": true,
  "data": {
    "item": {
      "id": "cart-item-123",
      "quantity": 2,
      
      // معلومات المنتج الأساسية
      "product": {
        "id": "prod-456",
        "name": "عصير برتقال",
        "nameEn": "Orange Juice",
        "image": "/uploads/juice.jpg",
        "category": { "id": "cat-1", "name": "مشروبات" },
        "brand": { "id": "brand-1", "name": "طازج" }
      },
      
      // الحجم المختار
      "selectedVariant": {
        "id": "var-1l",
        "size": "1 لتر",
        "sizeEn": "1L",
        "stock": 100
      },
      
      // النكهة المختارة (إن وجدت)
      "selectedOption": {
        "id": "opt-sugar-free",
        "name": "بدون سكر",
        "nameEn": "Sugar Free",
        "stock": 30,
        "priceOverride": 3.0
      },
      
      // وحدة البيع المختارة
      "selectedUnit": {
        "id": "unit-dozen",
        "unit": "DOZEN",
        "label": "دزينة",
        "labelEn": "Dozen",
        "piecesPerUnit": 12,
        "price": 28.0,
        "compareAtPrice": 30.0
      },
      
      // الأسعار
      "pricing": {
        "pricePerUnit": 28.0,      // السعر النهائي للوحدة الواحدة
        "compareAtPricePerUnit": 30.0,
        "subtotal": 56.0           // 28 × 2 دزينة
      }
    }
  }
}
```

---

## 🛒 2. عرض السلة

### الطلب

```bash
GET /api/v1/cart
Authorization: Bearer {token}
```

### الرد: جميع عناصر السلة مع كل الاختيارات

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cart-item-123",
        "quantity": 2,
        "product": { /* ... */ },
        "selectedVariant": { /* الحجم */ },
        "selectedOption": { /* النكهة */ },
        "selectedUnit": { /* الوحدة */ },
        "pricing": {
          "pricePerUnit": 28.0,
          "subtotal": 56.0
        }
      },
      {
        "id": "cart-item-124",
        "quantity": 1,
        "product": { 
          "name": "زنجر" 
        },
        "selectedVariant": {
          "size": "كبير",
          "sizeEn": "Large"
        },
        "selectedOption": {
          "name": "حار",
          "nameEn": "Spicy"
        },
        "selectedUnit": {
          "label": "قطعة",
          "piecesPerUnit": 1,
          "price": 5.0
        },
        "pricing": {
          "pricePerUnit": 5.0,
          "subtotal": 5.0
        }
      }
    ],
    "total": 61.0,
    "itemCount": 2
  }
}
```

---

## 📝 3. عرض السلة للمستخدم

### مثال: كيفية عرض السلة في التطبيق

```jsx
// React/React Native example
import { useEffect, useState } from 'react'

export function CartScreen() {
  const [cart, setCart] = useState(null)

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/cart', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setCart(data.data))
  }, [])

  if (!cart) return <div>جاري التحميل...</div>

  return (
    <div className="cart">
      <h1>سلتي</h1>
      
      {cart.items.map(item => (
        <div key={item.id} className="cart-item">
          {/* الصورة */}
          <img src={item.product.image} alt={item.product.name} />
          
          {/* المنتج والاختيارات */}
          <div>
            <h3>{item.product.name}</h3>
            
            {/* الحجم */}
            <p>الحجم: <strong>{item.selectedVariant.size}</strong></p>
            
            {/* النكهة (إذا كانت موجودة) */}
            {item.selectedOption && (
              <p>النكهة: <strong>{item.selectedOption.name}</strong></p>
            )}
            
            {/* الوحدة */}
            <p>الوحدة: <strong>{item.selectedUnit.label}</strong> ({item.selectedUnit.piecesPerUnit} قطع)</p>
            
            {/* الكمية والسعر */}
            <p>الكمية: {item.quantity}</p>
            <p className="price">
              {item.pricing.pricePerUnit} د.أ × {item.quantity} = 
              <strong>{item.pricing.subtotal} د.أ</strong>
            </p>
          </div>
        </div>
      ))}
      
      <div className="total">
        الإجمالي: <strong>{cart.total} د.أ</strong>
      </div>
    </div>
  )
}
```

---

## 📦 4. إنشاء طلب من السلة

### الطلب

```bash
POST /api/v1/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "deliveryAddress": "شارع الملك عبدالله، عمّان",
  "deliveryCity": "عمّان",
  "buyerNotes": "يرجى التوصيل قبل الساعة 3",
  "couponCode": "SAVE20"  // (اختياري)
}
```

### الرد: `200 OK`

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-789",
      "orderNumber": "ORD-20250525-12345",
      "totalPrice": 61.0,
      "status": "PENDING",
      "createdAt": "2025-05-25T10:30:00Z",
      "items": [
        {
          "id": "order-item-456",
          "quantity": 2,
          "product": {
            "id": "prod-456",
            "name": "عصير برتقال",
            "image": "/uploads/juice.jpg"
          },
          
          // النكهة والحجم **محفوظة بالضبط** كما اختارها الزبون
          "selectedSize": {
            "size": "1 لتر",
            "sizeEn": "1L"
          },
          "selectedFlavor": {
            "name": "بدون سكر",
            "nameEn": "Sugar Free"
          },
          "selectedUnit": {
            "label": "دزينة",
            "labelEn": "Dozen",
            "piecesPerUnit": 12
          },
          
          "pricing": {
            "pricePerUnit": 28.0,
            "subtotal": 56.0
          }
        }
      ]
    }
  }
}
```

---

## 👁️ 5. عرض تفاصيل الطلب

### الطلب

```bash
GET /api/v1/orders/{orderId}
Authorization: Bearer {token}
```

### الرد

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-789",
      "orderNumber": "ORD-20250525-12345",
      "status": "DELIVERED",
      "totalPrice": 61.0,
      "items": [
        {
          "product": {
            "id": "prod-456",
            "name": "عصير برتقال",
            "nameEn": "Orange Juice"
          },
          // جميع الاختيارات محفوظة ومعروضة
          "selectedSize": {
            "size": "1 لتر",
            "sizeEn": "1L"
          },
          "selectedFlavor": {
            "name": "بدون سكر",
            "nameEn": "Sugar Free"
          },
          "selectedUnit": {
            "label": "دزينة",
            "piecesPerUnit": 12
          },
          "quantity": 2,
          "pricing": {
            "pricePerUnit": 28.0,
            "subtotal": 56.0
          }
        }
      ]
    }
  }
}
```

---

## 📊 6. أمثلة واقعية

### مثال 1: منتج بنكهات وأحجام مختلفة

**المنتج: عصير برتقال**

المستخدم يختار:
- الحجم: 1 لتر
- النكهة: طبيعي
- الوحدة: دزينة
- الكمية: 1

**في السلة:**
```
عصير برتقال - 1 لتر - طبيعي - دزينة × 1 = 25 د.أ
```

**في الطلب:**
```
عصير برتقال
الحجم: 1 لتر
النكهة: طبيعي
الوحدة: دزينة (12 قطعة)
الكمية: 1
السعر: 25 د.أ
```

---

### مثال 2: نفس المنتج مع نكهات مختلفة

**المنتج: عصير برتقال**

المستخدم يضيف **مرتين**:

1. أولاً: 1 لتر - طبيعي - دزينة × 1
2. ثانياً: 1 لتر - بدون سكر - دزينة × 1

**في السلة: عنصرين منفصلين**
```
1. عصير برتقال - 1 لتر - طبيعي - دزينة × 1 = 25 د.أ
2. عصير برتقال - 1 لتر - بدون سكر - دزينة × 1 = 28 د.أ
```

**المهم**: لا يتم دمج العنصرين! لأن النكهة مختلفة.

**في الطلب: سطرين منفصلين**
```
السطر 1: عصير برتقال - الحجم: 1 لتر - النكهة: طبيعي - 25 د.أ
السطر 2: عصير برتقال - الحجم: 1 لتر - النكهة: بدون سكر - 28 د.أ
الإجمالي: 53 د.أ
```

---

### مثال 3: منتج بدون نكهات

**المنتج: أرز**

المستخدم يختار:
- الحجم: 5 كيلو
- النكهة: (لا توجد)
- الوحدة: قطعة
- الكمية: 3

**في السلة:**
```
أرز - 5 كيلو - قطعة × 3 = 15 د.أ
```

**في الطلب:**
```
أرز
الحجم: 5 كيلو
النكهة: بلا (null)
الوحدة: قطعة
الكمية: 3
السعر: 15 د.أ
```

---

## 🔄 7. تحديث كمية عنصر في السلة

### الطلب

```bash
PATCH /api/v1/cart/{itemId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 5
}
```

### الرد: نفس بنية الـ item الكاملة

---

## ❌ 8. حذف عنصر من السلة

### الطلب

```bash
DELETE /api/v1/cart/{itemId}
Authorization: Bearer {token}
```

### الرد

```json
{
  "success": true,
  "data": {
    "message": "Item removed from cart"
  }
}
```

---

## ⚠️ 9. الحالات الخاصة

### الحالة 1: منتج يجب اختيار نكهة له

إذا كان `variant.options.length > 0` و لم يتم تمرير `variantOptionId`:

```json
{
  "success": false,
  "error": "Please select an option (e.g., flavor)"
}
```

**الحل**: تمرير `variantOptionId` المختار.

### الحالة 2: مخزون غير كافي

```json
{
  "success": false,
  "error": "Only 5 items available for this option"
}
```

### الحالة 3: نفس المنتج بنفس الاختيارات

إذا حاول المستخدم إضافة منتج **بنفس** الحجم والنكهة والوحدة:

→ **الكمية تُزداد** في نفس عنصر السلة (لا يُضاف عنصر جديد)

---

## 📊 10. جدول سريع: ماذا يُرجع كل endpoint

| Endpoint | الرد |
|----------|------|
| `POST /api/v1/cart` | عنصر واحد مع كل الاختيارات |
| `GET /api/v1/cart` | قائمة العناصر مع كل الاختيارات |
| `PATCH /api/v1/cart/{id}` | عنصر واحد محدّث مع كل الاختيارات |
| `DELETE /api/v1/cart/{id}` | رسالة نجاح |
| `POST /api/v1/orders` | طلب كامل مع جميع الاختيارات المحفوظة |
| `GET /api/v1/orders` | قائمة الطلبات مع جميع الاختيارات المحفوظة |
| `GET /api/v1/orders/{id}` | تفاصيل طلب واحد مع جميع الاختيارات |

---

## 🎯 الخلاصة

✅ **جميع اختيارات الزبون** (الحجم، النكهة، الوحدة) **محفوظة بوضوح**

✅ **تظهر في السلة** بحيث يرى الزبون اختياراته قبل الشراء

✅ **تُحفظ في الطلب** بحيث يعرف الموظف بالضبط ماذا يُحضّر

✅ **نفس المنتج بنكهات مختلفة** = عناصر منفصلة (لا تدمج)

---

## 📚 ملفات إضافية

- [PRODUCT_API_QUICK_START.md](PRODUCT_API_QUICK_START.md) - تفاصيل المنتجات والاختيارات
- [PRODUCT_API_SCHEMA.md](PRODUCT_API_SCHEMA.md) - JSON schema تقنية
- [MOBILE_API.md](MOBILE_API.md) - جميع endpoints

**اسأل إذا احتجت توضيح أي نقطة!** ✨
