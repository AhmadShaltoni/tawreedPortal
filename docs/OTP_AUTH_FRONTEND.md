# 📱 نظام التحقق بالـ OTP - دليل مطور الفرونت اند

> دليل شامل لدمج نظام التحقق عبر WhatsApp/SMS في تطبيق React Native
>
> **آخر تحديث:** 2 يونيو 2026  
> **الإصدار:** 1.0  
> **الحالة:** ✅ جاهز للاستخدام

---

## 📑 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [مسار التحقق الكامل](#مسار-التحقق-الكامل)
3. [API Endpoints](#api-endpoints)
4. [حالات الـ OTP](#حالات-الـ-otp)
5. [منطق التوقيت في الفرونت](#منطق-التوقيت-في-الفرونت)
6. [متى يظهر خيار SMS؟](#متى-يظهر-خيار-sms)
7. [معالجة الأخطاء](#معالجة-الأخطاء)
8. [قواعد إعادة المحاولة](#قواعد-إعادة-المحاولة)
9. [حالات الـ UI المتوقعة](#حالات-الـ-ui-المتوقعة)
10. [مثال تكامل React Native كامل](#مثال-تكامل-react-native-كامل)
11. [أمثلة API كاملة](#أمثلة-api-كاملة)
12. [الأسئلة الشائعة](#الأسئلة-الشائعة)

---

## 🔍 نظرة عامة

### كيف يعمل النظام؟

```
┌─────────────────────────────────────────────────────────────┐
│                    مسار التحقق                               │
│                                                             │
│  📱 المستخدم يدخل رقم الهاتف                                │
│       ↓                                                     │
│  📤 الخادم يرسل OTP عبر WhatsApp أولاً                      │
│       ↓                                                     │
│  ✅ WhatsApp نجح → انتظر التحقق                              │
│  ❌ WhatsApp فشل فوراً → إرسال تلقائي عبر SMS                │
│       ↓                                                     │
│  ⏰ بعد 3 دقائق بدون تحقق → اعرض زر "إرسال SMS"            │
│       ↓                                                     │
│  📱 المستخدم يدخل الرمز (6 أرقام)                            │
│       ↓                                                     │
│  ✅ تم التحقق → حصول على JWT Token                           │
└─────────────────────────────────────────────────────────────┘
```

### المعلومات الأساسية

| المعلومة | القيمة |
|----------|--------|
| **مدة صلاحية الرمز** | 5 دقائق |
| **وقت انتظار خيار SMS** | 3 دقائق |
| **أقصى محاولات تحقق** | 5 محاولات |
| **أقصى طلبات إرسال** | 5 طلبات / 15 دقيقة |
| **الانتظار بين الطلبات** | 60 ثانية |
| **طول رمز التحقق** | 6 أرقام |
| **صيغة رقم الهاتف** | `07XXXXXXXX` (أردني) |

---

## 🔄 مسار التحقق الكامل

### المسار السعيد (Happy Path) ✅

```
الخطوة 1: إرسال OTP
═════════════════════
المستخدم → يدخل رقم الهاتف → يضغط "إرسال رمز التحقق"
التطبيق → POST /api/v1/auth/send-otp { phone: "0791234567" }
الخادم → يرسل عبر WhatsApp → { success: true, channel: "whatsapp" }
التطبيق → يعرض شاشة إدخال الرمز + عداد تنازلي

الخطوة 2: إدخال الرمز
═════════════════════
المستخدم → يستلم الرمز على WhatsApp → يدخله في التطبيق
التطبيق → POST /api/v1/auth/verify-otp { phone: "0791234567", code: "123456" }
الخادم → يتحقق → { success: true, token: "eyJ...", user: {...} }
التطبيق → يحفظ الـ Token → ينتقل للصفحة الرئيسية
```

### مسار الـ SMS التلقائي (WhatsApp فشل) 📲

```
الخطوة 1: إرسال OTP
═════════════════════
المستخدم → يدخل رقم الهاتف → يضغط "إرسال"
التطبيق → POST /api/v1/auth/send-otp { phone: "0791234567" }
الخادم → WhatsApp فشل → يرسل SMS تلقائياً
الخادم → { success: true, channel: "sms" }  ← لاحظ channel = sms
التطبيق → يعرض "تم إرسال رسالة نصية" بدلاً من "واتساب"

الخطوة 2: مثل المسار السعيد...
```

### مسار الـ SMS اليدوي (بعد 3 دقائق) ⏰

```
الخطوة 1: إرسال عبر WhatsApp
═════════════════════════════
التطبيق → POST /api/v1/auth/send-otp { phone: "0791234567" }
الخادم → { success: true, channel: "whatsapp", smsFallbackAllowedAt: "..." }

الخطوة 2: المستخدم لم يتحقق خلال 3 دقائق
══════════════════════════════════════════
التطبيق → يظهر زر "لم يصلك الرمز؟ إرسال SMS"
المستخدم → يضغط الزر
التطبيق → POST /api/v1/auth/resend-sms-otp { phone: "0791234567" }
الخادم → { success: true, channel: "sms" }

الخطوة 3: التحقق عبر SMS
═══════════════════════════
المستخدم → يستلم SMS → يدخل الرمز
التطبيق → POST /api/v1/auth/verify-otp { phone: "0791234567", code: "654321" }
الخادم → { success: true, token: "..." }
```

---

## 🔌 API Endpoints

### Base URL

```
Production: https://your-domain.com/api/v1/auth
Development: http://localhost:3000/api/v1/auth
```

---

### 1️⃣ POST `/auth/send-otp` — إرسال رمز التحقق

**الغرض:** إرسال رمز OTP (WhatsApp أولاً، SMS كبديل تلقائي)

**Request:**
```json
{
  "phone": "0791234567"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "channel": "whatsapp",
  "message": "تم إرسال رمز التحقق عبر واتساب",
  "expiresAt": "2026-06-02T12:05:00.000Z",
  "smsFallbackAllowedAt": "2026-06-02T12:03:00.000Z"
}
```

**Success Response - SMS Fallback (200):**
```json
{
  "success": true,
  "channel": "sms",
  "message": "تم إرسال رمز التحقق عبر رسالة نصية",
  "expiresAt": "2026-06-02T12:05:00.000Z",
  "smsFallbackAllowedAt": "2026-06-02T12:03:00.000Z"
}
```

**Error Responses:**

| Status | الحالة | Response |
|--------|--------|----------|
| 400 | رقم غير صالح | `{ "success": false, "error": "رقم الهاتف غير صالح. يجب أن يكون رقم أردني (07XXXXXXXX)" }` |
| 429 | تم تجاوز الحد | `{ "success": false, "error": "تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار 15 دقيقة" }` |
| 429 | انتظار بين الطلبات | `{ "success": false, "error": "يرجى الانتظار 45 ثانية قبل إعادة المحاولة" }` |
| 503 | فشل الإرسال | `{ "success": false, "error": "فشل في إرسال رمز التحقق. يرجى المحاولة لاحقاً" }` |

---

### 2️⃣ POST `/auth/verify-otp` — التحقق من الرمز

**الغرض:** التحقق من رمز OTP + تسجيل الدخول/إنشاء حساب

**Request:**
```json
{
  "phone": "0791234567",
  "code": "123456",
  "deviceToken": "fcm_token_here",
  "platform": "ios"
}
```

> **ملاحظة:** `deviceToken` و `platform` اختياريان (لتسجيل الإشعارات)

**Success Response - مستخدم موجود (200):**
```json
{
  "success": true,
  "message": "تم التحقق بنجاح",
  "token": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwi...",
  "user": {
    "id": "cm3abc123",
    "phone": "0791234567",
    "username": "أحمد محل البركة",
    "role": "BUYER",
    "storeName": "محل البركة",
    "isNewUser": false
  }
}
```

**Success Response - مستخدم جديد (200):**
```json
{
  "success": true,
  "message": "تم التحقق بنجاح",
  "token": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwi...",
  "user": {
    "id": "cm3xyz789",
    "phone": "0791234567",
    "username": "0791234567",
    "role": "BUYER",
    "storeName": null,
    "isNewUser": true
  }
}
```

> **هام:** إذا كان `isNewUser: true`، انقل المستخدم لصفحة إكمال الملف الشخصي.

**Error Responses:**

| Status | الحالة | Response |
|--------|--------|----------|
| 400 | بيانات ناقصة | `{ "success": false, "error": "رقم الهاتف ورمز التحقق مطلوبان" }` |
| 400 | صيغة خاطئة | `{ "success": false, "error": "رمز التحقق يجب أن يكون 6 أرقام" }` |
| 400 | لا يوجد جلسة | `{ "success": false, "error": "لا يوجد رمز تحقق نشط لهذا الرقم. أعد إرسال الرمز" }` |
| 400 | منتهي | `{ "success": false, "error": "انتهت صلاحية رمز التحقق. أعد إرسال الرمز" }` |
| 400 | رمز خاطئ | `{ "success": false, "error": "رمز التحقق غير صحيح. المحاولات المتبقية: 4" }` |
| 403 | حساب معطل | `{ "success": false, "error": "الحساب معطل. تواصل مع الدعم" }` |
| 429 | تجاوز المحاولات | `{ "success": false, "error": "تم تجاوز الحد الأقصى لمحاولات التحقق. أعد إرسال الرمز" }` |

---

### 3️⃣ POST `/auth/resend-sms-otp` — إعادة إرسال عبر SMS

**الغرض:** إرسال رمز جديد عبر SMS (بعد فشل WhatsApp أو انتظار 3 دقائق)

**Request:**
```json
{
  "phone": "0791234567"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "channel": "sms",
  "message": "تم إرسال رمز التحقق عبر رسالة نصية",
  "expiresAt": "2026-06-02T12:10:00.000Z",
  "smsFallbackAllowedAt": "2026-06-02T12:05:00.000Z"
}
```

**Error Responses:**

| Status | الحالة | Response |
|--------|--------|----------|
| 400 | لا يوجد جلسة | `{ "success": false, "error": "لا يوجد رمز تحقق نشط. أعد إرسال الرمز من البداية" }` |
| 400 | لم يمر 3 دقائق | `{ "success": false, "error": "يرجى الانتظار 120 ثانية قبل طلب رسالة نصية" }` |
| 429 | تجاوز الحد | `{ "success": false, "error": "تم تجاوز الحد الأقصى للمحاولات..." }` |
| 503 | فشل الإرسال | `{ "success": false, "error": "فشل في إرسال الرسالة النصية. يرجى المحاولة لاحقاً" }` |

---

### 4️⃣ GET `/auth/otp-status?phone=07XXXXXXXX` — حالة الجلسة

**الغرض:** معرفة حالة OTP الحالية (للاستعلام الدوري)

**Request:**
```
GET /api/v1/auth/otp-status?phone=0791234567
```

**Success Response (200):**
```json
{
  "success": true,
  "phone": "+962791234567",
  "status": "pending",
  "channel": "whatsapp",
  "sentAt": "2026-06-02T12:00:00.000Z",
  "expiresAt": "2026-06-02T12:05:00.000Z",
  "remainingSeconds": 180,
  "smsFallbackAllowed": false,
  "smsFallbackAllowedAt": "2026-06-02T12:03:00.000Z",
  "attempts": 0,
  "maxAttempts": 5
}
```

**بعد 3 دقائق:**
```json
{
  "success": true,
  "phone": "+962791234567",
  "status": "pending",
  "channel": "whatsapp",
  "sentAt": "2026-06-02T12:00:00.000Z",
  "expiresAt": "2026-06-02T12:05:00.000Z",
  "remainingSeconds": 120,
  "smsFallbackAllowed": true,
  "smsFallbackAllowedAt": "2026-06-02T12:03:00.000Z",
  "attempts": 1,
  "maxAttempts": 5
}
```

**Error Responses:**

| Status | الحالة | Response |
|--------|--------|----------|
| 400 | رقم غير صالح | `{ "success": false, "error": "رقم الهاتف غير صالح" }` |
| 400 | منتهي | `{ "success": false, "error": "انتهت صلاحية رمز التحقق" }` |
| 404 | لا يوجد جلسة | `{ "success": false, "error": "لا يوجد رمز تحقق نشط لهذا الرقم" }` |

---

## 📊 حالات الـ OTP

### قيم الـ Status

| القيمة | المعنى | الإجراء في التطبيق |
|--------|--------|---------------------|
| `pending` | تم الإرسال، بانتظار التحقق | اعرض شاشة إدخال الرمز |
| `verified` | تم التحقق بنجاح | انتقل للصفحة التالية |
| `expired` | انتهت الصلاحية (5 دقائق) | اعرض "إعادة إرسال" |
| `failed` | فشل الإرسال | اعرض رسالة خطأ + إعادة محاولة |
| `max_attempts` | تجاوز المحاولات (5 محاولات) | اعرض "إعادة إرسال رمز جديد" |

### قيم الـ Channel

| القيمة | المعنى | الأيقونة المقترحة |
|--------|--------|-------------------|
| `whatsapp` | تم الإرسال عبر واتساب | 💬 أيقونة واتساب |
| `sms` | تم الإرسال عبر رسالة نصية | 📱 أيقونة رسالة |

---

## ⏱️ منطق التوقيت في الفرونت

### الخط الزمني

```
T+0:00  ─── إرسال OTP عبر WhatsApp
  │
  │ ← شاشة إدخال الرمز + عداد تنازلي 5:00
  │ ← لا تعرض زر SMS بعد
  │
T+1:00  ─── دقيقة 1: "تحقق من WhatsApp"
  │
T+2:00  ─── دقيقة 2: "تحقق من WhatsApp"
  │
T+3:00  ─── 🔔 اعرض زر "لم يصلك الرمز؟ إرسال SMS"
  │         (smsFallbackAllowed = true)
  │
T+4:00  ─── لا يزال الرمز صالح
  │
T+5:00  ─── ⚠️ انتهت صلاحية الرمز
              اعرض "إعادة إرسال"
```

### كيف تحسب الأوقات في الفرونت؟

```javascript
// عند استلام response من send-otp
const { expiresAt, smsFallbackAllowedAt } = response

// حساب الوقت المتبقي
const now = new Date()
const expiry = new Date(expiresAt)
const smsAllowed = new Date(smsFallbackAllowedAt)

// العداد التنازلي (بالثواني)
const remainingSeconds = Math.max(0, Math.floor((expiry - now) / 1000))

// هل يمكن طلب SMS؟
const canRequestSms = now >= smsAllowed

// متى يمكن طلب SMS (عداد تنازلي ثانوي)
const smsWaitSeconds = Math.max(0, Math.floor((smsAllowed - now) / 1000))
```

### مثال عملي للعدادات

```javascript
import { useState, useEffect, useRef } from 'react'

function useOtpTimers(expiresAt, smsFallbackAllowedAt) {
  const [remainingSeconds, setRemainingSeconds] = useState(300)
  const [smsFallbackAllowed, setSmsFallbackAllowed] = useState(false)
  const [smsWaitSeconds, setSmsWaitSeconds] = useState(180)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!expiresAt) return

    const expiry = new Date(expiresAt).getTime()
    const smsAllowed = new Date(smsFallbackAllowedAt).getTime()

    intervalRef.current = setInterval(() => {
      const now = Date.now()

      // عداد انتهاء OTP
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
      setRemainingSeconds(remaining)

      // هل يمكن طلب SMS؟
      const canSms = now >= smsAllowed
      setSmsFallbackAllowed(canSms)

      // عداد SMS
      const smsWait = Math.max(0, Math.floor((smsAllowed - now) / 1000))
      setSmsWaitSeconds(smsWait)

      // إيقاف العداد عند الانتهاء
      if (remaining <= 0) {
        clearInterval(intervalRef.current)
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [expiresAt, smsFallbackAllowedAt])

  return { remainingSeconds, smsFallbackAllowed, smsWaitSeconds }
}
```

---

## 📲 متى يظهر خيار SMS؟

### القواعد

| الحالة | هل يظهر زر SMS؟ | السبب |
|--------|-----------------|-------|
| أول إرسال ناجح عبر WhatsApp | ❌ لا | انتظر 3 دقائق |
| مرور أقل من 3 دقائق | ❌ لا | لا يزال مبكراً |
| مرور 3 دقائق بدون تحقق | ✅ نعم | `smsFallbackAllowed: true` |
| أول إرسال عبر SMS (fallback تلقائي) | ❌ لا | تم استخدام SMS بالفعل |
| بعد إرسال SMS | ❌ لا | لا حاجة لإعادة الإرسال فوراً |

### كيف تعرف متى تعرض الزر؟

```javascript
// الطريقة 1: استخدم العداد المحلي (الأفضل)
const showSmsButton = smsFallbackAllowed && channel === 'whatsapp'

// الطريقة 2: استعلام من الخادم (اختياري)
// GET /api/v1/auth/otp-status?phone=07...
// → response.smsFallbackAllowed === true
```

### شجرة القرار

```
هل الـ channel هو "whatsapp"؟
├── نعم → هل مرت 3 دقائق؟
│          ├── نعم → ✅ اعرض زر SMS
│          └── لا  → ❌ لا تعرض (اعرض عداد تنازلي)
│
└── لا (sms) → ❌ لا تعرض زر SMS (تم الإرسال بالفعل عبر SMS)
```

---

## 🚨 معالجة الأخطاء

### جدول الأخطاء والإجراءات

| الخطأ | الإجراء في التطبيق |
|-------|---------------------|
| `رقم الهاتف غير صالح` | أظهر رسالة + ركّز على حقل الرقم |
| `يرجى الانتظار X ثانية` | أظهر عداد + عطّل الزر |
| `تم تجاوز الحد الأقصى` | أظهر شاشة "حاول لاحقاً" + عداد |
| `فشل في إرسال رمز التحقق` | أظهر "حاول مجدداً" + زر إعادة |
| `رمز التحقق غير صحيح` | هز حقل الإدخال + أظهر المحاولات المتبقية |
| `انتهت صلاحية رمز التحقق` | أظهر زر "إعادة إرسال" |
| `تم تجاوز محاولات التحقق` | أظهر زر "إرسال رمز جديد" |
| `لا يوجد رمز تحقق نشط` | ارجع لشاشة إدخال الرقم |
| `الحساب معطل` | أظهر "تواصل مع الدعم" |

### مثال معالجة الأخطاء

```javascript
function handleOtpError(error, statusCode) {
  switch (statusCode) {
    case 400:
      if (error.includes('غير صالح')) {
        // مشكلة في البيانات المدخلة
        showInputError(error)
      } else if (error.includes('انتهت صلاحية')) {
        // الرمز انتهى
        showExpiredState()
      } else if (error.includes('غير صحيح')) {
        // رمز خاطئ
        shakeInput()
        showRemainingAttempts(error)
      } else if (error.includes('لا يوجد رمز')) {
        // لا جلسة - ارجع للبداية
        navigateToPhoneInput()
      }
      break

    case 403:
      // حساب معطل
      showBlockedAccountScreen()
      break

    case 429:
      // تجاوز الحد
      if (error.includes('ثانية')) {
        startCooldownTimer(extractSeconds(error))
      } else {
        showRateLimitScreen()
      }
      break

    case 503:
      // الخدمة غير متاحة
      showRetryScreen()
      break

    default:
      showGenericError()
  }
}
```

---

## 🔁 قواعد إعادة المحاولة

### متى يمكن إعادة إرسال OTP؟

| السيناريو | مسموح؟ | الشرط |
|-----------|--------|-------|
| بعد 60 ثانية من آخر إرسال | ✅ | يجب انتظار 60 ثانية |
| أقل من 60 ثانية | ❌ | خطأ 429 |
| بعد 5 طلبات في 15 دقيقة | ❌ | انتظر 15 دقيقة |
| بعد انتهاء الصلاحية (5 دقائق) | ✅ | أعد إرسال |
| بعد تجاوز محاولات التحقق | ✅ | أعد إرسال رمز جديد |

### عداد إعادة الإرسال

```javascript
function useResendTimer() {
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)

  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => {
      setResendTimer(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendTimer])

  const resetResendTimer = () => {
    setCanResend(false)
    setResendTimer(60)
  }

  return { canResend, resendTimer, resetResendTimer }
}
```

---

## 🎨 حالات الـ UI المتوقعة

### الشاشة 1: إدخال رقم الهاتف

```
┌──────────────────────────────────────┐
│                                      │
│         🔐 تسجيل الدخول              │
│                                      │
│  أدخل رقم هاتفك الأردني              │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  07 __ ___ ____              │    │
│  └──────────────────────────────┘    │
│                                      │
│  سيتم إرسال رمز التحقق عبر واتساب    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │      إرسال رمز التحقق        │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### الشاشة 2: إدخال رمز التحقق (WhatsApp)

```
┌──────────────────────────────────────┐
│                                      │
│    💬 تحقق من رسائل واتساب           │
│                                      │
│    تم إرسال رمز إلى 079****567       │
│                                      │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│    │  │ │  │ │  │ │  │ │  │ │  │    │
│    └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│                                      │
│    ⏰ ينتهي الرمز خلال: 4:32          │
│                                      │
│    إعادة إرسال (بعد 45 ثانية)         │
│                                      │
│    ← بعد 3 دقائق يظهر: →             │
│    لم يصلك الرمز؟ [إرسال SMS]         │
│                                      │
└──────────────────────────────────────┘
```

### الشاشة 3: بعد 3 دقائق (SMS متاح)

```
┌──────────────────────────────────────┐
│                                      │
│    💬 تحقق من رسائل واتساب           │
│                                      │
│    تم إرسال رمز إلى 079****567       │
│                                      │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│    │  │ │  │ │  │ │  │ │  │ │  │    │
│    └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│                                      │
│    ⏰ ينتهي الرمز خلال: 1:32          │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 📱 لم يصلك الرمز؟ إرسال SMS  │    │
│  └──────────────────────────────┘    │
│                                      │
│  قد لا يكون واتساب متاحاً حالياً     │
│                                      │
└──────────────────────────────────────┘
```

### الشاشة 4: رمز خاطئ

```
┌──────────────────────────────────────┐
│                                      │
│    ❌ رمز غير صحيح                    │
│                                      │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│    │ 1│ │ 2│ │ 3│ │ 4│ │ 5│ │ 6│    │
│    └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│         ↑ حقول حمراء (shake) ↑        │
│                                      │
│    المحاولات المتبقية: 3              │
│    ⏰ ينتهي الرمز خلال: 3:15          │
│                                      │
└──────────────────────────────────────┘
```

### الشاشة 5: انتهت الصلاحية

```
┌──────────────────────────────────────┐
│                                      │
│    ⏰ انتهت صلاحية الرمز              │
│                                      │
│    الرمز لم يعد صالحاً                │
│                                      │
│  ┌──────────────────────────────┐    │
│  │    إعادة إرسال رمز جديد       │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │    تغيير رقم الهاتف           │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### الشاشة 6: تجاوز الحد

```
┌──────────────────────────────────────┐
│                                      │
│    🚫 تم تجاوز الحد                   │
│                                      │
│    لقد أرسلت طلبات كثيرة              │
│    يرجى الانتظار قبل المحاولة         │
│                                      │
│    ⏰ حاول بعد: 12:30 دقيقة           │
│                                      │
└──────────────────────────────────────┘
```

---

## 💻 مثال تكامل React Native كامل

### الملف الرئيسي: `OtpAuthScreen.tsx`

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Keyboard,
} from 'react-native'

const API_BASE = 'https://your-domain.com/api/v1/auth'

// ═══════════════════════════════════════════════════
// الشاشة الرئيسية: إدخال رقم الهاتف
// ═══════════════════════════════════════════════════
export function PhoneInputScreen({ navigation }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = async () => {
    // تنظيف الرقم
    const cleanPhone = phone.replace(/[\s\-]/g, '')

    // فحص محلي سريع
    if (!cleanPhone.match(/^07[789]\d{7}$/)) {
      setError('أدخل رقم أردني صحيح (مثال: 0791234567)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      })

      const data = await response.json()

      if (data.success) {
        // انتقل لشاشة إدخال الرمز
        navigation.navigate('OtpVerify', {
          phone: cleanPhone,
          channel: data.channel,
          expiresAt: data.expiresAt,
          smsFallbackAllowedAt: data.smsFallbackAllowedAt,
        })
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('خطأ في الاتصال. تحقق من الإنترنت')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <Text style={styles.subtitle}>أدخل رقم هاتفك الأردني</Text>

      <TextInput
        style={[styles.phoneInput, error && styles.inputError]}
        placeholder="07XXXXXXXX"
        keyboardType="phone-pad"
        maxLength={10}
        value={phone}
        onChangeText={(text) => {
          setPhone(text)
          setError('')
        }}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.hint}>
        سيتم إرسال رمز التحقق عبر واتساب
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>إرسال رمز التحقق</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ═══════════════════════════════════════════════════
// شاشة إدخال رمز التحقق
// ═══════════════════════════════════════════════════
export function OtpVerifyScreen({ route, navigation }) {
  const { phone, channel, expiresAt, smsFallbackAllowedAt } = route.params

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentChannel, setCurrentChannel] = useState(channel)

  // عدادات
  const [remainingSeconds, setRemainingSeconds] = useState(300)
  const [smsFallbackAllowed, setSmsFallbackAllowed] = useState(false)
  const [smsWaitSeconds, setSmsWaitSeconds] = useState(180)
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [isExpired, setIsExpired] = useState(false)

  // مراجع لحقول الإدخال
  const inputRefs = useRef([])
  const shakeAnim = useRef(new Animated.Value(0)).current

  // ─── عداد تنازلي ───
  useEffect(() => {
    const expiry = new Date(expiresAt).getTime()
    const smsAllowed = new Date(smsFallbackAllowedAt).getTime()

    const interval = setInterval(() => {
      const now = Date.now()

      // عداد OTP
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
      setRemainingSeconds(remaining)

      if (remaining <= 0) {
        setIsExpired(true)
        clearInterval(interval)
        return
      }

      // عداد SMS
      const canSms = now >= smsAllowed
      setSmsFallbackAllowed(canSms)
      setSmsWaitSeconds(Math.max(0, Math.floor((smsAllowed - now) / 1000)))
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, smsFallbackAllowedAt])

  // ─── عداد إعادة الإرسال ───
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => {
      setResendTimer(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendTimer])

  // ─── إدخال الرمز ───
  const handleCodeInput = (text, index) => {
    const newCode = [...code]
    newCode[index] = text
    setCode(newCode)
    setError('')

    // انتقال تلقائي للحقل التالي
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // تحقق تلقائي عند إكمال 6 أرقام
    if (index === 5 && text) {
      const fullCode = newCode.join('')
      if (fullCode.length === 6) {
        Keyboard.dismiss()
        handleVerify(fullCode)
      }
    }
  }

  const handleBackspace = (index) => {
    if (index > 0 && !code[index]) {
      const newCode = [...code]
      newCode[index - 1] = ''
      setCode(newCode)
      inputRefs.current[index - 1]?.focus()
    }
  }

  // ─── التحقق ───
  const handleVerify = async (otpCode) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: otpCode,
          // deviceToken: await getDeviceToken(), // اختياري
          // platform: Platform.OS,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // حفظ الـ Token
        await saveToken(data.token)

        if (data.user.isNewUser) {
          // مستخدم جديد → أكمل الملف الشخصي
          navigation.replace('CompleteProfile', { user: data.user })
        } else {
          // مستخدم موجود → الصفحة الرئيسية
          navigation.replace('Home')
        }
      } else {
        setError(data.error)
        shakeInputs()

        // إذا انتهت الصلاحية أو تجاوز المحاولات
        if (data.error.includes('انتهت') || data.error.includes('تجاوز الحد')) {
          setIsExpired(true)
        }
      }
    } catch (err) {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  // ─── إعادة إرسال SMS ───
  const handleResendSms = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/resend-sms-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (data.success) {
        setCurrentChannel('sms')
        setCode(['', '', '', '', '', ''])
        setResendTimer(60)
        setCanResend(false)
        setIsExpired(false)

        // تحديث العدادات
        const newExpiry = new Date(data.expiresAt).getTime()
        const remaining = Math.floor((newExpiry - Date.now()) / 1000)
        setRemainingSeconds(remaining)
        setSmsFallbackAllowed(false)

        Alert.alert('✅', 'تم إرسال رمز جديد عبر SMS')
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  // ─── إعادة إرسال (نفس القناة) ───
  const handleResend = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (data.success) {
        setCurrentChannel(data.channel)
        setCode(['', '', '', '', '', ''])
        setResendTimer(60)
        setCanResend(false)
        setIsExpired(false)

        const newExpiry = new Date(data.expiresAt).getTime()
        setRemainingSeconds(Math.floor((newExpiry - Date.now()) / 1000))

        const smsAllowed = new Date(data.smsFallbackAllowedAt).getTime()
        setSmsWaitSeconds(Math.floor((smsAllowed - Date.now()) / 1000))
        setSmsFallbackAllowed(false)

        Alert.alert('✅', data.message)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  // ─── أنيميشن الاهتزاز ───
  const shakeInputs = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }

  // ─── تنسيق الوقت ───
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // ─── إخفاء جزء من الرقم ───
  const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')

  // ═══ الـ UI ═══
  if (isExpired) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>⏰ انتهت صلاحية الرمز</Text>
        <Text style={styles.subtitle}>الرمز لم يعد صالحاً</Text>

        <TouchableOpacity style={styles.button} onPress={handleResend}>
          <Text style={styles.buttonText}>إعادة إرسال رمز جديد</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>تغيير رقم الهاتف</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* العنوان حسب القناة */}
      <Text style={styles.title}>
        {currentChannel === 'whatsapp' ? '💬 تحقق من واتساب' : '📱 تحقق من الرسائل'}
      </Text>
      <Text style={styles.subtitle}>
        تم إرسال رمز إلى {maskedPhone}
      </Text>

      {/* حقول إدخال الرمز */}
      <Animated.View
        style={[styles.codeContainer, { transform: [{ translateX: shakeAnim }] }]}
      >
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[styles.codeInput, error && styles.codeInputError]}
            value={digit}
            onChangeText={(text) => handleCodeInput(text.slice(-1), index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace') handleBackspace(index)
            }}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </Animated.View>

      {/* رسالة الخطأ */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* العداد التنازلي */}
      <Text style={styles.timer}>
        ⏰ ينتهي الرمز خلال: {formatTime(remainingSeconds)}
      </Text>

      {/* زر إعادة الإرسال */}
      {canResend ? (
        <TouchableOpacity onPress={handleResend} disabled={loading}>
          <Text style={styles.resendLink}>إعادة إرسال الرمز</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.resendDisabled}>
          إعادة إرسال بعد {resendTimer} ثانية
        </Text>
      )}

      {/* زر SMS - يظهر بعد 3 دقائق فقط إذا القناة واتساب */}
      {currentChannel === 'whatsapp' && smsFallbackAllowed && (
        <TouchableOpacity
          style={styles.smsButton}
          onPress={handleResendSms}
          disabled={loading}
        >
          <Text style={styles.smsButtonText}>
            📱 لم يصلك الرمز؟ إرسال SMS
          </Text>
        </TouchableOpacity>
      )}

      {/* عداد SMS (قبل أن يصبح متاح) */}
      {currentChannel === 'whatsapp' && !smsFallbackAllowed && smsWaitSeconds > 0 && (
        <Text style={styles.smsWaitText}>
          خيار SMS متاح بعد {formatTime(smsWaitSeconds)}
        </Text>
      )}

      {/* زر التحقق (اختياري - يمكن الاعتماد على التحقق التلقائي) */}
      {loading && (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
      )}

      {/* زر الرجوع */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← تغيير الرقم</Text>
      </TouchableOpacity>
    </View>
  )
}

// ═══════════════════════════════════════════════════
// دالة حفظ الـ Token (مثال)
// ═══════════════════════════════════════════════════
async function saveToken(token) {
  // استخدم AsyncStorage أو SecureStore
  // مثال مع expo-secure-store:
  // await SecureStore.setItemAsync('auth_token', token)
  
  // أو AsyncStorage:
  // await AsyncStorage.setItem('auth_token', token)
  console.log('Token saved:', token.slice(0, 20) + '...')
}

// ═══════════════════════════════════════════════════
// الـ Styles
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    backgroundColor: '#f9fafb',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  hint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
  },
  codeInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  timer: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  },
  resendLink: {
    textAlign: 'center',
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  smsButton: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignItems: 'center',
  },
  smsButtonText: {
    color: '#0369a1',
    fontSize: 15,
    fontWeight: '600',
  },
  smsWaitText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 16,
  },
  backButton: {
    marginTop: 32,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
})
```

---

## 📋 أمثلة API كاملة

### cURL Examples

#### إرسال OTP
```bash
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "0791234567"}'
```

#### التحقق من الرمز
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "0791234567", "code": "123456"}'
```

#### إعادة إرسال SMS
```bash
curl -X POST http://localhost:3000/api/v1/auth/resend-sms-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "0791234567"}'
```

#### التحقق من الحالة
```bash
curl "http://localhost:3000/api/v1/auth/otp-status?phone=0791234567"
```

---

### Postman Collection (Import as JSON)

```json
{
  "info": {
    "name": "Tawreed OTP Auth",
    "description": "OTP Authentication API for Tawreed Mobile App",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api/v1/auth"
    },
    {
      "key": "phone",
      "value": "0791234567"
    }
  ],
  "item": [
    {
      "name": "1. Send OTP",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"phone\": \"{{phone}}\"}"
        },
        "url": "{{base_url}}/send-otp"
      }
    },
    {
      "name": "2. Check OTP Status",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/otp-status?phone={{phone}}"
      }
    },
    {
      "name": "3. Verify OTP",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"phone\": \"{{phone}}\", \"code\": \"123456\"}"
        },
        "url": "{{base_url}}/verify-otp"
      }
    },
    {
      "name": "4. Resend via SMS",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"phone\": \"{{phone}}\"}"
        },
        "url": "{{base_url}}/resend-sms-otp"
      }
    }
  ]
}
```

---

## ❓ الأسئلة الشائعة

### س: ماذا لو المستخدم جديد (ليس لديه حساب)؟

**ج:** النظام ينشئ حساباً تلقائياً عند أول تحقق ناجح. تعرف ذلك من `isNewUser: true` في الاستجابة. وجّه المستخدم لصفحة إكمال الملف الشخصي.

```javascript
if (data.user.isNewUser) {
  navigation.replace('CompleteProfile')
} else {
  navigation.replace('Home')
}
```

---

### س: كيف أحفظ الـ Token بشكل آمن؟

**ج:** استخدم `expo-secure-store` أو `react-native-keychain`:

```javascript
// expo-secure-store (مفضل)
import * as SecureStore from 'expo-secure-store'
await SecureStore.setItemAsync('auth_token', token)

// للقراءة
const token = await SecureStore.getItemAsync('auth_token')
```

---

### س: كيف أعرف أن الـ Token انتهى؟

**ج:** عند استدعاء أي API، إذا حصلت على `401`:

```javascript
// في interceptor
if (response.status === 401) {
  // الـ Token انتهى → ارجع لشاشة تسجيل الدخول
  await SecureStore.deleteItemAsync('auth_token')
  navigation.reset({ routes: [{ name: 'Login' }] })
}
```

---

### س: ماذا لو المستخدم ليس على الإنترنت؟

**ج:** 
- إذا لم يكن هناك إنترنت، سيفشل `send-otp` وتعرض رسالة "تحقق من الاتصال"
- إذا أرسل OTP عبر WhatsApp ثم فقد الإنترنت، الرمز يصله عبر WhatsApp (يحتاج إنترنت لقراءته)
- بعد 3 دقائق، يظهر خيار SMS الذي لا يحتاج إنترنت

---

### س: هل يمكن استخدام أي رقم في وضع التطوير؟

**ج:** نعم! في وضع التطوير (`OTP_DEV_MODE=true`):
- أي رقم أردني مقبول
- لا يتم إرسال OTP فعلي
- الرمز الثابت هو: `123456`
- مفيد لتجربة الـ UI بدون Twilio

---

### س: ما الفرق بين "إعادة إرسال" و "إرسال SMS"؟

**ج:**

| الزر | الـ Endpoint | السلوك |
|------|-------------|--------|
| إعادة إرسال | `POST /send-otp` | يرسل رمز جديد عبر WhatsApp (أو SMS تلقائياً) |
| إرسال SMS | `POST /resend-sms-otp` | يرسل عبر SMS حصراً (بعد 3 دقائق) |

---

### س: متى يظهر كل زر؟

```
T+0   → لا أزرار (انتظر 60 ثانية)
T+60  → يظهر "إعادة إرسال"
T+180 → يظهر "إرسال SMS" (إذا channel=whatsapp)
T+300 → شاشة "انتهت الصلاحية" + "إعادة إرسال"
```

---

### س: كيف أتعامل مع خطأ 429 (Rate Limit)؟

**ج:** استخرج عدد الثواني من الرسالة واعرض عداداً:

```javascript
if (statusCode === 429) {
  // الرسالة: "يرجى الانتظار 45 ثانية..."
  const seconds = parseInt(error.match(/\d+/)?.[0] || '60')
  startCooldown(seconds)
}
```

---

### س: هل يدعم النظام أكثر من جهاز؟

**ج:** نعم. عند التحقق، أرسل `deviceToken` لتسجيل الجهاز للإشعارات:

```json
{
  "phone": "0791234567",
  "code": "123456",
  "deviceToken": "fcm_token_xxx",
  "platform": "android"
}
```

---

## 🔧 وضع التطوير (Development Mode)

### التفعيل

في ملف `.env`:
```env
OTP_DEV_MODE=true
```

### السلوك في وضع التطوير

| الميزة | الإنتاج | التطوير |
|--------|---------|---------|
| إرسال OTP | عبر Twilio | محاكاة (لا إرسال) |
| رمز التحقق | عشوائي من Twilio | ثابت: `123456` |
| Twilio credentials | مطلوبة | غير مطلوبة |
| Rate limiting | مفعل | مفعل |
| الـ Logs | مختصرة | مفصلة |

### اختبار كامل بدون Twilio

```bash
# 1. شغّل الخادم بوضع التطوير
OTP_DEV_MODE=true npm run dev

# 2. أرسل OTP
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "0791234567"}'

# 3. تحقق بالرمز الثابت
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "0791234567", "code": "123456"}'
```

---

## 📄 ملف .env المطلوب

```env
# ═══════════════════════════════════════
# OTP Authentication Configuration
# ═══════════════════════════════════════

# Twilio Credentials (required for production)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Development Mode (set to 'true' for local testing without Twilio)
OTP_DEV_MODE=true

# Existing variables (already in your .env)
# DATABASE_URL=postgresql://...
# AUTH_SECRET=your-secret-key
```

### إعداد Twilio

1. أنشئ حساب على [twilio.com](https://www.twilio.com)
2. فعّل خدمة **Verify** من الـ Console
3. أنشئ Verify Service جديد
4. فعّل قنوات: **SMS** + **WhatsApp**
5. لـ WhatsApp: سجّل رقمك في [Twilio WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn) أو اطلب Business Profile
6. انسخ الـ credentials إلى `.env`

---

## 📊 مخطط المسار الكامل (Sequence Diagram)

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Mobile  │         │  Server  │         │  Twilio  │
│   App    │         │  (API)   │         │ Verify   │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                     │                     │
     │  POST /send-otp     │                     │
     │  {phone}            │                     │
     │────────────────────>│                     │
     │                     │                     │
     │                     │  Send WhatsApp OTP  │
     │                     │────────────────────>│
     │                     │                     │
     │                     │  ✅ Accepted        │
     │                     │<────────────────────│
     │                     │                     │
     │  {channel: whatsapp}│                     │
     │<────────────────────│                     │
     │                     │                     │
     │  ... user receives OTP on WhatsApp ...    │
     │                     │                     │
     │  POST /verify-otp   │                     │
     │  {phone, code}      │                     │
     │────────────────────>│                     │
     │                     │  Check code         │
     │                     │────────────────────>│
     │                     │                     │
     │                     │  ✅ Approved        │
     │                     │<────────────────────│
     │                     │                     │
     │  {token, user}      │                     │
     │<────────────────────│                     │
     │                     │                     │

--- OR (WhatsApp Failed) ---

     │  POST /send-otp     │                     │
     │────────────────────>│                     │
     │                     │  Send WhatsApp OTP  │
     │                     │────────────────────>│
     │                     │  ❌ Failed          │
     │                     │<────────────────────│
     │                     │                     │
     │                     │  Send SMS OTP       │
     │                     │────────────────────>│
     │                     │  ✅ Accepted        │
     │                     │<────────────────────│
     │                     │                     │
     │  {channel: sms}     │                     │
     │<────────────────────│                     │
     │                     │                     │

--- OR (3 minutes timeout) ---

     │  POST /send-otp     │                     │
     │────────────────────>│                     │
     │  {channel: whatsapp}│                     │
     │<────────────────────│                     │
     │                     │                     │
     │  ... 3 minutes pass without verify ...    │
     │                     │                     │
     │  POST /resend-sms   │                     │
     │────────────────────>│                     │
     │                     │  Send SMS OTP       │
     │                     │────────────────────>│
     │                     │  ✅ Accepted        │
     │                     │<────────────────────│
     │                     │                     │
     │  {channel: sms}     │                     │
     │<────────────────────│                     │
```

---

## ✅ ملخص التكامل السريع

1. **شاشة الرقم:** اجمع رقم الهاتف → `POST /send-otp`
2. **شاشة الرمز:** اعرض 6 حقول → `POST /verify-otp`
3. **عداد OTP:** 5 دقائق تنازلي من `expiresAt`
4. **عداد SMS:** 3 دقائق من `smsFallbackAllowedAt`
5. **زر SMS:** يظهر فقط إذا `channel === 'whatsapp'` + مرت 3 دقائق
6. **إعادة إرسال:** بعد 60 ثانية → `POST /send-otp`
7. **SMS يدوي:** بعد 3 دقائق → `POST /resend-sms-otp`
8. **Token:** احفظه في SecureStore واستخدمه في `Authorization: Bearer`

---

**آخر تحديث:** 2 يونيو 2026  
**المسؤول:** Backend Team  
**للأسئلة:** راجع `lib/otp/` للكود المصدري
