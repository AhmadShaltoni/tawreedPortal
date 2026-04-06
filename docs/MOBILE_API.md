# 📱 Tawreed Mobile API Documentation

> API Documentation for the Tawreed B2B Marketplace Mobile Application

---

## 🔐 Authentication Endpoints

All endpoints use **phone-based authentication**. The mobile app supports both phone-based registration and login.

### Base URL
```
https://tawreed.jo/api/v1  (Production)
http://localhost:3000/api/v1  (Development)
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  (for authenticated requests)
```

---

## 📝 POST `/auth` - Registration

**Purpose**: Register a new user with phone number and create a user account

### Request Payload

```json
{
  "action": "register",
  "username": "abuahmed",
  "phone": "07912345678",
  "storeName": "أبو أحمد للبقالة",
  "password": "Pass123",
  "role": "buyer"
}
```

### Request Fields

| Field | Type | Required | Format | Example | Notes |
|-------|------|----------|--------|---------|-------|
| `action` | string | ✅ | static | `"register"` | Must be "register" |
| `username` | string | ✅ | min 2 chars | `"abuahmed"` | User display name (unique per system) |
| `phone` | string | ✅ | `07xxxxxxxx` | `"07912345678"` | Jordanian format only, must be unique |
| `storeName` | string | ✅ | min 2 chars | `"أبو أحمد للبقالة"` | Store/business name |
| `password` | string | ✅ | 8+ chars with letter + number | `"Pass123"` | Must have at least 1 letter and 1 number |
| `role` | string | ✅ | `buyer` or `supplier` | `"buyer"` | Case-insensitive (converted to uppercase) |
| `email` | string | ❌ | valid email | `"user@example.com"` | Optional, must be unique if provided |
| `businessAddress` | string | ❌ | any | `"شارع الرسالة، عمّان"` | Optional |
| `city` | string | ❌ | any | `"عمّان"` | Optional |

### Success Response (201 Created)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clh1234567890abcdefghijkl",
    "username": "abuahmed",
    "phone": "07912345678",
    "storeName": "أبو أحمد للبقالة",
    "role": "BUYER"
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "error": "يجب أن يكون رقم الهاتف بصيغة 07xxxxxxxx"
}
```

**Common validation errors:**
- `"اسم المستخدم مطلوب"` - Username is required (min 2 chars)
- `"يجب أن يكون رقم الهاتف بصيغة 07xxxxxxxx"` - Invalid phone format
- `"اسم البقالة مطلوب"` - Store name is required
- `"كلمة المرور يجب أن تكون 8 أحرف على الأقل"` - Password too short
- `"يجب أن تحتوي على حرف واحد على الأقل"` - Password needs at least 1 letter
- `"يجب أن تحتوي على رقم واحد على الأقل"` - Password needs at least 1 number
- `"البريد الإلكتروني غير صحيح"` - Invalid email format (if provided)

#### 409 Conflict - Duplicate Phone
```json
{
  "error": "هذا الهاتف مسجل بالفعل"
}
```

#### 500 Server Error
```json
{
  "error": "خطأ في إعدادات الخادم"
}
```

---

## 🔓 POST `/auth` - Login

**Purpose**: Authenticate user with phone and password, return JWT token

### Request Payload

```json
{
  "phone": "07912345678",
  "password": "Pass123"
}
```

### Request Fields

| Field | Type | Required | Format | Example |
|-------|------|----------|--------|---------|
| `phone` | string | ✅ | `07xxxxxxxx` | `"07912345678"` |
| `password` | string | ✅ | any | `"Pass123"` |

### Success Response (200 OK)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clh1234567890abcdefghijkl",
    "username": "abuahmed",
    "phone": "07912345678",
    "storeName": "أبو أحمد للبقالة",
    "role": "BUYER"
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "error": "صيغة الهاتف أو كلمة المرور غير صحيحة"
}
```

#### 401 Unauthorized - Invalid Credentials
```json
{
  "error": "رقم الهاتف أو كلمة المرور غير صحيحة"
}
```

---

## 🔒 GET `/auth/me` - Get Current User

**Purpose**: Get the current authenticated user's profile information

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Success Response (200 OK)

```json
{
  "user": {
    "id": "clh1234567890abcdefghijkl",
    "phone": "07912345678",
    "username": "abuahmed",
    "role": "BUYER",
    "storeName": "أبو أحمد للبقالة",
    "city": "عمّان",
    "email": "user@example.com"
  }
}
```

### Error Responses

#### 401 Unauthorized - Missing or Invalid Token
```json
{
  "error": "Authentication required"
}
```

#### 404 Not Found - User Not Found
```json
{
  "error": "User not found"
}
```

---

## 📦 GET `/products` - Get Products Catalog

**Purpose**: Browse all available products with optional filters

### Query Parameters

| Parameter | Type | Default | Example | Notes |
|-----------|------|---------|---------|-------|
| `categoryId` | string | undefined | `"clh1234567890abcdefg"` | Filter by category |
| `skip` | number | 0 | `20` | Pagination offset |
| `take` | number | 10 | `20` | Items per page (max 100) |
| `search` | string | undefined | `"سكر"` | Search in product name/description |
| `sortBy` | string | `"createdAt"` | `"price"` or `"name"` | Sort field |
| `order` | string | `"desc"` | `"asc"` | Sort order |

### Success Response (200 OK)

```json
{
  "products": [
    {
      "id": "clh1234567890abcdefg",
      "name": "سكر أبيض",
      "nameEn": "White Sugar",
      "price": 2.50,
      "compareAtPrice": 3.00,
      "stock": 100,
      "unit": "KG",
      "category": {
        "id": "clh1234567890abcdefg",
        "name": "سكر",
        "slug": "sugar"
      },
      "image": "https://tawreed.jo/uploads/products/sugar-001.jpg"
    }
  ],
  "total": 45,
  "skip": 0,
  "take": 10
}
```

---

## 🛒 POST `/cart` - Add Item to Cart

**Purpose**: Add a product to user's shopping cart

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Payload
```json
{
  "productId": "clh1234567890abcdefg",
  "quantity": 5
}
```

### Success Response (201 Created)

```json
{
  "cartItem": {
    "id": "clh_cart_item_123",
    "productId": "clh1234567890abcdefg",
    "quantity": 5,
    "product": {
      "name": "سكر أبيض",
      "price": 2.50
    }
  }
}
```

---

## 📦 GET `/cart` - Get Shopping Cart

**Purpose**: Retrieve user's shopping cart with all items

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Success Response (200 OK)

```json
{
  "items": [
    {
      "id": "clh_cart_item_123",
      "productId": "clh1234567890abcdefg",
      "quantity": 5,
      "product": {
        "id": "clh1234567890abcdefg",
        "name": "سكر أبيض",
        "price": 2.50,
        "unit": "KG"
      },
      "subtotal": 12.50
    }
  ],
  "total": 12.50,
  "itemCount": 1
}
```

---

## 📋 GET `/orders` - Get User Orders

**Purpose**: Get all orders placed by the current user

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Query Parameters

| Parameter | Type | Default | Example |
|-----------|------|---------|---------|
| `status` | string | undefined | `"PENDING"` |
| `skip` | number | 0 | `20` |
| `take` | number | 10 | `20` |

### Success Response (200 OK)

```json
{
  "orders": [
    {
      "id": "clh_order_123",
      "status": "PENDING",
      "totalAmount": 50.00,
      "itemCount": 3,
      "createdAt": "2026-04-05T10:30:00Z",
      "items": [
        {
          "id": "clh_order_item_1",
          "productName": "سكر أبيض",
          "quantity": 5,
          "totalPrice": 12.50
        }
      ]
    }
  ],
  "total": 10,
  "skip": 0,
  "take": 10
}
```

---

## 🔔 GET `/notifications` - Get User Notifications

**Purpose**: Get system notifications for the user

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Success Response (200 OK)

```json
{
  "notifications": [
    {
      "id": "clh_notif_123",
      "type": "ORDER_STATUS_CHANGE",
      "title": "تحديث حالة الطلب",
      "message": "تم تأكيد طلبك وجاري التحضير",
      "read": false,
      "createdAt": "2026-04-05T10:30:00Z"
    }
  ],
  "total": 5,
  "unreadCount": 2
}
```

---

## ⚙️ Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Authentication successful, data retrieved |
| 201 | Created | User registered, item added |
| 400 | Bad Request | Validation failed, invalid format |
| 401 | Unauthorized | Missing/invalid token, wrong credentials |
| 409 | Conflict | Duplicate phone number |
| 500 | Server Error | Database error, config missing |

### Error Response Format

All errors follow this format:
```json
{
  "error": "Human-readable error message in Arabic"
}
```

---

## 🔑 JWT Token Details

### Token Structure
The JWT token contains the following payload:
```json
{
  "id": "user_id",
  "phone": "07912345678",
  "username": "abuahmed",
  "role": "BUYER",
  "storeName": "أبو أحمد للبقالة"
}
```

### Token Expiration
- Default expiration: **Based on NextAuth configuration**
- Refresh: Not implemented yet (tokens don't expire in current version)

### Using the Token
```javascript
// Store token after registration/login
localStorage.setItem('authToken', response.token)

// Include in subsequent requests
fetch('https://localhost:3000/api/v1/cart', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})
```

---

## 📝 Testing Checklist

### Registration Tests
- ✅ Register with all required fields
- ✅ Register with phone that already exists (409)
- ✅ Register with invalid phone format (400)
- ✅ Register with short password (400)
- ✅ Register with role in lowercase (should work)
- ✅ Register with optional email (should work)
- ✅ Verify token is returned and valid

### Login Tests
- ✅ Login with correct phone and password
- ✅ Login with non-existent phone (401)
- ✅ Login with wrong password (401)
- ✅ Verify token is returned and valid
- ✅ Verify user data matches

### Authentication Tests
- ✅ Access protected endpoints with valid token
- ✅ Access protected endpoints with invalid token (401)
- ✅ Access protected endpoints without token (401)

### Product Tests
- ✅ Browse products without authentication
- ✅ Filter products by category
- ✅ Search products
- ✅ Paginate results

### Cart Tests
- ✅ Add item to cart (requires auth)
- ✅ Get cart items (requires auth)
- ✅ Update item quantity
- ✅ Remove item from cart
- ✅ Clear cart

---

## 🚀 Example Mobile App Integration

### React Native Example
```javascript
// Register
const response = await fetch('http://localhost:3000/api/v1/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'register',
    username: 'newuser',
    phone: '07912345678',
    storeName: 'متجري الجديد',
    password: 'Pass123',
    role: 'buyer'
  })
})

const data = await response.json()
if (data.token) {
  // Store token and user data
  await AsyncStorage.setItem('authToken', data.token)
  await AsyncStorage.setItem('user', JSON.stringify(data.user))
}

// Login
const loginResponse = await fetch('http://localhost:3000/api/v1/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '07912345678',
    password: 'Pass123'
  })
})

// Get current user
const userResponse = await fetch('http://localhost:3000/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
  }
})

// Add to cart
const cartResponse = await fetch('http://localhost:3000/api/v1/cart', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
  },
  body: JSON.stringify({
    productId: 'product_id',
    quantity: 5
  })
})
```

---

## 📞 Support & Issues

For issues or questions about the Mobile API:
1. Check this documentation first
2. Review the validation error messages (they explain what's wrong)
3. Verify payload format matches exactly
4. Check token expiration if authenticated endpoint fails

---

**Last Updated**: April 5, 2026  
**API Version**: v1  
**Status**: ✅ Stable
