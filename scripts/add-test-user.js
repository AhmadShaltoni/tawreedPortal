// One-off script: create a regular test BUYER account for trying the mobile app.
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const PHONE = '0781111111'
const USERNAME = 'test'
const PASSWORD = 'Test@6768'
const CITY_NAME = 'عمان'
const AREA_NAME = 'طبربور'

async function main() {
  const existing = await prisma.user.findUnique({ where: { phone: PHONE } })
  if (existing) {
    console.log(`⚠️  يوجد مستخدم بالرقم ${PHONE} مسبقاً (${existing.username}) — تم التخطي`)
    return
  }

  // Resolve structured location (city + area) if available.
  const city = await prisma.city.findFirst({ where: { name: { contains: CITY_NAME } } })
  const area = city
    ? await prisma.area.findFirst({ where: { cityId: city.id, name: { contains: AREA_NAME } } })
    : null

  const passwordHash = await hash(PASSWORD, 12)

  const user = await prisma.user.create({
    data: {
      phone: PHONE,
      username: USERNAME,
      passwordHash,
      role: 'BUYER',
      isVerified: true,
      isActive: true,
      city: [city?.name ?? CITY_NAME, area?.name ?? AREA_NAME].join(' - '),
      cityId: city?.id ?? null,
      areaId: area?.id ?? null,
    },
  })

  console.log(`✅ تم إنشاء المستخدم ${USERNAME} (${PHONE})`)
  console.log(`   المدينة: ${city?.name ?? '— (غير مطابقة)'} | المنطقة: ${area?.name ?? '— (غير مطابقة)'}`)
  console.log(`   المعرّف: ${user.id}`)
}

main()
  .catch((error) => {
    console.error('❌ خطأ:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
