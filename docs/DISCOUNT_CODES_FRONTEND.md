# 📋 نظام أكواد الخصم (Discount Codes) - دليل شامل

> دليل تفصيلي شامل لفهم واستخدام نظام أكواد الخصم في تطبيق توريد الموبايل
> 
> **إعداد:** لمبرمجي الفرونت اند  
> **آخر تحديث:** 14 أبريل 2026

---

## 📑 جدول المحتويات

1. [البنية الأساسية](#البنية-الأساسية)
2. [أنواع أكواد الخصم](#أنواع-أكواد-الخصم)
3. [السيناريوهات والحالات](#السيناريوهات-والحالات)
4. [API Endpoints](#api-endpoints)
5. [رسائل الخطأ](#رسائل-الخطأ)
6. [أمثلة عملية](#أمثلة-عملية)
7. [الملاحظات الأمنية](#الملاحظات-الأمنية)

---

## 🏗️ البنية الأساسية

### نموذج قاعدة البيانات

```prisma
model DiscountCode {
  id              String    @id @default(cuid())
  
  // المعرّف الفريد
  code            String    @unique   // مثال: ISTIKLAL2026, SBA50
  
  // الخصم
  discountPercent Float              // مثال: 15 (يعني 15%)
  
  // قواعد الاستخدام
  isSingleUse     Boolean   @default(false)  // مرة واحدة فقط لكل مستخدم؟
  maxUsage        Int?               // الحد الأقصى للاستخدام من الجميع (null = غير محدود)
  minOrderAmount  Float?             // الحد الأدنى لقيمة الطلب (د.أ)
  
  // نطاق الصلاحية
  startDate       DateTime?          // متى يصبح الكود فعال
  endDate         DateTime?          // متى ينتهي الكود
  
  // الحالة
  isActive        Boolean   @default(true)  // مفعل أم معطل؟
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  usages          DiscountCodeUsage[]
}

model DiscountCodeUsage {
  id              String    @id @default(cuid())
  
  // المبالغ
  discountAmount  Float              // المبلغ المخصوم (د.أ)
  orderTotal      Float              // قيمة الطلب قبل الخصم
  
  // العلاقات
  discountCodeId  String
  userId          String
  orderId         String?
  
  createdAt       DateTime  @default(now())
}
```

### شرح الحقول الأساسية

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|-----|
| `code` | String | الكود الفريد (يُخزن بأحرف كبيرة) | `WELCOME20` |
| `discountPercent` | Float | نسبة الخصم من 0 إلى 100 | `15` = 15% |
| `isSingleUse` | Boolean | هل يمكن للمستخدم استخدامه مرة واحدة فقط؟ | `true` أو `false` |
| `maxUsage` | Int? | الحد الأقصى للاستخدام الكلي (null = بدون حد) | `100` أو `null` |
| `minOrderAmount` | Float? | الحد الأدنى لقيمة الطلب (null = بدون حد) | `50` أو `null` |
| `startDate` | DateTime? | بداية صلاحية الكود (null = فوري) | `2026-04-01T00:00:00Z` |
| `endDate` | DateTime? | نهاية صلاحية الكود (null = بدون نهاية) | `2026-12-31T23:59:59Z` |
| `isActive` | Boolean | هل الكود مفعل؟ | `true` أو `false` |

---

## 🎯 أنواع أكواد الخصم

### 1️⃣ **كود مرة واحدة فقط** (Single Use)

#### التعريف والخصائص
- يمكن لكل مستخدم استخدام هذا الكود **مرة واحدة فقط** في حياته
- بعد استخدامه، لن يتمكن من استخدامه مرة أخرى
- لكن مستخدمون آخرون يمكنهم استخدامه عدة مرات (غير محدود)
- مفيد للعروض الترويجية الموجهة للمستخدمين الجدد

#### مثال الكود

```json
{
  "code": "WELCOME2026",
  "discountPercent": 20,
  "isSingleUse": true,
  "maxUsage": null,
  "minOrderAmount": 50,
  "startDate": "2026-04-01T00:00:00Z",
  "endDate": "2026-12-31T23:59:59Z",
  "isActive": true
}
```

#### السيناريو الزمني

```
المستخدم أحمد:
┌────────────────────────────────────────────┐
│ المحاولة الأولى: 2026-05-10               │
│ ✅ النتيجة: نجح - خصم 20%                  │
│ يحصل على: 20 د.أ خصم                      │
├────────────────────────────────────────────┤
│ المحاولة الثانية: 2026-06-15              │
│ ❌ النتيجة: فشل                            │
│ رسالة الخطأ: "لقد استخدمت هذا الكود"      │
└────────────────────────────────────────────┘

في نفس الوقت، مستخدم آخر (فاطمة):
✅ يمكنها استخدام الكود (أول مرة لها)
✅ يمكنها استخدامه مرة أخرى إذا أرادت (تتلقى رسالة خطأ)
```

#### متى نستخدم هذا النوع؟
✅ أكواد الترحيب للمستخدمين الجدد  
✅ عروض لمرة واحدة  
✅ كوبونات التسجيل  

---

### 2️⃣ **كود متعدد الاستخدام** (Unlimited Use)

#### التعريف والخصائص
- يمكن لكل مستخدم استخدام هذا الكود **عدة مرات** بدون قيود
- لا توجد حدود على عدد مرات الاستخدام
- مفيد للأكواد الدائمة والشراكات

#### مثال الكود

```json
{
  "code": "PARTNER15",
  "discountPercent": 15,
  "isSingleUse": false,
  "maxUsage": null,
  "minOrderAmount": 100,
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": null,
  "isActive": true
}
```

#### السيناريو الزمني

```
نفس المستخدم (محمد):
┌────────────────────────────────────────────┐
│ الطلب الأول: 2026-02-10                   │
│ ✅ يستخدم الكود - خصم 15%                 │
├────────────────────────────────────────────┤
│ الطلب الثاني: 2026-03-15                  │
│ ✅ يستخدم الكود مجدداً - خصم 15%          │
├────────────────────────────────────────────┤
│ الطلب الثالث: 2026-04-20                  │
│ ✅ يستخدم الكود مجدداً - خصم 15%          │
├────────────────────────────────────────────┤
│ الطلب الرابع: 2026-05-25                  │
│ ✅ يستخدم الكود مجدداً - خصم 15%          │
│ ... (بدون حد)                             │
└────────────────────────────────────────────┘

سجل الاستخدام لمحمد:
1. 2026-02-10: 15 د.أ خصم ✅
2. 2026-03-15: 15 د.أ خصم ✅
3. 2026-04-20: 15 د.أ خصم ✅
4. 2026-05-25: 15 د.أ خصم ✅
Total saved: 60 د.أ
```

#### متى نستخدم هذا النوع؟
✅ أكواد الشراكاء الدائمة  
✅ أكواد الموزعين المفضلين  
✅ عروض مستمرة (مثل عضويات)  

---

### 3️⃣ **كود محدود بالعدد** (Limited Usage)

#### التعريف والخصائص
- الكود له حد أقصى **للاستخدام الكلي** من جميع المستخدمين
- بعد الوصول للحد الأقصى، لا أحد يستطيع استخدامه
- يمكن أن يكون مع أو بدون قيد `isSingleUse`
- مفيد للحملات الترويجية المحدودة

#### مثال الكود

```json
{
  "code": "LIMITED100",
  "discountPercent": 30,
  "isSingleUse": true,
  "maxUsage": 100,
  "minOrderAmount": 75,
  "startDate": "2026-04-01T00:00:00Z",
  "endDate": "2026-04-10T23:59:59Z",
  "isActive": true
}
```

#### السيناريو الزمني

```
عدد الاستخدامات المتبقية: 100
┌─────────────────────────────────────────┐
│ المستخدم رقم 1: USE (1/100 متبقي)     │
│ ✅ نجح - خصم 30%                        │
├─────────────────────────────────────────┤
│ المستخدم رقم 2: USE (2/100 متبقي)     │
│ ✅ نجح - خصم 30%                        │
├─────────────────────────────────────────┤
│ ...                                     │
├─────────────────────────────────────────┤
│ المستخدم رقم 100: USE (100/100 متبقي) │
│ ✅ نجح - خصم 30%                        │
├─────────────────────────────────────────┤
│ المستخدم رقم 101: USE (0/100 متبقي)   │
│ ❌ فشل                                  │
│ رسالة الخطأ: "تم الوصول للحد الأقصى"   │
└─────────────────────────────────────────┘
```

#### متى نستخدم هذا النوع؟
✅ حملات موسمية محدودة  
✅ عروض بكميات محدودة  
✅ مسابقات ووسوم  

---

### 4️⃣ **كود معطل** (Inactive)

#### التعريف والخصائص
- الكود معطل بالكامل (`isActive: false`)
- جميع الشروط الأخرى لا تهم
- لا يمكن استخدام الكود حتى لو استوفى جميع الشروط الأخرى

#### مثال الكود

```json
{
  "code": "ARCHIVED2025",
  "discountPercent": 50,
  "isSingleUse": false,
  "maxUsage": null,
  "minOrderAmount": null,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "isActive": false
}
```

#### السيناريو

```
أي محاولة لاستخدام هذا الكود:
┌──────────────────────────────────────┐
│ الطلب: { code: "ARCHIVED2025" }      │
│ ❌ النتيجة: فشل                      │
│ السبب: الكود معطل                    │
│ الرسالة: "كود الخصم غير مفعل"        │
└──────────────────────────────────────┘
```

---

## 📊 السيناريوهات والحالات

### السيناريو الأول: كود ترحيب للمستخدمين الجدد ✨

#### إعدادات الكود
```json
{
  "code": "WELCOME20",
  "discountPercent": 20,
  "isSingleUse": true,
  "maxUsage": null,
  "minOrderAmount": 50,
  "startDate": "2026-04-01T00:00:00Z",
  "endDate": "2026-04-30T23:59:59Z",
  "isActive": true
}
```

#### ✅ حالة النجاح: الشروط مستوفاة

```
الطلب من المحمول:
═══════════════════════════════════════
POST /api/v1/coupons/validate
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "code": "WELCOME20",
  "orderTotal": 100
}

الفحوصات التي تتم:
✅ الكود موجود؟ نعم ✓
✅ الكود مفعل؟ نعم ✓
✅ التاريخ: 2026-04-15 ✓ (بين 04-01 و 04-30)
✅ قيمة الطلب: 100 ✓ (أكبر من 50)
✅ أول مرة يستخدمه؟ نعم ✓

الرد الناجح:
═══════════════════════════════════════
HTTP 200 OK
Content-Type: application/json

{
  "valid": true,
  "discountPercent": 20,
  "discountAmount": 20,
  "finalTotal": 80,
  "code": "WELCOME20"
}

التطبيق يعرض:
┌──────────────────────────────────────┐
│ الخصم: 20%                           │
│ المبلغ المخصوم: 20 د.أ               │
│ الإجمالي النهائي: 80 د.أ             │
│ ✅ يمكن للمستخدم تأكيد الطلب          │
└──────────────────────────────────────┘
```

#### ❌ حالة الرفض 1: قيمة الطلب أقل من الحد الأدنى

```
الطلب من المحمول:
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "WELCOME20",
  "orderTotal": 30
}

الفحوصات:
✅ الكود موجود؟ نعم ✓
✅ الكود مفعل؟ نعم ✓
✅ التاريخ؟ نعم ✓
❌ قيمة الطلب: 30 < 50 ✗

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": false,
  "error": "ORDER_BELOW_MINIMUM",
  "message": "قيمة الطلب أقل من الحد الأدنى المطلوب (50 د.أ)"
}

التطبيق يعرض:
┌──────────────────────────────────────┐
│ ❌ الكود لا يصلح لهذا الطلب           │
│ أضف 20 د.أ أكثر من المنتجات          │
│ لاستخدام هذا الكود                   │
└──────────────────────────────────────┘
```

#### ❌ حالة الرفض 2: الكود منتهي الصلاحية

```
الطلب من المحمول (في 2026-05-01):
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "WELCOME20",
  "orderTotal": 100
}

الفحوصات:
✅ الكود موجود؟ نعم ✓
✅ الكود مفعل؟ نعم ✓
❌ التاريخ: 2026-05-01 > 2026-04-30 ✗

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": false,
  "error": "CODE_EXPIRED",
  "message": "كود الخصم منتهي الصلاحية"
}

التطبيق يعرض:
┌──────────────────────────────────────┐
│ ⏰ انتهت صلاحية هذا الكود             │
│ كان متاح حتى 30-04-2026               │
└──────────────────────────────────────┘
```

#### ❌ حالة الرفض 3: المستخدم استخدم الكود من قبل

```
الطلب من المحمول:
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "WELCOME20",
  "orderTotal": 100
}

السجل في قاعدة البيانات:
DiscountCodeUsage.findFirst({
  discountCodeId: "code_123",
  userId: "user_456"  ← موجود بالفعل!
})

الفحوصات:
✅ الكود موجود؟ نعم ✓
✅ الكود مفعل؟ نعم ✓
✅ التاريخ؟ نعم ✓
✅ قيمة الطلب؟ نعم ✓
❌ isSingleUse و المستخدم استخدمه؟ نعم ✗

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": false,
  "error": "CODE_ALREADY_USED",
  "message": "لقد استخدمت هذا الكود من قبل"
}

التطبيق يعرض:
┌──────────────────────────────────────┐
│ ⚠️ لقد استخدمت هذا الكود بالفعل      │
│ يمكنك استخدام كود آخر أو البحث       │
│ عن عروض أخرى متاحة                   │
└──────────────────────────────────────┘
```

#### ❌ حالة الرفض 4: الكود غير موجود

```
الطلب من المحمول:
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "INVALID123",
  "orderTotal": 100
}

الفحوصات:
❌ الكود موجود؟ لا ✗

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": false,
  "error": "CODE_NOT_FOUND",
  "message": "كود الخصم غير موجود"
}

التطبيق يعرض:
┌──────────────────────────────────────┐
│ ❌ كود غير صحيح                       │
│ تأكد من الكود وحاول مجدداً             │
└──────────────────────────────────────┘
```

---

### السيناريو الثاني: كود حملة موسمية محدودة 🎉

#### إعدادات الكود
```json
{
  "code": "SPRING2026",
  "discountPercent": 30,
  "isSingleUse": true,
  "maxUsage": 100,
  "minOrderAmount": 75,
  "startDate": "2026-04-01T00:00:00Z",
  "endDate": "2026-04-10T23:59:59Z",
  "isActive": true
}
```

#### ✅ حالة النجاح: عدد الاستخدامات متوفر (50/100)

```
عدد الاستخدامات المتبقية: 50

الطلب من المحمول:
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "SPRING2026",
  "orderTotal": 200
}

الفحوصات:
✅ الكود موجود؟ نعم ✓
✅ الكود مفعل؟ نعم ✓
✅ التاريخ؟ نعم ✓
✅ عدد الاستخدامات: 50 < 100 ✓
✅ أول مرة يستخدمه؟ نعم ✓
✅ قيمة الطلب: 200 > 75 ✓

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": true,
  "discountPercent": 30,
  "discountAmount": 60,
  "finalTotal": 140,
  "code": "SPRING2026"
}
```

#### ❌ حالة الرفض: انتهت الحملة (100/100)

```
عدد الاستخدامات: 100 (وصلنا الحد الأقصى)

الطلب من المحمول:
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "SPRING2026",
  "orderTotal": 200
}

الفحوصات:
✅ الكود موجود؟ نعم ✓
✅ الكود مفعل؟ نعم ✓
✅ التاريخ؟ نعم ✓
❌ عدد الاستخدامات: 100 >= 100 ✗

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": false,
  "error": "CODE_USAGE_LIMIT_REACHED",
  "message": "تم الوصول للحد الأقصى لاستخدام هذا الكود"
}

التطبيق يعرض:
┌──────────────────────────────────────┐
│ 😞 انتهى هذا الكود من الصلاحية       │
│ لقد تم استخدام جميع الكميات المتاحة   │
│ تفقد العروض الأخرى المتاحة حالياً    │
└──────────────────────────────────────┘
```

---

### السيناريو الثالث: كود دائم للشركاء 🤝

#### إعدادات الكود
```json
{
  "code": "PARTNER15",
  "discountPercent": 15,
  "isSingleUse": false,
  "maxUsage": null,
  "minOrderAmount": 200,
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": null,
  "isActive": true
}
```

#### ✅ الاستخدام الأول للمستخدم

```
الطلب:
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "PARTNER15",
  "orderTotal": 300
}

الفحوصات:
✅ جميع الشروط مستوفاة ✓

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": true,
  "discountPercent": 15,
  "discountAmount": 45,
  "finalTotal": 255,
  "code": "PARTNER15"
}
```

#### ✅ الاستخدام الثاني للمستخدم نفسه

```
الطلب (من نفس المستخدم):
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "PARTNER15",
  "orderTotal": 350
}

الفحوصات:
✅ الكود موجود؟ نعم ✓
✅ isSingleUse = false ✓ (يمكن إعادة الاستخدام)
✅ جميع الشروط الأخرى مستوفاة ✓

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": true,
  "discountPercent": 15,
  "discountAmount": 52.50,
  "finalTotal": 297.50,
  "code": "PARTNER15"
}

سجل الاستخدام للمستخدم:
┌──────────────────────────────────────┐
│ الاستخدام الأول:  45 د.أ خصم ✅     │
│ الاستخدام الثاني:  52.50 د.أ خصم ✅ │
│ الاستخدام الثالث:  ... (بدون حد)    │
└──────────────────────────────────────┘
```

---

### السيناريو الرابع: كود بتاريخ بداية في المستقبل ⏳

#### إعدادات الكود
```json
{
  "code": "FUTURE2026",
  "discountPercent": 25,
  "isSingleUse": true,
  "maxUsage": 50,
  "minOrderAmount": 60,
  "startDate": "2026-05-01T00:00:00Z",
  "endDate": "2026-05-31T23:59:59Z",
  "isActive": true
}
```

#### ❌ محاولة الاستخدام قبل البداية (في 2026-04-24)

```
الطلب من المحمول (قبل 7 أيام من البداية):
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "FUTURE2026",
  "orderTotal": 200
}

الفحوصات:
✅ الكود موجود؟ نعم ✓
✅ الكود مفعل؟ نعم ✓
❌ الآن (2026-04-24) < البداية (2026-05-01) ✗

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": false,
  "error": "CODE_NOT_STARTED",
  "message": "كود الخصم لم يبدأ بعد"
}

التطبيق يعرض:
┌──────────────────────────────────────┐
│ ⏰ هذا الكود سيكون متاح قريباً        │
│ بدء الصلاحية: 01-05-2026              │
│ ⏳ متبقي: 7 أيام                      │
│ نبهني عند البدء؟                      │
└──────────────────────────────────────┘
```

#### ✅ الاستخدام بعد بداية الكود (في 2026-05-05)

```
الطلب من المحمول (بعد 4 أيام من البداية):
═══════════════════════════════════════
POST /api/v1/coupons/validate

{
  "code": "FUTURE2026",
  "orderTotal": 200
}

الفحوصات:
✅ جميع الشروط مستوفاة الآن ✓

الرد:
═══════════════════════════════════════
HTTP 200 OK

{
  "valid": true,
  "discountPercent": 25,
  "discountAmount": 50,
  "finalTotal": 150,
  "code": "FUTURE2026"
}
```

---

## 🔌 API Endpoints

> **⚠️ تحديث مهم (14 أبريل 2026):**  
> تم دمج كود الخصم مباشرة في عملية إنشاء الطلب (`POST /api/v1/orders`).  
> لم يعد هناك حاجة لاستدعاء `/confirm` بشكل منفصل.  
> استخدم `/validate` فقط لمعاينة الخصم، ثم أرسل `couponCode` مع الطلب.

---

### 1. التحقق من صحة الكود (Validate) - للمعاينة فقط 👁️

**الغرض:** معاينة الخصم في صفحة السلة (بدون إنشاء سجل)

**الـ URL:**
```
POST /api/v1/coupons/validate
```

**Headers:**
```json
{
  "Authorization": "Bearer eyJhbGc...",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "code": "WELCOME20",
  "orderTotal": 100
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "discountPercent": 20,
  "discountAmount": 20,
  "finalTotal": 80,
  "code": "WELCOME20"
}
```

**Error Response (200):**
```json
{
  "valid": false,
  "error": "CODE_NOT_FOUND",
  "message": "كود الخصم غير موجود"
}
```

**ملاحظات مهمة:**
- ⚠️ هذا الـ endpoint **لا ينشئ** سجل استخدام في قاعدة البيانات
- ✅ استخدمه **فقط لمعاينة الخصم** في صفحة السلة قبل الدفع
- ✅ يمكن استدعاؤه عدة مرات (لا يؤثر على الأكواد)
- ❌ **لا تعتمد عليه لتسجيل الاستخدام** — يتم ذلك تلقائياً عند إنشاء الطلب

**مثال الاستدعاء من React Native:**
```javascript
async function validateCoupon(code, orderTotal) {
  try {
    const response = await fetch(
      'https://api.tawreed.jo/api/v1/coupons/validate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, orderTotal })
      }
    )
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Validation error:', error)
    return { valid: false, error: 'خطأ في الاتصال' }
  }
}
```

---

### 2. إنشاء الطلب مع كود الخصم (Create Order) 🛒 **[الأساسي]**

**الغرض:** إنشاء الطلب + التحقق من الكوبون + تسجيل الاستخدام = كل شي في عملية واحدة

**الـ URL:**
```
POST /api/v1/orders
```

**Headers:**
```json
{
  "Authorization": "Bearer eyJhbGc...",
  "Content-Type": "application/json"
}
```

**Request Body (بدون كوبون):**
```json
{
  "deliveryAddress": "شارع المدينة المنورة، عمان",
  "deliveryCity": "عمان",
  "buyerNotes": "يرجى التوصيل صباحاً"
}
```

**Request Body (مع كوبون):**
```json
{
  "deliveryAddress": "شارع المدينة المنورة، عمان",
  "deliveryCity": "عمان",
  "buyerNotes": "يرجى التوصيل صباحاً",
  "couponCode": "WELCOME20"
}
```

**Success Response - بدون كوبون (201):**
```json
{
  "order": {
    "id": "order_abc123",
    "orderNumber": "ORD-20260414-ABC1",
    "totalPrice": 100,
    "status": "PENDING",
    "items": [...]
  }
}
```

**Success Response - مع كوبون (201):**
```json
{
  "order": {
    "id": "order_abc123",
    "orderNumber": "ORD-20260414-ABC1",
    "totalPrice": 80,
    "status": "PENDING",
    "items": [...]
  },
  "coupon": {
    "code": "WELCOME20",
    "discountPercent": 20,
    "discountAmount": 20,
    "originalTotal": 100,
    "finalTotal": 80
  }
}
```

**Error Responses (400):**
```json
{ "error": "كود الخصم غير موجود" }
{ "error": "كود الخصم غير مفعل" }
{ "error": "كود الخصم لم يبدأ بعد" }
{ "error": "كود الخصم منتهي الصلاحية" }
{ "error": "تم الوصول للحد الأقصى لاستخدام هذا الكود" }
{ "error": "لقد استخدمت هذا الكود من قبل" }
{ "error": "قيمة الطلب أقل من الحد الأدنى المطلوب (50 د.أ)" }
```

**ملاحظات مهمة:**
- ✅ هذا الـ endpoint **يتحقق من الكوبون + ينشئ سجل الاستخدام + ينشئ الطلب** في transaction واحدة
- ✅ `couponCode` حقل **اختياري** — الطلب يعمل بدونه
- ✅ إذا فشل الكوبون، يُرفض الطلب بالكامل (لا يُنشأ طلب بدون خصم)
- ✅ `totalPrice` في الطلب = السعر النهائي **بعد الخصم**
- ✅ `coupon.originalTotal` = السعر الأصلي **قبل الخصم**

**مثال الاستدعاء:**
```javascript
async function createOrder(deliveryAddress, deliveryCity, buyerNotes, couponCode) {
  try {
    const body = {
      deliveryAddress,
      deliveryCity,
      buyerNotes,
    }

    // أضف الكوبون فقط إذا تم إدخاله
    if (couponCode) {
      body.couponCode = couponCode
    }

    const response = await fetch(
      'https://api.tawreed.jo/api/v1/orders',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )
    
    const data = await response.json()
    
    if (response.ok) {
      return {
        success: true,
        order: data.order,
        coupon: data.coupon || null,  // null إذا لم يُستخدم كوبون
      }
    } else {
      return { success: false, error: data.error }
    }
  } catch (error) {
    return { success: false, error: 'فشل في إنشاء الطلب' }
  }
}
```

---

### 3. تأكيد استخدام الكود (Confirm) - **[قديم / للتوافقية فقط]** 📝

> **⚠️ لم يعد ضرورياً!** سجل الاستخدام يُنشأ تلقائياً عند إنشاء الطلب.  
> هذا الـ endpoint موجود فقط للتوافقية مع النسخ القديمة.

**الـ URL:**
```
POST /api/v1/coupons/confirm
```

**Request Body:**
```json
{
  "code": "WELCOME20",
  "orderId": "order_abc123xyz",
  "orderTotal": 100
}
```

**Success Response (201):**
```json
{
  "success": true,
  "discountAmount": 20,
  "usageId": "usage_xyz789abc"
}
```

---

## 🚨 رسائل الخطأ

### جدول شامل لجميع رسائل الخطأ

| الكود | الرسالة العربية | المشكلة | الحل للمستخدم |
|-------|-----------------|--------|----------------|
| `CODE_NOT_FOUND` | كود الخصم غير موجود | الكود غير صحيح أو لم يُكتب بشكل صحيح | تحقق من الكود وحاول مجدداً |
| `CODE_INACTIVE` | كود الخصم غير مفعل | الإداري عطّل الكود | تواصل مع خدمة العملاء |
| `CODE_NOT_STARTED` | كود الخصم لم يبدأ بعد | الكود سيصبح متاح في تاريخ لاحق | انتظر تاريخ البداية |
| `CODE_EXPIRED` | كود الخصم منتهي الصلاحية | انتهت صلاحية الكود | جرب كوداً آخر متاح |
| `CODE_USAGE_LIMIT_REACHED` | تم الوصول للحد الأقصى | الكود لم يعد متاح (انتهت الكمية) | جرب كوداً آخر |
| `CODE_ALREADY_USED` | لقد استخدمت هذا الكود من قبل | المستخدم استخدم الكود مرة واحدة | جرب كوداً آخر |
| `ORDER_BELOW_MINIMUM` | قيمة الطلب أقل من الحد الأدنى | قيمة الطلب الحالية تحت الحد المطلوب | أضف مزيد من المنتجات |

### رسائل الخطأ المفصلة مع الأمثلة

#### ❌ CODE_NOT_FOUND
```
السيناريو: المستخدم أدخل كود خاطئ
رسالة الخطأ: "كود الخصم غير موجود"

ماذا يفعل التطبيق:
┌──────────────────────────────────────┐
│ ❌ كود غير صحيح                       │
│ تأكد من:                              │
│ • الكود كتاب بشكل صحيح               │
│ • لا توجد مسافات إضافية              │
│ • استخدم الأحرف الكبيرة فقط           │
│                                      │
│ [جرب مجدداً]  [عروض متاحة]            │
└──────────────────────────────────────┘
```

#### ❌ CODE_INACTIVE
```
السيناريو: الإداري عطّل الكود
رسالة الخطأ: "كود الخصم غير مفعل"

ماذا يفعل التطبيق:
┌──────────────────────────────────────┐
│ ⚠️ هذا الكود معطل حالياً              │
│                                      │
│ قد يعود قريباً أو قد تم إيقافه نهائياً │
│                                      │
│ [تصفح عروضاً أخرى]                   │
└──────────────────────────────────────┘
```

#### ❌ CODE_NOT_STARTED
```
السيناريو: الكود سيبدأ في المستقبل
رسالة الخطأ: "كود الخصم لم يبدأ بعد"

ماذا يفعل التطبيق:
┌──────────────────────────────────────┐
│ ⏳ هذا الكود سيكون متاح قريباً        │
│                                      │
│ بدء الصلاحية: 01-05-2026              │
│ متبقي: 7 أيام ⏰                      │
│                                      │
│ [نبهني عند البدء]  [عروض متاحة]        │
└──────────────────────────────────────┘
```

#### ❌ CODE_EXPIRED
```
السيناريو: انتهت صلاحية الكود
رسالة الخطأ: "كود الخصم منتهي الصلاحية"

ماذا يفعل التطبيق:
┌──────────────────────────────────────┐
│ 😞 انتهت صلاحية هذا الكود             │
│                                      │
│ كان متاح حتى: 30-04-2026              │
│ انتهى قبل: 5 أيام                    │
│                                      │
│ [عروض متاحة الآن]                     │
└──────────────────────────────────────┘
```

#### ❌ CODE_USAGE_LIMIT_REACHED
```
السيناريو: الكود انتهت كميته
رسالة الخطأ: "تم الوصول للحد الأقصى"

ماذا يفعل التطبيق:
┌──────────────────────────────────────┐
│ 🚫 انتهى هذا الكود من الصلاحية       │
│                                      │
│ تم استخدام جميع الكميات المتاحة       │
│ (100/100 استخدام)                   │
│                                      │
│ [عروض متاحة أخرى]                     │
└──────────────────────────────────────┘
```

#### ❌ CODE_ALREADY_USED
```
السيناريو: المستخدم استخدم الكود قبلاً (single-use)
رسالة الخطأ: "لقد استخدمت هذا الكود من قبل"

ماذا يفعل التطبيق:
┌──────────────────────────────────────┐
│ ⚠️ لقد استخدمت هذا الكود بالفعل      │
│                                      │
│ كل كود يُستخدم مرة واحدة فقط          │
│ آخر استخدام: 15-04-2026               │
│                                      │
│ [عروض متاحة أخرى]                     │
└──────────────────────────────────────┘
```

#### ❌ ORDER_BELOW_MINIMUM
```
السيناريو: قيمة الطلب أقل من الحد الأدنى
رسالة الخطأ: "قيمة الطلب أقل من الحد الأدنى (50 د.أ)"

ماذا يفعل التطبيق:
┌──────────────────────────────────────┐
│ 💳 هذا الكود يتطلب حد أدنى             │
│                                      │
│ الحد الأدنى: 50 د.أ                    │
│ الإجمالي الحالي: 30 د.أ               │
│ متبقي: 20 د.أ                         │
│                                      │
│ أضف مزيد من المنتجات لتطبيق الكود    │
│                                      │
│ [متابعة التسوق]    [إزالة الكود]       │
└──────────────────────────────────────┘
```

---

## 💻 أمثلة عملية

### مثال 1: مكون صفحة السلة (React Native)

```javascript
import React, { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native'

export function CartCouponInput({ 
  orderTotal,
  onCouponApplied,
  token 
}) {
  const [couponCode, setCouponCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [validCoupon, setValidCoupon] = useState(null)
  const [error, setError] = useState(null)

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setError('أدخل كود الخصم')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        'https://api.tawreed.jo/api/v1/coupons/validate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: couponCode.toUpperCase(),
            orderTotal: orderTotal
          })
        }
      )

      const data = await response.json()

      if (data.valid) {
        // ✅ نجح
        setValidCoupon(data)
        setError(null)
        
        // إخطار الأب بالكود الصحيح
        onCouponApplied({
          code: data.code,
          discountAmount: data.discountAmount,
          finalTotal: data.finalTotal
        })

        // عرض رسالة نجاح
        Alert.alert(
          'تم تطبيق الخصم',
          `خصم: ${data.discountPercent}% = ${data.discountAmount} د.أ`
        )
      } else {
        // ❌ فشل
        setValidCoupon(null)
        setError(data.message)
        onCouponApplied(null)
      }
    } catch (err) {
      setError('خطأ في الاتصال')
      console.error('Coupon validation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const removeCoupon = () => {
    setCouponCode('')
    setValidCoupon(null)
    setError(null)
    onCouponApplied(null)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>كود الخصم (اختياري)</Text>

      {!validCoupon ? (
        <>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="أدخل كود الخصم"
              placeholderTextColor="#999"
              value={couponCode}
              onChangeText={setCouponCode}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.button,
                loading && styles.buttonDisabled
              ]}
              onPress={validateCoupon}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>تطبيق</Text>
              )}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>❌ {error}</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            ✅ تم تطبيق الكود: {validCoupon.code}
          </Text>
          <Text style={styles.discountText}>
            خصم: {validCoupon.discountPercent}% ({validCoupon.discountAmount} د.أ)
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={removeCoupon}
          >
            <Text style={styles.removeButtonText}>إزالة الكود</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    textAlign: 'right'
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'right',
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444'
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'right'
  },
  successBox: {
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  successText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 4
  },
  discountText: {
    color: '#558B2F',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 8
  },
  removeButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FF6B6B',
    borderRadius: 4
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  }
})
```

---

### مثال 2: عملية الدفع الكاملة (الطريقة الصحيحة ✅)

```javascript
async function completeCheckout(
  cartItems,
  couponCode,
  deliveryAddress,
  deliveryCity,
  buyerNotes,
  token
) {
  try {
    // 1. حساب الإجمالي محلياً (للعرض فقط)
    const orderTotal = cartItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    )

    console.log('🛒 إجمالي الطلب:', orderTotal, 'د.أ')

    // 2. إنشاء الطلب مع الكوبون في طلب واحد
    const body = {
      deliveryAddress,
      deliveryCity,
      buyerNotes,
    }

    // أضف الكوبون فقط إذا أدخل المستخدم كود
    if (couponCode && couponCode.trim()) {
      body.couponCode = couponCode.trim()
    }

    const response = await fetch(
      'https://api.tawreed.jo/api/v1/orders',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      // ❌ فشل — قد يكون بسبب الكوبون أو خطأ آخر
      console.error('❌ خطأ:', data.error)
      return { success: false, error: data.error }
    }

    // ✅ نجح — الطلب + الكوبون تمت معالجتهما معاً
    console.log('✅ تم إنشاء الطلب:', data.order.id)

    if (data.coupon) {
      console.log('🎟️ تم تطبيق الخصم:', data.coupon.discountAmount, 'د.أ')
      console.log('📊 السعر الأصلي:', data.coupon.originalTotal)
      console.log('💰 السعر النهائي:', data.coupon.finalTotal)
    }

    return {
      success: true,
      orderId: data.order.id,
      orderTotal: data.coupon?.originalTotal ?? data.order.totalPrice,
      discountAmount: data.coupon?.discountAmount ?? 0,
      finalTotal: data.order.totalPrice,
      couponApplied: !!data.coupon,
    }
  } catch (error) {
    console.error('Checkout error:', error)
    return { success: false, error: 'فشل إنشاء الطلب' }
  }
}
```

**⚠️ الطريقة القديمة (لا تستخدمها):**
```javascript
// ❌ خطأ: استدعاء validate ثم إنشاء الطلب ثم confirm بشكل منفصل
// هذا يسبب مشكلة: الكود لا يُسجل إذا فشل confirm
async function oldWrongApproach() {
  const result = await validate(code, orderTotal)      // 1️⃣ تحقق فقط
  const order = await createOrder(items)                // 2️⃣ إنشاء طلب بدون كوبون
  const confirm = await confirmCoupon(code, order.id)   // 3️⃣ قد يفشل ولا يُسجل!
}

// ✅ صحيح: أرسل الكوبون مع الطلب
async function newCorrectApproach() {
  const preview = await validate(code, orderTotal)      // 1️⃣ معاينة فقط
  showDiscount(preview)                                  // 2️⃣ عرض الخصم للمستخدم
  const result = await createOrder({                     // 3️⃣ إنشاء الطلب مع الكوبون معاً
    ...orderData,
    couponCode: code
  })
  // ✅ الكوبون تم التحقق منه وتسجيل استخدامه تلقائياً!
}
```

---

### مثال 3: معالجة الأخطاء مع رسائل مخصصة

```javascript
function getErrorMessage(errorCode, additionalData = {}) {
  const messages = {
    CODE_NOT_FOUND: {
      title: '❌ كود غير صحيح',
      message: 'تأكد من كتابة الكود بشكل صحيح',
      action: 'جرب مجدداً'
    },
    CODE_INACTIVE: {
      title: '⚠️ الكود معطل',
      message: 'هذا الكود غير متاح حالياً',
      action: 'تصفح عروض أخرى'
    },
    CODE_NOT_STARTED: {
      title: '⏳ الكود سيبدأ قريباً',
      message: `بدء الصلاحية: ${additionalData.startDate}`,
      action: 'نبهني عند البدء'
    },
    CODE_EXPIRED: {
      title: '😞 الكود منتهي الصلاحية',
      message: `انتهى في: ${additionalData.endDate}`,
      action: 'عروض متاحة'
    },
    CODE_USAGE_LIMIT_REACHED: {
      title: '🚫 انتهت الكمية',
      message: 'تم استخدام جميع الكميات المتاحة',
      action: 'عروض أخرى'
    },
    CODE_ALREADY_USED: {
      title: '⚠️ تم استخدامه من قبل',
      message: 'كل كود يُستخدم مرة واحدة فقط',
      action: 'جرب كود آخر'
    },
    ORDER_BELOW_MINIMUM: {
      title: '💳 الحد الأدنى غير مستوفى',
      message: `أضف ${additionalData.requiredAmount} د.أ إضافية`,
      action: 'متابعة التسوق'
    }
  }

  return messages[errorCode] || {
    title: '❌ خطأ البار',
    message: 'حدث خطأ غير معروف',
    action: 'المحاولة مجدداً'
  }
}

// في مكون React
function handleCouponError(error, errorCode) {
  const errorInfo = getErrorMessage(errorCode, error)

  Alert.alert(
    errorInfo.title,
    errorInfo.message,
    [
      {
        text: 'إلغاء',
        onPress: () => {},
        style: 'cancel'
      },
      {
        text: errorInfo.action,
        onPress: () => {
          // تنفيذ الإجراء المناسب
        }
      }
    ]
  )
}
```

---

## 🔐 الملاحظات الأمنية

### 1. التحقق المزدوج (Double Validation)

```javascript
// ❌ خطأ: التحقق عبر validate فقط ثم إنشاء الطلب بشكل منفصل
async function wrongApproach(code, orderTotal) {
  const result = await validate(code, orderTotal)
  if (result.valid) {
    // إنشاء الطلب بدون إرسال couponCode ← الكود لا يُسجل!
    createOrder({ deliveryAddress, deliveryCity })
  }
}

// ✅ صحيح: أرسل couponCode مع الطلب
async function correctApproach(code, orderTotal) {
  // 1. معاينة الخصم (اختياري - لعرض الخصم في السلة)
  const preview = await validate(code, orderTotal)
  if (!preview.valid) {
    showError(preview.message)
    return
  }

  // 2. إنشاء الطلب مع الكوبون (التحقق + التسجيل تلقائياً)
  const result = await createOrder({
    deliveryAddress,
    deliveryCity,
    couponCode: code  // ← الخادم يتحقق ويسجل الاستخدام تلقائياً
  })

  if (!result.success) {
    showError(result.error)  // رسالة خطأ واضحة من الخادم
  }
}
```

### 2. عدم الثقة بالعميل

```javascript
// ❌ خطأ: تخزين معلومات الكود في الجهاز
const storeDiscountLocally = (discountAmount) => {
  // لا تفعل هذا!
  localStorage.setItem('discount', discountAmount)
  localStorage.setItem('finalTotal', finalTotal)
}

// ✅ صحيح: التحقق من الخادم دائماً
const getDiscountFromServer = async (code, orderTotal) => {
  // كل استدعاء يتحقق الخادم من الشروط
  const response = await fetch('/api/v1/coupons/validate', {
    // معلومات الخادم فقط
  })
}
```

### 3. استخدام JWT Token

```javascript
// ✅ التحقق من الـ Token في كل استدعاء
const headers = {
  'Authorization': `Bearer ${token}`,  // الـ token يحتوي على معرّف المستخدم
  'Content-Type': 'application/json'
}

// الخادم يتحقق من:
// 1. هل الـ Token صحيح؟
// 2. هل لم ينته (expired)؟
// 3. من هو المستخدم (من الـ token يستخرج userId)
// 4. هل هذا المستخدم موجود؟
```

### 4. السجلات والتتبع

```javascript
// كل استخدام يُحفظ في DiscountCodeUsage:
// - معرّف المستخدم (userId)
// - معرّف الكود (discountCodeId)
// - معرّف الطلب (orderId)
// - التاريخ والوقت (createdAt)
// - المبلغ المخصوم (discountAmount)

// هذا يسمح بـ:
// ✅ تتبع من استخدم الكود
// ✅ منع الاستخدام المتكرر
// ✅ حساب الإحصائيات
// ✅ الكشف عن الاحتيال
```

---

## ❓ الأسئلة الشائعة

### س: ماذا لو فشل كود الخصم عند إنشاء الطلب؟

**الجواب:**
```javascript
// السيناريو: المستخدم أدخل كوبون وضغط "تأكيد الطلب"
// لكن الكوبون رُفض → الطلب بالكامل لا يُنشأ

try {
  const result = await createOrder({
    deliveryAddress: 'عمان',
    deliveryCity: 'عمان',
    couponCode: 'WELCOME20'  // كود مرفوض
  })
  
  if (!result.success) {
    // ❌ الطلب لم يُنشأ أصلاً
    // رسالة الخطأ تخص الكوبون
    
    switch (true) {
      case result.error.includes('من قبل'):
        showAlert('لقد استخدمت هذا الكود سابقاً، جرب كود آخر أو أكمل بدون خصم')
        break
      case result.error.includes('الحد الأدنى'):
        showAlert('أضف مزيد من المنتجات أو أكمل بدون خصم')
        break
      default:
        showAlert(result.error)
    }
    
    // خيارات للمستخدم:
    // 1. إعادة المحاولة بكود آخر
    // 2. إنشاء الطلب بدون كوبون (أزل couponCode)
  }
} catch (error) {
  showError('خطأ في الاتصال')
}
```

### س: كيف يتعامل التطبيق مع الأكواد المنتهية؟

**الجواب:**
```javascript
// الخادم يفحص في كل مرة:
const now = new Date()

if (discountCode.endDate && now > discountCode.endDate) {
  // الكود انتهى
  return { valid: false, error: 'CODE_EXPIRED' }
}

// هذا يعني:
// - الكود لا يحتاج إلى حذف من قاعدة البيانات
// - سجل الاستخدامات يبقى للأرشيفات
// - يمكن إعادة تفعيل الكود لاحقاً (تغيير endDate)
```

### س: هل يمكن استخدام كود على طلب بقيمة أقل من الحد الأدنى؟

**الجواب:**
```javascript
// لا، الخادم يرفض
if (discountCode.minOrderAmount && 
    orderTotal < discountCode.minOrderAmount) {
  return {
    valid: false,
    error: 'ORDER_BELOW_MINIMUM',
    message: `الحد الأدنى: ${discountCode.minOrderAmount} د.أ`
  }
}

// لكن التطبيق يمكنه:
// ✅ عرض رسالة واضحة
// ✅ حساب المبلغ المتبقي
// ✅ اقتراح إضافة منتجات
```

### س: ماذا لو كان الكود `isSingleUse` و `maxUsage` معاً؟

**الجواب:**
```javascript
// يتم فحص كلا الشرطين:

// 1. هل المستخدم استخدمه قبلاً؟
if (discountCode.isSingleUse) {
  const existingUsage = await db.discountCodeUsage.findFirst({
    where: {
      discountCodeId: code.id,
      userId: user.id
    }
  })
  if (existingUsage) {
    return { error: 'CODE_ALREADY_USED' }
  }
}

// 2. هل وصلنا الحد الأقصى الكلي؟
if (discountCode.maxUsage && 
    totalUsages >= discountCode.maxUsage) {
  return { error: 'CODE_USAGE_LIMIT_REACHED' }
}

// النتيجة: الكود يُستخدم مرة واحدة من كل مستخدم،
// والحد الأقصى الكلي هو maxUsage
```

### س: كيف يحسب الخصم بالضبط؟

**الجواب:**
```javascript
// صيغة الحساب:
const discountPercent = 15  // مثلاً
const orderTotal = 100      // د.أ

// الخصم = (المجموع × النسبة) / 100
let discountAmount = (orderTotal * discountPercent) / 100
// = (100 * 15) / 100 = 15 د.أ

// الإجمالي النهائي = المجموع - الخصم
const finalTotal = orderTotal - discountAmount
// = 100 - 15 = 85 د.أ

// التقريب إلى منزلتين عشريتين:
discountAmount = Math.round(discountAmount * 100) / 100
finalTotal = Math.round(finalTotal * 100) / 100

// مثال:
// orderTotal = 100.5, discountPercent = 15
// rawDiscount = 15.075 → 15.08 د.أ
// finalTotal = 85.42 د.أ
```

---

## 📞 معلومات الدعم

**للأسئلة والاستفسارات:**
- 📧 العودة إلى ملف CLAUDE.md للمعمارية العامة
- 📖 راجع `types/index.ts` للأنواع والواجهات
- 💾 اطلع على `actions/discount-codes.ts` للمنطق الخادم
- 🔗 اطلع على `app/api/v1/coupons/` للـ endpoints

---

**آخر تحديث:** 14 أبريل 2026  
**الإصدار:** 1.0  
**الحالة:** ✅ نشط وجاهز للتطبيق
