const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function cleanDatabase() {
  try {
    console.log('🗑️ Starting database cleanup...\n')

    // Delete all data from all tables (respecting foreign key constraints)
    console.log('Deleting records from all tables...')

    // Order matters due to foreign keys
    await prisma.discountCodeUsage.deleteMany()
    console.log('✅ Deleted discount code usages')

    await prisma.discountCode.deleteMany()
    console.log('✅ Deleted discount codes')

    await prisma.notification.deleteMany()
    console.log('✅ Deleted notifications')

    await prisma.cartItem.deleteMany()
    console.log('✅ Deleted cart items')

    await prisma.orderItem.deleteMany()
    console.log('✅ Deleted order items')

    await prisma.order.deleteMany()
    console.log('✅ Deleted orders')

    await prisma.offer.deleteMany()
    console.log('✅ Deleted offers')

    await prisma.request.deleteMany()
    console.log('✅ Deleted requests')

    await prisma.notice.deleteMany()
    console.log('✅ Deleted notices')

    await prisma.deviceToken.deleteMany()
    console.log('✅ Deleted device tokens')

    await prisma.productUnit.deleteMany()
    console.log('✅ Deleted product units')

    await prisma.product.deleteMany()
    console.log('✅ Deleted products')

    await prisma.category.deleteMany()
    console.log('✅ Deleted categories')

    await prisma.area.deleteMany()
    console.log('✅ Deleted areas')

    await prisma.city.deleteMany()
    console.log('✅ Deleted cities')

    await prisma.user.deleteMany()
    console.log('✅ Deleted users')

    console.log('\n✨ All data cleared!\n')

    // Create fresh admin user
    console.log('Creating fresh admin user...')
    const passwordHash = await hash('Admin@123', 12)

    const adminUser = await prisma.user.create({
      data: {
        phone: '0791234567',
        passwordHash,
        username: 'مدير النظام',
        role: 'ADMIN',
        storeName: 'توريد',
        city: 'عمّان',
        isVerified: true,
        isActive: true,
      },
    })

    console.log('\n✅ Admin user created successfully!')
    console.log('\n' + '='.repeat(50))
    console.log('📋 ADMIN CREDENTIALS:')
    console.log('='.repeat(50))
    console.log(`📱 Phone: ${adminUser.phone}`)
    console.log(`🔑 Password: Admin@123`)
    console.log('='.repeat(50) + '\n')

    console.log('🎉 Database cleanup and setup complete!')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDatabase()
