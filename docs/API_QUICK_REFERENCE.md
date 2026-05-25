# Cart & Orders API - Quick Reference

## الـ Base URL
```
http://localhost:3000/api/v1
```

## Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 1. الـ Cart Endpoints

### GET /api/v1/cart
**الغرض**: جلب السلة الحالية

**Request**:
```bash
GET /api/v1/cart
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-uuid-1",
        "quantity": 2,
        "product": {
          "id": "prod-1",
          "name": "سكر أبيض",
          "nameEn": "White Sugar",
          "image": "https://..."
        },
        "selectedVariant": {
          "id": "var-1",
          "size": "1 كيلو",
          "sizeEn": "1 KG",
          "stock": 100
        },
        "selectedOption": {
          "id": "opt-1",
          "name": "فانيليا",
          "nameEn": "Vanilla",
          "priceOverride": 5.50
        },
        "selectedUnit": {
          "id": "unit-1",
          "label": "قطعة",
          "labelEn": "Piece",
          "price": 3.50
        },
        "pricing": {
          "pricePerUnit": 5.50,
          "compareAtPricePerUnit": null,
          "subtotal": 11.00
        }
      }
    ],
    "total": 25.50,
    "itemCount": 2
  }
}
```

---

### POST /api/v1/cart
**الغرض**: إضافة منتج إلى السلة

**Request**:
```json
{
  "variantId": "var-uuid-1",
  "variantOptionId": "opt-uuid-1",  // اختياري
  "productUnitId": "unit-uuid-1",   // اختياري
  "quantity": 2
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "item": { /* same structure as GET */ }
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "quantity": ["Expected number"]
  }
}
```

---

### PATCH /api/v1/cart/{itemId}
**الغرض**: تحديث الكمية

**Request**:
```json
{
  "quantity": 5
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "item": { /* updated item */ }
  }
}
```

---

### DELETE /api/v1/cart/{itemId}
**الغرض**: حذف منتج من السلة

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Item removed from cart"
  }
}
```

---

### DELETE /api/v1/cart
**الغرض**: تنظيف السلة بالكامل

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Cart cleared"
  }
}
```

---

## 2. الـ Orders Endpoints

### GET /api/v1/orders
**الغرض**: جلب جميع الطلبات

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Request**:
```bash
GET /api/v1/orders?page=1&limit=10
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid-1",
        "buyerId": "user-uuid",
        "totalPrice": 25.50,
        "status": "PENDING",
        "deliveryAddress": "شارع النيل",
        "deliveryCity": "Amman",
        "items": [
          {
            "id": "item-1",
            "product": {
              "id": "prod-1",
              "name": "سكر أبيض",
              "image": "https://..."
            },
            "selectedSize": {
              "size": "1 كيلو",
              "sizeEn": "1 KG"
            },
            "selectedFlavor": {
              "name": "فانيليا",
              "nameEn": "Vanilla"
            },
            "selectedUnit": {
              "label": "قطعة",
              "labelEn": "Piece"
            },
            "quantity": 2,
            "pricing": {
              "pricePerUnit": 5.50,
              "subtotal": 11.00
            }
          }
        ],
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

### POST /api/v1/orders
**الغرض**: إنشاء طلب من السلة

**Request**:
```json
{
  "deliveryAddress": "شارع النيل، عمّان",
  "deliveryCity": "Amman",
  "buyerNotes": "توصيل سريع من فضلك",
  "couponCode": "DISCOUNT20"  // اختياري
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid-new",
      "totalPrice": 25.50,
      "originalPrice": 31.88,
      "discountAmount": 6.38,
      "status": "PENDING",
      "items": [...]
    }
  }
}
```

**Error Responses**:
```json
// Cart is empty
{
  "success": false,
  "error": "Cart is empty"
}

// Product no longer available
{
  "success": false,
  "error": "Product \"سكر\" is no longer available"
}

// Insufficient stock
{
  "success": false,
  "error": "Insufficient stock for \"سكر - 1 KG - Vanilla\". Available: 3"
}

// Invalid coupon
{
  "success": false,
  "error": "كود الخصم غير موجود"
}
```

---

### GET /api/v1/orders/{id}
**الغرض**: جلب تفاصيل طلب محدد

**Request**:
```bash
GET /api/v1/orders/order-uuid-1
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid-1",
      "buyerId": "user-uuid",
      "totalPrice": 25.50,
      "status": "CONFIRMED",
      "deliveryAddress": "شارع النيل، عمّان",
      "deliveryCity": "Amman",
      "buyerNotes": "توصيل سريع",
      "items": [
        {
          "id": "item-1",
          "product": {...},
          "selectedSize": {...},
          "selectedFlavor": {...},
          "selectedUnit": {...},
          "quantity": 2,
          "pricing": {...}
        }
      ],
      "statusHistory": [
        {
          "status": "PENDING",
          "timestamp": "2025-01-15T10:00:00Z",
          "note": null
        },
        {
          "status": "CONFIRMED",
          "timestamp": "2025-01-15T10:15:00Z",
          "note": "تم تأكيد الطلب"
        }
      ],
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:15:00Z"
    }
  }
}
```

---

### PATCH /api/v1/orders/{id}
**الغرض**: تحديث الطلب (في حالة PENDING فقط)

**Request**:
```json
{
  "deliveryAddress": "شارع جديد",
  "deliveryCity": "جديدة",
  "buyerNotes": "تحديث الملاحظات"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "order": { /* updated order */ }
  }
}
```

---

## 3. Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | GET, PATCH, DELETE requests succeeded |
| 201 | Created | POST requests succeeded |
| 400 | Bad Request | Validation errors, empty cart, insufficient stock |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User trying to access another user's order |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Unexpected error |

---

## 4. Common Errors

### `Unauthorized (401)`
```json
{
  "success": false,
  "error": "Unauthorized"
}
```
**Fix**: تأكد من إضافة `Authorization: Bearer <token>` في الـ header

### `Validation failed (400)`
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "quantity": ["Expected number"]
  }
}
```
**Fix**: تحقق من صيغة الـ request body

### `Cart is empty (400)`
```json
{
  "success": false,
  "error": "Cart is empty"
}
```
**Fix**: أضف منتجات إلى السلة قبل الشراء

---

## 5. Testing Tips

### استخدام curl
```bash
# Get cart
curl -X GET "http://localhost:3000/api/v1/cart" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add to cart
curl -X POST "http://localhost:3000/api/v1/cart" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"variantId":"uuid","quantity":2}'

# Create order
curl -X POST "http://localhost:3000/api/v1/orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryAddress":"address",
    "deliveryCity":"city",
    "buyerNotes":"notes"
  }'
```

### استخدام Postman
1. ضع الـ BASE_URL في environment variable
2. أضف `Authorization` header مع Bearer token
3. اختبر كل endpoint على حدة

### استخدام Browser DevTools
```javascript
// في console:
fetch('/api/v1/cart', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log)
```

---

## 6. Response Structure

جميع الـ responses تتبع هذا الـ structure:

```json
{
  "success": true | false,
  "data": { /* الـ actual data */ },
  "error": "string" // فقط إذا كان success: false
}
```

---

**آخر تحديث**: 2025-01-15  
**Version**: 1.0  
**Status**: ✅ جاهز للـ Production
