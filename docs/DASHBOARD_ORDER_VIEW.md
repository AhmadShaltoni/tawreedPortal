# 📊 دليل عرض الطلبات في الـ Dashboard

> **للموظفين والـ Admin**: كيفية عرض تفاصيل الطلب الكاملة مع النكهات والأحجام

---

## 🎯 المشكلة

عند استقبال طلب، الموظف يحتاج معرفة:

- ✅ المنتج المطلوب
- ✅ **الحجم (Size)** المختار - مثل "1 لتر" أو "2 كيلو"
- ✅ **النكهة (Flavor)** المختارة - مثل "طبيعي" أو "بدون سكر"
- ✅ **الوحدة (Unit)** - مثل "قطعة" أو "دزينة"
- ✅ الكمية والسعر

**بدون** هذه التفاصيل، الموظف **لا يعرف بالضبط ماذا يُحضّر**.

---

## ✅ الحل

جميع هذه البيانات **محفوظة** في قاعدة البيانات و **يُمكن عرضها**.

---

## 📋 1. عرض الطلب الواحد

### في الـ Backend

```typescript
// GET /admin/orders/{orderId}
// أو في الـ Dashboard

const order = await db.order.findUnique({
  where: { id: orderId },
  include: {
    items: {
      include: { product: true }
    },
    buyer: { select: { username: true, phone: true, storeName: true } }
  }
})
```

### في الـ Frontend (Dashboard)

```jsx
export function OrderDetailsView({ orderId }) {
  const [order, setOrder] = useState(null)
  
  useEffect(() => {
    // جلب الطلب من الـ API
    fetch(`/api/admin/orders/${orderId}`)
      .then(r => r.json())
      .then(data => setOrder(data.data.order))
  }, [orderId])
  
  if (!order) return <div>جاري التحميل...</div>
  
  return (
    <div className="order-details">
      {/* رأس الطلب */}
      <header>
        <h1>الطلب #{order.orderNumber}</h1>
        <span className={`status ${order.status}`}>{order.status}</span>
      </header>
      
      {/* بيانات الزبون */}
      <section className="customer-info">
        <h2>بيانات الزبون</h2>
        <p><strong>الاسم:</strong> {order.buyer?.username}</p>
        <p><strong>الهاتف:</strong> {order.buyer?.phone}</p>
        <p><strong>المتجر:</strong> {order.buyer?.storeName}</p>
        <p><strong>العنوان:</strong> {order.deliveryAddress}</p>
        <p><strong>المدينة:</strong> {order.deliveryCity}</p>
      </section>
      
      {/* عناصر الطلب */}
      <section className="order-items">
        <h2>عناصر الطلب</h2>
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الحجم</th>
              <th>النكهة</th>
              <th>الوحدة</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id}>
                {/* المنتج */}
                <td>
                  <img src={item.product.image} alt="" style={{ width: 50 }} />
                  <div>{item.product.name}</div>
                </td>
                
                {/* الحجم */}
                <td>
                  <strong>{item.variantSize}</strong>
                  {item.variantSizeEn && <div className="text-gray-500">{item.variantSizeEn}</div>}
                </td>
                
                {/* النكهة */}
                <td>
                  {item.variantOptionName ? (
                    <>
                      <strong>{item.variantOptionName}</strong>
                      {item.variantOptionNameEn && <div className="text-gray-500">{item.variantOptionNameEn}</div>}
                    </>
                  ) : (
                    <span className="text-gray-400">بلا</span>
                  )}
                </td>
                
                {/* الوحدة */}
                <td>
                  <strong>{item.unitLabel}</strong>
                  {item.unitLabelEn && <div className="text-gray-500">{item.unitLabelEn}</div>}
                  <div className="text-sm text-gray-400">({item.piecesPerUnit} قطع)</div>
                </td>
                
                {/* الكمية */}
                <td>{item.quantity}</td>
                
                {/* السعر */}
                <td>{item.pricePerUnit} د.أ</td>
                
                {/* الإجمالي */}
                <td><strong>{item.totalPrice} د.أ</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      {/* الإجمالي والملاحظات */}
      <section className="order-summary">
        <div className="total">
          <h3>الإجمالي: {order.totalPrice} د.أ</h3>
        </div>
        
        {order.buyerNotes && (
          <div className="notes">
            <h3>ملاحظات الزبون</h3>
            <p>{order.buyerNotes}</p>
          </div>
        )}
      </section>
    </div>
  )
}
```

---

## 📊 2. عرض قائمة الطلبات

### في الـ Frontend

```jsx
export function OrdersListView() {
  const [orders, setOrders] = useState([])
  
  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(data.data.orders))
  }, [])
  
  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>رقم الطلب</th>
          <th>الزبون</th>
          <th>العناصر</th>
          <th>الإجمالي</th>
          <th>الحالة</th>
          <th>الإجراء</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order.id}>
            <td><strong>#{order.orderNumber.slice(-8)}</strong></td>
            <td>{order.buyer?.storeName}</td>
            
            {/* عناصر الطلب بتفاصيلها */}
            <td className="items-preview">
              {order.items.slice(0, 2).map(item => (
                <div key={item.id} className="item-compact">
                  <span className="product">{item.product.name}</span>
                  
                  {/* الحجم والنكهة والوحدة بسرعة */}
                  <div className="selections">
                    {item.variantSize && <span className="size">{item.variantSize}</span>}
                    {item.variantOptionName && <span className="flavor">{item.variantOptionName}</span>}
                    {item.unitLabel && <span className="unit">{item.unitLabel}</span>}
                  </div>
                  
                  <span className="qty">×{item.quantity}</span>
                </div>
              ))}
              {order.items.length > 2 && (
                <div className="more">+{order.items.length - 2} أخرى</div>
              )}
            </td>
            
            <td><strong>{order.totalPrice} د.أ</strong></td>
            <td><span className={`badge ${order.status}`}>{order.status}</span></td>
            
            <td>
              <button onClick={() => viewOrder(order.id)}>عرض</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 📋 3. مثال واقعي: عرض الطلب

### البيانات المحفوظة في قاعدة البيانات

```javascript
{
  "id": "order-789",
  "orderNumber": "ORD-20250525-12345",
  "status": "CONFIRMED",
  "totalPrice": 61.0,
  "items": [
    {
      "id": "item-1",
      "productId": "prod-456",
      "productName": "عصير برتقال",
      "productNameEn": "Orange Juice",
      "productImage": "/uploads/juice.jpg",
      
      // البيانات المحفوظة من اختيار الزبون
      "variantSize": "1 لتر",
      "variantSizeEn": "1L",
      
      "variantOptionName": "بدون سكر",
      "variantOptionNameEn": "Sugar Free",
      
      "unitLabel": "دزينة",
      "unitLabelEn": "Dozen",
      "piecesPerUnit": 12,
      
      "quantity": 2,
      "pricePerUnit": 28.0,
      "totalPrice": 56.0
    },
    {
      "id": "item-2",
      "productName": "زنجر",
      "productNameEn": "Zinger",
      
      "variantSize": "كبير",
      "variantSizeEn": "Large",
      
      "variantOptionName": "حار",
      "variantOptionNameEn": "Spicy",
      
      "unitLabel": "قطعة",
      "piecesPerUnit": 1,
      
      "quantity": 1,
      "pricePerUnit": 5.0,
      "totalPrice": 5.0
    }
  ]
}
```

### العرض الذي يراه الموظف

```
═══════════════════════════════════════════════════════════════
                    الطلب #ORD-12345
═══════════════════════════════════════════════════════════════

📦 العناصر:

┌─────────────────────────────────────────────────────────────┐
│ 1. عصير برتقال (Orange Juice)                             │
│    ├─ الحجم: 1 لتر (1L)                                    │
│    ├─ النكهة: بدون سكر (Sugar Free)                        │
│    ├─ الوحدة: دزينة (Dozen) - 12 قطعة                    │
│    ├─ الكمية: 2                                            │
│    └─ الإجمالي: 28 د.أ × 2 = 56 د.أ                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. زنجر (Zinger)                                           │
│    ├─ الحجم: كبير (Large)                                  │
│    ├─ النكهة: حار (Spicy)                                 │
│    ├─ الوحدة: قطعة (Piece) - 1 قطعة                       │
│    ├─ الكمية: 1                                            │
│    └─ الإجمالي: 5 د.أ × 1 = 5 د.أ                        │
└─────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
المجموع: 61 د.أ
```

---

## 🎨 4. CSS لعرض جميل

```css
/* عنصر الطلب بسيط وواضح */
.order-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #f9fafb;
}

.order-item h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #1f2937;
}

/* التفاصيل مع اختلاف في اللون */
.order-item .detail {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  font-size: 14px;
  color: #6b7280;
}

.order-item .detail strong {
  color: #1f2937;
  font-weight: 600;
}

/* النكهة والحجم مع لون مختلف */
.order-item .selection {
  display: inline-block;
  background: #dbeafe;
  color: #1e40af;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 8px;
  margin-top: 8px;
}

/* الوحدة */
.order-item .unit {
  display: inline-block;
  background: #fef3c7;
  color: #92400e;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* الإجمالي بارز */
.order-item .total {
  border-top: 1px solid #d1d5db;
  margin-top: 12px;
  padding-top: 12px;
  font-size: 16px;
  font-weight: bold;
  color: #059669;
}
```

---

## 🔧 5. إضافة إجراء: تحديث الحالة

عند تحديث حالة الطلب، الموظف يرى التفاصيل الكاملة:

```jsx
function UpdateOrderStatus({ order, onStatusChange }) {
  return (
    <div className="status-update">
      <h3>تحديث الحالة</h3>
      
      {/* عرض الحالة الحالية والعناصر */}
      <div className="current-status">
        <p>الحالة الحالية: <strong>{order.status}</strong></p>
        <p>العناصر: {order.items.length} منتج</p>
        
        {/* ملخص سريع للعناصر */}
        <div className="items-summary">
          {order.items.map(item => (
            <span key={item.id} className="item-tag">
              {item.productName}
              {item.variantOptionName && ` (${item.variantOptionName})`}
              {item.variantSize && ` - ${item.variantSize}`}
            </span>
          ))}
        </div>
      </div>
      
      {/* اختيار الحالة الجديدة */}
      <select onChange={(e) => onStatusChange(e.target.value)}>
        <option value="CONFIRMED">مؤكد</option>
        <option value="PROCESSING">قيد الإعداد</option>
        <option value="SHIPPED">تم الشحن</option>
        <option value="DELIVERED">تم التسليم</option>
      </select>
    </div>
  )
}
```

---

## 📱 6. عرض مختصر على الهاتف

```jsx
function OrderCardMobile({ order }) {
  return (
    <div className="order-card">
      <div className="header">
        <span className="number">#{order.orderNumber.slice(-6)}</span>
        <span className={`status ${order.status}`}>{order.status}</span>
      </div>
      
      <div className="items">
        {order.items.map(item => (
          <div key={item.id} className="item-row">
            <div className="product-name">{item.productName}</div>
            <div className="selections">
              {item.variantSize && <span>{item.variantSize}</span>}
              {item.variantOptionName && <span>{item.variantOptionName}</span>}
              {item.unitLabel && <span>{item.unitLabel}</span>}
            </div>
            <div className="qty-price">
              ×{item.quantity} = {item.totalPrice} د.أ
            </div>
          </div>
        ))}
      </div>
      
      <div className="footer">
        <strong>{order.totalPrice} د.أ</strong>
        <button>عرض التفاصيل</button>
      </div>
    </div>
  )
}
```

---

## ✨ النقاط المهمة

✅ **جميع البيانات موجودة** في جدول `OrderItem`

✅ **لا توجد بيانات مفقودة** - كل ما يختاره الزبون محفوظ

✅ **سهل الوصول** من الـ API أو Dashboard

✅ **واضح للموظف** - يعرف بالضبط ماذا يُحضّر

✅ **محفوظ للأبد** - بيانات الطلب لا تتغير

---

## 📞 الخلاصة

الآن الموظف/الـ Admin يرى:

- ✅ المنتج
- ✅ الحجم المختار
- ✅ النكهة المختارة
- ✅ الوحدة المختارة
- ✅ الكمية
- ✅ السعر

**بدون أي التباس أو غموض!**

