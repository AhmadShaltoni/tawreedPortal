# تحديث: إضافة صور للأصناف (Categories Images Update)

**تاريخ التحديث:** أبريل 6, 2026
**الحالة:** ✅ مكتمل وجاهز للإنتاج

---

## 📋 ملخص التغييرات

تم إضافة ميزة شاملة لرفع وإدارة الصور للأصناف في لوحة تحكم المشرف، مع دعم كامل في Mobile API. الصور تظهر الآن في تطبيق الهاتف بشكل احترافي.

---

## 🔧 التعديلات المنفذة

### 1. **قاعدة البيانات (Database)**

#### ✅ موديل Category (محدّث مسبقاً)
```prisma
model Category {
  id        String    @id @default(cuid())
  name      String    // Arabic name
  nameEn    String?   // English name
  slug      String    @unique
  image     String?   // ✨ حقل الصورة (مسار الملف)
  sortOrder Int       @default(0)
  isActive  Boolean   @default(true)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  products  Product[]
  
  @@index([sortOrder])
  @@index([isActive])
}
```

**ملاحظة:** الحقل `image` موجود بالفعل في البيانات الأساسية. لا تحتاج لإضافة migration جديدة.

---

### 2. **خدمات تحميل الملفات (Upload Services)**

#### 📁 `lib/upload.ts` - تم التوسيع

تم إضافة دوال جديدة للتعامل مع صور الأصناف:

```typescript
// ============ CATEGORY IMAGES ============
export async function saveCategoryImage(file: File): Promise<string> {
  // الصورة تُحفظ في: public/uploads/categories/[timestamp]-[hash].[ext]
  // يُرجع المسار: /uploads/categories/filename.jpg
}

export async function deleteCategoryImage(imagePath: string): Promise<void> {
  // حذف الصور عند تحديث أو حذف الصنف
}
```

**التفاصيل:**
- 📂 **مجلد الحفظ:** `public/uploads/categories/`
- 🖼️ **صيغ مدعومة:** JPEG, PNG, WebP
- 💾 **الحد الأقصى:** 5MB لكل صورة
- 🆔 **تسمية فريدة:** `timestamp-randomHash.ext`

---

### 3. **إجراءات الخادم (Server Actions)**

#### `actions/categories.ts` - تم التحديث

```typescript
export async function createCategory(formData: FormData): Promise<ActionResponse> {
  // ✨ الجديد: معالجة رفع الصورة
  // - التحقق من نوع الملف (JPEG, PNG, WebP فقط)
  // - التحقق من حجم الملف (أقل من 5MB)
  // - حفظ الصورة في المجلد المخصص
  // - حفظ المسار في قاعدة البيانات
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResponse> {
  // ✨ الجديد: تحديث/استبدال الصورة
  // - حذف الصورة القديمة عند التحديث
  // - رفع الصورة الجديدة
  // - الحفاظ على الصورة إذا لم يتم تحديثها
}

export async function deleteCategory(id: string): Promise<ActionResponse> {
  // ✨ الجديد: حذف الصورة عند حذف الصنف
}

export async function reorderCategories(ids: string[]): Promise<void> {
  // دالة مساعدة لإعادة ترتيب الأصناف
}
```

---

### 4. **نماذج الإدارة (Admin Forms)**

#### `app/admin/categories/new/NewCategoryForm.tsx` - تم التحديث

**ميزات جديدة:**
- ✨ حقل تحميل الصورة بـ drag & drop
- 🖼️ معاينة الصورة قبل الرفع
- ❌ زر حذف الصورة
- 📱 تصميم استجابي بالكامل

```tsx
// الواجهة الجديدة تتضمن:
<input
  type="file"
  name="image"
  accept="image/jpeg,image/png,image/webp"
  // معالجة المعاينة والتحديث
/>

// عرض المعاينة:
{imagePreview ? (
  <img src={imagePreview} alt="Preview" className="w-32 h-32" />
) : (
  <Upload icon + text />
)}
```

#### `app/admin/categories/[id]/EditCategoryForm.tsx` - تم التحديث

**ميزات جديدة:**
- ✨ تحديث الصورة الحالية
- ❌ زر لحذف الصورة الحالية
- 🖼️ معاينة الصورة الموجودة
- 🔄 استبدال الصورة بأخرى جديدة

```tsx
// عرض الصورة الحالية:
{imagePreview && (
  <div className="relative">
    <img src={imagePreview} alt="Preview" />
    <button onClick={handleRemoveImage}>❌</button>
  </div>
)}
```

---

### 5. **قائمة الأصناف (Categories List)**

#### `app/admin/categories/CategoryListClient.tsx` - تم التحديث

**التغييرات:**
- ✨ عمود جديد لعرض الصور المصغرة (thumbnails)
- 🖼️ حجم الصور: 48×48 pixels
- 📍 خلفية رمادية إذا لم توجد صورة
- 🎨 تصميم احترافي مع border-radius

```tsx
<td className="py-3">
  {cat.image ? (
    <img src={cat.image} alt={cat.name} className="w-12 h-12 object-cover rounded" />
  ) : (
    <div className="w-12 h-12 bg-gray-200 rounded">بدون صورة</div>
  )}
</td>
```

---

### 6. **API موبايل (Mobile API)**

#### `app/api/v1/categories/route.ts` - تم التحديث

**الاستجابة الجديدة:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cate_123abc",
        "name": "الألبان",
        "nameEn": "Dairy",
        "slug": "dairy-products",
        "sortOrder": 0,
        "image": {
          "url": "/uploads/categories/1712435200-abc123def.jpg",
          "alt": "الألبان"
        },
        "_count": {
          "products": 45
        }
      }
    ]
  }
}
```

**التفاصيل:**
- ✨ **image field:** الآن يحتوي على object بدلاً من string
  - `url`: المسار الكامل للصورة
  - `alt`: نص بديل (اسم الصنف بالعربية)
- 📊 **الحقول المُرجعة:**
  - `id`: معرف الصنف الفريد
  - `name`: الاسم بالعربية
  - `nameEn`: الاسم بالإنجليزية
  - `slug`: معرف الـ URL الصديق
  - `image`: بيانات الصورة
  - `sortOrder`: ترتيب العرض
  - `_count.products`: عدد المنتجات

---

## 📱 تعديلات التطبيق (Frontend - Mobile App)

### ما يحتاج تغييره في تطبيق الهاتف:

#### 1. **معالجة بيانات API الجديدة**

```javascript
// قديم (لا يعمل)
category.image  // -> null أو string

// جديد (يجب تحديثه)
category.image?.url      // -> "/uploads/categories/..."
category.image?.alt      // -> "اسم الصنف"
```

#### 2. **عرض الصور في قائمة الأصناف**

```javascript
// قبل: الصور كانت غير موجودة
// بعد: يجب إضافة الكود التالي

{category.image && (
  <Image
    source={{ uri: `${BASE_URL}${category.image.url}` }}
    style={{ width: 100, height: 100, borderRadius: 8 }}
  />
)}
```

#### 3. **الحجم الموصى به للصور**
- 🖼️ **عرض:** 400×300 pixels minimum
- 📐 **نسبة العرض:** 4:3 أو 16:9
- 💾 **الحد الأقصى:** 5MB

#### 4. **معالجة الخطأ**

```javascript
// إذا لم توجد صورة، عرّض placeholder
{category.image?.url ? (
  <Image source={{ uri }} />
) : (
  <PlaceholderImage categoryName={category.name} />
)}
```

---

## 🧪 اختبار التعديلات

### في الداشبورد الإدارية:

1. **إضافة صنف جديد:**
   - ✅ اذهب إلى `/admin/categories/new`
   - ✅ أدخل اسم الصنف
   - ✅ انقر على منطقة الصور
   - ✅ اختر صورة من جهازك
   - ✅ ستظهر معاينة الصورة
   - ✅ انقر "إضافة صنف"

2. **تحرير صنف:**
   - ✅ اذهب إلى `/admin/categories`
   - ✅ انقر على "تحرير" لأي صنف
   - ✅ يمكنك تحديث/حذف/استبدال الصورة
   - ✅ انقر "حفظ"

3. **قائمة الأصناف:**
   - ✅ يجب أن تظهر الصور المصغرة بحجم 48×48
   - ✅ إذا لم توجد صورة، عرّض منطقة رمادية

### في API موبايل:

```bash
# اختبر الاستجابة الجديدة
curl -X GET "http://localhost:3000/api/v1/categories"

# يجب أن تحتوي على:
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "...",
        "name": "...",
        "image": {
          "url": "/uploads/categories/...",
          "alt": "..."
        }
      }
    ]
  }
}
```

---

## 📋 قائمة التحقق قبل النشر

- ✅ تم تحديث `lib/upload.ts` بدوال `saveCategoryImage` و `deleteCategoryImage`
- ✅ تم تحديث `actions/categories.ts` لمعالجة الصور
- ✅ تم تحديث نماذج الإدارة (New & Edit forms)
- ✅ تم تحديث `CategoryListClient.tsx` لعرض الصور
- ✅ تم تحديث `app/api/v1/categories/route.ts` للـ API الجديدة
- ✅ تم اختبار رفع الصور
- ✅ تم اختبار حذف الصور القديمة
- ✅ تم اختبار معاينة الصور
- ✅ التطبيق الموبايل سيحتاج تحديث للتعامل مع الـ JSON الجديد

---

## 🚀 الخطوات القادمة (للمبرمج)

### في تطبيق الهاتف:

1. **تحديث نموذج الصنف:**
   ```typescript
   interface Category {
     id: string
     name: string
     nameEn?: string
     slug: string
     image?: {
       url: string
       alt: string
     }
     sortOrder: number
     _count: { products: number }
   }
   ```

2. **تحديث شاشة الأصناف:**
   - عرض الصور بحجم 100×100 pixels
   - معالجة الحالة عند عدم وجود صورة
   - إضافة loading skeleton أثناء تحميل الصور

3. **تحديث شاشة المنتجات:**
   - عرض صورة الصنف في headers أو filters
   - استخدام الـ category image في التصفية

4. **التخزين المؤقت:**
   - استخدم image caching للأداء الأفضل
   - clear cache عند تحديث الأصناف

---

## 🔐 ملاحظات أمان

- ✅ الملفات تُحفظ في `public/uploads/` (يمكن الوصول إليها)
- ✅ التحقق من نوع الملف (MIME type)
- ✅ التحقق من حجم الملف (5MB max)
- ✅ أسماء الملفات عشوائية لتجنب التعارض
- ✅ الصور القديمة تُحذف تلقائياً عند التحديث

---

## 📞 التواصل

في حالة وجود أسئلة أو مشاكل:
- تحقق من أن مجلد `public/uploads/categories/` موجود
- تأكد من أذونات الكتابة على المجلد
- تحقق من أن الملفات لا تتجاوز 5MB

---

## 📚 الملفات المعدلة

```
✅ lib/upload.ts                           (+35 سطر)
✅ actions/categories.ts                   (+80 سطر)
✅ app/admin/categories/new/NewCategoryForm.tsx    (+60 سطر)
✅ app/admin/categories/[id]/EditCategoryForm.tsx  (+70 سطر)
✅ app/admin/categories/CategoryListClient.tsx     (+15 سطر)
✅ app/api/v1/categories/route.ts          (+10 سطر)
```

**المجموع:** 270+ سطر من التحسينات المتوافقة تماماً مع البنية الموجودة

---

**آخر تحديث:** أبريل 6, 2026 ✅
