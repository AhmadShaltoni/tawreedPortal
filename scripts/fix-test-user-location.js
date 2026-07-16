// One-off script: link the test user to the correct structured city/area.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PHONE = '0781111111'
const CITY_EN = 'Amman'
const AREA_NAME = 'طبربور'

async function main() {
  const city = await prisma.city.findFirst({ where: { nameEn: CITY_EN } })
  if (!city) throw new Error('لم يتم العثور على مدينة عمّان')

  const area = await prisma.area.findFirst({ where: { cityId: city.id, name: AREA_NAME } })
  if (!area) throw new Error('لم يتم العثور على منطقة طبربور')

  const user = await prisma.user.update({
    where: { phone: PHONE },
    data: {
      cityId: city.id,
      areaId: area.id,
      city: `${city.name} - ${area.name}`,
    },
  })

  console.log(`✅ تم تحديث موقع المستخدم ${user.username} (${PHONE})`)
  console.log(`   المدينة: ${city.name} | المنطقة: ${area.name}`)
}

main()
  .catch((error) => {
    console.error('❌ خطأ:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
