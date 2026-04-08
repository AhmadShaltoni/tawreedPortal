# 📌 Quick Reference - نظام الإعلانات

> **اطبع هذا الملف وعلّقه على مكتبك!**

---

## ⚡ النقاط الرئيسية بـ 30 ثانية

**ماذا نبني؟**  
نظام إعلانات يعرض رسائل ترويجية تتدور كل 10 ثواني

**من يعمل إيه؟**  
- Backend: Database + API  
- Admin: Dashboard لـ manage الإعلانات  
- Frontend: Component لعرض الإعلانات

**الوقت المتوقع**: يوم واحد (8 ساعات)

---

## 🔧 Quick Setup

### Backend
```bash
# 1. Prisma schema
model Notice {
  id: UUID
  text: String (255 max)
  backgroundColor: String (hex)
  textColor: String (hex)
  isActive: Boolean
  timestamps: DateTime
}

# 2. 3 API Routes
GET /api/v1/notices              # public
GET/POST/PUT/DELETE /admin/notices # admin only

# 3. 6 Server Actions
getActive, create, update, disable, enable, getAll
```

### Admin
```bash
# 1. Pages
/admin/notices          # list
/admin/notices/new      # add
/admin/notices/:id      # edit

# 2. Components
NoticeListClient
NewNoticeForm
EditNoticeForm

# 3. Translations
t.notices.*
```

### Frontend
```bash
# 1. Component
components/NoticesBar.tsx

# 2. Hooks
useEffect (fetch)
useEffect (10s rotation)

# 3. Integration
Add to home page
```

---

## 📊 Data Model

```typescript
interface Notice {
  id: string                    // UUID
  text: string                  // 255 chars max
  backgroundColor: string       // #RRGGBB
  textColor: string            // #RRGGBB
  isActive?: boolean           // true/false
  createdAt?: DateTime
  updatedAt?: DateTime
}
```

---

## 🔌 API Quick Reference

```
GET  /api/v1/notices
├─ Public endpoint
├─ Returns: [Notice]
└─ Used by: Frontend, Mobile

POST /api/v1/admin/notices
├─ Body: { text, backgroundColor, textColor }
├─ Auth: ADMIN
└─ Returns: created Notice

PUT /api/v1/admin/notices/:id
├─ Body: partial Notice
├─ Auth: ADMIN
└─ Returns: updated Notice

DELETE /api/v1/admin/notices/:id
├─ Auth: ADMIN
└─ Returns: { success: true }
```

---

## 📁 Files to Create/Modify

### Backend
```
NEW:
✅ actions/notices.ts
✅ app/api/v1/notices/route.ts
✅ app/api/v1/admin/notices/route.ts
✅ app/api/v1/admin/notices/[id]/route.ts

MODIFY:
✅ prisma/schema.prisma
✅ lib/validations.ts
```

### Admin
```
NEW:
✅ app/admin/notices/page.tsx
✅ app/admin/notices/NoticeListClient.tsx
✅ app/admin/notices/new/NewNoticeForm.tsx
✅ app/admin/notices/[id]/EditNoticeForm.tsx

MODIFY:
✅ lib/translations/ar.ts
✅ lib/translations/en.ts
```

### Frontend
```
NEW:
✅ components/NoticesBar.tsx

MODIFY:
✅ app/page.tsx (or home page)
```

---

## 🧪 Testing Checklist

### Backend
- [ ] Postman: GET /api/v1/notices (should return [])
- [ ] Postman: POST with valid data (should create)
- [ ] Postman: PUT with partial data (should update)
- [ ] Postman: DELETE (should soft-delete)
- [ ] Check: isActive = false after delete

### Admin
- [ ] Page loads and shows no notices initially
- [ ] Add form works, preview shows colors
- [ ] Notice appears in list after save
- [ ] Edit form pre-fills with data
- [ ] Toggle active/inactive works
- [ ] Delete confirmation appears
- [ ] Translations work (AR/EN)

### Frontend
- [ ] Component renders with notices
- [ ] Notice changes every 10 seconds
- [ ] Component hides when no notices
- [ ] Correct colors display
- [ ] RTL support works
- [ ] Mobile responsive

---

## 🎯 Rotation Logic

```
currentIndex = 0

useEffect(() => {
  const timer = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % notices.length)
  }, 10000)  // 10 seconds
  
  return () => clearInterval(timer)
}, [notices.length])

// Display: notices[currentIndex]
```

---

## 🎨 Color Examples

```
#FFA500 (Orange) with #FFFFFF (White)   → Good contrast ✓
#4CAF50 (Green) with #FFFFFF (White)    → Good contrast ✓
#2196F3 (Blue) with #FFFFFF (White)     → Good contrast ✓
#FFFFFF (White) with #000000 (Black)    → Good contrast ✓
```

---

## 🔐 Authorization Pattern

```typescript
// In API route
const session = await getSession({ req: request })

if (!session || session.user.role !== 'ADMIN') {
  return Response.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  )
}

// Proceed...
```

---

## ⚠️ Common Mistakes to Avoid

```
❌ Forgetting to check ADMIN role
❌ Not soft-deleting (actually deleting data)
❌ Wrong hex color format (#FFF instead of #FFFFFF)
❌ Rotation timer not cleaning up
❌ Not validating text length
❌ Missing translations
❌ Component not handling empty notices array
❌ API returning all fields (hide passwords, etc.)
```

---

## ✅ Success Criteria

```
✓ Backend: All 3 API endpoints tested and working
✓ Admin: All CRUD operations working
✓ Frontend: Notices rotating every 10 seconds
✓ Integration: Add notice → appears on frontend
✓ No console errors
✓ Translations working
✓ Mobile responsive
✓ RTL working for Arabic
```

---

## 📚 Essential Docs

| Doc | Read | Use For |
|-----|------|---------|
| PROMPT_*.md | 15 min | Your main task |
| API_CONTRACT.md | 5 min | JSON format |
| DIAGRAMS.md | 5 min | Visual help |

---

## 🆘 Emergency Help

| Problem | Solution |
|---------|----------|
| API returns 401 | Check ADMIN role + session |
| Notices not rotating | Check setTimeout/setInterval |
| Colors not showing | Check hex format #RRGGBB |
| Page not loading | Check API endpoint URL |
| DB error | Run migration: `npx prisma migrate dev` |

---

## 🎯 Step-by-Step Execution

```
Day 1:
├─ 09:00 - Backend starts
├─ 11:30 - Backend finishes, notifies Admin
├─ 12:00 - Admin starts (Backend also starts Frontend)
├─ 15:00 - Admin finishes, Frontend continues
├─ 16:00 - Frontend finishes
└─ 17:00 - Integration testing

Result: System ready for production!
```

---

## 📞 Who to Contact

| Issue | Contact |
|-------|---------|
| API not working | Backend Dev |
| Dashboard bugs | Admin Dev |
| Frontend rendering | Frontend Dev |
| Integration | Team Lead |

---

## 🚀 Launch Command

```bash
# Start dev server
npm run dev

# Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Test API
curl http://localhost:3000/api/v1/notices
```

---

## 📊 Success Metrics Post-Launch

```
✓ Notices load in < 100ms
✓ Admin adds notice in < 5 seconds
✓ Frontend displays notice < 1 second
✓ Rotation works perfectly
✓ Zero console errors
✓ Mobile works smoothly
```

---

**Print this page. Keep it handy. Reference it often!**

---

**Version**: 1.0  
**Date**: 6 أبريل 2026  
**Status**: Ready to Go! 🚀
