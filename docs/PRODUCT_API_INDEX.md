# 📚 Product API - دليل العمل الكامل

> **للمطورين: ابدؤوا من هنا** ⬇️

---

## 🎯 الملفات الرئيسية

### 1. 🚀 [PRODUCT_API_QUICK_START.md](PRODUCT_API_QUICK_START.md) - ابدأ من هنا

**الملف الأساسي الذي يجب قراءته أولاً**

✅ **يحتوي على:**
- مثال واحد شامل يشرح كل شيء
- كيفية عرض البيانات في الشاشات المختلفة
- حساب السعر النهائي
- كود نهائي كامل جاهز للاستخدام

**مثالي لـ:** البدء السريع والفهم العام

---

### 2. 📖 [PRODUCT_DETAILS_API_GUIDE.md](PRODUCT_DETAILS_API_GUIDE.md) - الشرح المفصل

**شرح تفصيلي لكل جزء من البيانات**

✅ **يحتوي على:**
- شرح مبسط لبنية البيانات (Variants, Options, Units)
- أمثلة JSON كاملة وحقيقية
- تدفق شراء كامل
- ملاحظات مهمة حول كل جزء
- جدول شامل لأنواع البيانات

**مثالي لـ:** الفهم العميق والتفاصيل

---

### 3. 📋 [PRODUCT_API_SCHEMA.md](PRODUCT_API_SCHEMA.md) - المرجع التقني

**JSON Schema التفصيلية**

✅ **يحتوي على:**
- Schema كاملة لكل response
- أمثلة منفصلة لكل حالة استخدام
- 4 حالات واقعية مختلفة
- جدول الاستخدامات والحالات الخاصة

**مثالي لـ:** المرجع السريع والـ Copy-Paste

---

### 4. 💻 [PRODUCT_API_EXAMPLES.md](PRODUCT_API_EXAMPLES.md) - الأكواد العملية

**أمثلة cURL و TypeScript مباشرة**

✅ **يحتوي على:**
- أمثلة cURL لكل endpoint
- Types TypeScript كاملة
- خدمة productService جاهزة
- React components جاهزة
- React hooks مفيدة

**مثالي لـ:** Copy-paste الأكواد والتطبيق الفوري

---

## 🗺️ خريطة الاستخدام

### 🎬 أنت مبتدئ؟

```
PRODUCT_API_QUICK_START.md
    ↓
اقرأ المثال الشامل
    ↓
افهم 3 مستويات البيانات
    ↓
اكتشف كيفية عرضها
```

---

### 💼 أنت بحاجة لكود الآن؟

```
PRODUCT_API_EXAMPLES.md
    ↓
انسخ Types التي تحتاجها
    ↓
استخدم productService الجاهز
    ↓
استخدم React components الجاهزة
```

---

### 🔍 أنت بحاجة لمرجع سريع؟

```
PRODUCT_API_SCHEMA.md
    ↓
ابحث عن الحالة التي تحتاجها
    ↓
انسخ الـ JSON
    ↓
افهم كل حقل
```

---

### 📚 أنت بحاجة للشرح المفصل؟

```
PRODUCT_DETAILS_API_GUIDE.md
    ↓
اقرأ الشرح المبسط
    ↓
ادرس الأمثلة الواقعية
    ↓
افهم التفاصيل الدقيقة
```

---

## 🎯 حسب الدور

### 👨‍💻 **مطور فرونت إند - React/React Native**

**الترتيب الموصى به:**

1. اقرأ [PRODUCT_API_QUICK_START.md](PRODUCT_API_QUICK_START.md) (15 دقيقة)
2. انسخ Types من [PRODUCT_API_EXAMPLES.md](PRODUCT_API_EXAMPLES.md) (5 دقائق)
3. استخدم `productService` الجاهز (5 دقائق)
4. استخدم `ProductCard` و `ProductDetail` components (10 دقائق)
5. ابدأ بالترميز!

**ملفات مهمة:**
- `PRODUCT_API_QUICK_START.md` - للفهم العام
- `PRODUCT_API_EXAMPLES.md` - للأكواد الجاهزة
- `PRODUCT_DETAILS_API_GUIDE.md` - للمراجعة السريعة

---

### 📱 **مطور تطبيق - Flutter/React Native**

**الترتيب الموصى به:**

1. اقرأ [PRODUCT_API_QUICK_START.md](PRODUCT_API_QUICK_START.md) (15 دقيقة)
2. ادرس [PRODUCT_DETAILS_API_GUIDE.md](PRODUCT_DETAILS_API_GUIDE.md) (20 دقيقة)
3. ارجع إلى [PRODUCT_API_SCHEMA.md](PRODUCT_API_SCHEMA.md) للمرجع (حسب الحاجة)
4. ابدأ بـ API calls

**ملفات مهمة:**
- `PRODUCT_API_QUICK_START.md` - للبدء السريع
- `PRODUCT_DETAILS_API_GUIDE.md` - لأمثلة JSON كاملة
- `PRODUCT_API_SCHEMA.md` - للمرجع السريع

---

### 🎯 **مدير المشروع**

**الترتيب الموصى به:**

1. اقرأ هذا الملف أولاً (2 دقيقة)
2. اقرأ [PRODUCT_API_QUICK_START.md](PRODUCT_API_QUICK_START.md) للفهم (10 دقائق)
3. اطلب من الفرق اقرأ الملفات الموصى به

---

## 📊 ملخص البيانات

### البنية الأساسية

```
Product (المنتج)
  ├── Variants (الأحجام: 1 لتر، 2 لتر)
  │    ├── Units (وحدات البيع: قطعة، دزينة، كرتونة)
  │    └── Options (النكهات: طبيعي، بدون سكر)
  ├── Brand (الماركة)
  └── Category (الفئة)
```

### المعلومات المطلوبة للشراء

```
المستخدم يختار:
  1. الحجم (variant)
  2. النكهة (option) - اختياري
  3. وحدة البيع (unit)
  4. الكمية (quantity)
```

### حساب السعر

```
السعر = (option.priceOverride || unit.price) × quantity
```

---

## 🔗 أسرع الروابط

| أنت تريد | اذهب إلى |
|---------|----------|
| البدء السريع | [PRODUCT_API_QUICK_START.md](PRODUCT_API_QUICK_START.md) |
| كود جاهز | [PRODUCT_API_EXAMPLES.md](PRODUCT_API_EXAMPLES.md) |
| مرجع سريع | [PRODUCT_API_SCHEMA.md](PRODUCT_API_SCHEMA.md) |
| شرح مفصل | [PRODUCT_DETAILS_API_GUIDE.md](PRODUCT_DETAILS_API_GUIDE.md) |
| مثال JSON | [PRODUCT_DETAILS_API_GUIDE.md](PRODUCT_DETAILS_API_GUIDE.md#-أمثلة-عملية-للفرونت-إند) |
| أمثلة cURL | [PRODUCT_API_EXAMPLES.md](PRODUCT_API_EXAMPLES.md#-أمثلة-curl) |
| React Code | [PRODUCT_API_EXAMPLES.md](PRODUCT_API_EXAMPLES.md#-أمثلة-typescript) |

---

## ✅ Endpoints المتاحة

| الإجراء | الـ Endpoint | الملف المرجعي |
|--------|------------|--------------|
| قائمة المنتجات | `GET /api/v1/products` | كل الملفات |
| تفاصيل منتج | `GET /api/v1/products/[id]` | كل الملفات |
| البحث | `GET /api/v1/search?q=query` | جميع الملفات |
| الفئات | `GET /api/v1/products?categoryId=id` | PRODUCT_DETAILS_API_GUIDE |
| الماركات | `GET /api/v1/brands/[slug]/products` | PRODUCT_DETAILS_API_GUIDE |
| المجموعات | `GET /api/v1/collections/[slug]` | PRODUCT_DETAILS_API_GUIDE |

---

## 🎓 مثال سريع

### الخطوة 1: اجلب المنتج

```bash
curl "http://localhost:3000/api/v1/products/prod-123"
```

### الخطوة 2: اختر الخيارات

```javascript
const variant = product.variants[0];      // 1 لتر
const option = variant.options[1];        // بدون سكر
const unit = variant.units[1];            // دزينة
const quantity = 2;                       // دزينتان
```

### الخطوة 3: احسب السعر

```javascript
const price = option.priceOverride || unit.price;  // 3.0 JOD
const total = price * quantity;                    // 6.0 JOD
```

### الخطوة 4: أضف للسلة

```javascript
POST /api/v1/cart
{
  variantId: "var-1l",
  variantOptionId: "opt-sugar-free",
  productUnitId: "unit-dozen",
  quantity: 2
}
```

---

## 🚨 أشياء يجب تذكرها

### ✅ افعل:
- ✅ استخدم `priceOverride` إذا كانت النكهة لها سعر مختلف
- ✅ تحقق من `stock` قبل الإضافة للسلة
- ✅ استخدم `compareAtPrice` لعرض الخصومات
- ✅ اعرض `isDefault` units و variants أولاً في القائمة
- ✅ أرسل `variantId` + `optionId` + `unitId` عند الشراء

### ❌ لا تفعل:
- ❌ لا تفترض أن كل منتج له options (قد تكون فارغة)
- ❌ لا تفترض أن كل variant له وحدات متعددة (قد يكون واحد فقط)
- ❌ لا تستخدم سعر مختلف للخيار بدون `priceOverride`
- ❌ لا تنسَ التحقق من المخزون قبل الشراء

---

## 📞 أسئلة شائعة

### س: هل جميع المنتجات لها نكهات؟
**ج:** لا، فقط المنتجات التي لها `options`. افحص `variant.options.length > 0`

### س: هل يمكن أن يكون للمنتج حجم واحد فقط؟
**ج:** نعم، افحص `product.variants.length`

### س: هل يمكن أن تكون هناك وحدة بيع واحدة فقط؟
**ج:** نعم، افحص `variant.units.length`

### س: كيف أحسب السعر الصحيح؟
**ج:** اقرأ قسم "حساب السعر النهائي" في [PRODUCT_API_QUICK_START.md](PRODUCT_API_QUICK_START.md)

### س: أين تكون IDs للإضافة للسلة؟
**ج:** 
- `variantId`: من `variant.id`
- `optionId`: من `option.id` (اختياري)
- `unitId`: من `unit.id`
- `quantity`: من المستخدم

---

## 🎯 التالي

بعد قراءة هذا الملف:

1. اختر ملفاً من القائمة أعلاه حسب احتياجاتك
2. اقرأ بعناية
3. جرب الأمثلة
4. ابدأ بالترميز!

**أسئلة؟** اسأل في الـ comments أو تواصل مع الـ Backend Team 📞

---

**آخر تحديث:** May 23, 2026
