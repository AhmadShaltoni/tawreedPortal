// Script to clear all orders from the database
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearOrders() {
  try {
    console.log('🗑️  جاري حذف جميع الطلبات...')
    
    // Delete all orders (OrderItems will be deleted automatically due to CASCADE)
    const deletedOrders = await prisma.order.deleteMany({})
    
    console.log(`✅ تم حذف ${deletedOrders.count} طلب من قاعدة البيانات`)
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ خطأ:', error.message)
    } else {
      console.error('❌ خطأ:', error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearOrders()
