# 📱 PROMPT: Frontend Developer - Notices Bar Component

## المهمة

تطوير مكون `NoticesBar` يعرض إعلانات تدور تلقائياً على الشاشة الرئيسية (Home) بألوان مختلفة.

---

## 🎯 الميزات المطلوبة

### 1. التدوير التلقائي
- عرض إعلان واحد
- بعد 10 ثواني → إعلان التالي
- قائمة دورية (آخر إعلان ← أول إعلان)

### 2. الاختفاء الذكي
- إذا لا توجد إعلانات نشطة → البار يختفي تماماً

### 3. الألوان الديناميكية
- كل إعلان لون خلفية خاص
- كل إعلان لون نص خاص
- الألوان تأتي من الـ API

### 4. الـ Layout
- يظهر **أعلى** الشاشة الرئيسية (Home)
- عرض كامل: `w-full`
- Padding: `py-3 px-4`
- نص وسط: `text-center`

---

## 🔌 API الخاص بك

**Endpoint**: `/api/v1/notices`

**Method**: `GET`

**الاستجابة:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
      "backgroundColor": "#FFA500",
      "textColor": "#FFFFFF"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "text": "عرض جديد: خصم 20% على جميع المنتجات",
      "backgroundColor": "#4CAF50",
      "textColor": "#FFFFFF"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "text": "منتجات جديدة وصلت",
      "backgroundColor": "#2196F3",
      "textColor": "#FFFFFF"
    }
  ]
}
```

---

## 🛠️ معمارية المكون

### ملف المكون

**الموقع**: `components/NoticesBar.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

interface Notice {
  id: string
  text: string
  backgroundColor: string
  textColor: string
}

interface NoticesBarProps {
  interval?: number  // مدة التدوير (ملي ثانية) - افتراضي 10000
}

export function NoticesBar({ interval = 10000 }: NoticesBarProps) {
  // TODO: Implementation
}

export default NoticesBar
```

---

## 📝 التفاصيل التقنية

### State المطلوب

```typescript
const [notices, setNotices] = useState<Notice[]>([])
const [currentIndex, setCurrentIndex] = useState(0)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

### Hooks المستخدمة

#### 1. useEffect للـ Fetch
**الهدف**: جلب الإعلانات من الـ API عند mount المكون

```typescript
useEffect(() => {
  const fetchNotices = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v1/notices')
      const data = await res.json()
      
      if (data.success && Array.isArray(data.data)) {
        setNotices(data.data)
        setCurrentIndex(0)  // ابدأ من الأول
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error)
      setError('Failed to load notices')
    } finally {
      setLoading(false)
    }
  }

  fetchNotices()
}, [])
```

#### 2. useEffect للـ Rotation
**الهدف**: تدوير الإعلانات كل 10 ثواني

```typescript
useEffect(() => {
  if (notices.length === 0) return

  const intervalId = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % notices.length)
  }, interval)

  return () => clearInterval(intervalId)
}, [notices.length, interval])
```

---

## 🎨 الـ Render

### صيغة HTML

```tsx
return (
  <>
    {/* رسالة الخطأ (اختياري) */}
    {error && (
      <div className="bg-red-500 text-white py-2 px-4 text-center text-sm">
        {error}
      </div>
    )}

    {/* البار الرئيسي */}
    {!loading && notices.length > 0 && (
      <div
        className="w-full py-3 px-4 text-center transition-all duration-500"
        style={{
          backgroundColor: notices[currentIndex].backgroundColor,
          color: notices[currentIndex].textColor,
        }}
      >
        <p className="text-sm md:text-base font-medium leading-relaxed">
          {notices[currentIndex].text}
        </p>
      </div>
    )}
  </>
)
```

### CSS Classes
- `w-full` - عرض كامل
- `py-3 px-4` - padding
- `text-center` - توسيط النص
- `transition-all duration-500` - تلاشي سلس عند التغيير
- `text-sm md:text-base` - حاجم النص + responsive
- `font-medium` - وزن الخط
- `leading-relaxed` - ارتفاع سطر أفضل للقراءة

---

## 📍 الاستخدام في الصفحة الرئيسية

**الملف**: `app/(tabs)/home/page.tsx` أو `app/page.tsx`

```tsx
import { NoticesBar } from '@/components/NoticesBar'

export default function HomePage() {
  return (
    <>
      {/* NoticesBar يجب أن يكون أول عنصر */}
      <NoticesBar />

      {/* باقي المحتوى */}
      <main className="container mx-auto">
        {/* ... */}
      </main>
    </>
  )
}
```

---

## 🔄 حالات الاستخدام

### الحالة 1: إعلانات موجودة
```
[التحميل...]
↓
عرض إعلان 1 (10 sec)
عرض إعلان 2 (10 sec)
عرض إعلان 3 (10 sec)
عرض إعلان 1 (repeat)
...
```

### الحالة 2: لا توجد إعلانات
```
[التحميل...]
↓
البار يختفي تماماً → لا شيء يظهر
```

### الحالة 3: خطأ في الـ API
```
[خطأ: Failed to load notices]
↓
رسالة حمراء صغيرة
```

---

## ⚡ الأداء والتحسينات

### 1. Refresh الإعلانات (اختياري)
أضف زر refresh يدوي (مفيد للـ admins):

```typescript
const handleRefresh = async () => {
  setLoading(true)
  // أعد جلب الإعلانات
}
```

### 2. Refetch الدوري (اختياري)
أعد جلب الإعلانات كل دقيقة للتأكد من التحديثات:

```typescript
// في useEffect الثاني، أضف refetch interval
const refetchInterval = setInterval(() => {
  fetchNotices() // أعد استدعاء API
}, 60000) // كل دقيقة
```

### 3. Accessibility
- أضف `aria-live="polite"` للتحديثات الحية
- أضف `.sr-only` text لقارئات الشاشة

```tsx
<div
  className="w-full py-3 px-4 text-center"
  aria-live="polite"
  aria-label={`Current notice: ${notices[currentIndex].text}`}
>
  <p className="text-sm md:text-base font-medium">
    {notices[currentIndex].text}
  </p>
</div>
```

---

## 🌐 RTL Support

**مهم للعربية:**

```tsx
<div
  className="w-full py-3 px-4 text-center transition-all"
  dir={notices[currentIndex].text.match(/[\u0600-\u06FF]/) ? 'rtl' : 'ltr'}
  style={{...}}
>
```

أو استخدم `useLanguage()` hook:

```typescript
import { useLanguage } from '@/lib/LanguageContext'

export function NoticesBar() {
  const { dir } = useLanguage()
  
  return (
    <div dir={dir} className="...">
      {/* ... */}
    </div>
  )
}
```

---

## 🧪 الاختبار

### اختبارات يدوية

1. **وجود إعلانات**: البار يظهر ويدور كل 10 ثواني ✓
2. **لا توجد إعلانات**: البار يختفي ✓
3. **خطأ API**: رسالة خطأ تظهر ✓
4. **التحميل**: Loading state يعمل ✓
5. **RTL**: النصوص العربية تظهر صحيح ✓

### Mock Data للاختبار

```typescript
const mockNotices: Notice[] = [
  {
    id: '1',
    text: 'توصيل مجاني للطلبات أكثر من 50 دينار',
    backgroundColor: '#FFA500',
    textColor: '#FFFFFF',
  },
  {
    id: '2',
    text: 'عرض جديد: خصم 20% على جميع المنتجات',
    backgroundColor: '#4CAF50',
    textColor: '#FFFFFF',
  },
]
```

---

## 🔗 ملفات ذات صلة

- `lib/LanguageContext.tsx` - للـ RTL support
- API: `/api/v1/notices` (Backend dev سيطوره)
- Admin Dashboard: `/admin/notices` (Admin dev سيطوره)

---

## ✅ Checklist

- [ ] المكون يجلب الإعلانات من الـ API
- [ ] التدوير يعمل كل 10 ثواني
- [ ] الألوان تظهر بشكل صحيح
- [ ] البار يختفي إذا لا توجد إعلانات
- [ ] معالجة الأخطاء
- [ ] Loading state
- [ ] Responsive design
- [ ] RTL support
- [ ] Accessibility
- [ ] استدعاء المكون في Home page
