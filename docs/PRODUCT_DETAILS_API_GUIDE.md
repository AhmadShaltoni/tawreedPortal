# 📦 دليل بيانات المنتجات الكاملة للفرونت إند

## 🎯 ملخص البنية

المنتج يحتوي على **3 مستويات من التفاصيل**:

```
Product (المنتج الأساسي)
  ├── Variants (الأحجام: 2kg, 4kg, إلخ)
  │    ├── VariantOptions (النكهات: تفاح، برتقال، إلخ)
  │    └── ProductUnits (وحدات البيع: قطعة، دزينة، كرتونة)
  ├── Brand (الماركة)
  ├── Category (الفئة)
  └── Tags (التصنيفات)
```

---

## 🔌 نقاط API المتاحة

### 1️⃣ **الحصول على قائمة المنتجات**

**الـ Endpoint:**
```
GET /api/v1/products?page=1&limit=20&categoryId=xxx
GET /api/v1/products?page=1&limit=20&view=card  (خفيف للقائمة)
```

**مثال الطلب (Request):**
```bash
curl "http://localhost:3000/api/v1/products?page=1&limit=5"
```

**مثال الرد (Response):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "clz9x1a2b3c4d5e6f7g8h9i0",
        "name": "عصير البرتقال الطبيعي",
        "nameEn": "Fresh Orange Juice",
        "image": "/uploads/juice.jpg",
        "isActive": true,
        "sortOrder": 0,
        "category": {
          "id": "cat123",
          "name": "المشروبات",
          "nameEn": "Beverages",
          "slug": "beverages"
        },
        "brand": {
          "id": "brand123",
          "name": "ماركة برتقال",
          "nameEn": "Orange Brand",
          "slug": "orange-brand",
          "logo": "/uploads/logo.jpg"
        },
        "variants": [
          {
            "id": "var1",
            "size": "1 لتر",
            "sizeEn": "1L",
            "sku": "OJ-1L-001",
            "barcode": "123456789",
            "stock": 100,
            "minOrderQuantity": 1,
            "isDefault": true,
            "isActive": true,
            "sortOrder": 0,
            "units": [
              {
                "id": "unit1",
                "unit": "PIECE",
                "label": "قطعة",
                "labelEn": "Piece",
                "piecesPerUnit": 1,
                "price": 2.5,
                "wholesalePrice": 1.8,
                "compareAtPrice": 3.0,
                "isDefault": true,
                "sortOrder": 0
              },
              {
                "id": "unit2",
                "unit": "CARTON",
                "label": "كرتونة",
                "labelEn": "Carton",
                "piecesPerUnit": 12,
                "price": 28.0,
                "wholesalePrice": 20.4,
                "compareAtPrice": 30.0,
                "isDefault": false,
                "sortOrder": 1
              }
            ],
            "options": [
              {
                "id": "opt1",
                "name": "طبيعي",
                "nameEn": "Natural",
                "stock": 50,
                "sku": "OJ-1L-NAT",
                "priceOverride": null,
                "isActive": true,
                "sortOrder": 0
              },
              {
                "id": "opt2",
                "name": "بدون سكر",
                "nameEn": "Sugar Free",
                "stock": 30,
                "sku": "OJ-1L-SF",
                "priceOverride": 3.0,
                "isActive": true,
                "sortOrder": 1
              }
            ]
          },
          {
            "id": "var2",
            "size": "2 لتر",
            "sizeEn": "2L",
            "sku": "OJ-2L-001",
            "stock": 80,
            "minOrderQuantity": 1,
            "isDefault": false,
            "isActive": true,
            "sortOrder": 1,
            "units": [
              {
                "id": "unit3",
                "unit": "PIECE",
                "label": "قطعة",
                "labelEn": "Piece",
                "piecesPerUnit": 1,
                "price": 4.5,
                "compareAtPrice": 5.0,
                "isDefault": true
              }
            ],
            "options": []
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 150,
      "pages": 30
    }
  }
}
```

---

### 2️⃣ **الحصول على تفاصيل منتج واحد كامل**

**الـ Endpoint:**
```
GET /api/v1/products/[productId]
```

**مثال الطلب:**
```bash
curl "http://localhost:3000/api/v1/products/clz9x1a2b3c4d5e6f7g8h9i0"
```

**مثال الرد:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "clz9x1a2b3c4d5e6f7g8h9i0",
      "name": "عصير البرتقال الطبيعي",
      "nameEn": "Fresh Orange Juice",
      "description": "عصير برتقال 100% طبيعي بدون مواد حافظة",
      "descriptionEn": "100% natural orange juice without preservatives",
      "image": "/uploads/juice.jpg",
      "images": [
        "/uploads/juice-1.jpg",
        "/uploads/juice-2.jpg",
        "/uploads/juice-3.jpg"
      ],
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-20T15:45:00Z",
      "category": {
        "id": "cat123",
        "name": "المشروبات",
        "nameEn": "Beverages",
        "slug": "beverages"
      },
      "brand": {
        "id": "brand123",
        "name": "ماركة برتقال",
        "nameEn": "Orange Brand",
        "slug": "orange-brand",
        "logo": "/uploads/logo.jpg"
      },
      "variants": [
        {
          "id": "var1",
          "size": "1 لتر",
          "sizeEn": "1L",
          "sku": "OJ-1L-001",
          "barcode": "123456789",
          "stock": 100,
          "minOrderQuantity": 1,
          "isDefault": true,
          "isActive": true,
          "sortOrder": 0,
          "createdAt": "2025-01-15T10:30:00Z",
          "units": [
            {
              "id": "unit1",
              "unit": "PIECE",
              "label": "قطعة",
              "labelEn": "Piece",
              "piecesPerUnit": 1,
              "price": 2.5,
              "wholesalePrice": 1.8,
              "compareAtPrice": 3.0,
              "isDefault": true,
              "sortOrder": 0
            },
            {
              "id": "unit2",
              "unit": "DOZEN",
              "label": "دزينة",
              "labelEn": "Dozen",
              "piecesPerUnit": 12,
              "price": 28.0,
              "wholesalePrice": 20.4,
              "compareAtPrice": 30.0,
              "isDefault": false,
              "sortOrder": 1
            },
            {
              "id": "unit3",
              "unit": "CARTON",
              "label": "كرتونة",
              "labelEn": "Carton",
              "piecesPerUnit": 36,
              "price": 84.0,
              "wholesalePrice": 61.2,
              "compareAtPrice": 90.0,
              "isDefault": false,
              "sortOrder": 2
            }
          ],
          "options": [
            {
              "id": "opt1",
              "name": "طبيعي 100%",
              "nameEn": "100% Natural",
              "stock": 50,
              "sku": "OJ-1L-NAT",
              "barcode": "123456790",
              "priceOverride": null,
              "isActive": true,
              "sortOrder": 0
            },
            {
              "id": "opt2",
              "name": "بدون سكر مضاف",
              "nameEn": "No Added Sugar",
              "stock": 30,
              "sku": "OJ-1L-NAS",
              "barcode": "123456791",
              "priceOverride": 3.0,
              "isActive": true,
              "sortOrder": 1
            },
            {
              "id": "opt3",
              "name": "بفيتامين C إضافي",
              "nameEn": "Extra Vitamin C",
              "stock": 20,
              "sku": "OJ-1L-VC",
              "barcode": "123456792",
              "priceOverride": 3.5,
              "isActive": true,
              "sortOrder": 2
            }
          ]
        },
        {
          "id": "var2",
          "size": "2 لتر",
          "sizeEn": "2L",
          "sku": "OJ-2L-001",
          "stock": 80,
          "minOrderQuantity": 1,
          "isDefault": false,
          "isActive": true,
          "sortOrder": 1,
          "units": [
            {
              "id": "unit4",
              "unit": "PIECE",
              "label": "قطعة",
              "labelEn": "Piece",
              "piecesPerUnit": 1,
              "price": 4.5,
              "compareAtPrice": 5.0,
              "isDefault": true
            },
            {
              "id": "unit5",
              "unit": "DOZEN",
              "label": "دزينة",
              "labelEn": "Dozen",
              "piecesPerUnit": 6,
              "price": 25.0,
              "compareAtPrice": 27.0,
              "isDefault": false
            }
          ],
          "options": [
            {
              "id": "opt4",
              "name": "طبيعي 100%",
              "nameEn": "100% Natural",
              "stock": 60,
              "sku": "OJ-2L-NAT",
              "priceOverride": null,
              "isActive": true,
              "sortOrder": 0
            },
            {
              "id": "opt5",
              "name": "بدون سكر مضاف",
              "nameEn": "No Added Sugar",
              "stock": 20,
              "sku": "OJ-2L-NAS",
              "priceOverride": 5.0,
              "isActive": true,
              "sortOrder": 1
            }
          ]
        }
      ],
      "categories": [
        {
          "categoryId": "cat123",
          "isPrimary": true,
          "category": {
            "id": "cat123",
            "name": "المشروبات",
            "nameEn": "Beverages",
            "slug": "beverages"
          }
        },
        {
          "categoryId": "cat456",
          "isPrimary": false,
          "category": {
            "id": "cat456",
            "name": "الصحة والعافية",
            "nameEn": "Health & Wellness",
            "slug": "health-wellness"
          }
        }
      ],
      "tags": [
        {
          "tagId": "tag1",
          "tag": {
            "id": "tag1",
            "name": "برتقال طازج",
            "nameEn": "Fresh Orange",
            "slug": "fresh-orange"
          }
        }
      ]
    }
  }
}
```

---

## 🎨 شرح مبسط لبنية البيانات

### 📏 **الأحجام (Variants)**
```
المنتج: عصير برتقال
  ↓
  Variant 1: 1 لتر (size: "1 لتر")
  Variant 2: 2 لتر (size: "2 لتر")
  Variant 3: 500 مل (size: "500 مل")
```

### 🍊 **النكهات (VariantOptions)**
```
الحجم: 1 لتر
  ↓
  Option 1: طبيعي (name: "طبيعي")
  Option 2: بدون سكر (name: "بدون سكر" + priceOverride: 3.0)
  Option 3: مع فيتامين C (name: "مع فيتامين C" + priceOverride: 3.5)
```

### 📦 **وحدات البيع (ProductUnits)**
```
الحجم: 1 لتر
  ↓
  Unit 1: قطعة واحدة (label: "قطعة", price: 2.5)
  Unit 2: دزينة (label: "دزينة", piecesPerUnit: 12, price: 28.0)
  Unit 3: كرتونة (label: "كرتونة", piecesPerUnit: 36, price: 84.0)
```

---

## 💻 **أمثلة عملية للفرونت إند**

### ✅ **مثال 1: عرض قائمة المنتجات في الموبايل**

```typescript
// Frontend Code (React Native / Flutter)

// 1. جلب المنتجات
const response = await fetch(
  'http://localhost:3000/api/v1/products?page=1&limit=20&view=card'
);
const { data } = await response.json();

// 2. عرض كل منتج
data.products.forEach(product => {
  // المتغير الأساسي (الحجم الأول)
  const defaultVariant = product.variants[0];
  const defaultUnit = defaultVariant.units[0]; // الوحدة الأولى
  
  console.log(`اسم: ${product.name}`);
  console.log(`السعر: ${defaultUnit.price} JOD`);
  console.log(`الحجم: ${defaultVariant.size}`);
  console.log(`المخزون: ${defaultVariant.stock}`);
});
```

---

### ✅ **مثال 2: عرض صفحة تفاصيل المنتج (Product Details)**

```typescript
// Frontend Code

// 1. جلب التفاصيل الكاملة
const productId = 'clz9x1a2b3c4d5e6f7g8h9i0';
const response = await fetch(
  `http://localhost:3000/api/v1/products/${productId}`
);
const { data } = await response.json();
const product = data.product;

// 2. عرض الأحجام المتاحة
console.log('الأحجام المتاحة:');
product.variants.forEach(variant => {
  console.log(`- ${variant.size} (${variant.stock} متوفر)`);
});

// 3. عند اختيار حجم، عرض النكهات
const selectedVariant = product.variants[0]; // 1 لتر مثلاً
console.log(`النكهات المتاحة للحجم ${selectedVariant.size}:`);
selectedVariant.options.forEach(option => {
  let priceLabel = option.priceOverride 
    ? `${option.priceOverride} JOD` 
    : 'نفس السعر الأساسي';
  console.log(`- ${option.name} (${option.stock} متوفر) - ${priceLabel}`);
});

// 4. عند اختيار نكهة، عرض وحدات البيع
console.log(`وحدات البيع المتاحة:`);
selectedVariant.units.forEach(unit => {
  console.log(
    `- ${unit.label} (${unit.piecesPerUnit} قطع): ${unit.price} JOD`
  );
  if (unit.compareAtPrice && unit.compareAtPrice > unit.price) {
    console.log(
      `  خصم: من ${unit.compareAtPrice} إلى ${unit.price} JOD`
    );
  }
});
```

---

### ✅ **مثال 3: إضافة منتج إلى السلة (Add to Cart)**

```typescript
// Frontend Code

// اختيارات المستخدم:
// - نريد 1 لتر
// - بدون سكر
// - دزينة (12 قطعة)
// - الكمية: 2 دزينة

const cartItem = {
  variantId: "var1",              // 1 لتر
  variantOptionId: "opt2",        // بدون سكر
  productUnitId: "unit2",         // دزينة
  quantity: 2                     // 2 دزينة
};

// حساب السعر الإجمالي:
const selectedVariant = product.variants[0];
const selectedOption = selectedVariant.options[1]; // بدون سكر
const selectedUnit = selectedVariant.units[1]; // دزينة

// السعر الأساسي للوحدة (قد يكون هناك override)
const unitPrice = selectedOption.priceOverride || selectedUnit.price;
const totalPrice = unitPrice * cartItem.quantity;

console.log(`
  المنتج: ${product.name}
  الحجم: ${selectedVariant.size}
  النكهة: ${selectedOption.name}
  الوحدة: ${selectedUnit.label} (${selectedUnit.piecesPerUnit} قطع)
  السعر للوحدة: ${unitPrice} JOD
  الكمية: ${cartItem.quantity}
  الإجمالي: ${totalPrice} JOD
`);
```

---

## 📊 **جدول أنواع البيانات**

| الحقل | النوع | الوصف | مثال |
|--------|--------|---------|---------|
| `variant.size` | String | اسم الحجم بالعربية | "1 لتر", "2 كيلو" |
| `variant.sizeEn` | String | اسم الحجم بالإنجليزية | "1L", "2kg" |
| `variant.stock` | Integer | إجمالي المخزون | 100 |
| `option.name` | String | اسم الخيار (النكهة) | "تفاح", "برتقال" |
| `option.stock` | Integer | مخزون هذا الخيار | 50 |
| `option.priceOverride` | Float | سعر مختلف للخيار (اختياري) | 3.0 |
| `unit.label` | String | اسم الوحدة | "قطعة", "دزينة" |
| `unit.piecesPerUnit` | Integer | عدد القطع | 1, 12, 36 |
| `unit.price` | Float | السعر الأساسي | 2.5 |
| `unit.compareAtPrice` | Float | السعر الأصلي (قبل الخصم) | 3.0 |

---

## 🔄 **تدفق شراء كامل**

```
1. المستخدم يدخل لقائمة المنتجات
   ↓ GET /api/v1/products
   ↓ يعرض: كل منتج + أول حجم + أول نكهة + أول وحدة

2. المستخدم ينقر على منتج
   ↓ GET /api/v1/products/[id]
   ↓ يعرض: كل التفاصيل (جميع الأحجام والنكهات والوحدات)

3. المستخدم يختار:
   - حجم (variant)
   - نكهة (option) - اختياري
   - وحدة بيع (unit)
   - كمية (quantity)

4. المستخدم يضيف للسلة
   ↓ POST /api/v1/cart
   ↓ يحتاج: variantId + optionId + unitId + quantity

5. المستخدم يتمم الشراء
   ↓ POST /api/v1/orders
   ↓ ينشئ order مع OrderItems
```

---

## ⚡ **ملاحظات مهمة**

### 1️⃣ **السعر النهائي**
```
إذا كان هناك priceOverride للنكهة:
  السعر = priceOverride

وإلا:
  السعر = unit.price
```

### 2️⃣ **المخزون**
```
إذا كان الـ variant يحتوي على options:
  - كل option لها مخزون منفصل
  - المخزون الكلي = مجموع مخزون كل option

إذا كان بدون options:
  - المخزون من variant.stock مباشرة
```

### 3️⃣ **الوحدات الافتراضية**
```
الوحدة الافتراضية = isDefault: true
- كل variant يجب أن يكون عنده unit واحد default
- هذا يُستخدم في قائمة المنتجات
```

### 4️⃣ **تنسيق الأسعار**
```
جميع الأسعار بـ JOD (جنيه أردني)
مثال: 2.5, 25.0, 84.0
```

---

## 🚀 **خطوات التكامل للفرونت إند**

### ✅ القائمة (Product List)
```javascript
GET /api/v1/products?page=1&limit=20&view=card
```

### ✅ التفاصيل (Product Detail)
```javascript
GET /api/v1/products/[productId]
```

### ✅ السلة (Add to Cart)
```javascript
POST /api/v1/cart
Body: {
  variantId: string,
  productUnitId?: string,
  variantOptionId?: string,
  quantity: number
}
```

### ✅ الطلب (Checkout)
```javascript
POST /api/v1/orders
Body: {
  items: [{
    variantId: string,
    productUnitId?: string,
    variantOptionId?: string,
    quantity: number
  }],
  deliveryAddress: string,
  deliveryCity: string
}
```

---

## 📞 اتصل بالدعم

إذا كان لديك أي سؤال عن البيانات المتاحة أو طلبت تفاصيل إضافية، تواصل مع الـ Backend Team.
