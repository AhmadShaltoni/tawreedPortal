# أقسام التسويق - دليل مبرمج تطبيق الهاتف
# Marketing Sections - Mobile Developer Guide

---

## 📋 نظرة عامة (Overview)

أقسام التسويق هي أقسام تسويقية يتم إدارتها من لوحة التحكم وتظهر في الصفحة الرئيسية للتطبيق.
يمكن للمسؤول إنشاء أقسام مثل "عروض الأسبوع"، "وصل حديثاً"، "عروض رمضان"، وغيرها.

**ملاحظة مهمة:** المنتجات داخل الأقسام التسويقية هي نفس المنتجات الموجودة في النظام (ليست نسخاً منفصلة).

Marketing Sections are admin-managed promotional sections displayed on the mobile app's home screen.
The admin can create sections like "Weekly Offers", "New Arrivals", "Ramadan Offers", etc.

**Important:** Products inside marketing sections are the same products in the system (not separate copies).

---

## 🔗 API Endpoints

### Base URL
```
https://your-domain.com/api/v1
```

### Authentication
لا تحتاج هذه الـ APIs لتوثيق (عامة) - للعرض فقط.

These APIs are public (no authentication required) - read-only display endpoints.

---

## 1. الحصول على أقسام الصفحة الرئيسية
## 1. Get Home Page Sections

يُستخدم لجلب الأقسام التي يجب عرضها في الصفحة الرئيسية (بحد أقصى 2).

```
GET /api/v1/marketing-sections?showOnHome=true
```

### Response Example:
```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "id": "clx1abc123",
        "name": "عروض الأسبوع",
        "nameEn": "Weekly Offers",
        "slug": "weekly-offers",
        "description": "خصومات حصرية للفترة محدودة",
        "descriptionEn": "Exclusive limited-time discounts",
        "image": "https://res.cloudinary.com/xxx/image/upload/v123/tawreed/collections/abc.jpg",
        "showOnHome": true,
        "sortOrder": 0,
        "_count": {
          "products": 12
        }
      },
      {
        "id": "clx2def456",
        "name": "وصل حديثاً",
        "nameEn": "New Arrivals",
        "slug": "new-arrivals",
        "description": "اكتشف المنتجات الجديدة",
        "descriptionEn": "Discover new products",
        "image": "https://res.cloudinary.com/xxx/image/upload/v123/tawreed/collections/def.jpg",
        "showOnHome": true,
        "sortOrder": 1,
        "_count": {
          "products": 8
        }
      }
    ]
  }
}
```

### Query Parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `showOnHome` | boolean | - | إذا `true` يجلب فقط الأقسام المعروضة في الرئيسية |
| `limit` | number | 10 | عدد النتائج (حد أقصى 50) |

---

## 2. الحصول على جميع الأقسام التسويقية النشطة
## 2. Get All Active Marketing Sections

```
GET /api/v1/marketing-sections
```

### Response:
```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "id": "clx1abc123",
        "name": "عروض الأسبوع",
        "nameEn": "Weekly Offers",
        "slug": "weekly-offers",
        "description": "خصومات حصرية للفترة محدودة",
        "descriptionEn": "Exclusive limited-time discounts",
        "image": "https://res.cloudinary.com/.../abc.jpg",
        "showOnHome": true,
        "sortOrder": 0,
        "_count": { "products": 12 }
      },
      {
        "id": "clx2def456",
        "name": "وصل حديثاً",
        "nameEn": "New Arrivals",
        "slug": "new-arrivals",
        "description": null,
        "descriptionEn": null,
        "image": "https://res.cloudinary.com/.../def.jpg",
        "showOnHome": true,
        "sortOrder": 1,
        "_count": { "products": 8 }
      },
      {
        "id": "clx3ghi789",
        "name": "الأكثر طلباً",
        "nameEn": "Best Sellers",
        "slug": "best-sellers",
        "description": null,
        "descriptionEn": null,
        "image": null,
        "showOnHome": false,
        "sortOrder": 2,
        "_count": { "products": 15 }
      }
    ]
  }
}
```

---

## 3. الحصول على تفاصيل قسم تسويقي مع منتجاته
## 3. Get Marketing Section Details with Products

يُستخدم عند ضغط المستخدم على قسم تسويقي لعرض صفحة المنتجات.

```
GET /api/v1/marketing-sections/{slug}
```

### Example:
```
GET /api/v1/marketing-sections/weekly-offers
```

### Response:
```json
{
  "success": true,
  "data": {
    "section": {
      "id": "clx1abc123",
      "name": "عروض الأسبوع",
      "nameEn": "Weekly Offers",
      "slug": "weekly-offers",
      "description": "خصومات حصرية للفترة محدودة",
      "descriptionEn": "Exclusive limited-time discounts",
      "image": "https://res.cloudinary.com/.../abc.jpg",
      "products": [
        {
          "id": "prod_001",
          "name": "سكر ناعم",
          "nameEn": "Fine Sugar",
          "description": "سكر أبيض ناعم عالي الجودة",
          "descriptionEn": "High quality fine white sugar",
          "image": "https://res.cloudinary.com/.../sugar.jpg",
          "images": [],
          "isActive": true,
          "brand": {
            "id": "brand_001",
            "name": "العلالي",
            "nameEn": "Al Alali",
            "slug": "al-alali",
            "logo": "https://res.cloudinary.com/.../alali.jpg"
          },
          "category": {
            "id": "cat_001",
            "name": "سكر",
            "nameEn": "Sugar",
            "slug": "sugar"
          },
          "variants": [
            {
              "id": "var_001",
              "size": "2 كيلو",
              "sizeEn": "2kg",
              "image": null,
              "stock": 100,
              "isDefault": true,
              "units": [
                {
                  "id": "unit_001",
                  "unit": "PIECE",
                  "label": "قطعة",
                  "labelEn": "Piece",
                  "piecesPerUnit": 1,
                  "price": 1.50,
                  "compareAtPrice": 2.00,
                  "isDefault": true
                },
                {
                  "id": "unit_002",
                  "unit": "CARTON",
                  "label": "كرتونة (12 قطعة)",
                  "labelEn": "Carton (12 pieces)",
                  "piecesPerUnit": 12,
                  "price": 16.00,
                  "compareAtPrice": 24.00,
                  "isDefault": false
                }
              ],
              "options": []
            },
            {
              "id": "var_002",
              "size": "5 كيلو",
              "sizeEn": "5kg",
              "image": null,
              "stock": 50,
              "isDefault": false,
              "units": [
                {
                  "id": "unit_003",
                  "unit": "PIECE",
                  "label": "قطعة",
                  "labelEn": "Piece",
                  "piecesPerUnit": 1,
                  "price": 3.50,
                  "compareAtPrice": null,
                  "isDefault": true
                }
              ],
              "options": []
            }
          ]
        },
        {
          "id": "prod_002",
          "name": "حليب كامل الدسم",
          "nameEn": "Full Cream Milk",
          "description": "حليب طازج كامل الدسم",
          "descriptionEn": "Fresh full cream milk",
          "image": "https://res.cloudinary.com/.../milk.jpg",
          "images": [],
          "isActive": true,
          "brand": {
            "id": "brand_002",
            "name": "المراعي",
            "nameEn": "Almarai",
            "slug": "almarai",
            "logo": null
          },
          "category": {
            "id": "cat_002",
            "name": "حليب ومشتقات",
            "nameEn": "Dairy",
            "slug": "dairy"
          },
          "variants": [
            {
              "id": "var_003",
              "size": "1 لتر",
              "sizeEn": "1L",
              "image": null,
              "stock": 200,
              "isDefault": true,
              "units": [
                {
                  "id": "unit_004",
                  "unit": "PIECE",
                  "label": "قطعة",
                  "labelEn": "Piece",
                  "piecesPerUnit": 1,
                  "price": 0.85,
                  "compareAtPrice": 1.10,
                  "isDefault": true
                }
              ],
              "options": []
            }
          ]
        }
      ]
    }
  }
}
```

---

## 4. أقسام التسويق ضمن بيانات الصفحة الرئيسية
## 4. Marketing Sections in Home Data

أقسام التسويق تظهر أيضاً ضمن بيانات الصفحة الرئيسية المجمّعة:

```
GET /api/v1/home
```

تُرجع الأقسام التي `showOnHome = true` مع أول 10 منتجات لكل قسم.

---

## 📱 كيفية التكامل في التطبيق (Integration Guide)

### الصفحة الرئيسية (Home Screen)

```
┌─────────────────────────────────────┐
│         Header & Search              │
├─────────────────────────────────────┤
│         Categories Bar               │
├─────────────────────────────────────┤
│                                      │
│  ┌──────────────┐ ┌──────────────┐  │
│  │   صورة       │ │   صورة       │  │
│  │  عروض الأسبوع │ │  وصل حديثاً   │  │
│  │  خصومات حصرية │ │ اكتشف المنتجات │  │
│  │  [تسوق الآن]  │ │  [تسوق الآن]  │  │
│  └──────────────┘ └──────────────┘  │
│                                      │
│         Products Grid                │
├─────────────────────────────────────┤
│              ...                     │
└─────────────────────────────────────┘
```

### تدفق الاستخدام (User Flow):

1. **عند فتح التطبيق:**
   - استدعاء `GET /api/v1/marketing-sections?showOnHome=true`
   - عرض الأقسام (حد أقصى 2) بتصميم بطاقات مع الصورة والعنوان

2. **عند ضغط المستخدم على قسم:**
   - الانتقال إلى صفحة القسم التسويقي
   - استدعاء `GET /api/v1/marketing-sections/{slug}`
   - عرض عنوان القسم + صورته + قائمة المنتجات

3. **عند ضغط المستخدم على منتج:**
   - الانتقال إلى صفحة تفاصيل المنتج العادية
   - المنتج هو نفسه الموجود في النظام

---

## 🎨 تصميم البطاقات في الصفحة الرئيسية

بناءً على التصميم النهائي المعتمد:

```
┌─────────────────────────────────────────┐
│  Row: 2 بطاقات بجانب بعض (RTL)         │
│                                          │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │ ████████████████ │ │ ████████████████ ││
│  │ ████ صورة ████  │ │ ████ صورة ████  ││
│  │ ████████████████ │ │ ████████████████ ││
│  │                  │ │                  ││
│  │  عروض الأسبوع    │ │   وصل حديثاً     ││
│  │  خصومات حصرية   │ │  اكتشف المنتجات  ││
│  │  للفترة محدودة   │ │   الجديدة        ││
│  │                  │ │         [جديد]   ││
│  │  [تسوق الآن]     │ │   [تسوق الآن]    ││
│  └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────┘
```

### مواصفات التصميم:
- **خلفية البطاقة:** لون gradient (يمكن استخدام لون teal/أخضر كما في التصميم)
- **زوايا مستديرة:** `borderRadius: 12`
- **الصورة:** على الجانب الأيسر (في RTL)
- **النص:** على الجانب الأيمن (في RTL)
  - العنوان: خط عريض، أبيض
  - الوصف: خط أصغر، أبيض مع شفافية
- **زر "تسوق الآن":** زر أبيض صغير أسفل النص
- **عدد البطاقات:** 2 بحد أقصى (صف واحد)

---

## 🔄 التحديث والـ Caching

- الأقسام تتغير نادراً (يديرها الأدمن)
- يُنصح بتخزين البيانات مؤقتاً (Cache) لمدة 5-10 دقائق
- عند السحب للتحديث (Pull to Refresh) → إعادة الطلب

---

## ⚠️ ملاحظات مهمة

1. **الأقسام التسويقية ≠ أقسام المنتجات (Categories)**
   - Categories = تصنيف المنتجات (سكر، أرز، حليب...)
   - Marketing Sections = تجميعات تسويقية مؤقتة (عروض، جديد...)

2. **المنتجات مشتركة:** نفس المنتج يمكن أن يظهر في أكثر من قسم تسويقي وفي الأقسام العادية

3. **حد الصفحة الرئيسية:** 2 أقسام فقط تظهر في الرئيسية (باقي الأقسام يمكن الوصول لها من صفحة خاصة إن لزم)

4. **ترتيب المنتجات:** المنتجات مرتبة حسب `sortOrder` الذي يحدده الأدمن

5. **المنتجات غير النشطة:** يتم فلترتها تلقائياً من الـ API (لن تظهر في التطبيق)

---

## 📊 Response Fields Reference

### Section Object:
| Field | Type | Description (AR) | Description (EN) |
|-------|------|-------------------|-------------------|
| `id` | string | معرف القسم | Section ID |
| `name` | string | اسم القسم بالعربي | Arabic section name |
| `nameEn` | string? | اسم القسم بالإنجليزي | English section name |
| `slug` | string | الرابط (للـ URL) | URL-safe slug |
| `description` | string? | وصف بالعربي | Arabic description |
| `descriptionEn` | string? | وصف بالإنجليزي | English description |
| `image` | string? | رابط صورة القسم | Section image URL |
| `showOnHome` | boolean | يظهر في الرئيسية | Shown on home |
| `sortOrder` | number | ترتيب الظهور | Display order |
| `_count.products` | number | عدد المنتجات | Product count |

### Product Object (inside section):
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | معرف المنتج |
| `name` | string | اسم المنتج (عربي) |
| `nameEn` | string? | اسم المنتج (إنجليزي) |
| `image` | string? | صورة المنتج الرئيسية |
| `images` | string[] | صور إضافية |
| `brand` | object? | بيانات الماركة |
| `category` | object | بيانات الفئة |
| `variants` | array | المتغيرات (أحجام مختلفة) |
| `variants[].units` | array | وحدات البيع (قطعة/كرتون) |
| `variants[].options` | array | خيارات (نكهات/ألوان) |

---

## 💡 مثال عملي - Flutter/Dart

```dart
// Model
class MarketingSection {
  final String id;
  final String name;
  final String? nameEn;
  final String slug;
  final String? description;
  final String? descriptionEn;
  final String? image;
  final bool showOnHome;
  final int productCount;

  MarketingSection.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        name = json['name'],
        nameEn = json['nameEn'],
        slug = json['slug'],
        description = json['description'],
        descriptionEn = json['descriptionEn'],
        image = json['image'],
        showOnHome = json['showOnHome'] ?? false,
        productCount = json['_count']?['products'] ?? 0;
}

// API Service
class MarketingSectionService {
  final String baseUrl = 'https://your-domain.com/api/v1';

  // جلب أقسام الصفحة الرئيسية
  Future<List<MarketingSection>> getHomeSections() async {
    final response = await http.get(
      Uri.parse('$baseUrl/marketing-sections?showOnHome=true'),
    );
    final data = jsonDecode(response.body);
    final sections = (data['data']['sections'] as List)
        .map((s) => MarketingSection.fromJson(s))
        .toList();
    return sections;
  }

  // جلب تفاصيل قسم مع منتجاته
  Future<Map<String, dynamic>> getSectionDetails(String slug) async {
    final response = await http.get(
      Uri.parse('$baseUrl/marketing-sections/$slug'),
    );
    final data = jsonDecode(response.body);
    return data['data']['section'];
  }
}
```

### Widget Example:
```dart
class MarketingSectionsWidget extends StatelessWidget {
  final List<MarketingSection> sections;

  @override
  Widget build(BuildContext context) {
    if (sections.isEmpty) return SizedBox.shrink();
    
    return Row(
      children: sections.take(2).map((section) {
        return Expanded(
          child: GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => SectionProductsPage(slug: section.slug),
              ),
            ),
            child: Container(
              margin: EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: LinearGradient(
                  colors: [Color(0xFF0D9488), Color(0xFF115E59)],
                ),
              ),
              child: Row(
                children: [
                  // Text side
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(section.name, style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          )),
                          if (section.description != null)
                            Text(section.description!, style: TextStyle(
                              color: Colors.white70,
                              fontSize: 11,
                            )),
                          SizedBox(height: 8),
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text('تسوق الآن', style: TextStyle(
                              color: Color(0xFF0D9488),
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            )),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Image side
                  if (section.image != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        section.image!,
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
```

---

## 🧪 اختبار سريع (Quick Test)

```bash
# جلب أقسام الرئيسية
curl https://your-domain.com/api/v1/marketing-sections?showOnHome=true

# جلب جميع الأقسام
curl https://your-domain.com/api/v1/marketing-sections

# جلب تفاصيل قسم بالمنتجات
curl https://your-domain.com/api/v1/marketing-sections/weekly-offers
```

---

## 📝 ملخص التغييرات

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/marketing-sections` | GET | جلب الأقسام التسويقية النشطة |
| `/api/v1/marketing-sections?showOnHome=true` | GET | جلب أقسام الصفحة الرئيسية (حد أقصى 2) |
| `/api/v1/marketing-sections/{slug}` | GET | جلب تفاصيل قسم مع كل منتجاته |

---

**آخر تحديث:** يونيو 2026
