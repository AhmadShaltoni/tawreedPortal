// One-off script: permanently delete specific users (by phone) and all their orders.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PHONES = ['0781111111', '0798888881', '0792222222', '0791111111']

async function main() {
  for (const phone of PHONES) {
    const user = await prisma.user.findUnique({ where: { phone } })

    if (!user) {
      console.log(`⚠️  لا يوجد مستخدم بالرقم ${phone} — تم التخطي`)
      continue
    }

    await prisma.$transaction(async (tx) => {
      // Delete orders where this user is the buyer or the supplier
      // (OrderItems and other order-scoped rows cascade on order delete).
      const deletedOrders = await tx.order.deleteMany({
        where: { OR: [{ buyerId: user.id }, { supplierId: user.id }] },
      })

      // Delete the user. Remaining relations (cart, notifications, loyalty,
      // referrals, requests/offers, discount usages, device tokens) cascade
      // or are nullified per the schema.
      await tx.user.delete({ where: { id: user.id } })

      console.log(
        `✅ تم حذف المستخدم ${phone} (${user.username}) — طلبات محذوفة: ${deletedOrders.count}`
      )
    })
  }
}

main()
  .catch((error) => {
    console.error('❌ خطأ:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
