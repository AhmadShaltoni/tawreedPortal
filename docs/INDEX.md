# 📚 Notices System - Documentation Index

> نظام الإعلانات والنوتيسات - دليل شامل للفريق

---

## 🎯 ابدأ من هنا

### برجاء اختر الملف المناسب لك:

**⏱️ عندك 2 دقيقة؟**  
→ اقرأ `NOTICES_QUICKSTART.md`

**⏱️ عندك 5 دقائق؟**  
→ اقرأ `NOTICES_README.md`

**⏱️ عندك 10 دقائق؟**  
→ اقرأ `FULL_SUMMARY.md`

**⏱️ عربي فقط؟**  
→ اقرأ `NOTICES_AR.md`

---

## 👨‍💻 اختر حسب دورك

### Backend Developer
```
1. اقرأ: NOTICES_QUICKSTART.md (2 دقيقة)
2. اقرأ: PROMPT_BACKEND.md (10 دقائق)
3. اقرأ: API_CONTRACT.md (5 دقائق)
4. ابدأ الترميز!
```
**الملفات التي تحتاج تعديلها:**
- `prisma/schema.prisma` (إضافة)
- `actions/notices.ts` (جديد)
- `lib/validations.ts` (إضافة)
- `app/api/v1/notices/route.ts` (جديد)
- `app/api/v1/admin/notices/` (جديد)

---

### Admin Dashboard Developer
```
1. اقرأ: NOTICES_QUICKSTART.md (2 دقيقة)
2. اقرأ: PROMPT_ADMIN_DASHBOARD.md (15 دقيقة)
3. اقرأ: API_CONTRACT.md (5 دقائق) - optional
4. ابدأ الترميز!
```
**الملفات التي تحتاج تعديلها:**
- `app/admin/notices/` (جديد - مجلد كامل)
- `lib/translations/ar.ts` (إضافة)
- `lib/translations/en.ts` (إضافة)

---

### Frontend Developer
```
1. اقرأ: NOTICES_QUICKSTART.md (2 دقيقة)
2. اقرأ: PROMPT_FRONTEND.md (10 دقائق)
3. اقرأ: API_CONTRACT.md (جزء GET /api/v1/notices فقط - 2 دقيقة)
4. ابدأ الترميز!
```
**الملفات التي تحتاج تعديلها:**
- `components/NoticesBar.tsx` (جديد)
- Home page (إضافة import + call)

---

## 📖 الملفات الموثقة

### للمبتدئين والمراجعة السريعة
- **NOTICES_QUICKSTART.md** - TL;DR (2 دقيقة)
- **NOTICES_README.md** - ملخص سريع (5 دقائق)
- **NOTICES_AR.md** - ملخص عربي (5 دقائق)

### للفهم العميق
- **NOTICES_SYSTEM.md** - التوثيق الكامل (15 دقيقة)
- **FULL_SUMMARY.md** - ملخص شامل (10 دقائق)

### للتطوير الفعلي
- **PROMPT_BACKEND.md** - تعليمات Backend
- **PROMPT_ADMIN_DASHBOARD.md** - تعليمات Admin Dashboard
- **PROMPT_FRONTEND.md** - تعليمات Frontend

### المراجع التقنية
- **API_CONTRACT.md** - JSON Request/Response Examples
- **TASK_DISTRIBUTION.md** - توزيع المهام والتبعيات

---

## 🔄 ترتيب القراءة الموصى به

### السيناريو 1: أنت Backend Developer
```
1. NOTICES_QUICKSTART.md (2 min)
   ↓
2. PROMPT_BACKEND.md (10 min) ⭐ اقرأ هذا بتركيز
   ↓
3. API_CONTRACT.md (5 min) - كمرجع
   ↓
4. ابدأ الترميز
```

### السيناريو 2: أنت Admin Dashboard Developer
```
1. NOTICES_QUICKSTART.md (2 min)
   ↓
2. PROMPT_ADMIN_DASHBOARD.md (15 min) ⭐ اقرأ هذا بتركيز
   ↓
3. FULL_SUMMARY.md - كمرجع للـ structure
   ↓
4. ابدأ الترميز
```

### السيناريو 3: أنت Frontend Developer
```
1. NOTICES_QUICKSTART.md (2 min)
   ↓
2. PROMPT_FRONTEND.md (10 min) ⭐ اقرأ هذا بتركيز
   ↓
3. API_CONTRACT.md - جزء GET /api/v1/notices only
   ↓
4. ابدأ الترميز
```

### السيناريو 4: أنت Team Lead/Manager
```
1. NOTICES_README.md (5 min)
   ↓
2. TASK_DISTRIBUTION.md (10 min) ⭐ توزيع المهام
   ↓
3. FULL_SUMMARY.md - timeline وdependencies
```

---

## ✅ نقاط رئيسية لا تنساها

### Backend
- [ ] Prisma schema يحتوي على 7 حقول
- [ ] 6 server actions مطلوبة
- [ ] 3 API routes (GET, POST, PUT+DELETE)
- [ ] Authorization check لـ ADMIN role

### Admin
- [ ] صفحة list + نموذج add + نموذج edit
- [ ] معاينة حية للألوان
- [ ] أزرار الإجراءات (edit, toggle, delete)
- [ ] ترجمات AR/EN

### Frontend
- [ ] مكون واحد فقط: NoticesBar.tsx
- [ ] جلب من /api/v1/notices
- [ ] تبديل الإعلان كل 10 ثواني
- [ ] إختفاء إذا لا توجد إعلانات

---

## 🔗 الملفات بترتيب الحجم

### ملفات قصيرة (< 5 دقائق قراءة)
1. `NOTICES_QUICKSTART.md`
2. `NOTICES_AR.md`
3. API_CONTRACT.md - sections

### ملفات متوسطة (5-15 دقيقة قراءة)
1. `NOTICES_README.md`
2. `PROMPT_FRONTEND.md`
3. `FULL_SUMMARY.md`
4. `TASK_DISTRIBUTION.md`

### ملفات طويلة (15+ دقيقة قراءة)
1. `PROMPT_BACKEND.md`
2. `PROMPT_ADMIN_DASHBOARD.md`
3. `NOTICES_SYSTEM.md`
4. `API_CONTRACT.md` (complete)

---

## 🎯 رسالة سريعة من كل دور

### للـ Backend
```
استخدم API_CONTRACT.md كـ reference دقيق
الـ JSON examples موجودة فيه
ما في حاجة غير واضحة - اسأل
```

### للـ Admin
```
شوف /admin/categories كـ example
نفس المنطق لـ CRUD operations
Focus على UX (لا تنسى معاينة الألوان)
```

### للـ Frontend
```
جرب الـ API أولاً بـ Postman/curl
تأكد من الـ response format
ركز على التبديل بعد 10 ثواني
```

---

## 📊 Dependencies بين الفريق

```
Backend ← يوفر API و Server Actions
  ↓
Admin ← يستخدم Server Actions
  ↓
Frontend ← يستخدم الـ API
```

**الترتيب الصحيح:**
1. Backend ينتهي → اخبر Admin Dev
2. Admin ينتهي → اخبر Frontend Dev
3. Frontend ينتهي → اختبروا الكل معاً

---

## 🚨 Common Issues

### Backend لم ينتهي بعد؟
- Admin و Frontend في الانتظار
- يمكن لـ Admin أن يكتب mock data مؤقتاً

### Admin لم ينتهي بعد؟
- Frontend يستطيع أن يختبر مع Backend API مباشرة

### Frontend يحتاج تعديلات؟
- قد يكون في الـ API contract اختلاف
- راجع API_CONTRACT.md

---

## 📞 أسئلة شائعة

**س: أبدأ من فين؟**  
ج: اقرأ الـ PROMPT الخاص بدورك

**س: ما الـ deadline؟**  
ج: يوم عمل واحد (8-10 ساعات كـ estimate)

**س: لو متغير جزء من الـ requirement؟**  
ج: أخبر الفريق فوراً قبل البدء

**س: في مراجع إضافية؟**  
ج: نعم - في آخر كل PROMPT file

---

## 🎁 خريطة الملفات

```
docs/
├─ INDEX (أنت هنا)
│
├─ 🚀 FOR QUICK START (ابدأ من هنا)
│  ├─ NOTICES_QUICKSTART.md (2 min)
│  ├─ NOTICES_README.md (5 min)
│  └─ NOTICES_AR.md (5 min - عربي)
│
├─ 👨‍💻 FOR YOUR ROLE (اقرأ الخاص بك)
│  ├─ PROMPT_BACKEND.md
│  ├─ PROMPT_ADMIN_DASHBOARD.md
│  └─ PROMPT_FRONTEND.md
│
├─ 📚 FOR REFERENCE (كـ documentation)
│  ├─ NOTICES_SYSTEM.md
│  ├─ API_CONTRACT.md
│  ├─ FULL_SUMMARY.md
│  └─ TASK_DISTRIBUTION.md
│
└─ 📋 YOU ARE HERE
   └─ INDEX.md (هذا الملف)
```

---

## ✨ آخر نصيحة

**اقرأ الملف الخاص بك بتركيز كامل أولاً**

بعد ما تفهم الـ requirements:
1. افتح الملفات المطلوب تعديلها
2. ابدأ الترميز step by step
3. اختبر كل خطوة
4. اسأل لو في حاجة غير واضحة

---

**آخر تحديث**: 6 أبريل 2026  
**الإصدار**: 1.0  
**الحالة**: ✅ جاهز للتطوير

---

## 🚀 ابدأ الآن!

اختر دورك وافتح الـ PROMPT الخاص بك:
- Backend → PROMPT_BACKEND.md
- Admin → PROMPT_ADMIN_DASHBOARD.md
- Frontend → PROMPT_FRONTEND.md
