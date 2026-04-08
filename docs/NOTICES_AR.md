# 📢 ملخص عربي سريع - نظام الإعلانات

## ⚡ 10 ثواني - الفكرة الأساسية

**بار إعلانات أعلى الشاشة الرئيسية → يتغير كل 10 ثواني → الأدمن يدير من Dashboard**

```
الأدمن يضيف إعلانات → تظهر على الموبايل تلقائياً
```

---

## 👥 من يعمل إيه؟

### 1️⃣ Backend Developer
```
قاعدة بيانات + API endpoints
افتح: docs/PROMPT_BACKEND.md
```

### 2️⃣ Admin Dashboard Developer  
```
صفحة إدارة الإعلانات
افتح: docs/PROMPT_ADMIN_DASHBOARD.md
```

### 3️⃣ Frontend Developer
```
مكون عرض الإعلانات على الشاشة الرئيسية
افتح: docs/PROMPT_FRONTEND.md
```

---

## 📊 الترتيب

1️⃣ Backend ينهي API (2-3 ساعات)  
2️⃣ Admin يعمل Dashboard (3-4 ساعات)  
3️⃣ Frontend يعمل Component (1-2 ساعة)  

**المجموع**: يوم واحد

---

## 📁 الملفات المهمة

| الملف | الغرض |
|------|-------|
| `NOTICES_QUICKSTART.md` | ملخص جداً سريع |
| `PROMPT_*.md` (3 ملفات) | تعليمات لكل واحد |
| `API_CONTRACT.md` | أمثلة JSON |
| `TASK_DISTRIBUTION.md` | توزيع المهام |
| `NOTICES_SYSTEM.md` | التوثيق الكامل |

---

## 💾 قاعدة البيانات

جدول واحد فقط اسمه `notices`:
- `id`: معرّف فريد
- `text`: نص الإعلان (255 حرف max)
- `backgroundColor`: لون الخلفية (#FFA500)
- `textColor`: لون النص (#FFFFFF)
- `isActive`: نشط أم لا (true/false)
- `createdAt`: تاريخ الإنشاء
- `updatedAt`: آخر تعديل

---

## 🔌 APIs

### للـ Frontend (عام)
```
GET /api/v1/notices
→ ترجع الإعلانات النشطة فقط
```

### للـ Admin (محمي)
```
GET    /api/v1/admin/notices       # جلب الكل
POST   /api/v1/admin/notices       # إنشاء
PUT    /api/v1/admin/notices/:id   # تعديل
DELETE /api/v1/admin/notices/:id   # حذف
```

---

## 🎯 مثال عملي

**الأدمن في Dashboard:**
```
1. يضغط "إضافة إعلان"
2. يكتب: "توصيل مجاني للطلبات أكثر من 50 دينار"
3. يختار لون برتقالي: #FFA500
4. يضغط حفظ
```

**المستخدم على الموبايل:**
```
[أعلى الشاشة الرئيسية]
┌────────────────────────────────┐
│ توصيل مجاني للطلبات أكثر من    │
│ 50 دينار                       │
└────────────────────────────────┘
[بعد 10 ثواني تتغير للإعلان التالي]
```

---

## ✅ قبل ما تبدأ

- [ ] قرأت PROMPT الخاص بك (3 دقائق)
- [ ] فهمت المدخلات والمخرجات
- [ ] إذا في سؤال → اسأل الفريق

---

## 📚 الملفات الموجودة في `docs/`

```
✅ NOTICES_README.md           (شرح سريع)
✅ NOTICES_QUICKSTART.md       (TL;DR - 2 دقيقة)
✅ NOTICES_SYSTEM.md           (التوثيق الكامل)
✅ API_CONTRACT.md             (JSON examples)
✅ PROMPT_BACKEND.md           (Backend dev)
✅ PROMPT_ADMIN_DASHBOARD.md   (Admin dev)
✅ PROMPT_FRONTEND.md          (Frontend dev)
✅ TASK_DISTRIBUTION.md        (توزيع المهام)
✅ FULL_SUMMARY.md             (ملخص شامل)
✅ NOTICES_AR.md               (هذا الملف - عربي)
```

---

## 🚀 ابدأ الآن

**Backend**: ابدأ بـ Prisma schema  
**Admin**: ابدأ بـ list page  
**Frontend**: ابدأ بـ NoticesBar component  

---

**هذا كل شيء! يلا نبدأ 🚀**
