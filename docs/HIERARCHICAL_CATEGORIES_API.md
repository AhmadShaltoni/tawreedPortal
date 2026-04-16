# 📂 Hierarchical Categories System - API Documentation

> **وثيقة مرجعية لمبرمج الواجهة الأمامية (الموبايل)** لنظام الأصناف المتداخلة

---

## 1. نظرة عامة

تم تحويل نظام الأصناف من مستوى واحد مسطح إلى **شجرة متداخلة بعمق غير محدود**.

### المبدأ الأساسي
- كل صنف يمكن أن يحتوي على **أصناف فرعية** أو **منتجات** (في نفس المستوى)
- المنتجات يمكن تعيينها لأي صنف في أي مستوى (root, mid-level, أو leaf)
- الأصناف التي لها أبناء تعمل كـ "مجلدات" للتنظيم وللمنتجات أيضاً

### مثال على الهيكل
```
مواد تموينية (Grocery Supplies)          ← صنف رئيسي (root)
├── سكر (Sugar)                          ← صنف فرعي (يمكن ربط منتجات)
├── أرز (Rice)                           ← صنف فرعي
│   ├── أرز مصري (Egyptian Rice)         ← صنف فرعي أعمق
│   │   ├── أرز شعبان                    ← ورقة (leaf) → منتجات هنا
│   │   └── أرز عافية                    ← ورقة (leaf) → منتجات هنا
│   └── أرز بسمتي (Basmati Rice)        ← ورقة → منتجات هنا
├── زيت طبخ (Cooking Oil)
├── طحين وحبوب (Flour & Grains)
└── بهارات (Spices)

مشروبات ومأكولات (Food & Beverages)     ← صنف رئيسي آخر
├── حلويات وسناكات
├── منتجات الألبان
├── مشروبات
└── معلبات

منظفات وعناية (Cleaning & Care)
├── مواد تنظيف
└── عناية شخصية

أخرى (Other)
```

---

## 2. تغييرات قاعدة البيانات

### حقول جديدة في `Category`

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `parentId` | `String?` | معرف الصنف الأب (null = صنف رئيسي) |
| `depth` | `Int` | مستوى العمق (0 = root, 1 = child, 2 = grandchild...) |
| `path` | `String` | المسار الكامل من الجذر (e.g., `"rootId/childId/grandchildId"`) |

### العلاقة
```
Category (1) ──< (N) Category  (self-referencing via parentId)
Category (1) ──< (N) Product   (products only on leaf categories)
```

---

## 3. API Endpoints

### 3.1 الأصناف - `GET /api/v1/categories`

#### أ) جلب الأصناف الجذرية (الافتراضي)
```
GET /api/v1/categories
```

**Response:**
```json
{
  "categories": [
    {
      "id": "cm1abc...",
      "name": "مواد تموينية",
      "nameEn": "Grocery Supplies",
      "slug": "grocery-supplies",
      "image": { "url": "/uploads/categories/xxx.jpg", "alt": "مواد تموينية" },
      "sortOrder": 1,
      "parentId": null,
      "depth": 0,
      "hasChildren": true,
      "childrenCount": 5,
      "productsCount": 0,
      "_count": { "products": 0, "children": 5 }
    },
    {
      "id": "cm2def...",
      "name": "أخرى",
      "nameEn": "Other",
      "slug": "other",
      "hasChildren": false,
      "childrenCount": 0,
      "productsCount": 15
    }
  ],
  "breadcrumb": []
}
```

#### ب) جلب أبناء صنف معين
```
GET /api/v1/categories?parentId=cm1abc...
```

**Response:**
```json
{
  "categories": [
    {
      "id": "cm3ghi...",
      "name": "سكر",
      "nameEn": "Sugar",
      "slug": "sugar",
      "parentId": "cm1abc...",
      "depth": 1,
      "image": null,
      "hasChildren": false,
      "childrenCount": 0,
      "productsCount": 8
    },
    {
      "id": "cm4jkl...",
      "name": "أرز",
      "nameEn": "Rice",
      "slug": "rice",
      "parentId": "cm1abc...",
      "depth": 1,
      "image": null,
      "hasChildren": true,
      "childrenCount": 2,
      "productsCount": 0
    }
  ],
  "breadcrumb": [
    { 
      "id": "cm1abc...", 
      "name": "مواد تموينية", 
      "nameEn": "Grocery Supplies", 
      "slug": "grocery-supplies",
      "image": null,
      "depth": 0,
      "hasChildren": true,
      "childrenCount": 5,
      "productsCount": 0
    }
  ]
}
```

#### ج) جلب الشجرة الكاملة
```
GET /api/v1/categories?tree=true
```

**Response:**
```json
{
  "categories": [
    {
      "id": "cm1abc...",
      "name": "مواد تموينية",
      "nameEn": "Grocery Supplies",
      "slug": "grocery-supplies",
      "hasChildren": true,
      "childrenCount": 5,
      "productsCount": 0,
      "children": [
        {
          "id": "cm3ghi...",
          "name": "سكر",
          "nameEn": "Sugar",
          "hasChildren": false,
          "productsCount": 8,
          "children": []
        },
        {
          "id": "cm4jkl...",
          "name": "أرز",
          "nameEn": "Rice",
          "hasChildren": true,
          "productsCount": 0,
          "children": [
            {
              "id": "cm5mno...",
              "name": "أرز مصري",
              "nameEn": "Egyptian Rice",
              "hasChildren": false,
              "productsCount": 3,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 3.2 المنتجات - `GET /api/v1/products`

#### جلب منتجات صنف محدد
```
GET /api/v1/products?categoryId=cm3ghi...
```
يرجع فقط منتجات الصنف المحدد.

#### جلب منتجات صنف وجميع الأصناف الفرعية
```
GET /api/v1/products?categoryId=cm1abc...&includeDescendants=true
```
يرجع منتجات الصنف **وكل أبنائه وأحفاده** (recursive).

**مثال:** عند تصفح "مواد تموينية" مع `includeDescendants=true`:
- يعيد منتجات: سكر + أرز مصري + أرز بسمتي + زيت + طحين + بهارات + أي فروع أعمق

---

## 4. تحديثات واجهة الإدارة (Admin Dashboard) - المنتجات والأصناف

### 4.1 نماذج المنتجات - Cascading Category Selector

#### الميزة الجديدة
بدلاً من dropdown واحد مسطح للأصناف، استخدمنا **cascading selector** (محددات متسلسلة) في:
- ✅ نموذج إضافة منتج جديد (`/admin/products/new`)
- ✅ نموذج تعديل منتج (`/admin/products/[id]/edit`)

#### كيفية العمل
```
Dropdown 1️⃣:  الأصناف الجذرية
                ├─ مواد تموينية    ← اختر
                ├─ مشروبات ومأكولات
                └─ منظفات وعناية

Dropdown 2️⃣:  (يظهر عند اختيار صنف أب له أبناء)
                ├─ سكر
                ├─ أرز            ← اختر (له أبناء -> dropdown 3)
                ├─ زيت
                └─ طحين

Dropdown 3️⃣:  (يظهر عند اختيار "أرز")
                ├─ أرز مصري        ← اختر (ورقة نهائية)
                ├─ أرز بسمتي       ← اختر (ورقة نهائية)
                └─ أرز هندي

المنتج يُعيّن لآخر صنف تم اختياره (selectedPath[-1])
```

**حالات الاستخدام:**
- اختيار "مواد تموينية" فقط → منتج يُعيّن لـ "مواد تموينية"
- اختيار "مواد تموينية" + "أرز" → منتج يُعيّن لـ "أرز"
- اختيار "مواد تموينية" + "أرز" + "أرز مصري" → منتج يُعيّن لـ "أرز مصري"

#### البيانات المرسلة
```javascript
// State على الـ client
selectedPath: ["rootId", "childId", "grandchildId"]

// Form submission
formData.set('categoryId', selectedPath[selectedPath.length - 1])
// categoryId = "grandchildId" (آخر عنصر مختار)
```

#### التعديل (Edit Mode) - Pre-population
عند فتح نموذج التعديل، يتم:
1. جلب `categoryTree` من الـ server
2. حساب المسار من الصنف الحالي للمنتج إلى الجذر: `buildPathToNode()`
3. ملء `selectedPath` بالكامل والعودة لتمديد الـ dropdowns تلقائياً

**مثال:**
- منتج حالي في: "أرز مصري" (id: cm5mno)
- `buildPathToNode()` يرجع: `["cm1abc", "cm4jkl", "cm5mno"]`
- (مواد تموينية > أرز > أرز مصري)

### 4.2 سياسة تعيين المنتجات - التحديث الجديد

#### السياسة القديمة ❌
```
✗ المنتجات تُعيّن فقط للأصناف النهائية (Leaf categories)
✗ محاولة تعيين منتج لصنف له أبناء → خطأ
✗ لا يمكن جعل منتج مباشرة تحت "مواد تموينية" إذا كانت فيها أصناف فرعية
```

#### السياسة الجديدة ✅
```
✓ المنتجات يمكن تعيينها لأي صنف (root, mid-level, leaf)
✓ يمكن وجود منتجات وأصناف فرعية في نفس المستوى
✓ مثال: "مواد تموينية" يمكن أن تحتوي على:
  - منتجات مباشرة (مثل "ملح")
  - وأصناف فرعية (مثل "أرز" -> يحتوي على أنواع أرز)
```

#### التأثير على الـ API
```
القديم:
GET /api/v1/products?categoryId=cm1abc&includeDescendants=true
✗ لا يرجع منتجات من cm1abc نفسه (فقط من الأبناء)

الجديد:
GET /api/v1/products?categoryId=cm1abc&includeDescendants=true
✓ يرجع منتجات من cm1abc + كل الأبناء + كل الأحفاد (recursive)
```

---

## 5. أنماط التنقل المقترحة

### النمط 1: Drill-down (تنقل بالضغط) — **مُوصى به**

**تجربة المستخدم:**
1. الشاشة الرئيسية تعرض الأصناف الجذرية (مواد تموينية، مشروبات...)
2. الضغط على صنف يفتح شاشة جديدة بأبنائه وبمنتجات هذا المستوى
3. Breadcrumb في الأعلى للرجوع (مسار: الرئيسية > مواد تموينية > أرز)
4. عرض المنتجات المباشرة للصنف الحالي + خيار "عرض كل المنتجات" (مع descendants)

**التنفيذ:**
```
Screen 1: GET /api/v1/categories                    → عرض roots
Screen 2: GET /api/v1/categories?parentId=xxx        → عرض أبناء
Screen 3: GET /api/v1/products?categoryId=xxx        → عرض منتجات (leaf)
```

**كيف تعرف إذا تنتقل لأبناء أم منتجات؟**
- إذا `hasChildren === true` ← جلب أبناء (categories)
- إذا `hasChildren === false` ← جلب منتجات (products)

### النمط 2: Expandable Tree (شجرة قابلة للتوسيع)

**تجربة المستخدم:**
1. جلب الشجرة الكاملة مرة واحدة: `GET /api/v1/categories?tree=true`
2. عرض كشجرة مع أسهم توسيع
3. الضغط على ورقة يعرض المنتجات

**ملاحظة:** هذا النمط أقل أداءً مع أصناف كثيرة.

### النمط 3: Hybrid (مدمج)

- الصفحة الرئيسية: عرض roots كبطاقات (cards/grid)
- داخل كل root: قائمة أبناء (list)
- في أي مستوى: عرض شريط breadcrumb

---

## 5. بناء الـ Breadcrumb

عند استخدام `parentId`، الـ API يرجع `breadcrumb` تلقائياً:

```json
{
  "breadcrumb": [
    { 
      "id": "root-id", 
      "name": "مواد تموينية", 
      "nameEn": "Grocery Supplies", 
      "slug": "grocery-supplies",
      "image": null,
      "depth": 0,
      "hasChildren": true,
      "childrenCount": 5,
      "productsCount": 0
    },
    { 
      "id": "child-id", 
      "name": "أرز", 
      "nameEn": "Rice", 
      "slug": "rice",
      "image": null,
      "depth": 1,
      "hasChildren": true,
      "childrenCount": 2,
      "productsCount": 0
    }
  ]
}
```

**كيف تبني الـ UI:**
```
الرئيسية > مواد تموينية > أرز > [الحالي]
```

كل عنصر في الـ breadcrumb يعمل كرابط:
- الضغط عليه = `GET /api/v1/categories?parentId={id}`
- "الرئيسية" = `GET /api/v1/categories` (بدون parentId)

---

## 6. حقول الصنف الجديدة

| الحقل | النوع | الوصف | متى تستخدمه |
|-------|-------|-------|-------------|
| `parentId` | `string \| null` | معرف الأب | null يعني صنف جذري |
| `depth` | `number` | مستوى العمق | لتمييز المستويات بصرياً |
| `hasChildren` | `boolean` | هل له أبناء | لتحديد: هل أعرض أبناء أم منتجات أم الاثنين؟ |
| `childrenCount` | `number` | عدد الأبناء | لعرض عدد بجانب السهم |
| `productsCount` | `number` | عدد المنتجات المباشرة | لعرض عدد المنتجات في هذا المستوى |

---

## 7. ملاحظات مهمة

### ✨ التغيير الرئيسي: لا مزيد من الحد "leaf-only"
```
سابقاً:
✗ المنتجات فقط في الأوراق (hasChildren === false)
✗ "مواد تموينية" ليس له منتجات مباشرة إذا كان له أصناف فرعية

الآن:
✓ المنتجات في أي مستوى (بغض النظر عن hasChildren)
✓ "مواد تموينية" يمكن يحتوي على منتجات + أصناف فرعية معاً
```

### إرشادات للموبايل
- **جلب أبناء صنف معين:** `GET /api/v1/categories?parentId=xxx`
- **جلب منتجات مستوى واحد فقط:** `GET /api/v1/products?categoryId=xxx`
- **جلب منتجات صنف وكل أبناؤه (recursive):** `GET /api/v1/products?categoryId=xxx&includeDescendants=true`

### Backward Compatibility
- الـ API القديم `GET /api/v1/categories` بدون parameters يرجع الآن **الأصناف الجذرية فقط** (وليس كل الأصناف)
- **جديد:** المنتجات يمكن تعيينها لأي صنف (لا توجد قيود leaf-only بعد الآن)
- لجلب كل الأصناف بشكل مسطح كما كان سابقاً، استخدم `tree=true` وافرد الشجرة محلياً

### الترتيب
- `sortOrder` يعمل ضمن نفس المستوى (الإخوة)
- الأبناء مرتبون بـ `sortOrder` تصاعدياً

### الصور
- كل صنف يمكن أن يحمل صورة (image) سواء كان root أو leaf
- الصورة ترجع كـ `{ url, alt }` أو `null`

### الأداء
- حقل `path` يُستخدم داخلياً لاستعلامات descendant فعالة
- `depth` مُخزّن (cached) — لا حاجة لحسابه في الـ client
- `includeDescendants=true` يستخدم `path LIKE 'xxx/%'` (سريع مع index)

---

## 8. أمثلة عملية

### سيناريو: عرض الصفحة الرئيسية
```typescript
// جلب الأصناف الرئيسية
const { categories } = await api.get('/v1/categories')
// عرض كـ grid: مواد تموينية | مشروبات ومأكولات | منظفات وعناية | أخرى
```

### سيناريو: المستخدم ضغط على "مواد تموينية"
```typescript
const { categories, breadcrumb } = await api.get('/v1/categories?parentId=cm1abc...')
// breadcrumb: [{ name: "مواد تموينية", ... }]
// categories: [سكر, أرز, زيت, طحين, بهارات]
// منتجات مباشرة: قد تكون هناك منتجات مباشرة في "مواد تموينية" أيضاً (جديد)
```

### سيناريو: المستخدم ضغط على "أرز" (له أبناء)
```typescript
// أرز hasChildren === true
const { categories, breadcrumb } = await api.get('/v1/categories?parentId=cm4jkl...')
// breadcrumb: [{ name: "مواد تموينية" }, { name: "أرز" }]
// categories: [أرز مصري, أرز بسمتي]
// قد يكون هناك منتجات مباشرة في "أرز" بدون تحديد parentId (جديد)
```

### سيناريو: المستخدم ضغط على "أرز مصري" (ليس له أبناء)
```typescript
// أرز مصري hasChildren === false
const { products } = await api.get('/v1/products?categoryId=cm5mno...')
// products: [أرز شعبان, أرز عافية, ...]
```

### سيناريو: عرض كل منتجات "مواد تموينية" (مع الفروع)
```typescript
const { products } = await api.get('/v1/products?categoryId=cm1abc...&includeDescendants=true')
// يرجع كل المنتجات من:
// - مواد تموينية نفسها
// - سكر + أرز مصري + أرز بسمتي + زيت + طحين + بهارات
// وأي فروع أعمق (recursive)
```

### سيناريو: إضافة منتج جديد (Admin Dashboard)
```typescript
// 1. فتح نموذج إضافة منتج
// 2. Cascading selector يعرض الأصناف الجذرية أولاً
// 3. اختيار "مواد تموينية" → يظهر dropdown ثاني مع الأبناء
// 4. اختيار "أرز" → يظهر dropdown ثالث مع أنواع الأرز
// 5. اختيار "أرز مصري" → توقف (ورقة نهائية)
// 6. Submit: categoryId = "أرز مصري"

// OR: يمكن اختيار "مواد تموينية" مباشرة والاكتفاء به
// Submit: categoryId = "مواد تموينية"
```

---

## 9. ملخص التحديثات الشاملة

| الميزة | التحديث | الحالة |
|--------|---------|--------|
| **Hierarchical Categories** | أصناف متداخلة بعمق غير محدود | ✅ |
| **Category Tree API** | `GET /categories?tree=true` للشجرة الكاملة | ✅ |
| **Category Children API** | `GET /categories?parentId=xxx` للأبناء | ✅ |
| **Breadcrumb** | مدمج تلقائياً في الاستجابة | ✅ |
| **Product Filtering** | `?includeDescendants=true` لكل الفروع | ✅ |
| **Cascading Category Selector** | واجهة Admin لتحديد الصنف بشكل متسلسل | ✅ جديد |
| **Products at Any Level** | المنتجات لا تقتصر على الأوراق | ✅ جديد |
| **Pre-population on Edit** | ملء الـ cascading selector تلقائياً | ✅ جديد |

---

## 10. ملخص التغييرات الرئيسية

| الجانب | قبل | بعد | ملاحظة |
|--------|-----|-----|--------|
| هيكل الأصناف | مسطح (مستوى واحد) | متداخل (عمق غير محدود) | ✅ |
| API الافتراضي | `GET /categories` يرجع الكل | `GET /categories` يرجع roots فقط | ✅ |
| التنقل الهرمي | لا يوجد parentId | `parentId` للتنقل بين المستويات | ✅ |
| الشجرة الكاملة | لا توجد | `?tree=true` للشجرة الكاملة | ✅ |
| تصفية المنتجات | صنف واحد فقط | `?includeDescendants=true` لكل الفروع | ✅ |
| Breadcrumb | يدوي في الـ client | مدمج في الاستجابة | ✅ |
| قيد المنتجات | فقط في الأوراق (leaf) | **أي صنف في أي مستوى** | ✨ جديد |
| مختار الصنف | dropdown مسطح واحد | **cascading selector متسلسل** | ✨ جديد |
| التعديل | لا pre-population | **ملء تلقائي من المسار الحالي** | ✨ جديد |
