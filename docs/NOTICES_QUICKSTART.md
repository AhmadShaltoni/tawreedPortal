# 📌 TL;DR - نظام الإعلانات (ملخص سريع جاً)

## الفكرة بـ 10 ثواني

**بار إعلانات أعلى الشاشة الرئيسية يعرض رسائل ترويجية تتغير كل 10 ثواني.**

---

## من يعمل إيه؟

### 👨‍💻 Backend Developer
```
1. أنشئ جدول notices في قاعدة البيانات
2. اكتب 3 API endpoints:
   - GET /api/v1/notices (جلب)
   - POST /admin/notices (إنشاء)
   -PUT/DELETE /admin/notices/:id (تعديل/حذف)
3. اكتب 6 server actions
```
📝 **اقرأ**: `docs/PROMPT_BACKEND.md`

---

### 👨‍💼 Admin Dashboard Developer
```
1. أنشئ صفحة /admin/notices
2. اكتب جدول الإعلانات
3. اكتب نموذج الإضافة والتعديل
4. أضف أزرار الإجراءات
```
📝 **اقرأ**: `docs/PROMPT_ADMIN_DASHBOARD.md`

---

### 📱 Frontend Developer
```
1. أنشئ NoticesBar component
2. اجلب من /api/v1/notices
3. غيّر الإعلان كل 10 ثواني
4. ضعه أعلى الشاشة الرئيسية
```
📝 **اقرأ**: `docs/PROMPT_FRONTEND.md`

---

## البيانات

```json
{
  "id": "UUID",
  "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
  "backgroundColor": "#FFA500",
  "textColor": "#FFFFFF",
  "isActive": true
}
```

---

## الترتيب

```
1️⃣ Backend (2-3 ساعات)
   ↓
2️⃣ Admin (3-4 ساعات)
   ↓
3️⃣ Frontend (1-2 ساعة)
```

---

## النتيجة

```
أعلى Home page:
┌──────────────────────────────┐
│ توصيل مجاني للطلبات أكثر من 
│ 50 دينار                      │
└──────────────────────────────┘

[10 sec later]

┌──────────────────────────────┐
│ عرض جديد: خصم 20% على جميع   │
│ المنتجات                     │
└──────────────────────────────┘
```

---

## الملفات الجديدة

```
docs/
├─ NOTICES_SYSTEM.md           # التوثيق الكامل
├─ PROMPT_BACKEND.md           # للـ Backend dev
├─ PROMPT_ADMIN_DASHBOARD.md   # للـ Admin dev
├─ PROMPT_FRONTEND.md          # للـ Frontend dev
├─ TASK_DISTRIBUTION.md        # توزيع المهام
├─ NOTICES_README.md           # شرح سريع
└─ NOTICES_QUICKSTART.md       # (هذا الملف)

+ الملفات الجديدة تحت app/ و actions/
```

---

## ابدأ الآن

1. اقرأ الـ PROMPT الخاص بك (3 دقائق)
2. افتح الملفات المطلوبة
3. ابدأ الترميز!

---

**هذا كل شيء! 🚀**
