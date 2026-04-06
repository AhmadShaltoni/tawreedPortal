import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const categories = [
  { name: 'سكر', nameEn: 'Sugar', slug: 'sugar', sortOrder: 1 },
  { name: 'أرز', nameEn: 'Rice', slug: 'rice', sortOrder: 2 },
  { name: 'حلويات وسناكات', nameEn: 'Candy & Snacks', slug: 'candy-snacks', sortOrder: 3 },
  { name: 'منتجات الألبان', nameEn: 'Dairy Products', slug: 'dairy', sortOrder: 4 },
  { name: 'مشروبات', nameEn: 'Beverages', slug: 'beverages', sortOrder: 5 },
  { name: 'معلبات', nameEn: 'Canned Goods', slug: 'canned-goods', sortOrder: 6 },
  { name: 'زيت طبخ', nameEn: 'Cooking Oil', slug: 'cooking-oil', sortOrder: 7 },
  { name: 'طحين وحبوب', nameEn: 'Flour & Grains', slug: 'flour-grains', sortOrder: 8 },
  { name: 'بهارات', nameEn: 'Spices', slug: 'spices', sortOrder: 9 },
  { name: 'مواد تنظيف', nameEn: 'Cleaning Products', slug: 'cleaning', sortOrder: 10 },
  { name: 'عناية شخصية', nameEn: 'Personal Care', slug: 'personal-care', sortOrder: 11 },
  { name: 'أخرى', nameEn: 'Other', slug: 'other', sortOrder: 12 },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Seed categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, nameEn: cat.nameEn, sortOrder: cat.sortOrder },
      create: cat,
    })
  }
  console.log(`✅ Seeded ${categories.length} categories`)

  // Seed admin user
  const adminPhone = '0791234567'
  const existingAdmin = await prisma.user.findUnique({ where: { phone: adminPhone } })

  if (!existingAdmin) {
    const passwordHash = await hash('Admin@123', 12)
    await prisma.user.create({
      data: {
        phone: adminPhone,
        passwordHash,
        username: 'مدير النظام',
        role: 'ADMIN',
        storeName: 'توريد',
        city: 'عمّان',
        isVerified: true,
        isActive: true,
      },
    })
    console.log('✅ Created admin user (0791234567 / Admin@123)')
  } else {
    console.log('ℹ️ Admin user already exists')
  }

  console.log('🌱 Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
