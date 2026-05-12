# 🔔 دليل Push Notifications الكامل للفرونت إند

> دليل شامل للتعامل مع نظام الإشعارات في تطبيق توريد

---

## 📑 جدول المحتويات

1. [📚 مقدمة النظام](#مقدمة-النظام)
2. [🏗️ معمارية النظام](#معمارية-النظام)
3. [🔑 متطلبات البيئة](#متطلبات-البيئة)
4. [📱 تسجيل Device Token](#تسجيل-device-token)
5. [📨 API Endpoints الرئيسية](#api-endpoints-الرئيسية)
6. [🎯 استقبال الإشعارات](#استقبال-الإشعارات)
7. [💻 أمثلة عملية](#أمثلة-عملية)
8. [🧪 اختبار الإشعارات](#اختبار-الإشعارات)
9. [🐛 معالجة الأخطاء](#معالجة-الأخطاء)
10. [✅ Best Practices](#best-practices)

---

## 📚 مقدمة النظام

### ما هو نظام الإشعارات؟

نظام الإشعارات في توريد يوفر:
- ✅ **Push Notifications** - إشعارات فورية للتطبيق
- ✅ **In-App Notifications** - إشعارات داخل التطبيق
- ✅ **Multi-Device Support** - دعم أجهزة متعددة لنفس المستخدم
- ✅ **Real-time Delivery** - إرسال فوري عبر Firebase

### أنواع الإشعارات المدعومة

| النوع | الاستخدام | مثال |
|------|----------|------|
| `NEW_REQUEST` | طلب شراء جديد (Legacy) | تم استقبال طلب شراء جديد |
| `NEW_OFFER` | عرض جديد (Legacy) | مورد قدم لك عرض جديد |
| `OFFER_ACCEPTED` | قبول عرض (Legacy) | تم قبول عرضك |
| `OFFER_REJECTED` | رفض عرض (Legacy) | تم رفض عرضك |
| `NEW_ORDER` | طلب جديد (للمورد) | طلب شراء جديد من متجر |
| `ORDER_UPDATE` | تحديث حالة الطلب | حالة الطلب تغيرت |
| `ORDER_STATUS_CHANGE` | تغيير حالة الطلب | الطلب في مرحلة الشحن |
| `SYSTEM` | إشعارات النظام | إعلانات مهمة |

---

## 🏗️ معمارية النظام

### المكونات الرئيسية

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)            │
│         - FCM SDK / Expo Notifications SDK              │
│         - استقبال الإشعارات والتعامل معها             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ (JWT Token)
┌─────────────────────────────────────────────────────────┐
│            Backend API (Next.js + Node.js)              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Endpoints:                                    │ │
│  │  - POST /api/v1/notifications/device-token        │ │
│  │  - DELETE /api/v1/notifications/device-token      │ │
│  │  - GET /api/v1/notifications/device-token         │ │
│  │  - GET /api/v1/notifications                      │ │
│  │  - POST /api/v1/notifications/mark-as-read        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Server Actions:                                   │ │
│  │  - createAndSendNotification()                     │ │
│  │  - sendPushToUser()                                │ │
│  │  - sendPushToAll()                                 │ │
│  │  - sendPushToRole()                                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Database:                                         │ │
│  │  - DeviceToken (تخزين device tokens)             │ │
│  │  - Notification (سجل الإشعارات)                  │ │
│  └────────────────────────────────────────────────────┘ │
└────────────┬──────────────────────────────┬─────────────┘
             │                              │
             ↓                              ↓
    ┌──────────────────┐         ┌──────────────────┐
    │  Firebase Admin  │         │  PostgreSQL DB   │
    │  Cloud Messaging │         │  (Railway)       │
    │  (FCM)           │         │                  │
    └──────────────────┘         └──────────────────┘
             │
             ↓
    ┌──────────────────┐
    │  Device Tokens   │
    │  (APNS / FCM)    │
    └──────────────────┘
```

### تدفق العمل الكامل

```
1. Mobile App
   ↓ يحصل على FCM Token من Firebase
   ↓
2. تسجيل Device Token
   ↓ POST /api/v1/notifications/device-token
   ↓ (مع JWT Token في Authorization)
   ↓
3. Backend
   ↓ يحفظ Token في قاعدة البيانات (DeviceToken)
   ↓
4. عند حدث مهم (مثل طلب شراء جديد)
   ↓ Backend يستدعي sendPushToUser()
   ↓
5. Firebase Cloud Messaging
   ↓ يرسل Push Notification إلى الجهاز
   ↓
6. Device
   ↓ يستقبل الإشعار والتطبيق يعرضه
```

---

## 🔑 متطلبات البيئة

### على Backend (.env)

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID="tawreed-d7550"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@tawreed-d7550.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### على Frontend (React Native / Expo)

```bash
# تثبيت المكتبات المطلوبة:

# للـ Expo:
expo install expo-notifications
expo install expo-device

# للـ React Native (بدون Expo):
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

---

## 📱 تسجيل Device Token

### الخطوة 1: الحصول على FCM Token (Expo)

```javascript
// في تطبيقك React Native (Expo)
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('يجب تشغيل التطبيق على جهاز فعلي للحصول على notifications')
    return null
  }

  // الطلب صريح للسماح بالإشعارات
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('لم يتم منح صلاحيات الإشعارات')
    return null
  }

  // الحصول على Token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'YOUR_EXPO_PROJECT_ID', // من app.json
  })

  return token.data // مثال: ExponentPushToken[...]
}
```

### الخطوة 2: إرسال Device Token إلى Backend

```javascript
// بعد تسجيل المستخدم / تسجيل الدخول
async function sendDeviceTokenToBackend(fcmToken, jwtToken) {
  try {
    const response = await fetch(
      'https://your-api.com/api/v1/notifications/device-token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`, // ✅ JWT Token من تسجيل الدخول
        },
        body: JSON.stringify({
          token: fcmToken,
          platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Device Token تم تسجيله بنجاح:', data.deviceToken.id)
      return true
    } else {
      console.error('❌ خطأ:', data.error)
      return false
    }
  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error)
    return false
  }
}

// استخدام في App.js
useEffect(() => {
  ;(async () => {
    const token = await registerForPushNotificationsAsync()
    if (token && userJwtToken) {
      await sendDeviceTokenToBackend(token, userJwtToken)
    }
  })()
}, [userJwtToken])
```

### الخطوة 3: استقبال الإشعارات (Notification Handler)

```javascript
import * as Notifications from 'expo-notifications'

// تكوين سلوك الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // ✅ عرض الإشعار حتى لو التطبيق مفتوح
    shouldPlaySound: true,      // ✅ تشغيل صوت
    shouldSetBadge: true,       // ✅ عرض badge على الأيقونة
  }),
})

// معالج الإشعارات المستقبلة
Notifications.addNotificationReceivedListener((notification) => {
  console.log('📨 إشعار مستقبل:', notification)
  console.log('العنوان:', notification.request.content.title)
  console.log('الرسالة:', notification.request.content.body)
  console.log('البيانات الإضافية:', notification.request.content.data)
})

// معالج الضغط على الإشعار
Notifications.addNotificationResponseReceivedListener((response) => {
  const { title, body, data } = response.notification.request.content

  console.log('👆 تم الضغط على الإشعار')
  console.log('العنوان:', title)
  console.log('الرسالة:', body)

  // ✅ التعامل مع Deep Linking
  if (data?.linkUrl) {
    navigation.navigate('OrderDetails', { orderId: data.orderId })
  }
})
```

---

## 📨 API Endpoints الرئيسية

### 1. تسجيل Device Token

**Endpoint:** `POST /api/v1/notifications/device-token`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "ExponentPushToken[abc123...]",
  "platform": "ANDROID" // أو "IOS"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "deviceToken": {
    "id": "cuid123",
    "platform": "ANDROID",
    "isActive": true
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid request data"
}
```

---

### 2. إلغاء تسجيل Device Token

**Endpoint:** `DELETE /api/v1/notifications/device-token`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "ExponentPushToken[abc123...]"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Device token unregistered successfully"
}
```

---

### 3. قائمة Device Tokens للمستخدم

**Endpoint:** `GET /api/v1/notifications/device-token`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response (200 OK):**
```json
{
  "success": true,
  "deviceTokens": [
    {
      "id": "cuid123",
      "token": "ExponentPushToken[abc123...]",
      "platform": "ANDROID",
      "isActive": true,
      "createdAt": "2024-05-06T10:30:00Z",
      "updatedAt": "2024-05-06T10:30:00Z"
    },
    {
      "id": "cuid456",
      "token": "ExponentPushToken[def456...]",
      "platform": "IOS",
      "isActive": true,
      "createdAt": "2024-05-05T14:20:00Z",
      "updatedAt": "2024-05-05T14:20:00Z"
    }
  ],
  "count": 2
}
```

---

### 4. الحصول على الإشعارات

**Endpoint:** `GET /api/v1/notifications`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Query Parameters:**
```
?limit=20        // عدد الإشعارات (default: 20)
?offset=0        // الإزاحة (default: 0)
?isRead=false    // تصفية حسب حالة القراءة (optional)
```

**Response (200 OK):**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif123",
      "type": "ORDER_UPDATE",
      "title": "تحديث الطلب",
      "message": "تم تأكيد طلبك وسيتم إرساله قريباً",
      "linkUrl": "/orders/order123",
      "imageUrl": "https://...",
      "data": {
        "orderId": "order123",
        "status": "CONFIRMED"
      },
      "isSent": true,
      "isRead": false,
      "createdAt": "2024-05-06T10:30:00Z"
    }
  ],
  "count": 5,
  "unreadCount": 3
}
```

---

### 5. تحديد إشعار كمقروء

**Endpoint:** `POST /api/v1/notifications/mark-as-read`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "notificationId": "notif123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### 6. تحديد جميع الإشعارات كمقروءة

**Endpoint:** `POST /api/v1/notifications/mark-all-as-read`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

---

## 🎯 استقبال الإشعارات

### معالج الإشعارات الكامل

```javascript
import React, { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { useNavigation } from '@react-navigation/native'

export function NotificationManager() {
  const navigation = useNavigation()

  useEffect(() => {
    // =========================================
    // 1️⃣ معالج الإشعارات المستقبلة
    // =========================================
    const subscription1 = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content

        console.log('📨 إشعار جديد:')
        console.log('- العنوان:', title)
        console.log('- الرسالة:', body)
        console.log('- البيانات:', data)

        // ✅ يمكن إضافة منطق إضافي هنا
        // مثل تحديث الواجهة أو تحديث البيانات
      }
    )

    // =========================================
    // 2️⃣ معالج الضغط على الإشعار
    // =========================================
    const subscription2 = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { title, body, data } = response.notification.request.content

        console.log('👆 تم الضغط على الإشعار')

        // ✅ Deep Linking حسب نوع الإشعار
        if (data?.orderId) {
          navigation.navigate('OrderDetails', {
            orderId: data.orderId,
            status: data.status,
          })
        } else if (data?.requestId) {
          navigation.navigate('RequestDetails', {
            requestId: data.requestId,
          })
        } else if (data?.linkUrl) {
          navigation.navigate(data.linkUrl)
        }
      }
    )

    // =========================================
    // 3️⃣ تنظيف الـ Listeners
    // =========================================
    return () => {
      subscription1.remove()
      subscription2.remove()
    }
  }, [navigation])

  return null // هذا المكون لا يعرض أي شيء
}

// الاستخدام في App.js
export default function App() {
  return (
    <>
      <NotificationManager />
      {/* بقية التطبيق */}
    </>
  )
}
```

---

## 💻 أمثلة عملية

### مثال 1: تطبيق كامل مع تسجيل Notifications

```javascript
// NotificationService.js
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'

class NotificationService {
  // تسجيل للإشعارات
  static async registerForPushNotifications(jwtToken) {
    try {
      // التحقق من الجهاز
      if (!Device.isDevice) {
        console.warn('يجب تشغيل على جهاز فعلي')
        return false
      }

      // طلب الصلاحيات
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') {
        console.warn('لم يتم منح الصلاحيات')
        return false
      }

      // الحصول على Token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'YOUR_EXPO_PROJECT_ID',
      })

      const fcmToken = token.data

      // إرسال إلى Backend
      const response = await fetch(
        'https://api.tawreed.com/api/v1/notifications/device-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({
            token: fcmToken,
            platform: Device.osName === 'iOS' ? 'IOS' : 'ANDROID',
          }),
        }
      )

      if (response.ok) {
        // حفظ Token محلياً
        await AsyncStorage.setItem('fcmToken', fcmToken)
        console.log('✅ تم تسجيل Device Token بنجاح')
        return true
      } else {
        console.error('❌ فشل تسجيل Device Token')
        return false
      }
    } catch (error) {
      console.error('❌ خطأ في التسجيل:', error)
      return false
    }
  }

  // إلغاء التسجيل
  static async unregisterFromPushNotifications(jwtToken) {
    try {
      const fcmToken = await AsyncStorage.getItem('fcmToken')
      if (!fcmToken) return true

      const response = await fetch(
        'https://api.tawreed.com/api/v1/notifications/device-token',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ token: fcmToken }),
        }
      )

      if (response.ok) {
        await AsyncStorage.removeItem('fcmToken')
        console.log('✅ تم إلغاء التسجيل')
        return true
      }
      return false
    } catch (error) {
      console.error('❌ خطأ في الإلغاء:', error)
      return false
    }
  }

  // جلب الإشعارات
  static async fetchNotifications(jwtToken, limit = 20) {
    try {
      const response = await fetch(
        `https://api.tawreed.com/api/v1/notifications?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        return data.notifications
      }
      return []
    } catch (error) {
      console.error('❌ خطأ في جلب الإشعارات:', error)
      return []
    }
  }

  // تحديد إشعار كمقروء
  static async markAsRead(jwtToken, notificationId) {
    try {
      const response = await fetch(
        'https://api.tawreed.com/api/v1/notifications/mark-as-read',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ notificationId }),
        }
      )

      return response.ok
    } catch (error) {
      console.error('❌ خطأ في تحديث الإشعار:', error)
      return false
    }
  }
}

export default NotificationService
```

### مثال 2: Hook للإشعارات

```javascript
// useNotifications.js
import { useState, useEffect, useCallback } from 'react'
import NotificationService from './NotificationService'

export function useNotifications(jwtToken) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // جلب الإشعارات
  const fetchNotifications = useCallback(async () => {
    if (!jwtToken) return

    setLoading(true)
    try {
      const notifs = await NotificationService.fetchNotifications(jwtToken)
      setNotifications(notifs)

      // حساب عدد الإشعارات غير المقروءة
      const unread = notifs.filter((n) => !n.isRead).length
      setUnreadCount(unread)
    } finally {
      setLoading(false)
    }
  }, [jwtToken])

  // تحديد الإشعار كمقروء
  const markAsRead = useCallback(
    async (notificationId) => {
      const success = await NotificationService.markAsRead(jwtToken, notificationId)
      if (success) {
        // تحديث الحالة محلياً
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
      return success
    },
    [jwtToken]
  )

  // جلب الإشعارات عند تغيير JWT Token
  useEffect(() => {
    fetchNotifications()

    // تحديث الإشعارات كل 30 ثانية
    const interval = setInterval(fetchNotifications, 30000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
  }
}

// الاستخدام
function NotificationsScreen({ jwtToken }) {
  const { notifications, unreadCount, markAsRead } = useNotifications(jwtToken)

  return (
    <View>
      <Text>الإشعارات ({unreadCount})</Text>
      {notifications.map((notification) => (
        <TouchableOpacity
          key={notification.id}
          onPress={() => markAsRead(notification.id)}
        >
          <Text style={{ fontWeight: notification.isRead ? '400' : '700' }}>
            {notification.title}
          </Text>
          <Text>{notification.message}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
```

### مثال 3: Badge Counter (عداد الإشعارات)

```javascript
// BadgeCounter.js
import * as Notifications from 'expo-notifications'
import { useNotifications } from './useNotifications'

export function NotificationBadge({ jwtToken }) {
  const { unreadCount } = useNotifications(jwtToken)

  useEffect(() => {
    // تحديث Badge على أيقونة التطبيق
    if (unreadCount > 0) {
      Notifications.setBadgeCountAsync(unreadCount)
    } else {
      Notifications.setBadgeCountAsync(0)
    }
  }, [unreadCount])

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{unreadCount}</Text>
    </View>
  )
}
```

---

## 🧪 اختبار الإشعارات

### الخطوة 1: التحقق من تسجيل Device Token

```bash
# استخدام Postman أو curl

curl -X GET https://api.tawreed.com/api/v1/notifications/device-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# يجب أن تحصل على:
# {
#   "success": true,
#   "deviceTokens": [
#     {
#       "id": "...",
#       "token": "ExponentPushToken[...]",
#       "platform": "ANDROID",
#       "isActive": true
#     }
#   ]
# }
```

### الخطوة 2: إرسال إشعار تجريبي (من Backend)

```javascript
// في أي Server Action أو API Route

import { sendPushToUser } from '@/lib/push-notifications'
import { NotificationType } from '@prisma/client'
import { db } from '@/lib/db'

export async function testPushNotification(userId: string) {
  // إنشاء إشعار في قاعدة البيانات
  const notification = await db.notification.create({
    data: {
      userId,
      type: NotificationType.SYSTEM,
      title: '🧪 اختبار الإشعارات',
      message: 'هذا إشعار تجريبي لاختبار النظام',
      isSent: false,
    },
  })

  // إرسال Push Notification
  const result = await sendPushToUser(userId, {
    title: 'اختبار الإشعارات',
    body: 'هذا إشعار تجريبي',
    data: {
      notificationId: notification.id,
    },
  })

  return result
}
```

### الخطوة 3: المراقبة والتصحيح

```javascript
// في React Native

import * as Notifications from 'expo-notifications'

// لتصحيح المشاكل
async function debugNotifications() {
  // التحقق من الصلاحيات
  const permissions = await Notifications.getPermissionsAsync()
  console.log('الصلاحيات:', permissions)

  // الحصول على الـ Token
  const token = await Notifications.getExpoPushTokenAsync()
  console.log('Expo Push Token:', token.data)

  // الحصول على Firebase Token
  const fcmToken = await messaging().getToken()
  console.log('FCM Token:', fcmToken)

  // قائمة جميع الإشعارات المجدولة
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  console.log('الإشعارات المجدولة:', scheduled)
}
```

---

## 🐛 معالجة الأخطاء

### أخطاء شائعة وحلولها

| الخطأ | السبب | الحل |
|------|------|-----|
| `Invalid device token` | Device Token غير صحيح أو منتهي | إعادة تسجيل الجهاز |
| `Unauthorized` | JWT Token ناقص أو منتهي الصلاحية | تحديث Token |
| `Firebase not configured` | متغيرات البيئة ناقصة | إضافة Firebase credentials |
| `Permission denied` | لم يتم منح صلاحيات الإشعارات | طلب الصلاحيات من المستخدم |
| `No active device tokens` | المستخدم لم يسجل أي جهاز | تسجيل جهاز جديد |

### معالج الأخطاء الشامل

```javascript
// ErrorHandler.js
class NotificationErrorHandler {
  static handleError(error, context = '') {
    console.error(`❌ خطأ في الإشعارات (${context}):`, error)

    // تصنيف الخطأ
    if (error.message.includes('Unauthorized')) {
      // Token ناقص أو منتهي
      return {
        code: 'UNAUTHORIZED',
        message: 'تحقق من صحة JWT Token',
        userMessage: 'يرجى تسجيل الدخول مجددًا',
      }
    }

    if (error.message.includes('Invalid device token')) {
      // Device Token غير صحيح
      return {
        code: 'INVALID_TOKEN',
        message: 'Device Token غير صحيح',
        userMessage: 'يرجى إعادة تشغيل التطبيق',
        action: 'retry_registration',
      }
    }

    if (error.message.includes('Firebase')) {
      // مشكلة في Firebase
      return {
        code: 'FIREBASE_ERROR',
        message: 'خطأ في خدمة الإشعارات',
        userMessage: 'حاول مجددًا لاحقًا',
        action: 'retry_later',
      }
    }

    if (error.message.includes('Permission')) {
      // صلاحيات غير مسموحة
      return {
        code: 'PERMISSION_DENIED',
        message: 'لم يتم منح صلاحيات الإشعارات',
        userMessage: 'يرجى السماح بالإشعارات في الإعدادات',
        action: 'open_settings',
      }
    }

    // خطأ عام
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: 'حدث خطأ. يرجى المحاولة مجددًا',
      action: 'retry',
    }
  }

  static async retry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        console.log(`🔄 إعادة المحاولة ${i + 1}/${maxRetries}`)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }
}

export default NotificationErrorHandler
```

---

## ✅ Best Practices

### 1. إدارة الأجهزة المتعددة

```javascript
// المستخدم قد يملك عدة أجهزة
// احذر من:
// ❌ حفظ Token واحد فقط
// ✅ دعم أجهزة متعددة

async function handleMultiDeviceLogout(jwtToken) {
  // الحصول على جميع الأجهزة
  const devices = await fetch(
    'https://api.tawreed.com/api/v1/notifications/device-token',
    { headers: { 'Authorization': `Bearer ${jwtToken}` } }
  ).then((r) => r.json())

  // إلغاء تسجيل كل الأجهزة
  for (const device of devices.deviceTokens) {
    await fetch(
      'https://api.tawreed.com/api/v1/notifications/device-token',
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: device.token }),
      }
    )
  }
}
```

### 2. الحفظ والاستعادة

```javascript
// حفظ Token محلياً للوصول السريع
import AsyncStorage from '@react-native-async-storage/async-storage'

async function saveDeviceToken(token) {
  await AsyncStorage.setItem('deviceToken', token)
}

async function getDeviceToken() {
  return await AsyncStorage.getItem('deviceToken')
}

// استعادة عند تشغيل التطبيق
useEffect(() => {
  ;(async () => {
    const token = await getDeviceToken()
    if (token) {
      console.log('✅ تم استعادة Device Token')
    }
  })()
}, [])
```

### 3. منع التكرار

```javascript
// تجنب تسجيل نفس Token مرات متعددة
let registrationInProgress = false

async function registerDeviceTokenOnce(jwtToken) {
  if (registrationInProgress) {
    console.log('⏳ التسجيل قيد التقدم...')
    return
  }

  registrationInProgress = true
  try {
    const token = await getExpoPushTokenAsync()
    await sendToBackend(token, jwtToken)
  } finally {
    registrationInProgress = false
  }
}
```

### 4. المراقبة والـ Logging

```javascript
// تتبع الإشعارات لأغراض التصحيح
const logNotification = (type, data) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${type}:`, data)

  // يمكن إرسال السجلات إلى خدمة تحليلات
  // analytics.logEvent(type, data)
}

// الاستخدام
addNotificationReceivedListener((notification) => {
  logNotification('NOTIFICATION_RECEIVED', {
    title: notification.request.content.title,
    timestamp: new Date(),
  })
})
```

### 5. اختبر على جهاز حقيقي

```
❌ لا تختبر على المحاكي
✅ استخدم جهاز حقيقي دائماً

الأسباب:
- المحاكي قد لا يدعم FCM بشكل كامل
- الإشعارات قد لا تصل على المحاكي
- السلوك قد يختلف عن الجهاز الحقيقي
```

### 6. اختبر عدم الاتصال

```javascript
// اختبر السلوك عند عدم وجود اتصال بالإنترنت
function testOfflineMode() {
  // عطّل الإنترنت في جهازك
  // المتوقع: أن يحفظ التطبيق البيانات محليًا
  // عند العودة للإنترنت: يتم مزامنة البيانات

  // ✅ استخدم Redux أو Zustand للـ Offline-first state
}
```

---

## 📞 جدول المراجعة (Checklist)

### قبل الإرسال للـ Frontend Developer

- [ ] ✅ ملف `.env` يحتوي على Firebase credentials
- [ ] ✅ قاعدة البيانات تحتوي على جداول `DeviceToken` و `Notification`
- [ ] ✅ API Endpoints كلها تعمل وتم اختبارها
- [ ] ✅ Server Actions `sendPushToUser()` وغيرها جاهزة
- [ ] ✅ معالجة الأخطاء موجودة
- [ ] ✅ Firebase مُهيّأ وعامل بشكل صحيح

### للـ Frontend Developer قبل الإرسال للمستخدم

- [ ] ✅ تثبيت `expo-notifications` و `expo-device`
- [ ] ✅ طلب الصلاحيات من المستخدم
- [ ] ✅ الحصول على FCM Token وتسجيله
- [ ] ✅ معالجات الإشعارات المستقبلة
- [ ] ✅ معالج الضغط على الإشعار (Deep Linking)
- [ ] ✅ عرض عداد الإشعارات (Badge)
- [ ] ✅ شاشة الإشعارات
- [ ] ✅ اختبار على جهاز حقيقي

---

## 📚 موارد إضافية

### التوثيق الرسمي
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/messaging/usage)

### أفضل الممارسات
- تجنب إرسال الكثير من الإشعارات (Notification Fatigue)
- استخدم Rich Notifications (صور وأزرار)
- اختبر التوقيت المناسب للإرسال
- راقب معدل الفتح والضغط

---

## 📧 الدعم والمساعدة

في حالة المشاكل:

1. **تحقق من السجلات (Logs)** في console
2. **استخدم Firebase Console** للتحقق من الأجهزة المسجلة
3. **اختبر API مباشرة** باستخدام Postman
4. **راجع قسم معالجة الأخطاء** في هذا الملف
5. **تواصل مع فريق Backend** إذا استمرت المشكلة

---

**آخر تحديث:** 6 مايو 2026 | **الإصدار:** 1.0
