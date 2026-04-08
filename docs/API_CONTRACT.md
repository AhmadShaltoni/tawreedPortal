# 🔌 API Contract - نظام الإعلانات

هذا الملف يحتوي على الـ exact JSON format لجميع API endpoints.

---

## 📥 Request/Response Examples

### 1. GET /api/v1/notices (Public - No Auth)

**Request:**
```
GET /api/v1/notices
```

**Success Response (200):**
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

**Empty Response (200):**
```json
{
  "success": true,
  "data": []
}
```

---

### 2. GET /api/v1/admin/notices (Protected - ADMIN Only)

**Request:**
```
GET /api/v1/admin/notices
Authorization: NextAuth Session Cookie
```

**Query Parameters:**
- `includeInactive` (optional): `true|false` - Include disabled notices

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
      "backgroundColor": "#FFA500",
      "textColor": "#FFFFFF",
      "isActive": true,
      "createdAt": "2026-04-06T10:30:00Z",
      "updatedAt": "2026-04-06T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "text": "هذا إعلان معطل",
      "backgroundColor": "#999999",
      "textColor": "#FFFFFF",
      "isActive": false,
      "createdAt": "2026-04-05T15:20:00Z",
      "updatedAt": "2026-04-06T09:15:00Z"
    }
  ]
}
```

**Unauthorized Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized - Admin access required"
}
```

---

### 3. POST /api/v1/admin/notices (Protected - ADMIN Only)

**Request:**
```
POST /api/v1/admin/notices
Content-Type: application/json
Authorization: NextAuth Session Cookie

{
  "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
  "backgroundColor": "#FFA500",
  "textColor": "#FFFFFF"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440099",
    "text": "توصيل مجاني للطلبات أكثر من 50 دينار",
    "backgroundColor": "#FFA500",
    "textColor": "#FFFFFF",
    "isActive": true,
    "createdAt": "2026-04-06T11:45:00Z",
    "updatedAt": "2026-04-06T11:45:00Z"
  }
}
```

**Validation Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "text": ["Text must be between 1 and 255 characters"],
    "backgroundColor": ["Invalid hex color format. Must be #RRGGBB"]
  }
}
```

---

### 4. PUT /api/v1/admin/notices/:id (Protected - ADMIN Only)

**Request:**
```
PUT /api/v1/admin/notices/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: NextAuth Session Cookie

{
  "text": "توصيل مجاني للطلبات أكثر من 100 دينار الآن!",
  "backgroundColor": "#FF6F00",
  "textColor": "#FFFFFF",
  "isActive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "توصيل مجاني للطلبات أكثر من 100 دينار الآن!",
    "backgroundColor": "#FF6F00",
    "textColor": "#FFFFFF",
    "isActive": true,
    "createdAt": "2026-04-06T10:30:00Z",
    "updatedAt": "2026-04-06T12:00:00Z"
  }
}
```

**Not Found Response (404):**
```json
{
  "success": false,
  "error": "Notice not found"
}
```

---

### 5. DELETE /api/v1/admin/notices/:id (Protected - ADMIN Only)

**Request:**
```
DELETE /api/v1/admin/notices/550e8400-e29b-41d4-a716-446655440000
Authorization: NextAuth Session Cookie
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notice disabled successfully"
}
```

**Not Found Response (404):**
```json
{
  "success": false,
  "error": "Notice not found"
}
```

---

## 📦 TypeScript Types

```typescript
// Notice Object (Public - No timestamps)
interface Notice {
  id: string
  text: string
  backgroundColor: string
  textColor: string
}

// Notice Object (Admin - With timestamps)
interface NoticeAdmin extends Notice {
  isActive: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// API Response
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: Record<string, string[]>
}

// Create Notice Request
interface CreateNoticeRequest {
  text: string
  backgroundColor: string
  textColor: string
}

// Update Notice Request
interface UpdateNoticeRequest {
  text?: string
  backgroundColor?: string
  textColor?: string
  isActive?: boolean
}
```

---

## ✅ Validation Rules

### Text Field
- **Type**: String
- **Min Length**: 1
- **Max Length**: 255
- **Required**: Yes
- **Example**: "توصيل مجاني للطلبات أكثر من 50 دينار"

### backgroundColor Field
- **Type**: String (hex color)
- **Format**: `#RRGGBB` (case-insensitive)
- **Required**: No (default: #FFA500)
- **Valid Examples**: `#FFA500`, `#ff5722`, `#FF6F00`
- **Invalid Examples**: `#FF5`, `255 165 0`, `orange`

### textColor Field
- **Type**: String (hex color)
- **Format**: `#RRGGBB` (case-insensitive)
- **Required**: No (default: #FFFFFF)
- **Valid Examples**: `#FFFFFF`, `#000000`, `#2196F3`
- **Invalid Examples**: `#FFF`, `rgb(255,255,255)`

### isActive Field
- **Type**: Boolean
- **Default**: true
- **Required**: No
- **Values**: `true` (active) | `false` (disabled/soft deleted)

---

## 🔒 Authentication

**Method**: NextAuth Session Cookie

```typescript
// Check authentication in API route
import { getSession } from 'next-auth/react'

export async function GET(request: Request) {
  const session = await getSession({ req: request })
  
  if (!session) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  if (session.user.role !== 'ADMIN') {
    return Response.json(
      { success: false, error: 'Forbidden - Admin access required' },
      { status: 403 }
    )
  }
  
  // Proceed...
}
```

---

## 🌐 CORS Settings

- **Allowed Origins**: Same origin (internal use)
- **Methods**: GET, POST, PUT, DELETE
- **Credentials**: Required (cookies)

---

## 📊 Examples by Client

### From Frontend (JavaScript/Fetch)
```javascript
// Get notices for display
const response = await fetch('/api/v1/notices')
const { success, data } = await response.json()

if (success) {
  console.log('Notices:', data)
  // data = [Notice, Notice, ...]
}
```

### From Admin Dashboard (Server Action)
```typescript
'use server'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function getAllNotices(includeInactive = false) {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }
  
  const notices = await db.notice.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { createdAt: 'desc' }
  })
  
  return {
    success: true,
    data: notices
  }
}
```

### From Mobile App (JavaScript/Axios)
```javascript
// axios.get('/api/v1/notices')
axios
  .get('https://tawreed.app/api/v1/notices')
  .then(response => {
    console.log(response.data.data)
  })
  .catch(error => {
    console.error('Failed to fetch notices')
  })
```

---

## 🚨 Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Resource created (POST) |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized (not ADMIN) |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal error |

---

## ⏱️ Expected Response Times

| Endpoint | Expected Time |
|----------|---------------|
| GET /api/v1/notices | < 100ms |
| GET /api/v1/admin/notices | < 200ms |
| POST /api/v1/admin/notices | < 300ms |
| PUT /api/v1/admin/notices/:id | < 300ms |
| DELETE /api/v1/admin/notices/:id | < 200ms |

---

## 📝 Change Log

| Date | Change |
|------|--------|
| 2026-04-06 | Initial API contract v1.0 |
