# 📱 دليل التكامل الشامل - Product API

> **للمبرمجين: اقرأوا هذا الملف أولاً** 
> يحتوي على ملخص كامل وسريع للبدء

---

## 🎯 ماذا يوفر API؟

كل منتج يأتي بـ **3 مستويات من المرونة**:

```
├─ Variants (الأحجام)
│  ├─ Units (وحدات البيع)
│  └─ Options (النكهات)
```

---

## 📊 مثال واحد شامل

### الطلب:
```bash
GET http://localhost:3000/api/v1/products/clz9x1a2b3c4d5e6f7g8h9i0
```

### الرد الكامل:

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "clz9x1a2b3c4d5e6f7g8h9i0",
      "name": "عصير برتقال الطبيعي",
      "nameEn": "Fresh Orange Juice",
      "image": "/uploads/juice.jpg",
      "brand": {
        "id": "brand-123",
        "name": "ماركة طازج",
        "logo": "/uploads/logo.jpg"
      },
      
      "variants": [
        {
          "id": "var-1l",
          "size": "1 لتر",
          "sizeEn": "1L",
          "stock": 100,
          "minOrderQuantity": 1,
          "isDefault": true,
          
          // ⬇️ الوحدات: قطعة واحدة, دزينة, كرتونة
          "units": [
            {
              "id": "unit-piece",
              "unit": "PIECE",
              "label": "قطعة",
              "piecesPerUnit": 1,
              "price": 2.5,
              "compareAtPrice": 3.0,
              "isDefault": true
            },
            {
              "id": "unit-dozen",
              "unit": "DOZEN",
              "label": "دزينة",
              "piecesPerUnit": 12,
              "price": 28.0,
              "compareAtPrice": 30.0,
              "isDefault": false
            },
            {
              "id": "unit-carton",
              "unit": "CARTON",
              "label": "كرتونة",
              "piecesPerUnit": 36,
              "price": 84.0,
              "isDefault": false
            }
          ],
          
          // ⬇️ النكهات: طبيعي, بدون سكر, مع فيتامين
          "options": [
            {
              "id": "opt-natural",
              "name": "طبيعي",
              "nameEn": "Natural",
              "stock": 50,
              "priceOverride": null
            },
            {
              "id": "opt-sugar-free",
              "name": "بدون سكر",
              "nameEn": "Sugar Free",
              "stock": 30,
              "priceOverride": 3.0
            },
            {
              "id": "opt-vitamin-c",
              "name": "مع فيتامين C",
              "nameEn": "Extra Vitamin C",
              "stock": 20,
              "priceOverride": 3.5
            }
          ]
        },
        
        // الحجم الثاني
        {
          "id": "var-2l",
          "size": "2 لتر",
          "sizeEn": "2L",
          "stock": 80,
          "isDefault": false,
          "units": [
            {
              "id": "unit-2l",
              "unit": "PIECE",
              "label": "قطعة",
              "price": 4.5,
              "isDefault": true
            }
          ],
          "options": [
            {
              "id": "opt-2l-natural",
              "name": "طبيعي",
              "stock": 80,
              "priceOverride": null
            }
          ]
        }
      ]
    }
  }
}
```

---

## 🎨 كيفية عرض البيانات

### ✅ عرض قائمة المنتجات (Product List)

استخدم **أول variant فقط** و **أول unit** للسرعة:

```javascript
const product = response.data.product;
const defaultVariant = product.variants[0];  // 1 لتر
const defaultUnit = defaultVariant.units[0];  // قطعة

console.log(`
  المنتج: ${product.name}
  السعر: ${defaultUnit.price} JOD  (أصلي: ${defaultUnit.compareAtPrice} JOD)
  الحجم: ${defaultVariant.size}
  المخزون: ${defaultVariant.stock}
`);
```

**النتيجة:**
```
المنتج: عصير برتقال الطبيعي
السعر: 2.5 JOD  (أصلي: 3.0 JOD)
الحجم: 1 لتر
المخزون: 100
```

---

### ✅ عرض صفحة التفاصيل (Product Detail)

عرض **جميع الأحجام والنكهات والوحدات**:

```javascript
// شاشة اختيار الحجم
console.log("الأحجام المتاحة:");
product.variants.forEach(v => {
  console.log(`- ${v.size} (${v.stock} متوفر)`);
});

// النتيجة:
// الأحجام المتاحة:
// - 1 لتر (100 متوفر)
// - 2 لتر (80 متوفر)
```

---

```javascript
// عند اختيار حجم: 1 لتر
const selectedVariant = product.variants[0];

// شاشة اختيار النكهة
console.log(`النكهات المتاحة للحجم ${selectedVariant.size}:`);
selectedVariant.options.forEach(opt => {
  let priceText = "";
  if (opt.priceOverride) {
    priceText = ` - سعر خاص: ${opt.priceOverride} JOD`;
  }
  console.log(`- ${opt.name} (${opt.stock} متوفر)${priceText}`);
});

// النتيجة:
// النكهات المتاحة للحجم 1 لتر:
// - طبيعي (50 متوفر)
// - بدون سكر (30 متوفر) - سعر خاص: 3.0 JOD
// - مع فيتامين C (20 متوفر) - سعر خاص: 3.5 JOD
```

---

```javascript
// شاشة اختيار وحدة البيع
console.log(`وحدات البيع المتاحة:`);
selectedVariant.units.forEach(unit => {
  console.log(
    `- ${unit.label}: ${unit.price} JOD (${unit.piecesPerUnit} قطع)`
  );
});

// النتيجة:
// وحدات البيع المتاحة:
// - قطعة: 2.5 JOD (1 قطع)
// - دزينة: 28.0 JOD (12 قطع)
// - كرتونة: 84.0 JOD (36 قطع)
```

---

## 💰 حساب السعر النهائي

```javascript
// اختيارات المستخدم:
const selectedVariant = product.variants[0];     // 1 لتر
const selectedOption = selectedVariant.options[1]; // بدون سكر
const selectedUnit = selectedVariant.units[1];   // دزينة
const quantity = 2;                              // 2 دزينة

// حساب السعر
let price = selectedUnit.price;  // 28.0 JOD للدزينة

// إذا كان هناك override للنكهة، استخدمه
if (selectedOption.priceOverride) {
  price = selectedOption.priceOverride;  // 3.0 JOD للقطعة الواحدة
  // ملاحظة: هذا override يُطبق على كل وحدة
  price = selectedOption.priceOverride * selectedUnit.piecesPerUnit;
  // 3.0 * 12 = 36.0 JOD للدزينة
}

const totalPrice = price * quantity;  // 36.0 * 2 = 72.0 JOD

console.log(`
  الحجم: ${selectedVariant.size}
  النكهة: ${selectedOption.name}
  الوحدة: ${selectedUnit.label}
  السعر للوحدة: ${price} JOD
  الكمية: ${quantity}
  الإجمالي: ${totalPrice} JOD
`);
```

---

## 🛒 إضافة للسلة

```javascript
// البيانات المطلوبة
const cartItem = {
  variantId: "var-1l",              // نسخة الحجم 1 لتر
  variantOptionId: "opt-sugar-free", // النكهة: بدون سكر
  productUnitId: "unit-dozen",      // الوحدة: دزينة
  quantity: 2                       // الكمية: دزينتان
};

// الطلب
const response = await fetch(
  'http://localhost:3000/api/v1/cart',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify(cartItem)
  }
);
```

---

## 📋 جدول سريع: ماذا يُستخدم في كل حالة

| الحالة | الاستخدام | مثال |
|--------|-----------|------|
| **قائمة المنتجات** | أول variant + أول unit | "1 لتر" بسعر "2.5 JOD" |
| **تفاصيل المنتج** | جميع variants | اختر من "1 لتر" أو "2 لتر" |
| **عند اختيار حجم** | جميع options للـ variant | اختر "طبيعي" أو "بدون سكر" |
| **عند اختيار نكهة** | جميع units للـ variant | اختر "قطعة" أو "دزينة" |
| **حساب السعر** | unit.price أو option.priceOverride | 2.5 JOD أو 3.0 JOD |
| **التحقق من المخزون** | variant.stock أو option.stock | 100 متوفر أو 30 متوفر |

---

## ⚠️ حالات خاصة يجب الانتباه لها

### 1️⃣ عندما تكون هناك نكهات مختلفة

```javascript
// إذا كان variant.options.length > 0
// يجب اختيار نكهة قبل الشراء

if (selectedVariant.options.length > 0) {
  console.log("يجب اختيار نكهة:");
  selectedVariant.options.forEach(opt => {
    console.log(`- ${opt.name} (${opt.stock} متوفر)`);
  });
}
```

### 2️⃣ عندما تكون هناك وحدات متعددة

```javascript
// إذا كان variant.units.length > 1
// يمكن اختيار وحدة مختلفة للسعر الجملة

if (selectedVariant.units.length > 1) {
  console.log("وحدات بيع متعددة:");
  selectedVariant.units.forEach(unit => {
    const pricePerPiece = unit.price / unit.piecesPerUnit;
    console.log(
      `- ${unit.label}: ${unit.price} JOD (${pricePerPiece.toFixed(2)} للقطعة)`
    );
  });
}
```

### 3️⃣ عندما يكون هناك خصم

```javascript
// إذا كان compareAtPrice موجود وأكبر من price
// هناك خصم

const unit = selectedVariant.units[0];
if (unit.compareAtPrice && unit.compareAtPrice > unit.price) {
  const discountPercent = (
    (unit.compareAtPrice - unit.price) / unit.compareAtPrice
  ) * 100;
  console.log(`
    السعر الأصلي: ${unit.compareAtPrice} JOD
    السعر الحالي: ${unit.price} JOD
    الخصم: ${discountPercent.toFixed(0)}%
  `);
}
```

### 4️⃣ عندما يكون الخيار غير متوفر

```javascript
// تحقق من المخزون قبل الإضافة للسلة

if (selectedOption && selectedOption.stock === 0) {
  console.log("هذا الخيار غير متوفر حالياً");
} else if (selectedVariant.stock === 0) {
  console.log("هذا الحجم غير متوفر حالياً");
}
```

---

## 🚀 الخطوات التطبيقية

### الخطوة 1️⃣: عرض القائمة

```javascript
// GET /api/v1/products?page=1&limit=20&view=card
// استخدم view=card للحصول على رد أخف

const products = await fetch(
  'http://localhost:3000/api/v1/products?page=1&limit=20&view=card'
).then(r => r.json());

products.data.products.forEach(p => {
  // عرض كل منتج بـ default variant و unit فقط
});
```

### الخطوة 2️⃣: عند الضغط على منتج

```javascript
// GET /api/v1/products/[productId]
// احصل على كل التفاصيل

const product = await fetch(
  `http://localhost:3000/api/v1/products/${productId}`
).then(r => r.json());

// الآن عندك جميع variants و options و units
```

### الخطوة 3️⃣: عرض شاشة الاختيار

```javascript
// اعرض:
// 1. الأحجام (variants)
// 2. النكهات (options) - إذا كانت موجودة
// 3. وحدات البيع (units)
// 4. الكمية
// 5. السعر النهائي
```

### الخطوة 4️⃣: إضافة للسلة

```javascript
// POST /api/v1/cart
// أرسل: variantId + optionId + unitId + quantity

const cartItem = {
  variantId: selectedVariant.id,
  variantOptionId: selectedOption?.id,
  productUnitId: selectedUnit.id,
  quantity: userQuantity
};

await fetch('http://localhost:3000/api/v1/cart', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(cartItem)
});
```

---

## 📞 ملخص سريع

| ماذا تحتاج | الـ Endpoint | الطريقة |
|-----------|-------------|--------|
| قائمة المنتجات | `/products?page=1&limit=20` | GET |
| تفاصيل منتج | `/products/[id]` | GET |
| البحث | `/search?q=query` | GET |
| إضافة للسلة | `/cart` | POST |
| الشراء | `/orders` | POST |

---

## ✅ مثال كود نهائي شامل

```typescript
import React, { useState, useEffect } from 'react'

export function MyShoppingApp() {
  const [product, setProduct] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [quantity, setQuantity] = useState(1)

  // 1. جلب تفاصيل المنتج
  useEffect(() => {
    fetch('http://localhost:3000/api/v1/products/prod-123')
      .then(r => r.json())
      .then(data => {
        setProduct(data.data.product)
        setSelectedVariant(data.data.product.variants[0])
        setSelectedUnit(data.data.product.variants[0].units[0])
      })
  }, [])

  if (!product) return <div>جاري التحميل...</div>

  // 2. حساب السعر
  const calculatePrice = () => {
    let price = selectedUnit.price
    if (selectedOption?.priceOverride) {
      price = selectedOption.priceOverride
    }
    return price * quantity
  }

  // 3. إضافة للسلة
  const handleAddToCart = async () => {
    await fetch('http://localhost:3000/api/v1/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: selectedVariant.id,
        variantOptionId: selectedOption?.id,
        productUnitId: selectedUnit.id,
        quantity
      })
    })
  }

  // 4. العرض
  return (
    <div>
      <h1>{product.name}</h1>
      
      {/* الأحجام */}
      <div>
        <label>الحجم:</label>
        {product.variants.map(v => (
          <button
            key={v.id}
            onClick={() => {
              setSelectedVariant(v)
              setSelectedUnit(v.units[0])
              setSelectedOption(null)
            }}
          >
            {v.size}
          </button>
        ))}
      </div>

      {/* النكهات */}
      {selectedVariant?.options?.length > 0 && (
        <div>
          <label>النكهة:</label>
          {selectedVariant.options.map(o => (
            <button
              key={o.id}
              onClick={() => setSelectedOption(o)}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}

      {/* الوحدات */}
      {selectedVariant?.units?.length > 1 && (
        <div>
          <label>الوحدة:</label>
          {selectedVariant.units.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUnit(u)}
            >
              {u.label} - {u.price} JOD
            </button>
          ))}
        </div>
      )}

      {/* الكمية والسعر */}
      <div>
        <input 
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          min="1"
        />
        <p>الإجمالي: {calculatePrice().toFixed(2)} JOD</p>
        <button onClick={handleAddToCart}>
          إضافة للسلة
        </button>
      </div>
    </div>
  )
}
```

---

## 📚 الملفات الإضافية

- [PRODUCT_DETAILS_API_GUIDE.md](PRODUCT_DETAILS_API_GUIDE.md) - شرح مفصل وأمثلة كاملة
- [PRODUCT_API_SCHEMA.md](PRODUCT_API_SCHEMA.md) - JSON Schema التقنية
- [PRODUCT_API_EXAMPLES.md](PRODUCT_API_EXAMPLES.md) - أمثلة cURL و TypeScript
- [CART_AND_ORDER_FLOW.md](CART_AND_ORDER_FLOW.md) - **دليل شامل عن السلة والطلبات مع النكهات والأحجام** ⭐
- [DASHBOARD_ORDER_VIEW.md](DASHBOARD_ORDER_VIEW.md) - **كيفية عرض الطلبات مع جميع التفاصيل** ⭐

---

## ⭐ ملاحظة مهمة: النكهات والأحجام

**الميزة الجديدة**: جميع اختيارات الزبون (الحجم، النكهة، الوحدة) **محفوظة بوضوح** في السلة والطلب!

### أمثلة واقعية

**مثال 1: منتج بنكهات مختلفة**
```
المنتج: عصير برتقال
اختيار 1: 1 لتر - طبيعي - دزينة × 1 = 25 د.أ
اختيار 2: 1 لتر - بدون سكر - دزينة × 1 = 28 د.أ

✅ في السلة: عنصرين منفصلين (لا تدمج لأن النكهة مختلفة)
✅ في الطلب: سطرين منفصلين مع جميع التفاصيل
```

**مثال 2: منتج بحجم وتفاصيل**
```
POST /api/v1/cart
{
  "variantId": "var-1l",           // الحجم: 1 لتر
  "variantOptionId": "opt-sugar-free", // النكهة: بدون سكر
  "productUnitId": "unit-dozen",   // الوحدة: دزينة
  "quantity": 2                    // الكمية: 2
}

الرد يحتوي على:
{
  "item": {
    "product": { "name": "عصير برتقال" },
    "selectedVariant": { "size": "1 لتر" },
    "selectedOption": { "name": "بدون سكر" },
    "selectedUnit": { "label": "دزينة" },
    "quantity": 2,
    "pricing": { "pricePerUnit": 28, "subtotal": 56 }
  }
}
```

### في الـ Frontend: عرض السلة

```jsx
{cart.items.map(item => (
  <div key={item.id}>
    <h3>{item.product.name}</h3>
    <p>الحجم: {item.selectedVariant.size}</p>
    <p>النكهة: {item.selectedOption?.name || 'بلا'}</p>
    <p>الوحدة: {item.selectedUnit.label}</p>
    <p>الكمية: {item.quantity}</p>
    <p className="price">{item.pricing.subtotal} د.أ</p>
  </div>
))}
```

### في الـ Dashboard: عرض الطلب

```jsx
{order.items.map(item => (
  <tr key={item.id}>
    <td>{item.productName}</td>
    <td>{item.variantSize}</td>        {/* الحجم المحفوظ */}
    <td>{item.variantOptionName}</td>  {/* النكهة المحفوظة */}
    <td>{item.unitLabel}</td>          {/* الوحدة المحفوظة */}
    <td>{item.quantity}</td>
    <td>{item.totalPrice} د.أ</td>
  </tr>
))}
```

**اقرأ [CART_AND_ORDER_FLOW.md](CART_AND_ORDER_FLOW.md) للحصول على دليل شامل!** 👈

---

**اسأل إذا احتجت توضيح أي نقطة!** ✨
