# 🎨 Visual Diagrams - نظام الإعلانات

## 1. نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────┐
│                     NOTICES SYSTEM ARCHITECTURE              │
└─────────────────────────────────────────────────────────────┘

    Admin User (Web Browser)
            │
            ↓
    ┌──────────────────────┐
    │   Admin Dashboard    │
    │   /admin/notices     │
    │                      │
    │ • List Notices       │
    │ • Add/Edit Form      │
    │ • Delete/Toggle      │
    └──────────┬───────────┘
               │ (Server Actions)
               ↓
    ┌──────────────────────┐
    │  Backend - Server    │
    │  actions/notices.ts  │
    └──────────┬───────────┘
               │ (Database)
               ↓
    ┌──────────────────────┐
    │    PostgreSQL DB     │
    │   notices table      │
    │  • id                │
    │  • text              │
    │  • backgroundColor   │
    │  • textColor         │
    │  • isActive          │
    │  • timestamps        │
    └──────────┬───────────┘
               │ (API Routes)
               ↓
    ┌──────────────────────┐
    │   API Endpoints      │
    │  /api/v1/notices     │
    └──────────┬───────────┘
               │
        ┌──────┴────────┐
        ↓               ↓
    Mobile/App     Frontend (Web)
    (JWT Auth)     (Session)
        │               │
        ↓               ↓
┌──────────────┐  ┌──────────────────┐
│ Mobile App   │  │  NoticesBar      │
│ (React Native)  │  Component       │
│              │  │ app/page.tsx     │
│ Uses API     │  │ (Home Screen)    │
│ /api/v1/     │  │                  │
│ notices      │  │ Rotates every    │
│              │  │ 10 seconds       │
└──────────────┘  └──────────────────┘
```

---

## 2. Data Flow

### A. Admin إضافة إعلان جديد

```
┌─────────────────────────────────────────────┐
│  Admin Dashboard: Add Notice Form           │
│  • Text field: "توصيل مجاني..."            │
│  • Color picker: #FFA500                   │
│  • Text color: #FFFFFF                     │
│  • Click: SAVE button                      │
└────────────────┬────────────────────────────┘
                 │
                 ↓ (Server Action)
┌─────────────────────────────────────────────┐
│  Backend: createNotice()                    │
│  1. Verify user is ADMIN ✓                 │
│  2. Validate input data ✓                  │
│  3. Save to database ✓                     │
│  4. Return success + new notice            │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  Frontend: Show success toast               │
│  Admin redirected to list page              │
└─────────────────────────────────────────────┘

[الإعلان يظهر فوراً على الموبايلات]
```

### B. Frontend يعرض الإعلانات

```
┌─────────────────────────────────────────────┐
│  User opens mobile app → Home screen        │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  NoticesBar component mounts                │
│  useEffect: fetch /api/v1/notices           │
└────────────────┬────────────────────────────┘
                 │
                 ↓ (HTTP GET)
┌─────────────────────────────────────────────┐
│  Backend API returns:                       │
│  [                                          │
│    {                                        │
│      id: "uuid-1",                          │
│      text: "توصيل مجاني...",               │
│      backgroundColor: "#FFA500",            │
│      textColor: "#FFFFFF"                   │
│    },                                       │
│    {                                        │
│      id: "uuid-2",                          │
│      text: "عرض جديد...",                  │
│      backgroundColor: "#4CAF50",            │
│      textColor: "#FFFFFF"                   │
│    }                                        │
│  ]                                          │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  Frontend renders first notice:             │
│  ┌─────────────────────────────────────┐   │
│  │ توصيل مجاني للطلبات أكثر من 50 د   │ ← #FFA500 & #FFF
│  └─────────────────────────────────────┘   │
│                                             │
│  setTimeout: After 10 seconds               │
│  Switch to next notice...                   │
└─────────────────────────────────────────────┘
```

---

## 3. Page Layout

### Admin Dashboard - /admin/notices

```
┌───────────────────────────────────────────────────────────┐
│  HEADER                                                    │
├───────────────────────────────────────────────────────────┤
│  الإعلانات                        [+ إضافة إعلان جديد]     │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  Filter: ○ الكل  ○ نشط  ○ معطل                            │
│                                                            │
│  ┌─────────┬─────────────┬────────┬──────────┐            │
│  │ النص    │ الألوان     │ الحالة │ الإجراءات │            │
│  ├─────────┼─────────────┼────────┼──────────┤            │
│  │ توصيل   │ ████ ████   │ ✓ نشط  │ ✏️ 🗑️ |  │
│  │ مجاني   │ برتقالي     │        │ تعطيل   │
│  ├─────────┼─────────────┼────────┼──────────┤            │
│  │ عرض     │ ████ ████   │ ✓ نشط  │ ✏️ 🗑️ |  │
│  │ جديد    │ أخضر        │        │ تعطيل   │
│  ├─────────┼─────────────┼────────┼──────────┤            │
│  │ منتجات  │ ████ ████   │ ✗ معطل │ ✏️ 🗑️ |  │
│  │ جديدة   │ أزرق        │        │ تفعيل   │
│  └─────────┴─────────────┴────────┴──────────┘            │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

### Add/Edit Notice Form

```
┌─────────────────────────────────────────────┐
│  إضافة إعلان جديد                          │
├─────────────────────────────────────────────┤
│                                             │
│  نص الإعلان *                              │
│  ┌─────────────────────────────────────┐   │
│  │ توصيل مجاني للطلبات أكثر من        │   │
│  │ 50 دينار                           │   │
│  └─────────────────────────────────────┘   │
│  50 / 255                                   │
│                                             │
│  لون الخلفية                               │
│  ┌──────────────┐  ┌──────┐                │
│  │ 🎨 #FFA500   │  │████  │                │
│  └──────────────┘  └──────┘                │
│                                             │
│  لون النص                                  │
│  ┌──────────────┐  ┌──────┐                │
│  │ 🎨 #FFFFFF   │  │████  │                │
│  └──────────────┘  └──────┘                │
│                                             │
│  ━━━━━━━━━━━━━━ معاينة حية ━━━━━━━━━━━━━  │
│  ┌─────────────────────────────────────┐   │
│  │ توصيل مجاني للطلبات أكثر من      │   │ ← Live preview
│  │ 50 دينار                           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [حفظ]  [إلغاء]                            │
│                                             │
└─────────────────────────────────────────────┘
```

### Home Screen - NoticesBar Display

```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ توصيل مجاني للطلبات أكثر من 50د  │ │ ← #FFA500 برتقالي
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         [استعرض المتجر]
     
         [قائمة المنتجات]
         [إضافة للسلة]
         [الخ...]

────────────────────────────────────────
              after 10 seconds
────────────────────────────────────────

┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ عرض جديد: خصم 20% على جميع المنتجات │ │ ← #4CAF50 أخضر
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         [استعرض المتجر]
```

---

## 4. Rotation Timeline

```
TIME: 00:00
┌─────────────────────────────────────┐
│ إعلان 1: توصيل مجاني         #FFA500 │
└─────────────────────────────────────┘
        ↓ 10 seconds pass
        
TIME: 00:10
┌─────────────────────────────────────┐
│ إعلان 2: عرض جديد 20%        #4CAF50 │
└─────────────────────────────────────┘
        ↓ 10 seconds pass
        
TIME: 00:20
┌─────────────────────────────────────┐
│ إعلان 3: منتجات جديدة       #2196F3 │
└─────────────────────────────────────┘
        ↓ 10 seconds pass
        
TIME: 00:30
┌─────────────────────────────────────┐
│ إعلان 1: توصيل مجاني         #FFA500 │ ← REPEAT
└─────────────────────────────────────┘
        ↓ ...
```

---

## 5. State Machine - NoticesBar Component

```
┌──────────────┐
│   MOUNT      │
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│  State: loading=true │
│  State: notices=[]   │
│  State: index=0      │
└──────┬───────────────┘
       │
       ↓ (useEffect - Fetch)
┌──────────────────────┐
│  API Call            │
│  GET /api/v1/notices │
└──────┬───────────────┘
       │
   ┌───┴───┐
   │       │
   ↓       ↓
SUCCESS  ERROR
   │       │
   ↓       ↓
┌────┐  ┌─────┐
│ ✓  │  │ ✗   │
└──┬─┘  └──┬──┘
   │       │
   ↓       ↓
RENDER  RENDER
List    Error
        (hidden)

       ↓ (useEffect - Rotation Timer)
┌──────────────────────────┐
│  setInterval(10000ms)    │
│  Update: index = (++i)%n │
└──────┬───────────────────┘
       │
       ↓
RENDER
Notice[currentIndex]
with Background/Text Colors
       │
       ↓ (every 10 seconds)
REPEAT
```

---

## 6. Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       notices table                         │
├─────────────────────────────────────────────────────────────┤
│ PK │ id (UUID)              │ PRIMARY KEY, DEFAULT: gen_uuid │
├────┼────────────────────────┼──────────────────────────────┤
│    │ text (VARCHAR 255)     │ NOT NULL, MAX 255 chars      │
├────┼────────────────────────┼──────────────────────────────┤
│    │ backgroundColor (7)    │ DEFAULT: #FFA500             │
├────┼────────────────────────┼──────────────────────────────┤
│    │ textColor (7)          │ DEFAULT: #FFFFFF             │
├────┼────────────────────────┼──────────────────────────────┤
│FK │ isActive (BOOLEAN)      │ DEFAULT: true                │
├────┴────────────────────────┴──────────────────────────────┤
│ Indexes:                                                   │
│ • idx_isActive (isActive)                                  │
│ • idx_createdAt (createdAt DESC)                           │
├─────────────────────────────────────────────────────────────┤
│ Timestamps:                                                │
│ • createdAt (DEFAULT: now())                               │
│ • updatedAt (DEFAULT: now())                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Authorization Flow

```
┌─────────────────────────────┐
│   Admin wants to:           │
│   • Add notice              │
│   • Edit notice             │
│   • Delete notice           │
└────────────┬────────────────┘
             │
             ↓ (HTTP Request with Auth Cookie)
┌─────────────────────────────┐
│   Backend API Route          │
│   /api/v1/admin/notices     │
└────────────┬────────────────┘
             │
             ↓ (Check Session)
        ┌────┴────┐
        │          │
     NO │          │ YES
       ↓           ↓
    ┌──────┐   ┌────────────┐
    │ 401  │   │ user found │
    │Unauth.   └──────┬─────┘
    └──────┘          │
                      ↓ (Check Role)
                  ┌───┴────┐
                  │         │
             !ADMIN│        │ADMIN
                  ↓         ↓
              ┌──────┐   ┌──────┐
              │ 403  │   │ 200  │
              │Forbid│  │ OK   │
              │  den │   │Allow │
              └──────┘   └──────┘
```

---

## 8. Component Tree - Frontend

```
App
├─ Layout
│  ├─ Header
│  └─ Sidebar
│
├─ HomePage
│  │
│  ├─ NoticesBar ← NEW COMPONENT
│  │  ├─ useEffect (fetch)
│  │  ├─ useEffect (rotation)
│  │  └─ render (notice with colors)
│  │
│  ├─ HeroSection
│  │
│  ├─ ProductSection
│  │
│  └─ Footer
```

---

## 9. API Endpoints Map

```
GET /api/v1/notices
│
├─ Query: none (public)
├─ Returns: [Notice] (no timestamp)
└─ Used by: Frontend, Mobile App

GET /api/v1/admin/notices
│
├─ Query: ?includeInactive=true (optional)
├─ Auth: ADMIN
├─ Returns: [NoticeAdmin] (with timestamp)
└─ Used by: Admin Dashboard

POST /api/v1/admin/notices
│
├─ Body: { text, backgroundColor, textColor }
├─ Auth: ADMIN
├─ Returns: NoticeAdmin (created)
└─ Used by: Admin Dashboard

PUT /api/v1/admin/notices/:id
│
├─ Body: { text?, backgroundColor?, textColor?, isActive? }
├─ Auth: ADMIN
├─ Returns: NoticeAdmin (updated)
└─ Used by: Admin Dashboard

DELETE /api/v1/admin/notices/:id
│
├─ Auth: ADMIN
├─ Returns: { success: true, message: "..." }
└─ Used by: Admin Dashboard
```

---

**هذه الـ diagrams توضح النظام بشكل بصري. استخدمها كـ reference أثناء التطوير!**
