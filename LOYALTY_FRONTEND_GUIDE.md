# 🎁 Loyalty & Rewards System - Frontend Developer Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Mobile API Endpoints](#mobile-api-endpoints)
4. [Server Actions (for Web)](#server-actions-for-web)
5. [Data Models](#data-models)
6. [User Flows](#user-flows)
7. [Integration Examples](#integration-examples)
8. [Error Handling](#error-handling)
9. [Testing Guide](#testing-guide)

---

## Overview

The Loyalty & Rewards System is a comprehensive points-based rewards program integrated into the Tawreed B2B marketplace. It includes:

- **Points System**: Earn points on delivered orders
- **Welcome Bonus**: Points awarded on signup or first order
- **Referral Program**: Reward both referrer and invitee
- **Reward Catalog**: Admin-curated rewards (discounts, free delivery)
- **Progress Campaigns**: Goal-based challenges (spend amount, order count)
- **Coupon System**: Redeem points for discount coupons

**Key Principle**: Points are **ONLY** awarded when order status becomes `DELIVERED`.

---

## System Architecture

### Flow Diagram

```
Registration → Loyalty Balance Created → Referral Code Generated → Welcome Bonus (optional)
                                                ↓
Order Placed → Order Delivered → Points Calculated → Campaign Progress Updated
                                        ↓
User Balance Updated → Notification Sent → Transaction Logged
                                        ↓
Redeem Reward → Coupon Generated → Apply at Checkout → Mark as Used
```

### Components

| Component | Purpose |
|-----------|---------|
| **LoyaltyConfig** | System-wide settings (points per JOD, rounding, min order) |
| **LoyaltyBalance** | Per-user balance tracking |
| **LoyaltyTransaction** | Immutable audit log of all point movements |
| **LoyaltyReward** | Admin-created rewards catalog |
| **RedeemedReward** | User coupons with expiry and usage tracking |
| **LoyaltyCampaign** | Goal-based challenges |
| **UserCampaignProgress** | User progress in campaigns |
| **UserReferral** | Referral codes and tracking |

---

## Mobile API Endpoints

### Authentication

All API endpoints require JWT authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

---

### 1. Get User Balance

**Endpoint**: `GET /api/v1/loyalty/balance`

**Description**: Get user's loyalty balance and recent transactions.

**Response**:
```json
{
  "balance": {
    "userId": "uuid",
    "totalEarned": 1500,
    "totalRedeemed": 300,
    "currentBalance": 1200
  },
  "recentTransactions": [
    {
      "id": "uuid",
      "type": "EARN_ORDER",
      "points": 150,
      "description": "نقاط من الطلب #12345",
      "descriptionEn": "Points from order #12345",
      "createdAt": "2026-05-18T10:30:00Z",
      "metadata": { "orderId": "uuid" }
    }
  ]
}
```

**Transaction Types**:
- `EARN_ORDER` - Points from delivered order
- `EARN_WELCOME` - Welcome bonus
- `EARN_REFERRAL_INVITER` - Referrer reward
- `EARN_REFERRAL_INVITEE` - Invitee reward
- `EARN_CAMPAIGN` - Campaign completion reward
- `REDEEM` - Points redeemed for reward (negative points)
- `MANUAL_ADD` - Admin added points
- `MANUAL_REMOVE` - Admin removed points (negative)
- `EXPIRED` - Points expired (negative)

---

### 2. Get Transaction History

**Endpoint**: `GET /api/v1/loyalty/transactions?page=1&limit=20`

**Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response**:
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "EARN_ORDER",
      "points": 150,
      "description": "نقاط من الطلب #12345",
      "descriptionEn": "Points from order #12345",
      "createdAt": "2026-05-18T10:30:00Z",
      "metadata": { "orderId": "uuid" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 3. Get Rewards Catalog

**Endpoint**: `GET /api/v1/loyalty/rewards?type=FIXED_DISCOUNT`

**Parameters**:
- `type` (optional): Filter by reward type

**Reward Types**:
- `FIXED_DISCOUNT` - Fixed amount off (e.g., 10 JOD off)
- `PERCENTAGE_DISCOUNT` - Percentage off (e.g., 15% off)
- `FREE_DELIVERY` - Free delivery on order
- `CUSTOM` - Custom reward defined by admin

**Response**:
```json
{
  "rewards": [
    {
      "id": "uuid",
      "title": "خصم 10 دينار",
      "titleEn": "10 JOD Discount",
      "description": "خصم فوري على طلبك",
      "descriptionEn": "Instant discount on your order",
      "type": "FIXED_DISCOUNT",
      "pointsCost": 500,
      "discountValue": 10,
      "validityDays": 30,
      "minOrderAmount": 50,
      "maxRedemptionsPerUser": 5,
      "isActive": true
    }
  ]
}
```

---

### 4. Redeem Reward

**Endpoint**: `POST /api/v1/loyalty/rewards/redeem`

**Request Body**:
```json
{
  "rewardId": "uuid"
}
```

**Response** (Success):
```json
{
  "success": true,
  "couponCode": "LOYALTY-1716027000-A3F9K2"
}
```

**Response** (Error):
```json
{
  "error": "رصيد نقاط غير كافي"
}
```

**Possible Errors**:
- `"المكافأة غير متاحة"` - Reward not available
- `"رصيد نقاط غير كافي"` - Insufficient points
- `"لقد وصلت إلى الحد الأقصى لاسترداد هذه المكافأة"` - Max redemptions reached

**Business Logic**:
1. Checks if reward is active
2. Verifies user has enough points
3. Checks redemption limit per user
4. Generates unique coupon code
5. Deducts points from balance
6. Creates transaction log
7. Sends push notification

---

### 5. Get User's Coupons

**Endpoint**: `GET /api/v1/loyalty/coupons`

**Description**: Get all user's redeemed rewards (coupons), including used and expired ones.

**Response**:
```json
{
  "coupons": [
    {
      "id": "uuid",
      "couponCode": "LOYALTY-1716027000-A3F9K2",
      "redeemedAt": "2026-05-18T10:30:00Z",
      "expiresAt": "2026-06-17T10:30:00Z",
      "usedAt": null,
      "orderId": null,
      "reward": {
        "id": "uuid",
        "title": "خصم 10 دينار",
        "titleEn": "10 JOD Discount",
        "type": "FIXED_DISCOUNT",
        "discountValue": 10,
        "minOrderAmount": 50
      }
    }
  ]
}
```

**Coupon States**:
- **Valid**: `usedAt` is null and `expiresAt` is in future
- **Used**: `usedAt` is not null
- **Expired**: `expiresAt` is in past and `usedAt` is null

---

### 6. Validate Coupon at Checkout

**Endpoint**: `POST /api/v1/loyalty/coupons/validate`

**Request Body**:
```json
{
  "couponCode": "LOYALTY-1716027000-A3F9K2",
  "orderTotal": 75.50
}
```

**Response** (Success):
```json
{
  "valid": true,
  "discountAmount": 10,
  "finalTotal": 65.50,
  "couponId": "uuid"
}
```

**Response** (Error):
```json
{
  "error": "انتهت صلاحية هذا الكوبون"
}
```

**Possible Errors**:
- `"رمز الكوبون غير صحيح"` - Invalid coupon code
- `"هذا الكوبون لا ينتمي إليك"` - Coupon belongs to another user
- `"تم استخدام هذا الكوبون بالفعل"` - Coupon already used
- `"انتهت صلاحية هذا الكوبون"` - Coupon expired
- `"الحد الأدنى لمبلغ الطلب هو X JOD"` - Order below minimum amount

**Important**: For `FREE_DELIVERY` type, `discountAmount` will be 0. Frontend must handle removing delivery fee separately.

**After Validation**: Save the `couponId` to mark as used when order is placed.

---

### 7. Get Active Campaigns

**Endpoint**: `GET /api/v1/loyalty/campaigns`

**Description**: Get active campaigns with user's progress.

**Response**:
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "title": "أنفق 500 دينار",
      "titleEn": "Spend 500 JOD",
      "description": "أنفق 500 دينار خلال الشهر واحصل على 200 نقطة",
      "descriptionEn": "Spend 500 JOD this month and get 200 points",
      "goalType": "SPEND_AMOUNT",
      "goalValue": 500,
      "rewardPoints": 200,
      "startDate": "2026-05-01T00:00:00Z",
      "endDate": "2026-05-31T23:59:59Z",
      "status": "ACTIVE",
      "userProgress": {
        "currentValue": 275.50,
        "completed": false,
        "completedAt": null
      }
    }
  ]
}
```

**Goal Types**:
- `SPEND_AMOUNT` - Total spent (excludes delivery fees)
- `ORDER_COUNT` - Number of delivered orders

**Campaign Progress**:
- `currentValue` - User's current progress
- `completed` - Whether goal is reached
- `completedAt` - When goal was completed (null if not completed)

**UI Display**:
```
Progress: 275.50 / 500 JOD (55%)
Reward: 200 points
Status: In Progress
```

---

### 8. Get Referral Info

**Endpoint**: `GET /api/v1/loyalty/referral`

**Description**: Get user's referral code, shareable link, and total referrals.

**Response**:
```json
{
  "referralCode": "TAWREED-A3F9K2",
  "referralLink": "https://tawreed.jo/register?ref=TAWREED-A3F9K2",
  "totalReferrals": 12
}
```

**Usage**:
- Display referral code in user profile
- Generate QR code from `referralLink`
- Show "Share" button to share via WhatsApp, SMS, etc.

**Example Share Message**:
```
انضم إلى توريد واحصل على نقاط مكافأة!
استخدم رمز الإحالة الخاص بي: TAWREED-A3F9K2
https://tawreed.jo/register?ref=TAWREED-A3F9K2
```

---

### 9. Validate Referral Code

**Endpoint**: `POST /api/v1/loyalty/referral/apply`

**Description**: Validate referral code (used during registration flow).

**Request Body**:
```json
{
  "referralCode": "TAWREED-A3F9K2"
}
```

**Response** (Success):
```json
{
  "valid": true,
  "referralCode": "TAWREED-A3F9K2"
}
```

**Response** (Error):
```json
{
  "error": "رمز إحالة غير صالح"
}
```

**Integration**: Call this before submitting registration form to validate referral code.

---

## Server Actions (for Web)

For Next.js web app, use server actions directly instead of API calls.

### Points Management

```typescript
import { getUserBalance, getUserTransactions } from '@/actions/loyalty-points'

// Get user balance
const balanceData = await getUserBalance() // Uses current user from session

// Get transaction history
const { transactions, pagination } = await getUserTransactions(undefined, 1, 20)
```

### Rewards Management

```typescript
import { 
  getRewards, 
  redeemReward, 
  getUserRedeemedRewards,
  validateCoupon 
} from '@/actions/loyalty-rewards'

// Get rewards catalog
const rewards = await getRewards({ isActive: true })

// Redeem reward
const result = await redeemReward(rewardId)
if (result.success) {
  console.log('Coupon code:', result.data?.couponCode)
}

// Get user's coupons
const coupons = await getUserRedeemedRewards()

// Validate coupon at checkout
const validation = await validateCoupon(couponCode, orderTotal)
if (validation.success) {
  const { discountAmount, finalTotal, couponId } = validation.data
}
```

### Campaigns

```typescript
import { 
  getActiveCampaignsWithProgress,
  getUserCampaignProgress 
} from '@/actions/loyalty-campaigns'

// Get campaigns with user progress
const campaigns = await getActiveCampaignsWithProgress()

// Get user's campaign progress
const progress = await getUserCampaignProgress()
```

### Referrals

```typescript
import { 
  getUserReferralInfo,
  validateReferralCode 
} from '@/actions/loyalty-referrals'

// Get user's referral info
const referralInfo = await getUserReferralInfo()

// Validate referral code
const result = await validateReferralCode(code)
```

### Admin Actions

```typescript
import { getLoyaltyConfig, updateLoyaltyConfig } from '@/actions/loyalty-config'
import { createReward, updateReward, deleteReward } from '@/actions/loyalty-rewards'
import { createCampaign, updateCampaign, deleteCampaign } from '@/actions/loyalty-campaigns'
import { getLoyaltyDashboardStats, getTopLoyalCustomers } from '@/actions/loyalty-analytics'

// Config management
const config = await getLoyaltyConfig()
await updateLoyaltyConfig(formData)

// Reward CRUD
await createReward(formData)
await updateReward(formData)
await deleteReward(rewardId)

// Campaign CRUD
await createCampaign(formData)
await updateCampaign(formData)
await deleteCampaign(campaignId)

// Analytics
const stats = await getLoyaltyDashboardStats()
const topCustomers = await getTopLoyalCustomers(10)
```

---

## Data Models

### LoyaltyBalance

```typescript
{
  userId: string
  totalEarned: number      // Lifetime points earned
  totalRedeemed: number    // Lifetime points redeemed
  currentBalance: number   // Available points
  updatedAt: Date
}
```

### LoyaltyTransaction

```typescript
{
  id: string
  userId: string
  type: LoyaltyTransactionType
  points: number          // Positive for earn, negative for redeem
  description: string     // Arabic
  descriptionEn: string   // English
  metadata?: object       // Additional data (orderId, rewardId, etc.)
  createdAt: Date
}
```

### LoyaltyReward

```typescript
{
  id: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  type: RewardType        // FIXED_DISCOUNT, PERCENTAGE_DISCOUNT, FREE_DELIVERY, CUSTOM
  pointsCost: number
  discountValue?: number  // Amount or percentage
  validityDays: number    // Coupon validity after redemption
  minOrderAmount?: number // Min order to use coupon
  maxRedemptionsPerUser?: number // Limit per user
  isActive: boolean
}
```

### RedeemedReward

```typescript
{
  id: string
  userId: string
  rewardId: string
  couponCode: string      // Unique: LOYALTY-{timestamp}-{random}
  redeemedAt: Date
  expiresAt: Date
  usedAt?: Date
  orderId?: string        // Linked when coupon is used
  reward: LoyaltyReward   // Includes reward details
}
```

### LoyaltyCampaign

```typescript
{
  id: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  goalType: CampaignGoalType  // SPEND_AMOUNT, ORDER_COUNT
  goalValue: number
  rewardPoints: number
  startDate: Date
  endDate?: Date
  status: CampaignStatus  // DRAFT, ACTIVE, PAUSED, ENDED
}
```

### UserCampaignProgress

```typescript
{
  userId: string
  campaignId: string
  currentValue: number
  completed: boolean
  completedAt?: Date
  campaign: LoyaltyCampaign
}
```

---

## User Flows

### 1. Registration Flow

```
User fills registration form
    ↓
Optional: Enter referral code
    ↓
Frontend calls: POST /api/v1/loyalty/referral/apply
    ↓
If valid, include referralCode in registration
    ↓
Backend creates user + loyalty balance + referral code
    ↓
If welcome bonus trigger = SIGNUP, award points
    ↓
If referral code provided and trigger = SIGNUP, award referral points
```

**Frontend Code Example**:
```typescript
// Validate referral code before submitting registration
const validateRef = async (code: string) => {
  const res = await fetch('/api/v1/loyalty/referral/apply', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ referralCode: code })
  })
  
  const data = await res.json()
  return data.valid
}

// Include in registration formData
formData.append('referralCode', referralCode)
```

---

### 2. Order Flow

```
User places order (status: PENDING)
    ↓
Supplier processes (status: PROCESSING)
    ↓
Order shipped (status: SHIPPED)
    ↓
Order delivered (status: DELIVERED) ← Points awarded here!
    ↓
Backend: calculateOrderPoints(orderId)
    ↓
Backend: updateUserCampaignProgress(userId, orderId)
    ↓
Backend: Check if first order → Welcome bonus + Referral rewards
    ↓
User receives push notification with points earned
```

**Point Calculation Formula**:
```
orderTotal = order.total - order.deliveryFee (if excludeDeliveryFees = true)
points = (orderTotal / calculationBase) * pointsPerJod
points = Math.floor(points) (if roundingMode = FLOOR)
```

**Example**:
- Order total: 125 JOD
- Delivery fee: 5 JOD
- calculationBase: 1
- pointsPerJod: 10
- excludeDeliveryFees: true
- Calculation: ((125 - 5) / 1) * 10 = 1200 points

---

### 3. Reward Redemption Flow

```
User browses rewards catalog
    ↓
GET /api/v1/loyalty/rewards
    ↓
User selects reward
    ↓
POST /api/v1/loyalty/rewards/redeem
    ↓
Backend validates:
  - Reward is active
  - User has enough points
  - Max redemptions not exceeded
    ↓
Backend generates coupon code
    ↓
Backend deducts points
    ↓
Backend sends notification
    ↓
Frontend displays coupon code to user
```

---

### 4. Coupon Usage Flow

```
User adds items to cart
    ↓
At checkout, user enters coupon code
    ↓
POST /api/v1/loyalty/coupons/validate
    ↓
Backend validates:
  - Coupon exists
  - Belongs to user
  - Not used
  - Not expired
  - Order meets min amount
    ↓
Backend calculates discount
    ↓
Frontend applies discount to order total
    ↓
User confirms order
    ↓
Backend marks coupon as used (usedAt = now, orderId = order.id)
```

**Frontend Code Example**:
```typescript
const applyCoupon = async (code: string, total: number) => {
  const res = await fetch('/api/v1/loyalty/coupons/validate', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ couponCode: code, orderTotal: total })
  })
  
  if (!res.ok) {
    const error = await res.json()
    alert(error.error)
    return null
  }
  
  const data = await res.json()
  return {
    discountAmount: data.discountAmount,
    finalTotal: data.finalTotal,
    couponId: data.couponId // Save this for order creation
  }
}

// When creating order, include couponId in order data
orderData.redeemedRewardId = couponId
```

---

## Integration Examples

### Mobile App - Loyalty Dashboard Screen

```typescript
import { useEffect, useState } from 'react'

interface LoyaltyData {
  balance: {
    currentBalance: number
    totalEarned: number
    totalRedeemed: number
  }
  recentTransactions: Array<any>
}

export function LoyaltyDashboard() {
  const [data, setData] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchBalance()
  }, [])
  
  const fetchBalance = async () => {
    const token = await getAuthToken() // Your auth method
    const res = await fetch('/api/v1/loyalty/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    const data = await res.json()
    setData(data)
    setLoading(false)
  }
  
  if (loading) return <LoadingSpinner />
  
  return (
    <View>
      <Text style={styles.balance}>{data?.balance.currentBalance} نقطة</Text>
      <Text>إجمالي النقاط المكتسبة: {data?.balance.totalEarned}</Text>
      <Text>إجمالي النقاط المستردة: {data?.balance.totalRedeemed}</Text>
      
      <FlatList
        data={data?.recentTransactions}
        renderItem={({ item }) => (
          <TransactionCard transaction={item} />
        )}
      />
    </View>
  )
}
```

---

### Mobile App - Rewards Catalog Screen

```typescript
export function RewardsCatalog() {
  const [rewards, setRewards] = useState([])
  const [balance, setBalance] = useState(0)
  
  const fetchRewards = async () => {
    const token = await getAuthToken()
    const res = await fetch('/api/v1/loyalty/rewards', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    setRewards(data.rewards)
  }
  
  const redeemReward = async (rewardId: string) => {
    const token = await getAuthToken()
    const res = await fetch('/api/v1/loyalty/rewards/redeem', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rewardId })
    })
    
    if (!res.ok) {
      const error = await res.json()
      Alert.alert('خطأ', error.error)
      return
    }
    
    const data = await res.json()
    Alert.alert(
      'نجح!',
      `رمز الكوبون الخاص بك: ${data.couponCode}`,
      [{ text: 'نسخ', onPress: () => Clipboard.setString(data.couponCode) }]
    )
  }
  
  return (
    <FlatList
      data={rewards}
      renderItem={({ item }) => (
        <RewardCard 
          reward={item}
          userBalance={balance}
          onRedeem={() => redeemReward(item.id)}
        />
      )}
    />
  )
}
```

---

### Web App - Checkout with Coupon

```typescript
'use client'

import { useState } from 'react'
import { validateCoupon } from '@/actions/loyalty-rewards'

export function CheckoutForm({ orderTotal }: { orderTotal: number }) {
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponId, setCouponId] = useState<string | null>(null)
  const [error, setError] = useState('')
  
  const handleApplyCoupon = async () => {
    setError('')
    const result = await validateCoupon(couponCode, orderTotal)
    
    if (!result.success) {
      setError(result.error || 'كوبون غير صالح')
      return
    }
    
    setDiscount(result.data?.discountAmount || 0)
    setCouponId(result.data?.couponId || null)
  }
  
  const finalTotal = orderTotal - discount
  
  return (
    <form>
      <div className="coupon-section">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="أدخل رمز الكوبون"
        />
        <button type="button" onClick={handleApplyCoupon}>
          تطبيق
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      
      <div className="order-summary">
        <p>المجموع: {orderTotal} JOD</p>
        {discount > 0 && <p>الخصم: -{discount} JOD</p>}
        <p className="total">الإجمالي: {finalTotal} JOD</p>
      </div>
      
      <input type="hidden" name="redeemedRewardId" value={couponId || ''} />
      
      <button type="submit">تأكيد الطلب</button>
    </form>
  )
}
```

---

## Error Handling

### Common Error Codes

| Status | Error Message (AR) | Meaning |
|--------|-------------------|---------|
| 401 | غير مصرح | Unauthorized (no/invalid token) |
| 400 | رصيد نقاط غير كافي | Insufficient points |
| 400 | المكافأة غير متاحة | Reward not available/inactive |
| 400 | كوبون غير صالح | Invalid/expired/used coupon |
| 404 | غير موجود | Resource not found |
| 500 | خطأ في الخادم | Server error |

### Error Response Format

```json
{
  "error": "رصيد نقاط غير كافي"
}
```

### Frontend Error Handling Pattern

```typescript
const handleApiCall = async () => {
  try {
    const res = await fetch('/api/v1/loyalty/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'حدث خطأ')
    }
    
    const data = await res.json()
    return data
  } catch (err) {
    console.error('API Error:', err)
    alert(err.message)
    return null
  }
}
```

---

## Testing Guide

### Test Scenarios

#### 1. Points Calculation

**Steps**:
1. Register a new user
2. Create an order with total 100 JOD
3. Mark order as DELIVERED
4. Check user balance - should have 1000 points (100 * 10)

**Verification**:
```sql
SELECT * FROM "LoyaltyBalance" WHERE "userId" = 'user-id';
SELECT * FROM "LoyaltyTransaction" WHERE "userId" = 'user-id' AND type = 'EARN_ORDER';
```

---

#### 2. Welcome Bonus

**Steps**:
1. Configure welcome bonus: 100 points, trigger: SIGNUP
2. Register new user
3. Check balance - should have 100 points

**OR**:
1. Configure welcome bonus: 100 points, trigger: FIRST_DELIVERED_ORDER
2. Register new user
3. Create and deliver first order
4. Check balance - should have order points + 100 bonus points

---

#### 3. Referral System

**Steps**:
1. User A shares referral code: TAWREED-A3F9K2
2. User B registers with code TAWREED-A3F9K2
3. Configure referral: 50 points each, trigger: FIRST_DELIVERED_ORDER
4. User B creates and delivers first order
5. Check both balances:
   - User A: +50 points (EARN_REFERRAL_INVITER)
   - User B: order points + 50 points (EARN_REFERRAL_INVITEE)

---

#### 4. Reward Redemption

**Steps**:
1. User has 1000 points
2. Create reward: 10 JOD off, costs 500 points
3. User redeems reward
4. Check balance: 1000 - 500 = 500 points
5. Check coupons: Should have new coupon with code

---

#### 5. Coupon Validation

**Steps**:
1. User has coupon: LOYALTY-123-ABC
2. Reward: 10 JOD off, min order: 50 JOD
3. Validate with order total 40 JOD → Error: min order not met
4. Validate with order total 60 JOD → Success: discount 10 JOD

---

#### 6. Campaign Progress

**Steps**:
1. Create campaign: Spend 500 JOD, reward 200 points
2. User places 3 orders: 150, 200, 200 JOD (all delivered)
3. Check progress: 550 / 500 → Completed
4. Check balance: Should have +200 points (EARN_CAMPAIGN)

---

### API Testing with curl

```bash
# Get balance
curl -X GET http://localhost:3000/api/v1/loyalty/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Redeem reward
curl -X POST http://localhost:3000/api/v1/loyalty/rewards/redeem \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rewardId":"reward-uuid"}'

# Validate coupon
curl -X POST http://localhost:3000/api/v1/loyalty/coupons/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"couponCode":"LOYALTY-123-ABC","orderTotal":75.50}'
```

---

## Summary

### Quick Reference

| Feature | Mobile Endpoint | Web Action |
|---------|----------------|------------|
| Get Balance | `GET /api/v1/loyalty/balance` | `getUserBalance()` |
| Transaction History | `GET /api/v1/loyalty/transactions` | `getUserTransactions()` |
| Rewards Catalog | `GET /api/v1/loyalty/rewards` | `getRewards()` |
| Redeem Reward | `POST /api/v1/loyalty/rewards/redeem` | `redeemReward()` |
| User Coupons | `GET /api/v1/loyalty/coupons` | `getUserRedeemedRewards()` |
| Validate Coupon | `POST /api/v1/loyalty/coupons/validate` | `validateCoupon()` |
| Active Campaigns | `GET /api/v1/loyalty/campaigns` | `getActiveCampaignsWithProgress()` |
| Referral Info | `GET /api/v1/loyalty/referral` | `getUserReferralInfo()` |
| Validate Referral | `POST /api/v1/loyalty/referral/apply` | `validateReferralCode()` |

---

### Implementation Checklist

- [ ] Add loyalty dashboard to mobile app
- [ ] Display points balance in user profile
- [ ] Show transaction history
- [ ] Create rewards catalog screen
- [ ] Implement reward redemption flow
- [ ] Add coupon input to checkout
- [ ] Display active campaigns with progress bars
- [ ] Add referral code sharing functionality
- [ ] Show push notifications for loyalty events
- [ ] Test all flows end-to-end

---

### Support

For questions or issues, contact the backend team or refer to:
- **Implementation Summary**: `/LOYALTY_IMPLEMENTATION_SUMMARY.md`
- **Main Documentation**: `/CLAUDE.md`
- **Database Schema**: `/prisma/schema.prisma`
- **Server Actions**: `/actions/loyalty-*.ts`

---

**Version**: 1.0  
**Last Updated**: May 18, 2026  
**Status**: ✅ Core features complete, Admin dashboard pending
