/**
 * Upload all local images to Cloudinary (without database update)
 * This generates a CSV report that you can use to manually link images
 */

import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface UploadedImage {
  localPath: string
  fileName: string
  cloudinaryUrl: string
  type: 'product' | 'category'
}

async function uploadImageToCloudinary(
  localPath: string,
  folder: string
): Promise<string | null> {
  try {
    console.log(`   📤 Uploading: ${path.basename(localPath)}`)
    
    const result = await cloudinary.uploader.upload(localPath, {
      folder: `tawreed/${folder}`,
      resource_type: 'image',
    })

    console.log(`   ✅ Uploaded: ${result.secure_url}`)
    return result.secure_url
  } catch (error) {
    console.error(`   ❌ Failed to upload ${localPath}:`, error)
    return null
  }
}

async function uploadAllImages() {
  const uploadedImages: UploadedImage[] = []
  const productsDir = path.join(process.cwd(), 'public/uploads/products')
  const categoriesDir = path.join(process.cwd(), 'public/uploads/categories')

  console.log('🚀 Starting bulk upload to Cloudinary...\n')

  // Upload product images
  console.log('📦 === UPLOADING PRODUCT IMAGES ===\n')
  if (fs.existsSync(productsDir)) {
    const productFiles = fs.readdirSync(productsDir)
    console.log(`Found ${productFiles.length} product images\n`)

    for (const file of productFiles) {
      const fullPath = path.join(productsDir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(file)) {
        const cloudinaryUrl = await uploadImageToCloudinary(
          fullPath,
          'products'
        )

        if (cloudinaryUrl) {
          uploadedImages.push({
            localPath: `/uploads/products/${file}`,
            fileName: file,
            cloudinaryUrl,
            type: 'product',
          })
        }
        console.log()
      }
    }
  }

  // Upload category images
  console.log('\n📂 === UPLOADING CATEGORY IMAGES ===\n')
  if (fs.existsSync(categoriesDir)) {
    const categoryFiles = fs.readdirSync(categoriesDir)
    console.log(`Found ${categoryFiles.length} category images\n`)

    for (const file of categoryFiles) {
      const fullPath = path.join(categoriesDir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(file)) {
        const cloudinaryUrl = await uploadImageToCloudinary(
          fullPath,
          'categories'
        )

        if (cloudinaryUrl) {
          uploadedImages.push({
            localPath: `/uploads/categories/${file}`,
            fileName: file,
            cloudinaryUrl,
            type: 'category',
          })
        }
        console.log()
      }
    }
  }

  // Generate CSV report
  const csvPath = path.join(process.cwd(), 'uploaded-images-report.csv')
  const csvHeader = 'Type,Local File,Cloudinary URL\n'
  const csvRows = uploadedImages
    .map((img) => `${img.type},"${img.fileName}","${img.cloudinaryUrl}"`)
    .join('\n')
  const csvContent = csvHeader + csvRows

  fs.writeFileSync(csvPath, csvContent, 'utf-8')

  // Generate Markdown report
  const mdPath = path.join(process.cwd(), 'uploaded-images-report.md')
  let mdContent = '# 📊 Cloudinary Upload Report\n\n'
  mdContent += `**Date:** ${new Date().toLocaleString('ar-JO')}\n\n`
  mdContent += `**Total Uploaded:** ${uploadedImages.length} images\n\n`

  mdContent += '## 📦 Product Images\n\n'
  const productImages = uploadedImages.filter((img) => img.type === 'product')
  mdContent += `Total: ${productImages.length}\n\n`
  mdContent += '| File Name | Cloudinary URL |\n'
  mdContent += '|-----------|----------------|\n'
  productImages.forEach((img) => {
    mdContent += `| ${img.fileName} | ${img.cloudinaryUrl} |\n`
  })

  mdContent += '\n## 📂 Category Images\n\n'
  const categoryImages = uploadedImages.filter((img) => img.type === 'category')
  mdContent += `Total: ${categoryImages.length}\n\n`
  mdContent += '| File Name | Cloudinary URL |\n'
  mdContent += '|-----------|----------------|\n'
  categoryImages.forEach((img) => {
    mdContent += `| ${img.fileName} | ${img.cloudinaryUrl} |\n`
  })

  mdContent += '\n---\n\n'
  mdContent += '## 🔧 How to Update Database\n\n'
  mdContent += '### For Products:\n'
  mdContent += '```sql\n'
  mdContent += `-- Example:\n`
  mdContent += `UPDATE "Product" SET image = 'CLOUDINARY_URL' WHERE id = 'PRODUCT_ID';\n`
  mdContent += '```\n\n'
  mdContent += '### For Categories:\n'
  mdContent += '```sql\n'
  mdContent += `-- Example:\n`
  mdContent += `UPDATE "Category" SET image = 'CLOUDINARY_URL' WHERE id = 'CATEGORY_ID';\n`
  mdContent += '```\n'

  fs.writeFileSync(mdPath, mdContent, 'utf-8')

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 === UPLOAD SUMMARY ===')
  console.log('='.repeat(60))
  console.log(`\n✅ Total images uploaded: ${uploadedImages.length}`)
  console.log(`   📦 Products: ${productImages.length}`)
  console.log(`   📂 Categories: ${categoryImages.length}`)
  console.log(`\n📄 Reports generated:`)
  console.log(`   - CSV: uploaded-images-report.csv`)
  console.log(`   - Markdown: uploaded-images-report.md`)
  console.log('\n' + '='.repeat(60))
  console.log('\n✨ All images are now on Cloudinary!')
  console.log('📝 Check the reports to link images to products/categories\n')
}

uploadAllImages()
