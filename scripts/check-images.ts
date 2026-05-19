/**
 * Check current image paths in database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkImages() {
  console.log('🔍 Checking current image paths in database...\n')

  // Check products
  console.log('📦 === PRODUCTS ===\n')
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      image: true,
    },
    take: 20,
  })

  console.log(`Total products: ${products.length}\n`)
  
  products.forEach((p) => {
    console.log(`Product: ${p.name}`)
    console.log(`  Image: ${p.image || '(no image)'}`)
    console.log()
  })

  // Check categories
  console.log('\n📂 === CATEGORIES ===\n')
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      image: true,
    },
  })

  console.log(`Total categories: ${categories.length}\n`)
  
  categories.forEach((c) => {
    console.log(`Category: ${c.name}`)
    console.log(`  Image: ${c.image || '(no image)'}`)
    console.log()
  })

  // Count by image type
  const localProducts = await prisma.product.count({
    where: {
      image: {
        startsWith: '/uploads/',
      },
    },
  })

  const cloudinaryProducts = await prisma.product.count({
    where: {
      image: {
        contains: 'cloudinary',
      },
    },
  })

  const localCategories = await prisma.category.count({
    where: {
      image: {
        startsWith: '/uploads/',
      },
    },
  })

  const cloudinaryCategories = await prisma.category.count({
    where: {
      image: {
        contains: 'cloudinary',
      },
    },
  })

  console.log('\n📊 === SUMMARY ===\n')
  console.log(`Products with local paths (/uploads/): ${localProducts}`)
  console.log(`Products with Cloudinary URLs: ${cloudinaryProducts}`)
  console.log(`Categories with local paths (/uploads/): ${localCategories}`)
  console.log(`Categories with Cloudinary URLs: ${cloudinaryCategories}`)

  await prisma.$disconnect()
}

checkImages()
