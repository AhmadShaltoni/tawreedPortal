# Push Notification System — Delivery Report

**Date:** May 12, 2026  
**Scope:** Backend + Database + Dashboard  
**Status:** Production-Ready Implementation

---

## 1. Current System Analysis

### What Already Existed (Before This Work)

| Component | File | Status |
|-----------|------|--------|
| Firebase Admin SDK init | `lib/firebase.ts` | ✅ Working — env-based config with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| Push notification service | `lib/push-notifications.ts` | ⚠️ Written but **never imported anywhere** |
| DeviceToken model | `prisma/schema.prisma` | ✅ Working — `token` (unique), `platform` (IOS/ANDROID), `isActive`, `userId` |
| Device token API | `app/api/v1/notifications/device-token/route.ts` | ✅ Working — POST (register), DELETE (unregister), GET (list) |
| Notification API | `app/api/v1/notifications/route.ts` | ✅ Working — GET (fetch), PATCH (mark read) |
| Admin notification dashboard | `app/admin/notifications/` | ✅ Working — list, compose, stats |
| Admin send notification action | `actions/notifications.ts` | ⚠️ Created DB records but **never sent push** |
| Order status notifications | `actions/admin-orders.ts`, `actions/orders.ts` | ⚠️ Created DB records but **never sent push** |
| Offer notifications | `actions/offers.ts` | ⚠️ Created DB records but **never sent push** |
| New order admin notification | `app/api/v1/orders/route.ts` | ⚠️ Created DB records but **never sent push** |

### Root Cause of Notifications Not Reaching Users

**The push notification service (`lib/push-notifications.ts`) was fully coded with correct Firebase Admin SDK integration, but ZERO files in the entire codebase ever imported or called it.**

Every notification flow followed this broken path:
```
Event → db.notification.create() → Database record created → STOP
                                                                ↓
                                          Firebase never called — no push delivered
```

### What Worked
- Firebase Admin SDK initialization logic (correct env var handling)
- DeviceToken model and API (correct upsert, validation, auth)
- Dashboard UI for composing notifications
- Notification record creation in database

### What Was Broken
- `actions/notifications.ts` → `sendNotification()` logged a count but never called push functions
- `actions/admin-orders.ts` → `updateAdminOrderStatus()` used `db.notification.create()` without push
- `actions/orders.ts` → `updateOrderStatus()` used `db.notification.create()` without push
- `actions/offers.ts` → all 3 notification points used `db.notification.create()` without push
- `app/api/v1/orders/route.ts` → new order creation notified admins in DB only
- `sendPushToAll()` / `sendPushToRole()` had no FCM multicast batching (500 token limit)
- `createAndSendBroadcast()` had buggy `isSent` marking (marked ALL unsent global notifications as sent)

---

## 2. Missing Backend Work — Completed Checklist

| Task | Status | Details |
|------|--------|---------|
| Wire `sendNotification` to Firebase | ✅ Done | `actions/notifications.ts` now calls `sendPushToAll`, `sendPushToRole`, `sendPushToUser` |
| Wire order status push | ✅ Done | `actions/admin-orders.ts` and `actions/orders.ts` now use `createAndSendNotification` |
| Wire offer push | ✅ Done | `actions/offers.ts` (3 points) now uses `createAndSendNotification` |
| Wire new order push | ✅ Done | `app/api/v1/orders/route.ts` now calls `sendPushToRole('ADMIN', ...)` after transaction |
| Add FCM multicast batching | ✅ Done | New `sendMulticastBatched()` helper batches at 500 tokens |
| Fix broadcast `isSent` tracking | ✅ Done | Uses `batchId` in data payload for precise marking |
| Add stale token cleanup | ✅ Done | `cleanupStaleTokens(staleDays)` — deletes inactive, deactivates stale |
| Add push stats | ✅ Done | `getPushStats()` returns token counts by platform, Firebase config status |
| Add admin cleanup action | ✅ Done | `cleanupDeviceTokens()` server action for admin |
| Enhance notification stats | ✅ Done | `getNotificationStats()` now includes push delivery stats |

---

## 3. Database Changes

### Schema Update: Anonymous Device Support

**CRITICAL CHANGE:** `DeviceToken.userId` is now **optional** (`String?`) to support anonymous/logged-out devices receiving broadcast and marketing notifications.

**Updated schema:**

```prisma
enum Platform {
  IOS
  ANDROID
}

model DeviceToken {
  id        String    @id @default(cuid())
  token     String    @unique    // FCM token
  platform  Platform             // IOS or ANDROID
  
  isActive  Boolean   @default(true)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // Relations — userId is OPTIONAL (null = anonymous/logged-out device)
  userId    String?   // Changed from String (required) to String? (nullable)
  user      User?     @relation(fields: [userId], references: [id], onDelete: SetNull)  // Changed from Cascade to SetNull
  
  @@index([userId])
  @@index([isActive])
}

model Notification {
  id        String           @id @default(cuid())
  type      NotificationType
  title     String
  message   String
  linkUrl   String?
  imageUrl  String?
  data      Json?            // Custom payload (deep linking, batchId, etc.)
  isSent    Boolean          @default(false)
  isGlobal  Boolean          @default(false)
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([createdAt])
  @@index([isSent])
}
```

### Migration Required

**File:** `prisma/migrations/20260512120000_device_token_anonymous_support/migration.sql`

```sql
-- AlterTable: Make DeviceToken.userId optional (nullable)
-- This allows FCM tokens to represent device installations rather than authenticated sessions.
-- Anonymous/logged-out devices can still receive broadcast and marketing push notifications.

ALTER TABLE "DeviceToken" DROP CONSTRAINT "DeviceToken_userId_fkey";
ALTER TABLE "DeviceToken" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Action:** Run `npx prisma migrate deploy` (production) or `npx prisma migrate dev` (development).

---

## 4. API Contracts

### 4.1 Register Device Token (Updated — Anonymous Support)

**POST /api/v1/notifications/device-token** — Register or link device token.

- **With authentication:** Links token to authenticated user (upsert)
- **Without authentication:** Creates/updates anonymous token (for broadcast/marketing)

```
POST /api/v1/notifications/device-token
Authorization: Bearer <jwt_token>    // Optional — works with or without auth

Request Body:
{
  "token": "dFjH8sK...(FCM token)",
  "platform": "ANDROID"    // "IOS" or "ANDROID"
}

Response (201):
{
  "message": "Device token registered successfully",
  "deviceToken": {
    "id": "clx...",
    "platform": "ANDROID",
    "isActive": true,
    "linked": true    // true if userId is set, false if anonymous
  }
}
```

**Token Lifecycle:**
- Anonymous device calls POST (no auth) → token created with `userId=null`
- User logs in with same token → POST with auth → token.userId linked
- User logs out → DELETE → token.userId set to null (token persists)

### 4.2 Unlink Device Token (Updated — No Longer Deletes)

**DELETE /api/v1/notifications/device-token** — Unlink token from user.

⚠️ **Important:** Does NOT delete the token. Sets `userId = null` so the device remains reachable for broadcast/marketing push.

```
DELETE /api/v1/notifications/device-token
Authorization: Bearer <jwt_token>

Request Body:
{
  "token": "dFjH8sK...(FCM token)"
}

Response (200):
{
  "message": "Device token unlinked successfully"
}
```

**What happens:**
- Token persists in database
- userId set to null
- Device can still receive broadcasts/marketing
- On next login with same token → re-linked to new user

### 4.3 Get User Notifications (Already Exists)

```
GET /api/v1/notifications?unread=true&page=1&limit=20
Authorization: Bearer <jwt_token>

Response (200):
{
  "notifications": [
    {
      "id": "clx...",
      "type": "ORDER_STATUS_CHANGE",
      "title": "تحديث حالة الطلب",
      "message": "تم تحديث حالة طلبك #abc123 إلى CONFIRMED",
      "linkUrl": "/orders/clx...",
      "imageUrl": null,
      "data": {
        "orderId": "clx...",
        "orderNumber": "clx...",
        "status": "CONFIRMED"
      },
      "isSent": true,
      "isRead": false,
      "createdAt": "2026-05-12T10:00:00Z"
    }
  ],
  "unreadCount": 3,
  "pagination": { "page": 1, "limit": 20, "total": 15, "pages": 1 }
}
```

### 4.4 Mark Notifications as Read (Already Exists)

```
PATCH /api/v1/notifications
Authorization: Bearer <jwt_token>

Request Body:
{
  "ids": ["clx...", "clx..."]    // Optional — omit to mark all as read
}

Response (200):
{
  "message": "Notifications marked as read"
}
```

### 4.5 FCM Push Payload Structure (Sent by Backend)

The backend sends this payload to FCM, which the mobile app receives:

```json
{
  "notification": {
    "title": "طلب جديد",
    "body": "طلب جديد #abc123 بقيمة 150 د.أ",
    "imageUrl": "https://..."
  },
  "data": {
    "type": "NEW_ORDER",
    "orderId": "clx...",
    "orderNumber": "clx...",
    "linkUrl": "/admin/orders/clx...",
    "notificationId": "clx..."
  }
}
```

---

## 5. Dashboard Flow

### Current Dashboard → Push Flow (With Anonymous Device Support)

```
Admin opens /admin/notifications/new
    ↓
Admin fills: title, message, recipientType, optional link & image
    ↓
Admin clicks Send
    ↓
ComposeNotificationForm → sendNotification(formData)    [Server Action]
    ↓
actions/notifications.ts:
  1. Validates input
  2. Resolves recipient IDs based on recipientType
  3. Creates Notification DB records (isSent: false)
  4. Calls appropriate push function:
     - recipientType='all'       → sendPushToAll(payload)
                                    ⚠️ Includes BOTH authenticated + anonymous devices
     - recipientType='buyers'    → sendPushToRole('BUYER', payload)
                                    ✅ Only buyers with userId set
     - recipientType='suppliers' → sendPushToRole('SUPPLIER', payload)
                                    ✅ Only suppliers with userId set
     - recipientType='specific'  → sendPushToUser(userId, payload)
                                    ✅ Only that user's devices
  5. On push success, marks DB records as isSent: true
  6. Returns success with count
    ↓
Dashboard shows success message + delivery stats
```

**Key Difference:** `sendPushToAll()` now reaches both logged-in and logged-out devices!

### Dashboard Stats (Enhanced with Anonymous Device Tracking)

The notification stats now include push delivery and device classification:

```json
{
  "total": 150,
  "sent": 120,
  "unread": 30,
  "byType": { "SYSTEM": 50, "ORDER_STATUS_CHANGE": 70, "NEW_ORDER": 30 },
  "push": {
    "totalTokens": 250,
    "activeTokens": 220,
    "inactiveTokens": 30,
    "linkedTokens": 180,        // NEW: Devices linked to authenticated users
    "anonymousTokens": 40,      // NEW: Logged-out/pre-login devices
    "ioTokens": 100,
    "androidTokens": 120,
    "firebaseConfigured": true
  }
}
```

**Insight:** 40 anonymous tokens means 40 devices that can receive marketing/re-engagement push even if user isn't logged in!

### Admin Token Cleanup

Admin can call `cleanupDeviceTokens(staleDays)` server action to:
- Delete all tokens marked as inactive (failed delivery)
- Deactivate tokens not updated in >90 days (default)

---

## 6. Firebase Requirements

### What Must Be Configured

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Firebase Project | Required | Create at https://console.firebase.google.com |
| Cloud Messaging enabled | Required | Enable in Firebase Console → Project Settings → Cloud Messaging |
| Service Account | Required | Firebase Console → Project Settings → Service accounts → Generate new private key |
| `FIREBASE_PROJECT_ID` env var | Required | From service account JSON: `project_id` |
| `FIREBASE_CLIENT_EMAIL` env var | Required | From service account JSON: `client_email` |
| `FIREBASE_PRIVATE_KEY` env var | Required | From service account JSON: `private_key` (with `\n` preserved) |
| `google-services.json` (Android) | Frontend | Download from Firebase Console → add to mobile app |
| `GoogleService-Info.plist` (iOS) | Frontend | Download from Firebase Console → add to mobile app |
| APNs key/certificate (iOS) | Required | Upload APNs auth key to Firebase Console → Cloud Messaging → iOS |

### Environment Variables (.env)

```env
# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID="tawreed-xxxxx"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@tawreed-xxxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

### What Is NOT Needed

- ❌ Firebase Topics — not used (direct token storage is sufficient for our scale)
- ❌ Firebase Console for sending — all sending goes through backend
- ❌ BullMQ/Redis queues — not needed at current scale; can be added later
- ❌ Separate microservice — Next.js server handles everything

---

## 7. Frontend Requirements (Mobile App Team)

### What Frontend Must Implement

#### 7.1 FCM Token Registration (On Login/App Start)

```javascript
// After successful login:
const fcmToken = await messaging().getToken()

await fetch(`${API_BASE}/api/v1/notifications/device-token`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: fcmToken,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
  }),
})
```

#### 7.2 Token Refresh Listener

```javascript
// Set up on app init:
messaging().onTokenRefresh(async (newToken) => {
  await fetch(`${API_BASE}/api/v1/notifications/device-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: newToken,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    }),
  })
})
```

#### 7.3 Token Unlink (On Logout) — NEW BEHAVIOR

⚠️ **IMPORTANT CHANGE:** DELETE no longer removes the token. It **unlinks** the user (sets userId=null) so the device can still receive broadcasts.

```javascript
// Before clearing auth state:
const fcmToken = await messaging().getToken()

await fetch(`${API_BASE}/api/v1/notifications/device-token`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ token: fcmToken }),
})

// Token still active! Can receive broadcasts and "Come back" notifications.
// Device will be re-linked when user logs in again with same token.
```

#### 7.4 Notification Handling

```javascript
// Foreground notifications:
messaging().onMessage(async (remoteMessage) => {
  // Show in-app notification UI
  // remoteMessage.notification.title
  // remoteMessage.notification.body
  // remoteMessage.data.linkUrl → navigate
  // remoteMessage.data.type → determine action
})

// Background notification taps:
messaging().onNotificationOpenedApp((remoteMessage) => {
  // Navigate to remoteMessage.data.linkUrl
})

// App opened from killed state via notification:
const initialNotification = await messaging().getInitialNotification()
if (initialNotification) {
  // Navigate to initialNotification.data.linkUrl
}
```

#### 7.5 When to Send Token — UPDATED

| Event | Action | Notes |
|-------|--------|-------|
| App installs (pre-login) | `POST /api/v1/notifications/device-token` (no auth) | NEW: Registers anonymous token |
| User logs in | `POST /api/v1/notifications/device-token` with auth | Links token to user |
| App starts (if logged in) | `POST /api/v1/notifications/device-token` with auth | Re-links token (safe to repeat) |
| Token refresh event | `POST /api/v1/notifications/device-token` with current auth | Updates token |
| User logs out | `DELETE /api/v1/notifications/device-token` | Unlinks (token persists for broadcasts) |

**NEW:** Apps should register tokens even before login so they can receive marketing/re-engagement push!

#### 7.6 Notification Data Payload Structure

The `data` field in received notifications will contain:

```typescript
interface NotificationData {
  type: 'NEW_ORDER' | 'ORDER_STATUS_CHANGE' | 'ORDER_UPDATE' | 'NEW_OFFER' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'SYSTEM'
  notificationId?: string   // DB notification ID
  linkUrl?: string           // Navigation path
  orderId?: string           // For order-related notifications
  orderNumber?: string
  status?: string            // New order status
  requestId?: string         // For RFQ-related notifications
  offerId?: string
  isBroadcast?: 'true'      // If broadcast notification (can be received by anonymous devices)
}
```

**For anonymous devices:** If user not logged in and receives broadcast notification with `linkUrl`, app should navigate to link or prompt login.

---

## 8. Updated Token Lifecycle & Notification Flow

### 8.1 Complete Token Lifecycle

```
APP INSTALLED (Pre-login)
├─ App requests FCM token from Firebase SDK
├─ App sends: POST /api/v1/notifications/device-token (NO auth)
├─ Backend creates token with userId=null (ANONYMOUS)
└─ Token active for broadcasts/marketing push

USER LOGS IN
├─ App authenticates → receives JWT token
├─ App sends: POST /api/v1/notifications/device-token with JWT
├─ Backend upserts: links token to user (userId=user.id)
└─ Token now receives both user-specific AND broadcast push

USER LOGS OUT
├─ App sends: DELETE /api/v1/notifications/device-token
├─ Backend unlinks: sets userId=null
├─ Token persists in database
└─ Token can still receive broadcasts/marketing/re-engagement

USER LOGS IN AGAIN (Same device)
├─ App sends: POST /api/v1/notifications/device-token with JWT
├─ Backend re-links: sets userId=user.id
└─ Seamless re-engagement, no token loss

APP UNINSTALLED / TOKEN INVALID
├─ Firebase returns invalid token on next push attempt
├─ Backend deactivates token (isActive=false)
└─ Token can be deleted after cleanup period
```

### 8.2 Complete Flow: Broadcast Delivery to Anonymous Device

```
1. ANONYMOUS DEVICE (Not logged in)
   ├─ App installed, requests FCM token
   └─ POST /device-token (no auth) → userId=null (ANONYMOUS)

2. ADMIN SENDS BROADCAST
   ├─ Admin opens /admin/notifications/new
   ├─ Sends to recipientType='all'
   ├─ Backend calls sendPushToAll()
   │   └─ Queries ALL active tokens (including userId=null)
   └─ Firebase delivers to anonymous device

3. DEVICE RECEIVES NOTIFICATION
   ├─ Foreground/background: shows notification
   ├─ User may be logged out but still sees marketing push
   └─ If linkUrl present, can navigate or prompt login
```

### 8.3 Complete Flow: Login → Notification Delivery

```
1. USER LOGS IN (Mobile App)
   ├─ App authenticates → receives JWT token
   ├─ App requests FCM token from Firebase SDK
   └─ App sends: POST /api/v1/notifications/device-token with JWT
       ├─ Backend upserts: links token to user.id
       └─ Token now active and linked to user

2. EVENT OCCURS (e.g., Admin updates order status)
   ├─ Admin clicks "Update Status" on dashboard
   ├─ Server Action: updateAdminOrderStatus()
   │   ├─ Updates order in DB
   │   └─ Calls createAndSendNotification(buyerId, payload)
   │       ├─ Creates Notification record in DB (isSent: false)
   │       ├─ Queries DeviceToken where userId=buyerId AND isActive=true
   │       ├─ Calls sendMulticastBatched(tokens, pushPayload)
   │       │   ├─ Splits tokens into batches of 500
   │       │   ├─ Calls messaging.sendEachForMulticast() per batch
   │       │   ├─ Collects failed tokens
   │       │   └─ Deactivates failed tokens in DB
   │       └─ If any push succeeded, marks Notification as isSent: true
   │
   └─ Firebase Cloud Messaging
       ├─ Validates token
       ├─ Routes to APNs (iOS) or GCM (Android)
       └─ Delivers to device

3. DEVICE RECEIVES NOTIFICATION
   ├─ Foreground: messaging().onMessage() fires
   │   └─ App shows in-app notification
   ├─ Background: OS shows in notification tray
   │   └─ User taps → onNotificationOpenedApp() fires
   │       └─ App navigates to data.linkUrl
   └─ App killed: getInitialNotification() on next open
       └─ App navigates to data.linkUrl

4. USER VIEWS NOTIFICATIONS
   ├─ App calls: GET /api/v1/notifications?unread=true
   ├─ Shows notification list
   └─ Marks as read: PATCH /api/v1/notifications { ids: [...] }
```

### Role-Based Push (Authenticated Users Only)

```
1. Admin updates order status → triggers createAndSendNotification(buyerId)
2. Backend queries: DeviceToken where userId=buyerId AND isActive=true
3. Calls sendMulticastBatched() — only reaches that user's devices
4. Anonymous devices NOT included (userId=null filtered out)
```

### Broadcast Flow (Admin Dashboard)

```
1. Admin opens /admin/notifications/new
2. Fills title, message, recipients (all/buyers/suppliers/specific)
3. Clicks Send
4. Server Action: sendNotification(formData)
   ├─ Resolves recipient user IDs based on recipientType
   ├─ Creates Notification records for all recipients
   ├─ Calls appropriate push function:
   │   ├─ recipientType='all' → sendPushToAll()
   │   │   └─ Targets ALL active tokens (authenticated + anonymous)
   │   ├─ recipientType='buyers' → sendPushToRole('BUYER')
   │   │   └─ Targets only authenticated buyers
   │   ├─ recipientType='suppliers' → sendPushToRole('SUPPLIER')
   │   │   └─ Targets only authenticated suppliers
   │   └─ recipientType='specific' → sendPushToUser(userId)
   │       └─ Targets one user's devices
   ├─ sendMulticastBatched() handles FCM 500-token limit
   ├─ Marks successful notifications as isSent: true
   └─ Returns success with count (may include anonymous reach)
```

---

## 9. Architectural Decision: Device-Focused vs Session-Focused Tokens

### The Change

**Before:** Tokens = authenticated sessions (delete on logout)
**After:** Tokens = device installations (persist across login/logout)

### Why This Matters

| Requirement | Before | After |
|-------------|--------|-------|
| Token persists after logout | ❌ Deleted | ✅ Unlinked (userId=null) |
| Logged-out users receive marketing | ❌ No tokens | ✅ Anonymous tokens |
| Re-engagement campaigns | ❌ Impossible | ✅ Can target userId=null |
| Device re-linking | ❌ N/A | ✅ Seamless on re-login |
| Business opportunity | ❌ Lost users | ✅ Broadcast re-engagement |

### This Enables

✅ **Marketing campaigns** to logged-out users  
✅ **"Come back" notifications** with app re-engagement  
✅ **General announcements** to any installed app  
✅ **Promotional offers** pre-login  
✅ **Higher reach** without losing users  

---

## 10. Recommended Architecture

### Decision: Direct Token Storage (NOT Topics) + Anonymous Support

**Chosen approach:** Store FCM tokens in database as device installations, send via multicast, support both authenticated and anonymous devices.

#### Why NOT Topics

| Factor | Topics | Direct Tokens (Chosen) |
|--------|--------|----------------------|
| User-specific notifications | ❌ Cannot target individual users | ✅ Send to exact user's devices |
| Deep linking data | ❌ Same payload to all subscribers | ✅ Custom data per user (orderId, etc.) |
| Delivery tracking | ❌ No per-user delivery status | ✅ Track isSent per notification record |
| Role-based targeting | ⚠️ Must manage topic subscriptions | ✅ Query users by role from DB |
| Token cleanup | ❌ Firebase handles silently | ✅ Explicit cleanup, visible stats |
| User segmentation | ❌ Very limited | ✅ Full DB queries (city, activity, etc.) |
| Scalability concern | Topics scale better at >100k users | Our B2B user base is <10k users |

#### Why Direct Tokens Works for Tawreed

1. **B2B platform** — user base is thousands, not millions
2. **Most notifications are user-specific** — order updates, offer responses
3. **Need delivery tracking** — `isSent` flag per notification
4. **Need rich data payloads** — orderId, status, linkUrl differ per user
5. **Already have DeviceToken model** — infrastructure exists
6. **FCM multicast supports 500 tokens/call** — batching handles growth

#### When to Reconsider Topics

- If user base exceeds 50,000+ active devices
- If you add a "news/promotions" channel that ALL users subscribe to
- If you need Firebase-level delivery analytics

#### Pros of Current Approach

- ✅ Simple, single-stack (no Redis, no queues, no microservices)
- ✅ Full control over targeting and payload
- ✅ Per-user delivery tracking
- ✅ Works with existing Prisma/PostgreSQL stack
- ✅ Automatic invalid token cleanup on failed delivery
- ✅ Dashboard can show exact push delivery stats
- ✅ **NEW:** Anonymous device support for re-engagement and marketing
- ✅ **NEW:** Device-level persistence across login/logout cycles

#### Cons (Acceptable Trade-offs)

- ⚠️ For very large broadcasts (>10k tokens), delivery takes longer (batched sequentially)
- ⚠️ No built-in retry queue (failed batches are logged, tokens deactivated)
- ⚠️ If backend is down, no notifications are sent (no async queue)

These can be addressed in Phase 2 with BullMQ/Redis if needed.

---

## 11. New Push Functions (Anonymous Support)

### sendPushToAll() — Updated

**Targets:** ALL active device tokens, including anonymous (`userId=null`)

**Use case:** General announcements, marketing, promotions

```typescript
await sendPushToAll({
  title: "العرض الخاص",
  body: "تخفيف 20% على جميع المنتجات",
  data: { type: 'SYSTEM', linkUrl: '/offers' }
})
// Reaches both logged-in and logged-out users
```

### sendPushToAuthenticated() — NEW

**Targets:** Active tokens linked to authenticated users (`userId != null`)

**Use case:** When you want to exclude anonymous devices

```typescript
await sendPushToAuthenticated({
  title: "تحديث النظام",
  body: "يجب تحديث التطبيق",
  data: { type: 'SYSTEM' }
})
// Only reaches logged-in users, excludes anonymous devices
```

### sendPushToRole(role) — Updated

**Targets:** Active tokens linked to users with specific role (`userId != null AND user.role = role`)

**Use case:** Role-specific announcements

```typescript
await sendPushToRole('BUYER', {
  title: "طلب جديد متاح",
  body: "منتج جديد أضيف إلى الكتالوج"
})
// Only reaches authenticated buyers, excludes anonymous and suppliers
```

### sendPushToUser(userId) — Unchanged

**Targets:** Specific user's devices (`userId = target`)

**Use case:** User-specific notifications (order updates, offers, etc.)

---

## 12. What Was Implemented

### Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Made `DeviceToken.userId` nullable (`String?`), changed `onDelete: Cascade` → `onDelete: SetNull` |
| `prisma/migrations/20260512120000_device_token_anonymous_support/` | NEW: Migration to make userId nullable |
| `app/api/v1/notifications/device-token/route.ts` | **POST:** Now supports anonymous registration (no auth required), upserts token, links to user if authenticated. **DELETE:** Now unlinks (sets userId=null) instead of deleting. **GET:** Unchanged |
| `app/api/v1/auth/route.ts` | **Login:** Simplified upsert to link/re-link token to authenticated user. **Register:** Upsert to link token to new user (including from anonymous state) |
| `lib/push-notifications.ts` | Added `sendPushToAuthenticated()` function, updated `sendPushToAll()` to include anonymous tokens, updated `sendPushToRole()` to explicitly exclude anonymous (add userId guard), updated `getPushStats()` with `linkedTokens` and `anonymousTokens` counts |
| `actions/notifications.ts` | Imported `sendPushToAuthenticated`, updated to export new function, enhanced stats |
| `actions/admin-orders.ts` | No changes needed — already calls `createAndSendNotification()` which respects user context |
| `actions/orders.ts` | No changes needed — already calls `createAndSendNotification()` |
| `actions/offers.ts` | No changes needed — already calls `createAndSendNotification()` |
| `app/api/v1/orders/route.ts` | No changes needed — already calls `sendPushToRole('ADMIN')` |

**Zero breaking changes to existing notification flows.**

### Files NOT Changed (Already Working)

| File | Reason |
|------|--------|
| `lib/firebase.ts` | ✅ Firebase Admin SDK init is correct |
| `app/api/v1/notifications/route.ts` | ✅ Notification fetch/mark-read API is correct |
| `app/admin/notifications/*` | ✅ Dashboard UI works correctly (calls server actions) |

### New Functions Added

| Function | File | Purpose |
|----------|------|---------|
| `sendMulticastBatched()` | `lib/push-notifications.ts` | Internal helper — batches FCM calls at 500 tokens |
| `sendPushToAuthenticated()` | `lib/push-notifications.ts` | **NEW:** Send to only authenticated users (exclude anonymous) |
| `cleanupStaleTokens()` | `lib/push-notifications.ts` | Deletes inactive tokens, deactivates stale ones |
| `getPushStats()` | `lib/push-notifications.ts` | Returns token counts (now with linkedTokens/anonymousTokens) |
| `cleanupDeviceTokens()` | `actions/notifications.ts` | Admin server action to trigger token cleanup |

### Notification Points Now Sending Push

| Event | Action File | Push Target |
|-------|-------------|-------------|
| Admin sends notification | `actions/notifications.ts` | All / Buyers / Suppliers / Specific user |
| Admin updates order status | `actions/admin-orders.ts` | Buyer (order owner) |
| Supplier/Buyer updates order | `actions/orders.ts` | Other party |
| Supplier creates offer | `actions/offers.ts` | Buyer (request owner) |
| Buyer accepts offer | `actions/offers.ts` | Supplier (offer creator) |
| Buyer rejects offer | `actions/offers.ts` | Supplier (offer creator) |
| New order placed (checkout) | `app/api/v1/orders/route.ts` | All admins |

---

## Summary

### Phase 1: Initial Push Notification Wiring (Earlier)

The push notification system was architecturally complete but had a critical wiring gap — the Firebase send functions existed but were never called. We fixed:

1. ✅ Connected all 7 notification trigger points to push service
2. ✅ Added FCM multicast batching (500 tokens per call)
3. ✅ Fixed broadcast tracking with batchId
4. ✅ Added token lifecycle management
5. ✅ Enhanced dashboard stats

### Phase 2: Anonymous Device Support (This Update)

Transformed the system from **session-focused** to **device-focused**, enabling re-engagement and marketing:

1. ✅ Made `DeviceToken.userId` nullable — tokens represent devices, not sessions
2. ✅ Updated POST to support anonymous registration (no auth required)
3. ✅ Changed DELETE to unlink (userId=null) instead of delete — token persists
4. ✅ Updated login/register to re-link tokens from anonymous state
5. ✅ Added `sendPushToAuthenticated()` for excluding anonymous devices
6. ✅ Updated `sendPushToAll()` to include anonymous tokens (broadcasts reach everyone)
7. ✅ Enhanced stats with `linkedTokens` and `anonymousTokens` counts
8. ✅ Created migration for nullable userId

### What This Enables

- 📱 **Device-level persistence** — tokens survive login/logout cycles
- 📢 **Re-engagement campaigns** — reach users even when logged out
- 🎯 **Marketing broadcasts** — send to any installed app
- 📊 **Better metrics** — track anonymous reach separately
- 🔄 **Seamless re-linking** — users don't lose history when switching accounts

**The system is now production-ready with full anonymous device support and complete notification delivery infrastructure.**
