# Product API Response Schema

## 📋 Schema التفاصيل الكاملة للمنتج

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "string (cuid)",
      "name": "string (اسم المنتج بالعربية)",
      "nameEn": "string (اسم المنتج بالإنجليزية) - optional",
      "description": "string (وصف بالعربية) - optional",
      "descriptionEn": "string (وصف بالإنجليزية) - optional",
      "image": "string (رابط الصورة الرئيسية) - optional",
      "images": ["string (روابط صور إضافية)"],
      "isActive": "boolean",
      "sortOrder": "number",
      "createdAt": "ISO 8601 datetime",
      "updatedAt": "ISO 8601 datetime",
      
      "category": {
        "id": "string",
        "name": "string",
        "nameEn": "string - optional",
        "slug": "string"
      },
      
      "brand": {
        "id": "string",
        "name": "string",
        "nameEn": "string - optional",
        "slug": "string",
        "logo": "string - optional"
      },
      
      "variants": [
        {
          "id": "string (cuid)",
          "size": "string (حجم المنتج بالعربية: '1 لتر', '2 كيلو')",
          "sizeEn": "string (بالإنجليزية: '1L', '2kg') - optional",
          "sku": "string (رمز تخزين المنتج) - optional",
          "barcode": "string (باركود) - optional",
          "stock": "number (إجمالي المخزون)",
          "minOrderQuantity": "number (الحد الأدنى للشراء)",
          "isDefault": "boolean (الحجم الافتراضي للمنتج)",
          "isActive": "boolean",
          "sortOrder": "number",
          "createdAt": "ISO 8601 datetime",
          
          "units": [
            {
              "id": "string (cuid)",
              "unit": "enum: PIECE|DOZEN|CARTON|BOX|PACK|KG|GRAM|LITER|PALLET",
              "label": "string (اسم الوحدة بالعربية: 'قطعة', 'دزينة', 'كرتونة')",
              "labelEn": "string (بالإنجليزية) - optional",
              "piecesPerUnit": "number (عدد القطع في الوحدة: 1 للقطعة، 12 للدزينة، 36 للكرتونة)",
              "price": "number (السعر بـ JOD)",
              "wholesalePrice": "number (السعر الجملة) - optional",
              "compareAtPrice": "number (السعر الأصلي قبل الخصم) - optional",
              "isDefault": "boolean (الوحدة الافتراضية)",
              "sortOrder": "number"
            }
          ],
          
          "options": [
            {
              "id": "string (cuid)",
              "name": "string (اسم الخيار بالعربية: 'تفاح', 'برتقال', 'بدون سكر')",
              "nameEn": "string (بالإنجليزية) - optional",
              "stock": "number (مخزون هذا الخيار)",
              "sku": "string (رمز تخزين الخيار) - optional",
              "barcode": "string (باركود الخيار) - optional",
              "priceOverride": "number (سعر مختلف لهذا الخيار) - optional/nullable",
              "isActive": "boolean",
              "sortOrder": "number"
            }
          ]
        }
      ],
      
      "categories": [
        {
          "productId": "string",
          "categoryId": "string",
          "isPrimary": "boolean (الفئة الأساسية)",
          "sortOrder": "number",
          "category": {
            "id": "string",
            "name": "string",
            "nameEn": "string - optional",
            "slug": "string"
          }
        }
      ],
      
      "tags": [
        {
          "productId": "string",
          "tagId": "string",
          "tag": {
            "id": "string",
            "name": "string (تصنيف داخل الفئة: 'مشروبات شعير', 'عصائر طازجة')",
            "nameEn": "string - optional",
            "slug": "string"
          }
        }
      ]
    }
  }
}
```

---

## 🔍 أمثلة عملية

### 1️⃣ منتج بدون خيارات (الحجم واحد، بدون نكهات)

```json
{
  "id": "prod-001",
  "name": "أرز الشرقية الأبيض",
  "nameEn": "Al-Sharqiya White Rice",
  "image": "/uploads/rice.jpg",
  "category": {
    "id": "cat-rice",
    "name": "الأرز",
    "nameEn": "Rice",
    "slug": "rice"
  },
  "brand": {
    "id": "brand-sharqiya",
    "name": "الشرقية",
    "nameEn": "Al-Sharqiya",
    "slug": "al-sharqiya",
    "logo": "/uploads/sharqiya-logo.jpg"
  },
  "variants": [
    {
      "id": "var-001",
      "size": "5 كيلو",
      "sizeEn": "5kg",
      "sku": "RICE-5KG-001",
      "stock": 200,
      "minOrderQuantity": 1,
      "isDefault": true,
      "isActive": true,
      "sortOrder": 0,
      "units": [
        {
          "id": "unit-001",
          "unit": "KG",
          "label": "كيلو",
          "labelEn": "Kilogram",
          "piecesPerUnit": 1000,
          "price": 3.5,
          "wholesalePrice": 2.8,
          "compareAtPrice": 4.0,
          "isDefault": true,
          "sortOrder": 0
        }
      ],
      "options": []
    }
  ]
}
```

---

### 2️⃣ منتج بنكهات متعددة (نفس الحجم، نكهات مختلفة)

```json
{
  "id": "prod-juice-001",
  "name": "عصير الفاكهة الطبيعي",
  "nameEn": "Natural Fruit Juice",
  "image": "/uploads/juice.jpg",
  "variants": [
    {
      "id": "var-juice-1l",
      "size": "1 لتر",
      "sizeEn": "1L",
      "stock": 150,
      "isDefault": true,
      "units": [
        {
          "id": "unit-piece",
          "unit": "PIECE",
          "label": "قطعة",
          "labelEn": "Piece",
          "piecesPerUnit": 1,
          "price": 2.5,
          "compareAtPrice": 3.0,
          "isDefault": true
        },
        {
          "id": "unit-dozen",
          "unit": "DOZEN",
          "label": "دزينة",
          "labelEn": "Dozen",
          "piecesPerUnit": 12,
          "price": 28.0,
          "isDefault": false
        }
      ],
      "options": [
        {
          "id": "opt-apple",
          "name": "تفاح",
          "nameEn": "Apple",
          "stock": 50,
          "sku": "JUICE-1L-APPLE",
          "priceOverride": null,
          "isActive": true,
          "sortOrder": 0
        },
        {
          "id": "opt-orange",
          "name": "برتقال",
          "nameEn": "Orange",
          "stock": 60,
          "sku": "JUICE-1L-ORANGE",
          "priceOverride": null,
          "isActive": true,
          "sortOrder": 1
        },
        {
          "id": "opt-sugar-free",
          "name": "بدون سكر",
          "nameEn": "Sugar Free",
          "stock": 40,
          "sku": "JUICE-1L-SF",
          "priceOverride": 3.0,
          "isActive": true,
          "sortOrder": 2
        }
      ]
    }
  ]
}
```

---

### 3️⃣ منتج بأحجام متعددة وكل حجم له نكهات

```json
{
  "id": "prod-juice-complete",
  "name": "عصير الفاكهة الطبيعي",
  "nameEn": "Natural Fruit Juice",
  "variants": [
    {
      "id": "var-1l",
      "size": "1 لتر",
      "sizeEn": "1L",
      "stock": 100,
      "isDefault": true,
      "units": [
        {
          "id": "unit-1l-piece",
          "unit": "PIECE",
          "label": "قطعة",
          "price": 2.5,
          "isDefault": true
        }
      ],
      "options": [
        {
          "id": "opt-1l-apple",
          "name": "تفاح",
          "stock": 50,
          "priceOverride": null
        },
        {
          "id": "opt-1l-orange",
          "name": "برتقال",
          "stock": 50,
          "priceOverride": null
        }
      ]
    },
    {
      "id": "var-2l",
      "size": "2 لتر",
      "sizeEn": "2L",
      "stock": 80,
      "isDefault": false,
      "units": [
        {
          "id": "unit-2l-piece",
          "unit": "PIECE",
          "label": "قطعة",
          "price": 4.5,
          "isDefault": true
        }
      ],
      "options": [
        {
          "id": "opt-2l-apple",
          "name": "تفاح",
          "stock": 40,
          "priceOverride": null
        },
        {
          "id": "opt-2l-orange",
          "name": "برتقال",
          "stock": 40,
          "priceOverride": null
        }
      ]
    }
  ]
}
```

---

### 4️⃣ منتج بأحجام متعددة وكل حجم له وحدات بيع مختلفة

```json
{
  "id": "prod-coffee-beans",
  "name": "قهوة الشرقية المحمصة",
  "nameEn": "Al-Sharqiya Roasted Coffee",
  "variants": [
    {
      "id": "var-250g",
      "size": "250 غرام",
      "sizeEn": "250g",
      "stock": 500,
      "isDefault": true,
      "units": [
        {
          "id": "unit-piece",
          "unit": "PIECE",
          "label": "قطعة",
          "price": 5.0,
          "compareAtPrice": 6.0,
          "isDefault": true
        },
        {
          "id": "unit-box",
          "unit": "BOX",
          "label": "صندوق",
          "piecesPerUnit": 20,
          "price": 95.0,
          "compareAtPrice": 120.0,
          "isDefault": false
        }
      ],
      "options": []
    },
    {
      "id": "var-500g",
      "size": "500 غرام",
      "sizeEn": "500g",
      "stock": 300,
      "isDefault": false,
      "units": [
        {
          "id": "unit-piece-500",
          "unit": "PIECE",
          "label": "قطعة",
          "price": 9.0,
          "compareAtPrice": 10.0,
          "isDefault": true
        },
        {
          "id": "unit-box-500",
          "unit": "BOX",
          "label": "صندوق",
          "piecesPerUnit": 12,
          "price": 100.0,
          "isDefault": false
        }
      ],
      "options": []
    }
  ]
}
```

---

## 🛒 حالات الاستخدام (Use Cases)

### ✅ عرض المنتج في قائمة (Card View)

**المعلومات المطلوبة من أول variant:**
```javascript
{
  id: product.id,
  name: product.name,
  image: product.image,
  defaultVariant: product.variants[0].size,
  defaultPrice: product.variants[0].units[0].price,
  inStock: product.variants[0].stock > 0
}
```

### ✅ عرض صفحة التفاصيل

**عرض كل الأحجام والنكهات والوحدات:**
```javascript
product.variants.forEach(variant => {
  console.log(`حجم: ${variant.size}`);
  
  variant.options.forEach(option => {
    console.log(`  نكهة: ${option.name}`);
  });
  
  variant.units.forEach(unit => {
    console.log(`  وحدة: ${unit.label} - ${unit.price} JOD`);
  });
});
```

### ✅ حساب السعر عند الشراء

```javascript
function calculatePrice(variant, unit, option) {
  // 1. ابدأ بسعر الوحدة
  let price = unit.price;
  
  // 2. إذا كان هناك override للنكهة، استخدمه
  if (option && option.priceOverride) {
    price = option.priceOverride;
  }
  
  return price;
}

// استخدام
const variant = product.variants[0]; // 1 لتر
const unit = variant.units[0];      // قطعة
const option = variant.options[1];  // بدون سكر
const quantity = 2;

const pricePerUnit = calculatePrice(variant, unit, option);
const totalPrice = pricePerUnit * quantity;

console.log(`${totalPrice} JOD`); // 6.0 JOD
```

---

## ⚠️ حالات خاصة

### 1️⃣ عندما تكون النكهة تحت variant محدد

```
إذا كانت variant.options.length > 0:
  - يجب اختيار نكهة
  - كل نكهة لها مخزونها الخاص
  - قد تكون لها سعر مختلف (priceOverride)
```

### 2️⃣ عندما تكون وحدات بيع متعددة

```
إذا كانت variant.units.length > 1:
  - يجب اختيار وحدة بيع
  - كل وحدة لها سعر مختلف
  - قد تكون لها عدد قطع مختلف (piecesPerUnit)
```

### 3️⃣ الخصومات

```
إذا كان compareAtPrice موجود وأكبر من price:
  - هناك خصم نشط
  - العرض: من X JOD إلى Y JOD
  - نسبة الخصم = ((compareAtPrice - price) / compareAtPrice) * 100
```

---

## 📱 Integration Checklist

- [ ] عرض قائمة المنتجات بـ variant الأول و unit الأول
- [ ] عرض صفحة تفاصيل كاملة مع جميع variants و options و units
- [ ] اختيار الحجم (variant)
- [ ] اختيار النكهة (option) - إذا كانت موجودة
- [ ] اختيار وحدة البيع (unit)
- [ ] حساب السعر النهائي مع أي overrides
- [ ] عرض المخزون الصحيح لكل اختيار
- [ ] إضافة للسلة بـ variantId + optionId + unitId + quantity
- [ ] تطبيق الخصومات (compareAtPrice)
