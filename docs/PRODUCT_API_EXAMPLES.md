# 🔌 أمثلة الـ API العملية - Product API

## 📌 Base URL
```
http://localhost:3000/api/v1
```

---

## 🌐 أمثلة cURL

### 1️⃣ جلب قائمة المنتجات

#### الأمر:
```bash
curl -X GET "http://localhost:3000/api/v1/products?page=1&limit=10" \
  -H "Accept: application/json"
```

#### الرد (مختصر):
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod-1",
        "name": "عصير برتقال",
        "image": "/uploads/juice.jpg",
        "category": {"id": "cat-1", "name": "المشروبات"},
        "brand": {"id": "brand-1", "name": "ماركة أ"},
        "variants": [
          {
            "id": "var-1",
            "size": "1 لتر",
            "stock": 100,
            "units": [
              {
                "id": "unit-1",
                "price": 2.5,
                "label": "قطعة"
              }
            ]
          }
        ]
      }
    ],
    "pagination": {"page": 1, "limit": 10, "total": 50, "pages": 5}
  }
}
```

---

### 2️⃣ جلب المنتج بالتفاصيل الكاملة

#### الأمر:
```bash
curl -X GET "http://localhost:3000/api/v1/products/prod-1" \
  -H "Accept: application/json"
```

#### الرد (مختصر):
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "prod-1",
      "name": "عصير برتقال الطبيعي",
      "nameEn": "Fresh Orange Juice",
      "description": "عصير برتقال 100% طبيعي",
      "image": "/uploads/juice.jpg",
      "images": ["/uploads/juice-2.jpg", "/uploads/juice-3.jpg"],
      "category": {
        "id": "cat-drinks",
        "name": "المشروبات",
        "nameEn": "Beverages",
        "slug": "beverages"
      },
      "brand": {
        "id": "brand-fresh",
        "name": "ماركة طازج",
        "nameEn": "Fresh Brand",
        "slug": "fresh-brand",
        "logo": "/uploads/logo.jpg"
      },
      "variants": [
        {
          "id": "var-1l",
          "size": "1 لتر",
          "sizeEn": "1L",
          "sku": "JUICE-1L",
          "stock": 100,
          "minOrderQuantity": 1,
          "isDefault": true,
          "units": [
            {
              "id": "unit-piece",
              "unit": "PIECE",
              "label": "قطعة",
              "labelEn": "Piece",
              "piecesPerUnit": 1,
              "price": 2.5,
              "compareAtPrice": 3.0,
              "isDefault": true
            },
            {
              "id": "unit-dozen",
              "unit": "DOZEN",
              "label": "دزينة",
              "labelEn": "Dozen",
              "piecesPerUnit": 12,
              "price": 28.0,
              "isDefault": false
            }
          ],
          "options": [
            {
              "id": "opt-natural",
              "name": "طبيعي",
              "nameEn": "Natural",
              "stock": 50,
              "priceOverride": null
            },
            {
              "id": "opt-sugar-free",
              "name": "بدون سكر",
              "nameEn": "Sugar Free",
              "stock": 50,
              "priceOverride": 3.0
            }
          ]
        },
        {
          "id": "var-2l",
          "size": "2 لتر",
          "sizeEn": "2L",
          "stock": 80,
          "isDefault": false,
          "units": [
            {
              "id": "unit-2l",
              "unit": "PIECE",
              "label": "قطعة",
              "price": 4.5,
              "isDefault": true
            }
          ],
          "options": [
            {
              "id": "opt-2l-natural",
              "name": "طبيعي",
              "stock": 80,
              "priceOverride": null
            }
          ]
        }
      ]
    }
  }
}
```

---

### 3️⃣ البحث عن منتجات

#### الأمر:
```bash
curl -X GET "http://localhost:3000/api/v1/search?q=عصير&page=1&limit=20" \
  -H "Accept: application/json"
```

#### الرد:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod-juice-1",
        "name": "عصير برتقال",
        "nameEn": "Orange Juice"
      }
    ],
    "pagination": {"page": 1, "limit": 20, "total": 5, "totalPages": 1}
  }
}
```

---

### 4️⃣ جلب المنتجات حسب الفئة

#### الأمر:
```bash
curl -X GET "http://localhost:3000/api/v1/products?categoryId=cat-drinks&includeDescendants=true&page=1&limit=20" \
  -H "Accept: application/json"
```

---

### 5️⃣ جلب المنتجات حسب الماركة

#### الأمر:
```bash
curl -X GET "http://localhost:3000/api/v1/brands/fresh-brand/products?page=1&limit=20" \
  -H "Accept: application/json"
```

---

### 6️⃣ جلب مجموعة منتجات (Collection)

#### الأمر:
```bash
curl -X GET "http://localhost:3000/api/v1/collections/offers/products?page=1&limit=20" \
  -H "Accept: application/json"
```

---

## 💻 أمثلة TypeScript

### 1️⃣ جلب وعرض المنتجات

```typescript
// types.ts
interface ProductUnit {
  id: string
  unit: 'PIECE' | 'DOZEN' | 'CARTON' | 'BOX' | 'PACK' | 'KG' | 'GRAM' | 'LITER'
  label: string
  labelEn?: string
  piecesPerUnit: number
  price: number
  wholesalePrice?: number
  compareAtPrice?: number
  isDefault: boolean
  sortOrder: number
}

interface VariantOption {
  id: string
  name: string
  nameEn?: string
  stock: number
  sku?: string
  barcode?: string
  priceOverride?: number
  isActive: boolean
  sortOrder: number
}

interface ProductVariant {
  id: string
  size: string
  sizeEn?: string
  sku?: string
  barcode?: string
  stock: number
  minOrderQuantity: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  units: ProductUnit[]
  options: VariantOption[]
}

interface Category {
  id: string
  name: string
  nameEn?: string
  slug: string
}

interface Brand {
  id: string
  name: string
  nameEn?: string
  slug: string
  logo?: string
}

interface Product {
  id: string
  name: string
  nameEn?: string
  description?: string
  descriptionEn?: string
  image?: string
  images?: string[]
  isActive: boolean
  sortOrder: number
  category: Category
  brand?: Brand
  variants: ProductVariant[]
}
```

---

### 2️⃣ خدمة لجلب المنتجات

```typescript
// services/productService.ts
const API_BASE = 'http://localhost:3000/api/v1'

export const productService = {
  // جلب قائمة المنتجات
  async getProducts(params: {
    page?: number
    limit?: number
    categoryId?: string
    brandId?: string
    search?: string
    view?: 'card' | 'full'
  }) {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.set('page', String(params.page))
    if (params.limit) queryParams.set('limit', String(params.limit))
    if (params.categoryId) queryParams.set('categoryId', params.categoryId)
    if (params.brandId) queryParams.set('brandId', params.brandId)
    if (params.search) queryParams.set('search', params.search)
    if (params.view) queryParams.set('view', params.view)

    const response = await fetch(
      `${API_BASE}/products?${queryParams.toString()}`
    )
    if (!response.ok) throw new Error('Failed to fetch products')
    
    const data = await response.json()
    return data.data.products
  },

  // جلب منتج واحد
  async getProduct(productId: string) {
    const response = await fetch(`${API_BASE}/products/${productId}`)
    if (!response.ok) throw new Error('Product not found')
    
    const data = await response.json()
    return data.data.product
  },

  // البحث
  async searchProducts(query: string, page = 1, limit = 20) {
    const response = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    )
    if (!response.ok) throw new Error('Search failed')
    
    const data = await response.json()
    return data.data.products
  },

  // جلب منتجات الفئة
  async getCategoryProducts(categoryId: string, page = 1, limit = 20) {
    const response = await fetch(
      `${API_BASE}/products?categoryId=${categoryId}&page=${page}&limit=${limit}&includeDescendants=true`
    )
    if (!response.ok) throw new Error('Failed to fetch category products')
    
    const data = await response.json()
    return data.data.products
  }
}
```

---

### 3️⃣ عرض المنتج في قائمة

```typescript
// components/ProductCard.tsx
import React from 'react'
import { Product, ProductUnit } from '@/types'

interface ProductCardProps {
  product: Product
  onProductClick: (productId: string) => void
}

export function ProductCard({ product, onProductClick }: ProductCardProps) {
  // الحصول على أول variant و unit
  const defaultVariant = product.variants[0]
  const defaultUnit = defaultVariant?.units[0] as ProductUnit
  
  const hasDiscount = defaultUnit?.compareAtPrice && 
    defaultUnit.compareAtPrice > defaultUnit.price

  const discountPercent = hasDiscount 
    ? Math.round(
        ((defaultUnit.compareAtPrice - defaultUnit.price) / 
         defaultUnit.compareAtPrice) * 100
      )
    : 0

  return (
    <div 
      onClick={() => onProductClick(product.id)}
      className="product-card"
    >
      {/* الصورة */}
      <div className="product-image">
        <img 
          src={product.image || '/placeholder.jpg'} 
          alt={product.name}
          loading="lazy"
        />
        
        {/* شارة الخصم */}
        {hasDiscount && (
          <div className="discount-badge">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* المعلومات */}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        
        {product.brand && (
          <p className="product-brand">{product.brand.name}</p>
        )}

        {/* السعر */}
        <div className="product-price">
          <span className="current-price">
            {defaultUnit.price} ج.د
          </span>
          {hasDiscount && (
            <span className="original-price">
              {defaultUnit.compareAtPrice} ج.د
            </span>
          )}
        </div>

        {/* الحجم والكمية */}
        <p className="product-variant">
          {defaultVariant.size} | {defaultVariant.stock} متوفر
        </p>
      </div>
    </div>
  )
}
```

---

### 4️⃣ صفحة تفاصيل المنتج

```typescript
// pages/ProductDetail.tsx
import React, { useState, useEffect } from 'react'
import { Product, ProductVariant, ProductUnit, VariantOption } from '@/types'
import { productService } from '@/services/productService'

interface ProductDetailProps {
  productId: string
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedOption, setSelectedOption] = useState<VariantOption | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    productService.getProduct(productId).then(data => {
      setProduct(data)
      setSelectedVariant(data.variants[0])
      setSelectedUnit(data.variants[0].units[0])
    })
  }, [productId])

  if (!product) return <div>جاري التحميل...</div>

  // حساب السعر النهائي
  const calculatePrice = () => {
    if (!selectedUnit) return 0
    
    // إذا كان هناك option مع price override، استخدمه
    if (selectedOption?.priceOverride) {
      return selectedOption.priceOverride
    }
    
    return selectedUnit.price
  }

  const unitPrice = calculatePrice()
  const totalPrice = unitPrice * quantity

  // معالجة تغيير الحجم
  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariant(variant)
    setSelectedUnit(variant.units[0]) // أول وحدة للحجم الجديد
    setSelectedOption(null) // إعادة تعيين النكهة
  }

  // معالجة تغيير النكهة
  const handleOptionChange = (option: VariantOption) => {
    setSelectedOption(option)
  }

  // معالجة تغيير الوحدة
  const handleUnitChange = (unit: ProductUnit) => {
    setSelectedUnit(unit)
  }

  return (
    <div className="product-detail">
      <div className="product-images">
        {/* عرض الصور */}
        <div className="main-image">
          <img src={product.image} alt={product.name} />
        </div>
        {product.images && product.images.length > 0 && (
          <div className="thumbnail-images">
            {product.images.map((img, idx) => (
              <img 
                key={idx}
                src={img} 
                alt={`${product.name} ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="product-details">
        <h1>{product.name}</h1>
        {product.brand && <p className="brand">{product.brand.name}</p>}
        {product.description && <p>{product.description}</p>}

        {/* اختيار الحجم */}
        <div className="size-selector">
          <label>الحجم:</label>
          <div className="size-options">
            {product.variants.map(variant => (
              <button
                key={variant.id}
                onClick={() => handleVariantChange(variant)}
                className={selectedVariant?.id === variant.id ? 'active' : ''}
              >
                {variant.size}
              </button>
            ))}
          </div>
        </div>

        {/* اختيار النكهة (إن وجدت) */}
        {selectedVariant?.options && selectedVariant.options.length > 0 && (
          <div className="flavor-selector">
            <label>النكهة:</label>
            <div className="flavor-options">
              {selectedVariant.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleOptionChange(option)}
                  className={selectedOption?.id === option.id ? 'active' : ''}
                  disabled={option.stock === 0}
                >
                  {option.name}
                  {option.stock === 0 && ' (غير متوفر)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* اختيار وحدة البيع */}
        {selectedVariant?.units && selectedVariant.units.length > 1 && (
          <div className="unit-selector">
            <label>وحدة البيع:</label>
            <div className="unit-options">
              {selectedVariant.units.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => handleUnitChange(unit)}
                  className={selectedUnit?.id === unit.id ? 'active' : ''}
                >
                  {unit.label} ({unit.piecesPerUnit} قطع) - {unit.price} ج.د
                </button>
              ))}
            </div>
          </div>
        )}

        {/* الكمية */}
        <div className="quantity-selector">
          <label>الكمية:</label>
          <div className="quantity-controls">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              -
            </button>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
            />
            <button onClick={() => setQuantity(quantity + 1)}>
              +
            </button>
          </div>
        </div>

        {/* السعر والزر */}
        <div className="pricing">
          <div className="price">
            <span className="total">الإجمالي:</span>
            <span className="amount">{totalPrice.toFixed(2)} ج.د</span>
          </div>
          <button 
            className="add-to-cart-btn"
            onClick={() => {
              // إضافة للسلة
              const cartItem = {
                variantId: selectedVariant!.id,
                variantOptionId: selectedOption?.id,
                productUnitId: selectedUnit!.id,
                quantity
              }
              console.log('Adding to cart:', cartItem)
            }}
          >
            إضافة للسلة
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### 5️⃣ خطاف React للسلة

```typescript
// hooks/useCart.ts
import { useState, useCallback } from 'react'

interface CartItem {
  variantId: string
  variantOptionId?: string
  productUnitId?: string
  quantity: number
  productName: string
  price: number
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const addToCart = useCallback((item: CartItem) => {
    setCartItems(prev => {
      const existing = prev.find(
        ci => ci.variantId === item.variantId &&
              ci.variantOptionId === item.variantOptionId &&
              ci.productUnitId === item.productUnitId
      )

      if (existing) {
        // زيادة الكمية
        return prev.map(ci =>
          ci.variantId === item.variantId &&
          ci.variantOptionId === item.variantOptionId &&
          ci.productUnitId === item.productUnitId
            ? { ...ci, quantity: ci.quantity + item.quantity }
            : ci
        )
      }

      // إضافة جديد
      return [...prev, item]
    })
  }, [])

  const removeFromCart = useCallback((variantId: string, optionId?: string, unitId?: string) => {
    setCartItems(prev =>
      prev.filter(
        ci => !(ci.variantId === variantId &&
                ci.variantOptionId === optionId &&
                ci.productUnitId === unitId)
      )
    )
  }, [])

  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [cartItems])

  return {
    cartItems,
    addToCart,
    removeFromCart,
    getTotalPrice,
    itemsCount: cartItems.length
  }
}
```

---

## 🎯 ملخص المعاملات الأساسية

| الإجراء | Endpoint | Method | الفائدة |
|--------|----------|--------|---------|
| قائمة المنتجات | `/products?page=1&limit=20` | GET | عرض المنتجات في الصفحة |
| تفاصيل منتج | `/products/[id]` | GET | عرض كامل التفاصيل والخيارات |
| البحث | `/search?q=query` | GET | البحث عن منتجات معينة |
| حسب الفئة | `/products?categoryId=id` | GET | تصفية حسب الفئة |
| حسب الماركة | `/brands/[slug]/products` | GET | منتجات ماركة معينة |
| المجموعات | `/collections/[slug]` | GET | منتجات من مجموعة معينة |
