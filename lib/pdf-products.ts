export interface ProductExportRow {
  name: string
  image: string | null
  stock: number
  unitInfo: string
  wholesalePrice: string
  appPrice: string
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

export async function generateProductsPDF(products: ProductExportRow[]): Promise<void> {
  // Convert all images to base64 for offline printing
  const imageMap = new Map<string, string>()
  const imagePromises = products
    .filter((p) => p.image)
    .map(async (p) => {
      const base64 = await imageToBase64(p.image!)
      if (base64) imageMap.set(p.image!, base64)
    })
  await Promise.all(imagePromises)

  const rows = products
    .map((p) => {
      const imgSrc = p.image ? (imageMap.get(p.image) || p.image) : ''
      const imageCell = imgSrc
        ? `<td class="img-cell"><img src="${imgSrc}" alt="" /></td>`
        : `<td class="img-cell"><div class="placeholder">📦</div></td>`

      return `<tr>
        ${imageCell}
        <td class="name-cell" colspan="2">${escapeHtml(p.name)}</td>
        <td class="center-cell">${p.stock}</td>
        <td class="center-cell">${escapeHtml(p.unitInfo)}</td>
        <td class="center-cell">${escapeHtml(p.wholesalePrice)}</td>
        <td class="center-cell">${escapeHtml(p.appPrice)}</td>
        <td class="center-cell"></td>
        <td class="notes-cell" colspan="2"></td>
      </tr>`
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقرير مخزون المنتجات - توريد</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 10mm 18mm 10mm;
      @bottom-center {
        content: counter(page) " / " counter(pages);
        font-size: 9pt;
        color: #666;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 11pt;
      direction: rtl;
      color: #1a1a1a;
      background: #fff;
    }

    .header {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #1e3a8a;
    }

    .header h1 {
      font-size: 18pt;
      color: #1e3a8a;
      margin-bottom: 4px;
    }

    .header .subtitle {
      font-size: 10pt;
      color: #666;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    th {
      background-color: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 8px 6px;
      font-weight: 600;
      font-size: 10pt;
      text-align: center;
      color: #374151;
    }

    td {
      border: 1px solid #d1d5db;
      padding: 6px;
      vertical-align: middle;
      font-size: 10pt;
    }

    .img-cell {
      width: 60px;
      height: 60px;
      text-align: center;
      padding: 3px;
    }

    .img-cell img {
      width: 55px;
      height: 55px;
      object-fit: contain;
      border-radius: 4px;
    }

    .img-cell .placeholder {
      width: 55px;
      height: 55px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9fafb;
      border-radius: 4px;
      font-size: 20pt;
      margin: 0 auto;
    }

    .name-cell {
      text-align: right;
      font-weight: 500;
      min-width: 180px;
    }

    .center-cell {
      text-align: center;
      min-width: 80px;
    }

    .notes-cell {
      min-width: 160px;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: #666;
      padding: 4px;
    }

    @media print {
      .no-print {
        display: none !important;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    .toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1e3a8a;
      color: white;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 1000;
      direction: rtl;
    }

    .toolbar button {
      background: white;
      color: #1e3a8a;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 11pt;
      font-weight: 600;
      cursor: pointer;
    }

    .toolbar button:hover {
      background: #dbeafe;
    }

    .toolbar span {
      font-size: 11pt;
    }

    .content {
      margin-top: 60px;
    }

    @media print {
      .content {
        margin-top: 0;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
    <span>تقرير مخزون المنتجات - ${products.length} منتج</span>
  </div>

  <div class="content">
    <div class="header">
      <h1>تقرير مخزون المنتجات</h1>
      <div class="subtitle">توريد - سوق الجملة | ${new Date().toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>الصورة</th>
          <th colspan="2">اسم المنتج</th>
          <th>عدد المخزون</th>
          <th>نوع الوحدة (العدد)</th>
          <th>سعر الجملة</th>
          <th>سعر التطبيق</th>
          <th></th>
          <th colspan="2">ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`

  // Open in new tab
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
