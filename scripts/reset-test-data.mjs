/**
 * سكربت تنظيف بيانات الاختبار (لمرة واحدة، قبل الإطلاق) — DESTRUCTIVE / لا رجعة.
 *
 * يحذف:
 *   - كل الطلبات (Order) الـ٩ التجريبية + أصنافها (OrderItem) وطلبات التعديل (OrderEditRequest) بالتتابع (cascade)
 *   - كل حركات نقاط الولاء (LoyaltyTransaction) وسجلّها (LoyaltyAuditLog) والمكافآت المستردة (RedeemedReward)
 * ويصفّر أرصدة الولاء (LoyaltyBalance → 0).
 *
 * لا يمسّ: إعدادات الولاء (LoyaltyConfig) ولا كتالوج المكافآت (LoyaltyReward) ولا المنتجات/التصنيفات.
 *
 * حواجز أمان: يتوقّف إن لم تعد القاعدة تطابق اللقطة (9 طلبات/4 حركات/1 مكافأة/1 رصيد)،
 * أو إن وُجد طلب لمشترٍ غير تجريبي.
 *
 * التشغيل من داخل مجلد tawreedPortal:  node scripts/reset-test-data.mjs
 * (نسخة احتياطية JSON محفوظة مسبقاً في مجلد الـ scratchpad قبل أي تعديل.)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({ log: ['error'] })
const ALLOWED_TEST_PHONES = new Set(['0798336958', '0781111111', '+962000000000'])

async function main() {
  const [orderN, txN, rrN, balN] = await Promise.all([
    db.order.count(), db.loyaltyTransaction.count(), db.redeemedReward.count(), db.loyaltyBalance.count(),
  ])
  console.log(`PRE  → orders=${orderN} loyaltyTx=${txN} redeemedRewards=${rrN} balances=${balN}`)

  if (orderN !== 9 || txN !== 4 || rrN !== 1 || balN !== 1) {
    console.log('ABORT: القاعدة لم تعد تطابق اللقطة (تغيّر متزامن). لم يُنفَّذ أي حذف.')
    process.exit(2)
  }

  const orders = await db.order.findMany({ include: { buyer: { select: { phone: true } } } })
  const rogue = orders.filter((o) => !ALLOWED_TEST_PHONES.has(o.buyer?.phone ?? ''))
  if (rogue.length) {
    console.log('ABORT: وُجدت طلبات غير تجريبية:', rogue.map((o) => o.orderNumber))
    process.exit(3)
  }

  const result = await db.$transaction(async (tx) => {
    const delOrders = await tx.order.deleteMany({}) // cascades OrderItem + OrderEditRequest
    const delTx = await tx.loyaltyTransaction.deleteMany({})
    const delRR = await tx.redeemedReward.deleteMany({})
    const delAudit = await tx.loyaltyAuditLog.deleteMany({})
    const resetBal = await tx.loyaltyBalance.updateMany({ data: { totalEarned: 0, totalRedeemed: 0, currentBalance: 0 } })
    return { delOrders: delOrders.count, delTx: delTx.count, delRR: delRR.count, delAudit: delAudit.count, resetBal: resetBal.count }
  })
  console.log('MUTATION →', JSON.stringify(result))

  const deliveredAgg = await db.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalPrice: true }, _count: { _all: true } })
  const [ordersAfter, txAfter, rrAfter] = await Promise.all([db.order.count(), db.loyaltyTransaction.count(), db.redeemedReward.count()])
  const bals = await db.loyaltyBalance.findMany()
  const [cfg, rewards, products] = await Promise.all([db.loyaltyConfig.count(), db.loyaltyReward.count(), db.product.count()])

  console.log('\n=== POST-STATE ===')
  console.log(`orders total = ${ordersAfter}`)
  console.log(`DELIVERED revenue = ${(deliveredAgg._sum.totalPrice ?? 0).toFixed(2)} JOD (count=${deliveredAgg._count._all})`)
  console.log(`loyaltyTransactions = ${txAfter}  redeemedRewards = ${rrAfter}`)
  console.log('balances:', bals.map((b) => `current=${b.currentBalance}`).join(' | ') || '(none)')
  console.log(`UNTOUCHED → loyaltyConfig=${cfg} loyaltyRewards(catalog)=${rewards} products=${products}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
