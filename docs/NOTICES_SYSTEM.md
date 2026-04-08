# نظام الإعلانات والنوتيسات (Notices System)

## 📋 نظرة عامة

نظام إعلانات ديناميكي يسمح للأدمن بإدارة إعلانات تدور على الشاشة الرئيسية (Home) بألوان وأوقات مختلفة.

### الميزات:
- ✅ عرض إعلانات متعددة بتبديل تلقائي كل 10 ثواني
- ✅ إدارة كاملة من قبل الأدمن (إضافة، تعديل، تعطيل)
- ✅ ألوان قابلة للتخصيص (background + text)
- ✅ soft delete (عدم الحذف الحقيقي للبيانات)
- ✅ API قابلة للاستخدام من التطبيقات الخارجية

---

## 🗄️ قاعدة البيانات

### جدول `notices`

```sql
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text VARCHAR(255) NOT NULL,
  backgroundColor VARCHAR(7) DEFAULT '#FFA500',
  textColor VARCHAR(7) DEFAULT '#FFFFFF',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_text_length CHECK (length(text) > 0 AND length(text) <= 255),
  CONSTRAINT chk_colors CHECK (
    string_length(backgroundColor) = 7 AND
    string_length(textColor) = 7
  )
);

CREATE INDEX idx_notices_isActive ON notices(isActive);
CREATE INDEX idx_notices_createdAt ON notices(createdAt DESC);
```

### Prisma Schema

```prisma
model Notice {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  text          String   @db.VarChar(255)
  backgroundColor String  @default("#FFA500") @db.VarChar(7)
  textColor     String   @default("#FFFFFF") @db.VarChar(7)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([isActive])
  @@index([createdAt(sort: Desc)])
  @@map("notices")
}
```

---

## 🔌 API Endpoints

### 1. الحصول على الإعلانات النشطة (للـ Frontend)

```
GET /api/v1/notices
```

**الاستجابة:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
      "backgroundColor": "#FFA500",
      "textColor": "#FFFFFF",
      "isActive": true
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "text": "عرض جديد: خصم 20% على جميع المنتجات",
      "backgroundColor": "#4CAF50",
      "textColor": "#FFFFFF",
      "isActive": true
    }
  ]
}
```

### 2. Admin API - إنشاء إعلان

```
POST /api/v1/admin/notices
```

**الطلب:**
```json
{
  "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
  "backgroundColor": "#FFA500",
  "textColor": "#FFFFFF"
}
```

### 3. Admin API - تحديث إعلان

```
PUT /api/v1/admin/notices/:id
```

**الطلب:**
```json
{
  "text": "توصيل مجاني للطلبات أكثر من 100 دينار",
  "backgroundColor": "#FF5722",
  "textColor": "#FFFFFF",
  "isActive": true
}
```

### 4. Admin API - حذف (تعطيل) إعلان

```
DELETE /api/v1/admin/notices/:id
```

**الاستجابة:**
```json
{
  "success": true,
  "message": "Notice disabled successfully"
}
```

---

## 🎨 Frontend Implementation

### Home Screen - Notices Bar

```tsx
// components/NoticesBar.tsx
'use client'

import { useEffect, useState } from 'react'

interface Notice {
  id: string
  text: string
  backgroundColor: string
  textColor: string
}

export function NoticesBar() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/v1/notices')
        const data = await res.json()
        if (data.success && data.data.length > 0) {
          setNotices(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch notices:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotices()
  }, [])

  useEffect(() => {
    if (notices.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notices.length)
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [notices.length])

  if (loading || notices.length === 0) return null

  const notice = notices[currentIndex]

  return (
    <div
      className="w-full py-3 px-4 text-center transition-all duration-500"
      style={{
        backgroundColor: notice.backgroundColor,
        color: notice.textColor,
      }}
    >
      <p className="text-sm md:text-base font-medium">{notice.text}</p>
    </div>
  )
}
```

---

## 👨‍💼 Admin Dashboard UI

**المنطقة**: `/admin/notices`

### الصفحة الرئيسية (قائمة الإعلانات)
- جدول يعرض كل الإعلانات (النشطة والمعطلة)
- زر "إضافة إعلان جديد"
- لكل إعلان: تعديل، تفعيل/تعطيل، حذف
- تصفية حسب الحالة (نشط/معطل)

### نموذج الإضافة/التعديل
- حقل النص (255 حرف max)
- منتقى الألوان للخلفية
- منتقى الألوان للنص
- معاينة حية للإعلان
- زر الحفظ والإلغاء

---

## 📊 Migration

```bash
# إنشاء migration جديدة
npx prisma migrate dev --name add_notices_system

# أو يدويّاً
npx prisma db push
```

---

## 🔐 الصلاحيات (Authorization)

جميع Endpoints الـ Admin تتطلب:
- المستخدم مسجل دخول
- دور المستخدم = `ADMIN`

```typescript
if (!user || user.role !== 'ADMIN') {
  return { success: false, error: 'Unauthorized' }
}
```

---

## 🎯 استخدام أمثلة

### مثال 1: عرض إعلانات تدور
```
إعلان 1 (0-10ثواني): "توصيل مجاني للطلبات أكثر من 50 دينار" 🟠
إعلان 2 (10-20ثانية): "عرض جديد: خصم 20% على جميع المنتجات" 🟢
إعلان 3 (20-30ثانية): "منتجات جديدة وصلت" 🔵
```

### مثال 2: لا توجد إعلانات
```
البار → يختفي تماماً
```

---

## 📝 Translations

يجب إضافة المفاتيح التالية للترجمات:

**Arabic (`lib/translations/ar.ts`):**
```typescript
notices: {
  title: 'الإعلانات',
  addNew: 'إضافة إعلان جديد',
  text: 'نص الإعلان',
  backgroundColor: 'لون الخلفية',
  textColor: 'لون النص',
  status: 'الحالة',
  active: 'نشط',
  inactive: 'معطل',
  edit: 'تعديل',
  delete: 'حذف',
  save: 'حفظ',
  cancel: 'إلغاء',
  noNotices: 'لا توجد إعلانات',
  preview: 'معاينة',
}
```

**English (`lib/translations/en.ts`):**
```typescript
notices: {
  title: 'Announcements',
  addNew: 'Add New Notice',
  text: 'Notice Text',
  backgroundColor: 'Background Color',
  textColor: 'Text Color',
  status: 'Status',
  active: 'Active',
  inactive: 'Inactive',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  noNotices: 'No notices',
  preview: 'Preview',
}
```

---

## ✅ Checklist

- [ ] عمل Prisma schema
- [ ] عمل database migration
- [ ] عمل API endpoints
- [ ] عمل server actions
- [ ] عمل admin dashboard
- [ ] عمل frontend component
- [ ] إضافة ترجمات
- [ ] اختبار كامل النظام
