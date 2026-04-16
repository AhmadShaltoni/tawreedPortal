# Discount Codes (Coupon) API Documentation

> For the **frontend/mobile developer** — everything needed to integrate the discount code system.

---

## Base URL

```
https://your-domain.com/api/v1
```

Development: `http://localhost:3000/api/v1`

---

## Authentication

All endpoints require authentication via **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The JWT token is obtained from the `/api/v1/auth/login` endpoint.

---

## User Identifier

- User is tracked by **`userId`** (from the JWT token payload — `id` field)
- The `userId` is a `cuid` string (e.g., `clx1a2b3c4d5e6f7g8`)
- Phone number is NOT used for code tracking — `userId` is the sole identifier
- Single-use enforcement uses the composite index `[discountCodeId, userId]`

---

## Code Matching

- **Case-insensitive**: `istklal2026`, `ISTKLAL2026`, `Istklal2026` all match
- Codes are stored uppercase in the database
- Input codes are normalized to uppercase before lookup

---

## Confirm Usage Flow

The "confirm usage" is a **separate request**, NOT embedded in the order flow:

```
1. User enters code at checkout preview
2. Mobile app calls POST /coupons/validate → shows discount to user
3. User places order → POST /orders (standard order flow)
4. After order success → POST /coupons/confirm (records code usage)
```

---

## Endpoints

### 1. Validate a Discount Code

**`POST /api/v1/coupons/validate`**

Validates a discount code and returns the discount details if valid.

#### Request Body

```json
{
  "code": "ISTKLAL2026",
  "orderTotal": 150.00
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | ✅ | The discount code to validate |
| `orderTotal` | number | ✅ | The order total before discount (JOD) |

#### Success Response (200)

```json
{
  "valid": true,
  "discountPercent": 15,
  "discountAmount": 22.50,
  "finalTotal": 127.50,
  "code": "ISTKLAL2026"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | `true` if the code is valid |
| `discountPercent` | number | The discount percentage |
| `discountAmount` | number | The calculated discount in JOD |
| `finalTotal` | number | The total after discount |
| `code` | string | The normalized code |

#### Error Response (200 with `valid: false`)

```json
{
  "valid": false,
  "error": "CODE_NOT_FOUND",
  "message": "كود الخصم غير موجود"
}
```

#### All Error Codes

| Error Code | Arabic Message | English Meaning | When Returned |
|------------|---------------|-----------------|---------------|
| `CODE_NOT_FOUND` | كود الخصم غير موجود | Discount code not found | Code doesn't exist in database |
| `CODE_INACTIVE` | كود الخصم غير مفعل | Discount code is inactive | Admin deactivated the code |
| `CODE_NOT_STARTED` | كود الخصم لم يبدأ بعد | Code is not active yet | Current date is before `startDate` |
| `CODE_EXPIRED` | كود الخصم منتهي الصلاحية | Code has expired | Current date is after `endDate` |
| `CODE_USAGE_LIMIT_REACHED` | تم الوصول للحد الأقصى لاستخدام هذا الكود | Usage limit reached | Total uses >= `maxUsage` |
| `CODE_ALREADY_USED` | لقد استخدمت هذا الكود من قبل | You already used this code | `isSingleUse` & user has a usage record |
| `ORDER_BELOW_MINIMUM` | قيمة الطلب أقل من الحد الأدنى المطلوب (X د.أ) | Order below minimum | `orderTotal` < `minOrderAmount` |

**Validation is performed in this exact order.** The first failing check returns its error.

---

### 2. Confirm Code Usage

**`POST /api/v1/coupons/confirm`**

Records the usage of a discount code after a successful order. Call this **after** the order is placed.

#### Request Body

```json
{
  "code": "ISTKLAL2026",
  "orderId": "clx1abc123def456",
  "orderTotal": 150.00
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | ✅ | The discount code used |
| `orderId` | string | ✅ | The ID of the successfully placed order |
| `orderTotal` | number | ✅ | The order total before discount (JOD) |

#### Success Response (201)

```json
{
  "success": true,
  "discountAmount": 22.50,
  "usageId": "clx1usage123"
}
```

#### Error Responses

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "كود الخصم مطلوب" }` | Missing `code` |
| 400 | `{ "error": "رقم الطلب مطلوب" }` | Missing `orderId` |
| 400 | `{ "error": "..." }` | Any validation failure (same checks as validate) |
| 401 | `{ "error": "Authentication required" }` | No auth token |
| 404 | `{ "error": "كود الخصم غير موجود" }` | Code not found |
| 404 | `{ "error": "الطلب غير موجود" }` | Order not found or not owned by user |
| 500 | `{ "error": "فشل في تأكيد استخدام كود الخصم" }` | Server error |

---

### 3. Admin: List All Codes

**`GET /api/v1/admin/coupons`**

Requires admin role.

#### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

#### Success Response (200)

```json
{
  "codes": [
    {
      "id": "clx1abc123",
      "code": "ISTKLAL2026",
      "discountPercent": 15,
      "isSingleUse": true,
      "maxUsage": 100,
      "minOrderAmount": 50.00,
      "startDate": "2026-04-01T00:00:00.000Z",
      "endDate": "2026-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2026-04-12T08:00:00.000Z",
      "updatedAt": "2026-04-12T08:00:00.000Z",
      "_count": { "usages": 23 }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

### 4. Admin: Create a Code

**`POST /api/v1/admin/coupons`**

Requires admin role.

#### Request Body

```json
{
  "code": "SUMMER2026",
  "discountPercent": 20,
  "isSingleUse": true,
  "maxUsage": 500,
  "minOrderAmount": 30.00,
  "startDate": "2026-06-01T00:00:00.000Z",
  "endDate": "2026-08-31T23:59:59.000Z",
  "isActive": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `code` | string | ✅ | — | 3-20 chars, alphanumeric + hyphens, auto-uppercased |
| `discountPercent` | number | ✅ | — | 1-100 (percentage) |
| `isSingleUse` | boolean | ❌ | `false` | Each user can use only once |
| `maxUsage` | number/null | ❌ | `null` | Max total uses (null = unlimited) |
| `minOrderAmount` | number/null | ❌ | `null` | Min order value in JOD (null = no min) |
| `startDate` | ISO string/null | ❌ | `null` | When code becomes active (null = immediately) |
| `endDate` | ISO string/null | ❌ | `null` | When code expires (null = no expiry) |
| `isActive` | boolean | ❌ | `true` | Whether code is currently active |

#### Success Response (201)

```json
{
  "code": {
    "id": "clx1abc123",
    "code": "SUMMER2026",
    "discountPercent": 20,
    ...
  }
}
```

#### Error Responses

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Validation failed", "errors": {...} }` | Validation errors |
| 401 | `{ "error": "Authentication required" }` | No auth |
| 403 | `{ "error": "Admin access required" }` | Not admin role |
| 409 | `{ "error": "كود الخصم موجود بالفعل" }` | Duplicate code |

---

### 5. Admin: Update a Code

**`PUT /api/v1/admin/coupons/:id`**

Requires admin role. Same request body as Create.

#### Success Response (200)

```json
{
  "code": { ... }
}
```

---

### 6. Admin: Get Code Details

**`GET /api/v1/admin/coupons/:id`**

Requires admin role. Returns the code with full usage history.

#### Success Response (200)

```json
{
  "code": {
    "id": "clx1abc123",
    "code": "ISTKLAL2026",
    "discountPercent": 15,
    "isSingleUse": true,
    "maxUsage": 100,
    "minOrderAmount": 50.00,
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2026-12-31T23:59:59.000Z",
    "isActive": true,
    "createdAt": "2026-04-12T08:00:00.000Z",
    "updatedAt": "2026-04-12T08:00:00.000Z",
    "_count": { "usages": 2 },
    "usages": [
      {
        "id": "clx1usage123",
        "discountAmount": 22.50,
        "orderTotal": 150.00,
        "createdAt": "2026-04-12T10:00:00.000Z",
        "discountCodeId": "clx1abc123",
        "userId": "clx1user456",
        "orderId": "clx1order789",
        "user": {
          "id": "clx1user456",
          "username": "أحمد",
          "phone": "0791234567"
        }
      }
    ]
  }
}
```

---

### 7. Admin: Delete a Code

**`DELETE /api/v1/admin/coupons/:id`**

Requires admin role. Permanently deletes the code and all usage records.

#### Success Response (200)

```json
{
  "message": "تم حذف كود الخصم بنجاح"
}
```

---

## Data Model Reference

### DiscountCode

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (cuid) |
| `code` | string | Unique code (uppercase) |
| `discountPercent` | number | Percentage off (1-100) |
| `isSingleUse` | boolean | Each user limited to one use |
| `maxUsage` | number/null | Max total uses (null = unlimited) |
| `minOrderAmount` | number/null | Min order value in JOD |
| `startDate` | ISO date/null | Start of validity |
| `endDate` | ISO date/null | End of validity |
| `isActive` | boolean | Admin toggle |
| `createdAt` | ISO date | Creation timestamp |
| `updatedAt` | ISO date | Last update timestamp |

### DiscountCodeUsage

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `discountAmount` | number | Actual JOD saved |
| `orderTotal` | number | Order total before discount |
| `createdAt` | ISO date | When code was used |
| `discountCodeId` | string | FK to DiscountCode |
| `userId` | string | FK to User |
| `orderId` | string/null | FK to Order (linked after placement) |

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (new code or usage) |
| 400 | Bad request / validation error |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 409 | Conflict (duplicate code) |
| 500 | Server error |
