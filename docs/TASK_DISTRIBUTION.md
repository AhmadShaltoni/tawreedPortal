# 📊 توزيع المهام - نظام الإعلانات (Notices System)

## 🎯 نظرة عامة

هذا الملف يوضح توزيع المهام بين الفريق لتطوير نظام الإعلانات الكامل.

---

## 👨‍💻 المهام حسب الدور

---

### 1️⃣ Backend Developer

**المسؤولية الرئيسية**: بناء البنية الخلفية والـ APIs

#### المرحلة 1: قاعدة البيانات
- [ ] أضف Prisma model `Notice` إلى `prisma/schema.prisma`
- [ ] أنشئ migration: `npx prisma migrate dev --name add_notices_system`
- [ ] اختبر أن الـ migration تعمل

#### المرحلة 2: الـ Server Actions
- [ ] أنشئ ملف جديد: `actions/notices.ts`
- [ ] طبق الدوال الـ 6:
  - `getActiveNotices()` - جلب النشطة فقط
  - `createNotice()` - إنشاء إعلان جديد
  - `updateNotice()` - تعديل إعلان
  - `disableNotice()` - تعطيل (soft delete)
  - `enableNotice()` - تفعيل
  - `getAllNotices()` - جلب الكل (للأدمن)
- [ ] أضف validation schemas إلى `lib/validations.ts`

#### المرحلة 3: API Routes
- [ ] أنشئ `app/api/v1/notices/route.ts` - GET للإعلانات النشطة
- [ ] أنشئ `app/api/v1/admin/notices/route.ts` - POST + GET للأدمن
- [ ] أنشئ `app/api/v1/admin/notices/[id]/route.ts` - PUT + DELETE

#### المرحلة 4: الاختبار
- [ ] اختبر جميع الـ endpoints بـ Postman/Thunder Client
- [ ] تأكد من authorization checks
- [ ] اختبر معالجة الأخطاء

**الملفات المؤثرة:**
- `prisma/schema.prisma`
- `actions/notices.ts` (جديد)
- `lib/validations.ts`
- `app/api/v1/notices/route.ts` (جديد)
- `app/api/v1/admin/notices/route.ts` (جديد)
- `app/api/v1/admin/notices/[id]/route.ts` (جديد)

**الوقت المتوقع**: 2-3 ساعات

---

### 2️⃣ Admin Dashboard Developer

**المسؤولية الرئيسية**: لوحة التحكم لإدارة الإعلانات

#### المرحلة 1: صفحة القائمة
- [ ] أنشئ `app/admin/notices/page.tsx` (Server Component)
- [ ] أنشئ `app/admin/notices/NoticeListClient.tsx` (Client Component)
- [ ] بنّي جدول يعرض الإعلانات بأعمدة:
  - النص (أول 50 حرف)
  - الألوان (swatches)
  - الحالة (badge)
  - التاريخ
  - الإجراءات

#### المرحلة 2: نموذج الإضافة
- [ ] أنشئ `app/admin/notices/new/page.tsx` (Server)
- [ ] أنشئ `app/admin/notices/new/NewNoticeForm.tsx` (Client)
- [ ] بنّي النموذج مع:
  - Text field (Textarea)
  - Color picker for background
  - Color picker for text
  - معاينة حية
  - أزرار حفظ + إلغاء

#### المرحلة 3: نموذج التعديل
- [ ] أنشئ `app/admin/notices/[id]/page.tsx` (Server)
- [ ] أنشئ `app/admin/notices/[id]/EditNoticeForm.tsx` (Client)
- [ ] نفس النموذج لكن مع تحميل البيانات الموجودة

#### المرحلة 4: الأزرار والإجراءات
- [ ] زر "إضافة إعلان جديد" (في القائمة)
- [ ] زر "تعديل" (في الجدول) → goes to edit page
- [ ] زر "تفعيل/تعطيل" (inline toggle)
- [ ] زر "حذف" (مع تأكيد dialog)

#### المرحلة 5: الترجمات
- [ ] أضف مفاتيح الترجمات إلى:
  - `lib/translations/ar.ts`
  - `lib/translations/en.ts`

**الملفات المؤثرة:**
- `app/admin/notices/` (جديد - مجلد كامل)
- `app/admin/notices/page.tsx` (Server)
- `app/admin/notices/NoticeListClient.tsx` (Client)
- `app/admin/notices/new/NewNoticeForm.tsx` (Client)
- `app/admin/notices/[id]/EditNoticeForm.tsx` (Client)
- `lib/translations/ar.ts` (إضافة)
- `lib/translations/en.ts` (إضافة)

**الوقت المتوقع**: 3-4 ساعات

---

### 3️⃣ Frontend Developer

**المسؤولية الرئيسية**: مكون الإعلانات على الشاشة الرئيسية

#### المرحلة 1: المكون الأساسي
- [ ] أنشئ `components/NoticesBar.tsx` (Client Component)
- [ ] طبق:
  - جلب الإعلانات من `/api/v1/notices`
  - عرض إعلان واحد
  - التدوير التلقائي كل 10 ثواني

#### المرحلة 2: State Management
- [ ] State للإعلانات
- [ ] State للـ current index
- [ ] State للتحميل والأخطاء
- [ ] useEffect للـ Fetch
- [ ] useEffect للـ Rotation

#### المرحلة 3: الـ Render والأنماط
- [ ] عرض الإعلان الحالي مع ألوانه
- [ ] Fade transition (smooth)
- [ ] Responsive design (md media query)
- [ ] معالجة حالة "لا توجد إعلانات" (hidden)

#### المرحلة 4: التكامل
- [ ] أستدعي المكون في الصفحة الرئيسية (Home)
- [ ] وضعه في أعلى الصفحة
- [ ] تأكد لا تؤثر على باقي المحتوى

#### المرحلة 5: Enhancements (اختياري)
- [ ] Accessibility (aria-live)
- [ ] RTL support
- [ ] Refetch logic

**الملفات المؤثرة:**
- `components/NoticesBar.tsx` (جديد)
- `app/page.tsx` أو home page (إضافة import)
- `lib/translations/` (استخدام فقط، بدون تعديل)

**الوقت المتوقع**: 1-2 ساعة

---

## 📋 ترتيب التنفيذ

### ✅ الترتيب الموصى به:

```
1. Backend Developer:
   ├─ Prisma Schema + Migration
   └─ Server Actions + API Routes

   ↓

2. Admin Dashboard Developer:
   ├─ Query بـ getActiveNotices() من Backend
   └─ صفحة القائمة + النماذج

   ↓

3. Frontend Developer:
   ├─ Query من `/api/v1/notices`
   └─ NoticesBar component + Integration
```

**السبب**: Backend يجب يكون جاهز أولاً، Admin بعده، وأخيراً Frontend.

---

## 🤝 نقاط التكامل (Integration Points)

### 1️⃣ Backend → Admin
- Backend يوفر Server Actions
- Admin يستخدمها في النماذج
- **الملف**: `actions/notices.ts`

### 2️⃣ Backend → Frontend
- Backend يوفر API endpoint `/api/v1/notices`
- Frontend يجلب منها
- **الملف**: `app/api/v1/notices/route.ts`

### 3️⃣ Admin Dashboard → Frontend
- Admin يدير البيانات
- Frontend يعرضها تلقائياً
- **بدون ربط مباشر** - عبر API فقط

---

## 📝 Definition of Done

### ✅ Backend
- [ ] Prisma schema updated
- [ ] Migration applied successfully
- [ ] All 6 server actions implemented
- [ ] All 3 API routes created
- [ ] Error handling working
- [ ] Authorization checks in place
- [ ] Tested with Postman

### ✅ Admin Dashboard
- [ ] Notice list page showing all items
- [ ] Add notice form working
- [ ] Edit notice form working
- [ ] Delete confirmation working
- [ ] Enable/disable toggle working
- [ ] Live preview showing
- [ ] Translations done
- [ ] Responsive on mobile

### ✅ Frontend
- [ ] NoticesBar component created
- [ ] Fetching from API
- [ ] Rotation timer working
- [ ] Colors displaying correctly
- [ ] Hidden when no notices
- [ ] Integrated in Home page
- [ ] Responsive design
- [ ] RTL support

---

## 📞 Communication Channels

### Daily Standups
- **Who**: Backend, Admin Dev, Frontend Dev
- **When**: Start of day
- **Duration**: 15 minutes
- **Topics**: Blockers, progress, integration issues

### Code Review
- **Admin Dev**: Reviews Backend API after done
- **Frontend Dev**: Reviews Admin dashboard integration
- **Backend Dev**: Reviews API usage in Frontend

### Testing Handoff
1. Backend completes → notify Admin Dev
2. Admin Dev completes → notify Frontend Dev
3. Frontend Dev completes → full integration test

---

## 🐛 Troubleshooting

| المشكلة | السبب | الحل |
|--------|------|------|
| API returns 401 | Auth check في Backend | تأكد user role = ADMIN |
| Notices not rotating | Timer لم ينطبق | الـ interval يجب 10000ms |
| Colors not showing | Hex colors غير صحيحة | Check format: #RRGGBB |
| DB migration fails | Wrong syntax | Check Prisma docs |
| Admin form doesn't save | Server action error | Check console + validation |

---

## 📚 المراجع والموارد

**Backend:**
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)
- [Zod Validation](https://zod.dev)

**Admin Dashboard:**
- [React Hook Form](https://react-hook-form.com/)
- [Input Color Picker](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color)
- [Tailwind CSS](https://tailwindcss.com/)

**Frontend:**
- [React Hooks](https://react.dev/reference/react/hooks)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)

---

## 🎯 النتيجة النهائية

```
┌─────────────────────────────────────────────┐
│ NoticesBar (Frontend)                       │
│ توصيل مجاني للطلبات أكثر من 50 دينار          │
│ [10sec] → [تغيير الإعلان]                   │
└─────────────────────────────────────────────┘
        ↑ يستقبل من
        
    API v1/notices
        ↑ يوفر من Backend
        
    Database (Prisma)
        ↑ يدار من
        
    Admin Dashboard
    (/admin/notices)
```

---

**آخر تحديث**: 6 أبريل 2026
**الحالة**: جاهز للنشر
