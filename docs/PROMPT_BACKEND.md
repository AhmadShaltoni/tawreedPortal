# 🔧 PROMPT: Backend Developer - Notices System

## المهمة

تطوير نظام إعلانات كامل من جهة الـ Backend يسمح للأدمن بإدارة إعلانات ديناميكية تظهر على الشاشة الرئيسية للتطبيق.

---

## 📋 المتطلبات التفصيلية

### 1. Prisma Schema Update

أضف الـ model التالي إلى `prisma/schema.prisma`:

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

ثم **قم بإنشاء migration** وتطبيقها:
```bash
npx prisma migrate dev --name add_notices_system
```

---

### 2. Server Actions

أنشئ ملف جديد: `actions/notices.ts`

**الدوال المطلوبة:**

#### 2.1 الحصول على الإعلانات النشطة (للعرض)
```typescript
export async function getActiveNotices(): Promise<ActionResponse>
```
- بدون مصادقة مطلوبة
- ترجع جميع الإعلانات حيث `isActive = true`
- رتبة حسب `createdAt` DESC

#### 2.2 إنشاء إعلان جديد
```typescript
export async function createNotice(formData: FormData): Promise<ActionResponse>
```
- التحقق من أن المستخدم ADMIN
- التحقق من صحة البيانات:
  - `text`: لا يكون فارغاً وأقل من 255 حرف
  - `backgroundColor`: صيغة hex color صحيحة (#123ABC)
  - `textColor`: صيغة hex color صحيحة
- ترجع الإعلان المنشأ

#### 2.3 تحديث إعلان
```typescript
export async function updateNotice(id: string, formData: FormData): Promise<ActionResponse>
```
- التحقق من أن المستخدم ADMIN
- التحقق من وجود الإعلان
- تحديث الحقول المرسلة
- ترجع الإعلان المحدّث

#### 2.4 تعطيل إعلان (soft delete)
```typescript
export async function disableNotice(id: string): Promise<ActionResponse>
```
- التحقق من أن المستخدم ADMIN
- تعيين `isActive = false`
- **المهم**: عدم حذف البيانات من قاعدة البيانات

#### 2.5 تفعيل إعلان
```typescript
export async function enableNotice(id: string): Promise<ActionResponse>
```
- التحقق من أن المستخدم ADMIN
- تعيين `isActive = true`

#### 2.6 الحصول على جميع الإعلانات (للأدمن)
```typescript
export async function getAllNotices(includeInactive: boolean = false): Promise<ActionResponse>
```
- التحقق من أن المستخدم ADMIN
- إذا `includeInactive = true` ترجع الكل
- إذا `false` ترجع النشطة فقط

---

### 3. API Routes

أنشئ الـ endpoints التالية:

#### 3.1 `app/api/v1/notices/route.ts` (GET)
```typescript
export async function GET(request: Request)
```
- **الوصف**: الحصول على الإعلانات النشطة (للـ mobile + frontend)
- **الترجيع**: JSON مع `[Notice, Notice, ...]`
- **لا يتطلب authentication**

**مثال الاستجابة:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
      "backgroundColor": "#FFA500",
      "textColor": "#FFFFFF"
    }
  ]
}
```

---

#### 3.2 `app/api/v1/admin/notices/route.ts` (POST + GET)

**POST** - إنشاء إعلان جديد
```typescript
export async function POST(request: Request)
```
- **التحقق**: user.role === 'ADMIN'
- **الطلب**: `{ text, backgroundColor, textColor }`
- **الترجيع**: 201 مع الإعلان المنشأ

**GET** - الحصول على جميع الإعلانات
```typescript
export async function GET(request: Request)
```
- **التحقق**: user.role === 'ADMIN'
- **Query params**: `?includeInactive=true` اختياري
- **الترجيع**: array من الإعلانات

---

#### 3.3 `app/api/v1/admin/notices/[id]/route.ts` (PUT + DELETE)

**PUT** - تحديث إعلان
```typescript
export async function PUT(request: Request, { params }: { params: { id: string } })
```
- **التحقق**: user.role === 'ADMIN'
- **الطلب**: `{ text?, backgroundColor?, textColor?, isActive? }`
- **الترجيع**: 200 مع الإعلان المحدّث

**DELETE** - حذف (تعطيل) إعلان
```typescript
export async function DELETE(request: Request, { params }: { params: { id: string } })
```
- **التحقق**: user.role === 'ADMIN'
- **الترجيع**: 200 مع رسالة نجاح

---

### 4. معالجة الأخطاء

جميع الـ routes يجب أن ترجع:

```typescript
// نجاح
{ success: true, data: {...} }

// خطأ authentication
{ success: false, error: 'Unauthorized' }

// خطأ not found
{ success: false, error: 'Notice not found' }

// خطأ validation
{ success: false, error: 'Invalid input', details: {...} }
```

---

### 5. Zod Validation Schema

أضف إلى `lib/validations.ts`:

```typescript
export const createNoticeSchema = z.object({
  text: z.string().min(1).max(255),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i),
})

export const updateNoticeSchema = z.object({
  text: z.string().min(1).max(255).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isActive: z.boolean().optional(),
})
```

---

## ✅ Checklist

- [ ] Prisma schema updated
- [ ] Migration created and applied
- [ ] Server actions implemented
- [ ] API routes created
- [ ] Zod validation schemas added
- [ ] All routes tested with Postman/Thunder Client
- [ ] Error handling implemented
- [ ] Authorization checks added
- [ ] Database constraints verified

---

## 🔗 المراجع
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [Zod Validation](https://zod.dev)
