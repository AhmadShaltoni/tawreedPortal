# 📢 نظام الإعلانات والنوتيسات (Notices System)

## 🎬 ملخص سريع

نظام إعلانات يسمح للأدمن بإدارة رسائل ترويجية تظهر أعلى الشاشة الرئيسية بشكل دوري.

### مثال الاستخدام:
```
[أعلى الشاشة الرئيسية Home]
┌────────────────────────────────────────┐
│ توصيل مجاني للطلبات أكثر من 50 دينار   │ ← برتقالي
└────────────────────────────────────────┘
  [10 ثواني] ↓
┌────────────────────────────────────────┐
│ عرض جديد: خصم 20% على جميع المنتجات    │ ← أخضر
└────────────────────────────────────────┘
  [10 ثواني] ↓
┌────────────────────────────────────────┐
│ منتجات جديدة وصلت                       │ ← أزرق
└────────────────────────────────────────┘
  [10 ثواني] ↓ [repeat]
```

---

## 🎯 الميزات الرئيسية

✅ **عرض ديناميكي** - الإعلانات تتغير تلقائياً كل 10 ثواني  
✅ **إدارة سهلة** - الأدمن يتحكم من Dashboard  
✅ **ألوان قابلة للتخصيص** - كل إعلان له لون خاص  
✅ **Soft Delete** - الحذف بدون فقدان البيانات  
✅ **API جاهزة** - تطبيقات خارجية تستطيع تستخدمها  

---

## 📁 الملفات المهمة

| الملف | الغرض |
|------|-------|
| `docs/NOTICES_SYSTEM.md` | التوثيق الكامل |
| `docs/PROMPT_BACKEND.md` | تعليمات Backend Dev |
| `docs/PROMPT_ADMIN_DASHBOARD.md` | تعليمات Admin Dev |
| `docs/PROMPT_FRONTEND.md` | تعليمات Frontend Dev |
| `docs/TASK_DISTRIBUTION.md` | توزيع المهام |

---

## 🚀 البدء السريع

### للـ Backend Developer:
```bash
# اقرأ
docs/PROMPT_BACKEND.md

# ثم طبق:
1. Prisma schema
2. Server actions
3. API endpoints
```

### للـ Admin Developer:
```bash
# اقرأ
docs/PROMPT_ADMIN_DASHBOARD.md

# ثم طبق:
1. صفحة القائمة
2. نموذج الإضافة
3. نموذج التعديل
```

### للـ Frontend Developer:
```bash
# اقرأ
docs/PROMPT_FRONTEND.md

# ثم طبق:
1. NoticesBar component
2. استدعاء من API
3. تكامل مع Home page
```

---

## 📊 قاعدة البيانات

```sql
CREATE TABLE notices (
  id          UUID PRIMARY KEY,
  text        VARCHAR(255) NOT NULL,
  backgroundColor VARCHAR(7) DEFAULT '#FFA500',
  textColor   VARCHAR(7) DEFAULT '#FFFFFF',
  isActive    BOOLEAN DEFAULT true,
  createdAt   TIMESTAMP DEFAULT now(),
  updatedAt   TIMESTAMP
);
```

---

## 🔌 API Endpoints

### للـ Frontend (Public):
```
GET /api/v1/notices
```
ترجع جميع الإعلانات النشطة

### للـ Admin (Protected):
```
GET    /api/v1/admin/notices          # جلب الكل
POST   /api/v1/admin/notices          # إنشاء جديد
PUT    /api/v1/admin/notices/:id      # تعديل
DELETE /api/v1/admin/notices/:id      # حذف
```

---

## 📋 المهام الرئيسية

| # | المهمة | المسؤول | الوقت |
|---|--------|---------|------|
| 1 | Prisma + Migrations | Backend | 45 دقيقة |
| 2 | Server Actions | Backend | 1 ساعة |
| 3 | API Routes | Backend | 1 ساعة |
| 4 | List Page | Admin | 1.5 ساعة |
| 5 | Add Form | Admin | 1 ساعة |
| 6 | Edit Form | Admin | 1 ساعة |
| 7 | NoticesBar Component | Frontend | 45 دقيقة |
| 8 | Integration Testing | الفريق | 1 ساعة |

**المجموع**: ~8 ساعات (يوم واحد)

---

## ✅ Checklist قبل البدء

- [ ] هل قرأت التوثيق الخاص بك؟
- [ ] هل أنت واضح بشأن المدخلات والمخرجات؟
- [ ] هل تعرف الملفات التي تحتاج تعديلها؟
- [ ] هل لديك أسئلة على الفريم فيما يتعلق بـ API contracts؟

---

## 🤝 التواصل

### عند الانتهاء من جزء:
```
✅ Backend انتهى من API
  → أخبر Admin Dev 

✅ Admin انتهى من Dashboard
  → أخبر Frontend Dev

✅ Frontend انتهى من Component
  → اختبر الكل معا
```

---

## 🐛 عند مواجهة مشاكل

1. **اقرأ الـ error message بشكل دقيق**
2. **تحقق من الملف الـ PROMPT الخاص بك**
3. **ابحث في `docs/NOTICES_SYSTEM.md`**
4. **اسأل الفريق في Slack/Teams**

---

## 📚 الموارد الإضافية

- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [React Hooks Guide](https://react.dev/reference/react/hooks)
- [Color Picker](https://www.w3schools.com/html/html5_form_input_types.asp)

---

## 🎉 بعد الانتهاء

```
✨ نظام إعلانات كامل وجاهز للإنتاج
├─ Backend APIs
├─ Admin Dashboard
├─ Frontend Component
└─ موثق وجاهز للتوسع
```

---

**نسخة**: 1.0  
**التاريخ**: 6 أبريل 2026  
**الحالة**: جاهز للتطوير ✅
