/**
 * Script to migrate local images to Cloudinary
 * 
 * This script will:
 * 1. Read all images from public/uploads/products/ and public/uploads/categories/
 * 2. Upload them to Cloudinary
 * 3. Update the database with new Cloudinary URLs
 * 4. Generate a report of migrated images
 * 
 * Usage: tsx scripts/migrate-images-to-cloudinary.ts
 */

import { v2 as cloudinary } from 'cloudinary'
import { PrismaClient } from '@prisma/client'
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

const prisma = new PrismaClient()

interface MigrationResult {
  totalProducts: number
  migratedProducts: number
  failedProducts: string[]
  totalCategories: number
  migratedCategories: number
  failedCategories: string[]
}

async function uploadImageToCloudinary(
  localPath: string,
  folder: string
): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), localPath)
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  File not found: ${fullPath}`)
      return null
    }

    console.log(`   📤 Uploading: ${path.basename(localPath)}`)
    
    const result = await cloudinary.uploader.upload(fullPath, {
      folder: `tawreed/${folder}`,
      resource_type: 'image',
    })

    console.log(`   ✅ Uploaded successfully!`)
    return result.secure_url
  } catch (error) {
    console.error(`   ❌ Failed to upload ${localPath}:`, error)
    return null
  }
}

async function migrateProductImages(): Promise<{
  migrated: number
  failed: string[]
}> {
  console.log('\n🛍️  === MIGRATING PRODUCT IMAGES ===\n')

  const products = await prisma.product.findMany({
    where: {
      image: {
        startsWith: '/uploads/products/',
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
    },
  })

  console.log(`Found ${products.length} products with local images\n`)

  let migrated = 0
  const failed: string[] = []

  for (const product of products) {
    console.log(`📦 Product: ${product.name}`)
    console.log(`   Old path: ${product.image}`)

    if (!product.image) {
      console.log(`   ⏭️  Skipped (no image)\n`)
      continue
    }

    const cloudinaryUrl = await uploadImageToCloudinary(
      product.image.replace(/^\//, ''),
      'products'
    )

    if (cloudinaryUrl) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { image: cloudinaryUrl },
        })
        console.log(`   🔗 Database updated with: ${cloudinaryUrl}`)
        migrated++
      } catch (error) {
        console.error(`   ❌ Failed to update database:`, error)
        failed.push(`${product.name} (${product.id})`)
      }
    } else {
      failed.push(`${product.name} (${product.id})`)
    }

    console.log()
  }

  return { migrated, failed }
}

async function migrateCategoryImages(): Promise<{
  migrated: number
  failed: string[]
}> {
  console.log('\n📂 === MIGRATING CATEGORY IMAGES ===\n')

  const categories = await prisma.category.findMany({
    where: {
      image: {
        startsWith: '/uploads/categories/',
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
    },
  })

  console.log(`Found ${categories.length} categories with local images\n`)

  let migrated = 0
  const failed: string[] = []

  for (const category of categories) {
    console.log(`📁 Category: ${category.name}`)
    console.log(`   Old path: ${category.image}`)

    if (!category.image) {
      console.log(`   ⏭️  Skipped (no image)\n`)
      continue
    }

    const cloudinaryUrl = await uploadImageToCloudinary(
      category.image.replace(/^\//, ''),
      'categories'
    )

    if (cloudinaryUrl) {
      try {
        await prisma.category.update({
          where: { id: category.id },
          data: { image: cloudinaryUrl },
        })
        console.log(`   🔗 Database updated with: ${cloudinaryUrl}`)
        migrated++
      } catch (error) {
        console.error(`   ❌ Failed to update database:`, error)
        failed.push(`${category.name} (${category.id})`)
      }
    } else {
      failed.push(`${category.name} (${category.id})`)
    }

    console.log()
  }

  return { migrated, failed }
}

async function generateReport(result: MigrationResult) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 === MIGRATION REPORT ===')
  console.log('='.repeat(60))
  
  console.log('\n🛍️  PRODUCTS:')
  console.log(`   Total found: ${result.totalProducts}`)
  console.log(`   ✅ Successfully migrated: ${result.migratedProducts}`)
  console.log(`   ❌ Failed: ${result.failedProducts.length}`)
  if (result.failedProducts.length > 0) {
    console.log(`   Failed products:`)
    result.failedProducts.forEach((p) => console.log(`      - ${p}`))
  }
  
  console.log('\n📂 CATEGORIES:')
  console.log(`   Total found: ${result.totalCategories}`)
  console.log(`   ✅ Successfully migrated: ${result.migratedCategories}`)
  console.log(`   ❌ Failed: ${result.failedCategories.length}`)
  if (result.failedCategories.length > 0) {
    console.log(`   Failed categories:`)
    result.failedCategories.forEach((c) => console.log(`      - ${c}`))
  }
  
  console.log('\n' + '='.repeat(60))
  
  const totalMigrated = result.migratedProducts + result.migratedCategories
  const totalFailed = result.failedProducts.length + result.failedCategories.length
  
  if (totalFailed === 0) {
    console.log('🎉 SUCCESS! All images migrated successfully!')
  } else {
    console.log(`⚠️  Migration completed with ${totalFailed} failures`)
  }
  
  console.log('='.repeat(60) + '\n')
}

async function main() {
  console.log('🚀 Starting image migration to Cloudinary...\n')
  console.log('⚙️  Configuration:')
  console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`)
  console.log(`   Database: Connected\n`)

  try {
    // Migrate products
    const productResult = await migrateProductImages()

    // Migrate categories
    const categoryResult = await migrateCategoryImages()

    // Count totals
    const totalProducts = await prisma.product.count({
      where: {
        image: {
          startsWith: '/uploads/products/',
        },
      },
    })

    const totalCategories = await prisma.category.count({
      where: {
        image: {
          startsWith: '/uploads/categories/',
        },
      },
    })

    // Generate report
    const report: MigrationResult = {
      totalProducts: totalProducts + productResult.migrated,
      migratedProducts: productResult.migrated,
      failedProducts: productResult.failed,
      totalCategories: totalCategories + categoryResult.migrated,
      migratedCategories: categoryResult.migrated,
      failedCategories: categoryResult.failed,
    }

    await generateReport(report)

    // Check for remaining local images
    const remainingProducts = await prisma.product.count({
      where: {
        image: {
          startsWith: '/uploads/',
        },
      },
    })

    const remainingCategories = await prisma.category.count({
      where: {
        image: {
          startsWith: '/uploads/',
        },
      },
    })

    if (remainingProducts > 0 || remainingCategories > 0) {
      console.log('\n⚠️  WARNING: Some images still have local paths:')
      console.log(`   Products: ${remainingProducts}`)
      console.log(`   Categories: ${remainingCategories}`)
      console.log('\n   You may need to run this script again or check failed items.')
    } else {
      console.log('\n✨ Perfect! All images are now on Cloudinary!\n')
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
