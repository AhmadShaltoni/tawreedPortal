// Helpers for dispatching an order to a delivery driver:
// - buildWhatsAppMessage: plain-text message (WhatsApp only supports *bold*,
//   emoji and newlines — no real colors, so we emphasize with 🔴 / ⚠️ / *bold*)
// - buildOrderSheetHtml: a self-contained, colored printable sheet (real red
//   highlights) opened in a new window for print / save-as-PDF
import { formatCurrency } from '@/lib/utils'

type Lang = 'ar' | 'en'

export interface DispatchOrderItem {
  id: string
  productName: string
  productNameEn: string | null
  variantSize: string | null
  variantSizeEn: string | null
  variantOptionName: string | null
  variantOptionNameEn: string | null
  unitLabel: string | null
  unitLabelEn: string | null
  quantity: number
  unit: string
  pricePerUnit: number
  totalPrice: number
  note: string | null
  isReward?: boolean
  // Most specific image resolved server-side: flavor → size → product
  displayImage?: string | null
}

export interface DispatchOrder {
  orderNumber: string
  totalPrice: number
  deliveryFee?: number
  createdAt: Date | string
  deliveryCity: string
  deliveryAddress: string
  deliveryAddressDetails: string | null
  buyerNotes: string | null
  buyer: {
    username: string
    storeName: string | null
    phone: string | null
  }
  items: DispatchOrderItem[]
}

// Bilingual micro-labels so the module stays independent of the i18n context
const L = {
  ar: {
    forCollection: 'طلب للتجهيز والتوصيل',
    urgent: 'عاجل',
    orderNo: 'رقم الطلب',
    date: 'التاريخ',
    customerData: 'بيانات العميل',
    name: 'الاسم',
    phone: 'الهاتف',
    city: 'المدينة',
    address: 'العنوان',
    addressDetails: 'العنوان التفصيلي',
    customerNote: 'ملاحظة العميل',
    items: 'الأصناف',
    quantity: 'الكمية',
    note: 'ملاحظة',
    account: 'الحساب',
    deliveryFee: 'رسوم التوصيل',
    total: 'الإجمالي',
    flavor: 'نكهة',
    free: 'مجاناً (مكافأة)',
    attention: 'الأصناف المميزة بعلامة ⚠️ تحتاج انتباهًا خاصًا',
    print: 'طباعة / حفظ كـ PDF',
    printHint: 'اطبع أو احفظ كـ PDF ثم أرفقها في واتساب',
  },
  en: {
    forCollection: 'Order for collection & delivery',
    urgent: 'URGENT',
    orderNo: 'Order no.',
    date: 'Date',
    customerData: 'Customer details',
    name: 'Name',
    phone: 'Phone',
    city: 'City',
    address: 'Address',
    addressDetails: 'Address details',
    customerNote: 'Customer note',
    items: 'Items',
    quantity: 'Qty',
    note: 'Note',
    account: 'Summary',
    deliveryFee: 'Delivery fee',
    total: 'Total',
    flavor: 'Flavor',
    free: 'FREE (reward)',
    attention: 'Items marked with ⚠️ need special attention',
    print: 'Print / save as PDF',
    printHint: 'Print or save as PDF, then attach it in WhatsApp',
  },
} as const

function shortOrderNo(orderNumber: string): string {
  return orderNumber.slice(-8)
}

function itemName(item: DispatchOrderItem, lang: Lang): string {
  return lang === 'ar' ? item.productName : item.productNameEn || item.productName
}

// Variant/size/flavor/unit descriptors as one line, e.g. "٥ كغ · نكهة: فراولة"
function itemDetails(item: DispatchOrderItem, lang: Lang): string {
  const t = L[lang]
  const parts: string[] = []
  const size = lang === 'ar' ? item.variantSize : item.variantSizeEn || item.variantSize
  const option = lang === 'ar' ? item.variantOptionName : item.variantOptionNameEn || item.variantOptionName
  const unit = lang === 'ar' ? item.unitLabel : item.unitLabelEn || item.unitLabel
  if (size) parts.push(size)
  if (option) parts.push(`${t.flavor}: ${option}`)
  if (unit) parts.push(unit)
  return parts.join(' · ')
}

function fmtDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// Price line as plain text (WhatsApp). For qty > 1 show the breakdown
// "unit × qty = total"; rewards are free.
function itemPriceText(item: DispatchOrderItem, lang: Lang): string {
  if (item.isReward) return `🎁 ${L[lang].free}`
  if (item.quantity > 1) {
    return `${formatCurrency(item.pricePerUnit)} × ${item.quantity} = ${formatCurrency(item.totalPrice)}`
  }
  return formatCurrency(item.totalPrice)
}

// Same price line for the printable sheet, with the line total emphasized.
function itemPriceHtml(item: DispatchOrderItem, lang: Lang): string {
  if (item.isReward) return `<span class="price-free">🎁 ${esc(L[lang].free)}</span>`
  if (item.quantity > 1) {
    return `${formatCurrency(item.pricePerUnit)} × ${item.quantity} = <strong>${formatCurrency(item.totalPrice)}</strong>`
  }
  return `<strong>${formatCurrency(item.totalPrice)}</strong>`
}

// Normalize a locally-typed phone to WhatsApp digits with a Jordan default code.
export function normalizeWhatsAppPhone(raw: string, defaultCountryCode = '962'): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits.slice(1)
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return defaultCountryCode + digits.slice(1)
  // Already carries a country code (e.g. 9627...) — leave as-is
  if (digits.startsWith(defaultCountryCode)) return digits
  return defaultCountryCode + digits
}

// ── WhatsApp text message ──────────────────────────────────────────────────
export function buildWhatsAppMessage(order: DispatchOrder, lang: Lang): string {
  const t = L[lang]
  const customer = order.buyer.storeName || order.buyer.username
  const lines: string[] = []

  lines.push(`🔴 *${t.forCollection}*`)
  lines.push(`📦 ${t.orderNo}: #${shortOrderNo(order.orderNumber)}`)
  lines.push(`📅 ${t.date}: ${fmtDate(order.createdAt)}`)
  lines.push('')

  lines.push(`👤 *${t.customerData}*`)
  lines.push(`${t.name}: ${customer}`)
  if (order.buyer.phone) lines.push(`📞 ${t.phone}: ${order.buyer.phone}`)
  lines.push(`📍 ${t.city}: ${order.deliveryCity}`)
  lines.push(`🏠 ${t.address}: ${order.deliveryAddress}`)
  if (order.deliveryAddressDetails) lines.push(`   ${order.deliveryAddressDetails}`)

  if (order.buyerNotes) {
    lines.push('')
    lines.push(`⚠️ *${t.customerNote}:* ${order.buyerNotes}`)
  }

  lines.push('')
  lines.push(`🛒 *${t.items} (${order.items.length}):*`)
  order.items.forEach((item, i) => {
    const details = itemDetails(item, lang)
    const namePart = details ? `${itemName(item, lang)} — ${details}` : itemName(item, lang)
    // Quantity is the number the driver must collect — always highlighted
    lines.push(`${i + 1}) ${namePart}  🔢 *×${item.quantity}*`)
    lines.push(`   💵 ${itemPriceText(item, lang)}`)
    if (item.note) lines.push(`   ⚠️ ${t.note}: *${item.note}*`)
  })

  lines.push('')
  lines.push(`💰 *${t.account}*`)
  if (order.deliveryFee && order.deliveryFee > 0) {
    lines.push(`${t.deliveryFee}: ${formatCurrency(order.deliveryFee)}`)
  }
  lines.push(`*${t.total}: ${formatCurrency(order.totalPrice)}*`)

  lines.push('')
  lines.push(`——\n🔴 ${t.attention}`)

  return lines.join('\n')
}

// ── Printable colored order sheet (real red highlights) ─────────────────────
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildOrderSheetHtml(order: DispatchOrder, lang: Lang): string {
  const t = L[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const customer = order.buyer.storeName || order.buyer.username

  const rows = order.items
    .map((item, i) => {
      const details = itemDetails(item, lang)
      const noteRow = item.note
        ? `<div class="item-note">⚠️ ${esc(t.note)}: ${esc(item.note)}</div>`
        : ''
      const thumb = item.displayImage
        ? `<img class="thumb" src="${esc(item.displayImage)}" alt="" loading="eager" />`
        : `<div class="thumb thumb-placeholder">${item.isReward ? '🎁' : '📦'}</div>`
      return `
        <tr>
          <td class="col-idx">${i + 1}</td>
          <td class="col-img">${thumb}</td>
          <td class="col-name">
            <div class="item-name">${esc(itemName(item, lang))}</div>
            ${details ? `<div class="item-details">${esc(details)}</div>` : ''}
            <div class="item-price">${itemPriceHtml(item, lang)}</div>
            ${noteRow}
          </td>
          <td class="col-qty"><span class="qty">×${item.quantity}</span></td>
        </tr>`
    })
    .join('')

  const customerNote = order.buyerNotes
    ? `<div class="alert">⚠️ <strong>${esc(t.customerNote)}:</strong> ${esc(order.buyerNotes)}</div>`
    : ''

  const addressDetails = order.deliveryAddressDetails
    ? `<div class="field"><span class="label">${esc(t.addressDetails)}</span><span class="value">${esc(order.deliveryAddressDetails)}</span></div>`
    : ''

  const phoneField = order.buyer.phone
    ? `<div class="field"><span class="label">${esc(t.phone)}</span><span class="value" dir="ltr">${esc(order.buyer.phone)}</span></div>`
    : ''

  const deliveryFeeRow =
    order.deliveryFee && order.deliveryFee > 0
      ? `<div class="sum-row"><span>${esc(t.deliveryFee)}</span><span>${formatCurrency(order.deliveryFee)}</span></div>`
      : ''

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>#${esc(shortOrderNo(order.orderNumber))} — ${esc(t.forCollection)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Rubik", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif;
    margin: 0; padding: 24px; color: #111827; background: #f3f4f6;
  }
  .sheet { max-width: 780px; margin: 0 auto; background: #fff; border-radius: 14px;
    overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,.08); }
  .toolbar { max-width: 780px; margin: 0 auto 16px; display: flex; gap: 12px;
    align-items: center; justify-content: space-between; }
  .toolbar .hint { color: #6b7280; font-size: 13px; }
  .print-btn { background: #1e3a8a; color: #fff; border: 0; border-radius: 10px;
    padding: 10px 18px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .print-btn:hover { background: #1e40af; }

  .banner { background: #dc2626; color: #fff; padding: 18px 24px;
    display: flex; align-items: center; justify-content: space-between; }
  .banner .title { font-size: 20px; font-weight: 800; }
  .banner .order-no { font-size: 15px; font-weight: 700; opacity: .95; }
  .urgent { background: #fff; color: #dc2626; font-weight: 800; font-size: 12px;
    padding: 4px 10px; border-radius: 999px; letter-spacing: .5px; }

  .section { padding: 18px 24px; border-bottom: 1px solid #f0f0f0; }
  .section h2 { margin: 0 0 12px; font-size: 15px; color: #1e3a8a;
    text-transform: uppercase; letter-spacing: .4px; }
  .field { display: flex; gap: 10px; padding: 3px 0; font-size: 15px; }
  .field .label { color: #6b7280; min-width: 120px; }
  .field .value { font-weight: 600; color: #111827; }

  .alert { margin-top: 12px; background: #fef2f2; border: 1px solid #fecaca;
    color: #b91c1c; border-radius: 10px; padding: 10px 14px; font-size: 15px;
    line-height: 1.5; }

  table { width: 100%; border-collapse: collapse; }
  thead th { background: #f9fafb; text-align: start; font-size: 12px;
    text-transform: uppercase; letter-spacing: .4px; color: #6b7280;
    padding: 10px 12px; border-bottom: 2px solid #e5e7eb; }
  tbody td { padding: 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .col-idx { width: 34px; color: #9ca3af; font-weight: 700; }
  .col-img { width: 60px; }
  .col-qty { width: 90px; text-align: center; }
  .thumb { width: 56px; height: 56px; border-radius: 8px; object-fit: cover;
    border: 1px solid #e5e7eb; background: #f3f4f6; display: block; }
  .thumb-placeholder { display: flex; align-items: center; justify-content: center;
    font-size: 24px; color: #9ca3af; }
  .item-name { font-size: 16px; font-weight: 700; color: #111827; }
  .item-details { font-size: 13px; color: #6b7280; margin-top: 2px; }
  .item-note { margin-top: 6px; background: #fef2f2; border: 1px solid #fecaca;
    color: #b91c1c; border-radius: 8px; padding: 6px 10px; font-size: 14px;
    font-weight: 600; }
  .qty { display: inline-block; background: #dc2626; color: #fff; font-weight: 800;
    font-size: 17px; min-width: 52px; text-align: center; padding: 6px 8px;
    border-radius: 8px; }
  .item-price { margin-top: 4px; font-size: 14px; color: #374151; }
  .item-price strong { color: #1e3a8a; font-weight: 800; }
  .price-free { color: #ea580c; font-weight: 700; }

  .summary { padding: 18px 24px; }
  .sum-row { display: flex; justify-content: space-between; font-size: 15px;
    color: #4b5563; padding: 4px 0; }
  .sum-total { display: flex; justify-content: space-between; margin-top: 8px;
    padding-top: 12px; border-top: 2px dashed #e5e7eb; font-size: 20px;
    font-weight: 800; color: #dc2626; }

  .footer-note { padding: 14px 24px; background: #fff7ed; color: #b45309;
    font-size: 14px; font-weight: 600; text-align: center; }

  @media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none; }
    .sheet { box-shadow: none; border-radius: 0; max-width: none; }
    /* Force browsers to keep the red/colored backgrounds when printing */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="hint">${esc(t.printHint)}</span>
    <button class="print-btn" onclick="window.print()">${esc(t.print)}</button>
  </div>

  <div class="sheet">
    <div class="banner">
      <div>
        <div class="title">🔴 ${esc(t.forCollection)}</div>
        <div class="order-no">#${esc(shortOrderNo(order.orderNumber))} · ${esc(fmtDate(order.createdAt))}</div>
      </div>
      <span class="urgent">${esc(t.urgent)}</span>
    </div>

    <div class="section">
      <h2>${esc(t.customerData)}</h2>
      <div class="field"><span class="label">${esc(t.name)}</span><span class="value">${esc(customer)}</span></div>
      ${phoneField}
      <div class="field"><span class="label">${esc(t.city)}</span><span class="value">${esc(order.deliveryCity)}</span></div>
      <div class="field"><span class="label">${esc(t.address)}</span><span class="value">${esc(order.deliveryAddress)}</span></div>
      ${addressDetails}
      ${customerNote}
    </div>

    <div class="section" style="padding-inline: 0; padding-bottom: 0;">
      <h2 style="padding-inline: 24px;">${esc(t.items)} (${order.items.length})</h2>
      <table>
        <thead>
          <tr>
            <th class="col-idx">#</th>
            <th class="col-img"></th>
            <th>${esc(t.items)}</th>
            <th class="col-qty">${esc(t.quantity)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="summary">
      ${deliveryFeeRow}
      <div class="sum-total"><span>${esc(t.total)}</span><span>${formatCurrency(order.totalPrice)}</span></div>
    </div>

    <div class="footer-note">⚠️ ${esc(t.attention)}</div>
  </div>
</body>
</html>`
}
