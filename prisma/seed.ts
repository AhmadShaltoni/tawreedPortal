import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// Parent (root) categories
const rootCategories = [
  { name: 'مواد تموينية', nameEn: 'Grocery Supplies', slug: 'grocery-supplies', sortOrder: 1 },
  { name: 'مشروبات ومأكولات', nameEn: 'Food & Beverages', slug: 'food-beverages', sortOrder: 2 },
  { name: 'منظفات وعناية', nameEn: 'Cleaning & Care', slug: 'cleaning-care', sortOrder: 3 },
  { name: 'أخرى', nameEn: 'Other', slug: 'other', sortOrder: 4 },
]

// Subcategories mapped to their parent slug
const subcategories: Record<string, Array<{ name: string; nameEn: string; slug: string; sortOrder: number }>> = {
  'grocery-supplies': [
    { name: 'سكر', nameEn: 'Sugar', slug: 'sugar', sortOrder: 1 },
    { name: 'أرز', nameEn: 'Rice', slug: 'rice', sortOrder: 2 },
    { name: 'زيت طبخ', nameEn: 'Cooking Oil', slug: 'cooking-oil', sortOrder: 3 },
    { name: 'طحين وحبوب', nameEn: 'Flour & Grains', slug: 'flour-grains', sortOrder: 4 },
    { name: 'بهارات', nameEn: 'Spices', slug: 'spices', sortOrder: 5 },
  ],
  'food-beverages': [
    { name: 'حلويات وسناكات', nameEn: 'Candy & Snacks', slug: 'candy-snacks', sortOrder: 1 },
    { name: 'منتجات الألبان', nameEn: 'Dairy Products', slug: 'dairy', sortOrder: 2 },
    { name: 'مشروبات', nameEn: 'Beverages', slug: 'beverages', sortOrder: 3 },
    { name: 'معلبات', nameEn: 'Canned Goods', slug: 'canned-goods', sortOrder: 4 },
  ],
  'cleaning-care': [
    { name: 'مواد تنظيف', nameEn: 'Cleaning Products', slug: 'cleaning', sortOrder: 1 },
    { name: 'عناية شخصية', nameEn: 'Personal Care', slug: 'personal-care', sortOrder: 2 },
  ],
}

// All Jordan cities with their areas
const jordanCities: { name: string; nameEn: string; sortOrder: number; areas: { name: string; nameEn: string }[] }[] = [
  {
    name: 'عمّان', nameEn: 'Amman', sortOrder: 1,
    areas: [
      { name: 'الجبيهة', nameEn: 'Jubeiha' },
      { name: 'طبربور', nameEn: 'Tabarbour' },
      { name: 'أبو نصير', nameEn: 'Abu Nsair' },
      { name: 'شفا بدران', nameEn: 'Shafa Badran' },
      { name: 'صويلح', nameEn: 'Sweileh' },
      { name: 'تلاع العلي', nameEn: 'Tlaa Al-Ali' },
      { name: 'خلدا', nameEn: 'Khalda' },
      { name: 'عبدون', nameEn: 'Abdoun' },
      { name: 'الرابية', nameEn: 'Al-Rabiyeh' },
      { name: 'دير غبار', nameEn: 'Deir Ghbar' },
      { name: 'الشميساني', nameEn: 'Shmeisani' },
      { name: 'جبل عمّان', nameEn: 'Jabal Amman' },
      { name: 'جبل الحسين', nameEn: 'Jabal Al-Hussein' },
      { name: 'جبل اللويبدة', nameEn: 'Jabal Al-Lweibdeh' },
      { name: 'وسط البلد', nameEn: 'Downtown' },
      { name: 'ماركا', nameEn: 'Marka' },
      { name: 'الهاشمي الشمالي', nameEn: 'Al-Hashmi Al-Shamali' },
      { name: 'الأشرفية', nameEn: 'Ashrafiyeh' },
      { name: 'جبل التاج', nameEn: 'Jabal Al-Taj' },
      { name: 'جبل النصر', nameEn: 'Jabal Al-Nasr' },
      { name: 'جبل النظيف', nameEn: 'Jabal Al-Natheef' },
      { name: 'سحاب', nameEn: 'Sahab' },
      { name: 'القويسمة', nameEn: 'Al-Qweismeh' },
      { name: 'أم نوارة', nameEn: 'Um Nowarah' },
      { name: 'الجيزة', nameEn: 'Al-Jizah' },
      { name: 'الموقر', nameEn: 'Al-Muwaqqar' },
      { name: 'ناعور', nameEn: 'Na\'ur' },
      { name: 'وادي السير', nameEn: 'Wadi Al-Seer' },
      { name: 'مرج الحمام', nameEn: 'Marj Al-Hamam' },
      { name: 'الظهير', nameEn: 'Al-Thahir' },
      { name: 'ضاحية الرشيد', nameEn: 'Dahiyat Al-Rasheed' },
      { name: 'ضاحية الأمير حسن', nameEn: 'Dahiyat Al-Amir Hassan' },
      { name: 'الياسمين', nameEn: 'Al-Yasmin' },
      { name: 'الجندويل', nameEn: 'Al-Jandaweel' },
      { name: 'أم أذينة', nameEn: 'Um Uthaina' },
    ],
  },
  {
    name: 'إربد', nameEn: 'Irbid', sortOrder: 2,
    areas: [
      { name: 'وسط إربد', nameEn: 'Irbid Downtown' },
      { name: 'الحصن', nameEn: 'Al-Husn' },
      { name: 'الرمثا', nameEn: 'Al-Ramtha' },
      { name: 'بني كنانة', nameEn: 'Bani Kinanah' },
      { name: 'الأغوار الشمالية', nameEn: 'Northern Ghors' },
      { name: 'الكورة', nameEn: 'Al-Koura' },
      { name: 'بني عبيد', nameEn: 'Bani Obeid' },
      { name: 'المزار الشمالي', nameEn: 'Al-Mazar Al-Shamali' },
      { name: 'الطيبة', nameEn: 'Al-Taybeh' },
      { name: 'الوسطية', nameEn: 'Al-Wastiyyeh' },
    ],
  },
  {
    name: 'الزرقاء', nameEn: 'Zarqa', sortOrder: 3,
    areas: [
      { name: 'وسط الزرقاء', nameEn: 'Zarqa Downtown' },
      { name: 'الزرقاء الجديدة', nameEn: 'New Zarqa' },
      { name: 'الرصيفة', nameEn: 'Russeifa' },
      { name: 'الهاشمية', nameEn: 'Al-Hashimiyya' },
      { name: 'الأزرق', nameEn: 'Azraq' },
      { name: 'بيرين', nameEn: 'Bireen' },
    ],
  },
  {
    name: 'المفرق', nameEn: 'Mafraq', sortOrder: 4,
    areas: [
      { name: 'وسط المفرق', nameEn: 'Mafraq Downtown' },
      { name: 'رحاب', nameEn: 'Rehab' },
      { name: 'الصالحية', nameEn: 'Al-Salhiyya' },
      { name: 'بلدة الخالدية', nameEn: 'Al-Khalidiyya' },
      { name: 'صبحا', nameEn: 'Sabha' },
    ],
  },
  {
    name: 'عجلون', nameEn: 'Ajloun', sortOrder: 5,
    areas: [
      { name: 'قلعة عجلون', nameEn: 'Ajloun Castle' },
      { name: 'كفرنجة', nameEn: 'Kufranjah' },
      { name: 'عنجرة', nameEn: 'Anjarah' },
      { name: 'عبين', nameEn: 'Abeen' },
      { name: 'راجب', nameEn: 'Rajeb' },
    ],
  },
  {
    name: 'جرش', nameEn: 'Jerash', sortOrder: 6,
    areas: [
      { name: 'وسط جرش', nameEn: 'Jerash Downtown' },
      { name: 'سوف', nameEn: 'Souf' },
      { name: 'المصطبة', nameEn: 'Al-Mastabah' },
      { name: 'برما', nameEn: 'Burma' },
      { name: 'ساكب', nameEn: 'Sakeb' },
    ],
  },
  {
    name: 'مادبا', nameEn: 'Madaba', sortOrder: 7,
    areas: [
      { name: 'وسط مادبا', nameEn: 'Madaba Downtown' },
      { name: 'ذيبان', nameEn: 'Dhiban' },
      { name: 'ماعين', nameEn: 'Ma\'in' },
    ],
  },
  {
    name: 'البلقاء', nameEn: 'Balqa', sortOrder: 8,
    areas: [
      { name: 'السلط', nameEn: 'Al-Salt' },
      { name: 'عين الباشا', nameEn: 'Ain Al-Basha' },
      { name: 'الفحيص', nameEn: 'Al-Fuhais' },
      { name: 'ماحص', nameEn: 'Mahis' },
      { name: 'دير علّا', nameEn: 'Deir Alla' },
      { name: 'الشونة الجنوبية', nameEn: 'South Shouneh' },
    ],
  },
  {
    name: 'الكرك', nameEn: 'Karak', sortOrder: 9,
    areas: [
      { name: 'وسط الكرك', nameEn: 'Karak Downtown' },
      { name: 'المزار الجنوبي', nameEn: 'Al-Mazar Al-Janoubi' },
      { name: 'الأغوار الجنوبية', nameEn: 'Southern Ghors' },
      { name: 'القصر', nameEn: 'Al-Qasr' },
      { name: 'مؤتة', nameEn: 'Mu\'tah' },
    ],
  },
  {
    name: 'الطفيلة', nameEn: 'Tafilah', sortOrder: 10,
    areas: [
      { name: 'وسط الطفيلة', nameEn: 'Tafilah Downtown' },
      { name: 'بصيرا', nameEn: 'Busayra' },
      { name: 'الحسا', nameEn: 'Al-Hasa' },
    ],
  },
  {
    name: 'معان', nameEn: 'Ma\'an', sortOrder: 11,
    areas: [
      { name: 'وسط معان', nameEn: 'Ma\'an Downtown' },
      { name: 'الشوبك', nameEn: 'Al-Shobak' },
      { name: 'البتراء / وادي موسى', nameEn: 'Petra / Wadi Musa' },
      { name: 'الحسينية', nameEn: 'Al-Hussainiyya' },
    ],
  },
  {
    name: 'العقبة', nameEn: 'Aqaba', sortOrder: 12,
    areas: [
      { name: 'وسط العقبة', nameEn: 'Aqaba Downtown' },
      { name: 'المنطقة الاقتصادية', nameEn: 'Economic Zone' },
      { name: 'الشلّالة', nameEn: 'Al-Shallalah' },
      { name: 'التاسعة', nameEn: 'Al-Tase\'a' },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Seed hierarchical categories
  let totalCategories = 0
  for (const rootCat of rootCategories) {
    // Create or update root category
    const root = await prisma.category.upsert({
      where: { slug: rootCat.slug },
      update: { name: rootCat.name, nameEn: rootCat.nameEn, sortOrder: rootCat.sortOrder, parentId: null, depth: 0 },
      create: { ...rootCat, depth: 0, path: '' },
    })
    // Update path to include own ID
    await prisma.category.update({
      where: { id: root.id },
      data: { path: root.id },
    })
    totalCategories++

    // Create subcategories for this root
    const children = subcategories[rootCat.slug] || []
    for (const childCat of children) {
      const child = await prisma.category.upsert({
        where: { slug: childCat.slug },
        update: { name: childCat.name, nameEn: childCat.nameEn, sortOrder: childCat.sortOrder, parentId: root.id, depth: 1 },
        create: { ...childCat, parentId: root.id, depth: 1, path: '' },
      })
      await prisma.category.update({
        where: { id: child.id },
        data: { path: `${root.id}/${child.id}` },
      })
      totalCategories++
    }
  }
  console.log(`✅ Seeded ${totalCategories} categories (hierarchical)`)

  // Seed Jordan cities and areas
  let totalAreas = 0
  for (const cityData of jordanCities) {
    const { areas, ...cityFields } = cityData

    // Upsert city by nameEn (unique enough for seed)
    let city = await prisma.city.findFirst({ where: { nameEn: cityFields.nameEn } })
    if (!city) {
      city = await prisma.city.create({ data: cityFields })
    } else {
      city = await prisma.city.update({
        where: { id: city.id },
        data: { name: cityFields.name, sortOrder: cityFields.sortOrder },
      })
    }

    // Upsert areas
    for (const areaData of areas) {
      const existingArea = await prisma.area.findFirst({
        where: { nameEn: areaData.nameEn, cityId: city.id },
      })
      if (!existingArea) {
        await prisma.area.create({
          data: { ...areaData, cityId: city.id },
        })
      } else {
        await prisma.area.update({
          where: { id: existingArea.id },
          data: { name: areaData.name },
        })
      }
      totalAreas++
    }
  }
  console.log(`✅ Seeded ${jordanCities.length} cities with ${totalAreas} areas`)

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

  // Seed sample products with variants
  const sugarCategory = await prisma.category.findFirst({ where: { slug: 'sugar' } })
  const riceCategory = await prisma.category.findFirst({ where: { slug: 'rice' } })

  if (sugarCategory) {
    const existingProduct = await prisma.product.findFirst({ where: { name: 'سكر أبيض' } })
    if (!existingProduct) {
      await prisma.product.create({
        data: {
          name: 'سكر أبيض',
          nameEn: 'White Sugar',
          description: 'سكر أبيض ناعم عالي الجودة',
          descriptionEn: 'High quality fine white sugar',
          categoryId: sugarCategory.id,
          isActive: true,
          sortOrder: 0,
          variants: {
            create: [
              {
                size: '2 كيلو',
                sizeEn: '2kg',
                stock: 100,
                minOrderQuantity: 1,
                isDefault: true,
                sortOrder: 0,
                units: {
                  create: [
                    { unit: 'PIECE', label: 'قطعة', labelEn: 'Piece', piecesPerUnit: 1, price: 3, isDefault: true, sortOrder: 0 },
                    { unit: 'DOZEN', label: 'دزينة', labelEn: 'Dozen', piecesPerUnit: 12, price: 33, isDefault: false, sortOrder: 1 },
                  ],
                },
              },
              {
                size: '4 كيلو',
                sizeEn: '4kg',
                stock: 50,
                minOrderQuantity: 1,
                isDefault: false,
                sortOrder: 1,
                units: {
                  create: [
                    { unit: 'PIECE', label: 'قطعة', labelEn: 'Piece', piecesPerUnit: 1, price: 5, isDefault: true, sortOrder: 0 },
                    { unit: 'DOZEN', label: 'دزينة', labelEn: 'Dozen', piecesPerUnit: 12, price: 55, isDefault: false, sortOrder: 1 },
                  ],
                },
              },
              {
                size: '10 كيلو',
                sizeEn: '10kg',
                stock: 30,
                minOrderQuantity: 1,
                isDefault: false,
                sortOrder: 2,
                units: {
                  create: [
                    { unit: 'PIECE', label: 'قطعة', labelEn: 'Piece', piecesPerUnit: 1, price: 10, isDefault: true, sortOrder: 0 },
                  ],
                },
              },
            ],
          },
        },
      })
      console.log('✅ Created sample product: سكر أبيض (3 variants)')
    }
  }

  if (riceCategory) {
    const existingProduct = await prisma.product.findFirst({ where: { name: 'أرز بسمتي' } })
    if (!existingProduct) {
      await prisma.product.create({
        data: {
          name: 'أرز بسمتي',
          nameEn: 'Basmati Rice',
          description: 'أرز بسمتي هندي طويل الحبة',
          descriptionEn: 'Indian long grain basmati rice',
          categoryId: riceCategory.id,
          isActive: true,
          sortOrder: 1,
          variants: {
            create: [
              {
                size: '1 كيلو',
                sizeEn: '1kg',
                stock: 200,
                minOrderQuantity: 1,
                isDefault: true,
                sortOrder: 0,
                units: {
                  create: [
                    { unit: 'PIECE', label: 'قطعة', labelEn: 'Piece', piecesPerUnit: 1, price: 2.5, isDefault: true, sortOrder: 0 },
                    { unit: 'CARTON', label: 'كرتونة', labelEn: 'Carton', piecesPerUnit: 24, price: 55, isDefault: false, sortOrder: 1 },
                  ],
                },
              },
              {
                size: '5 كيلو',
                sizeEn: '5kg',
                stock: 80,
                minOrderQuantity: 1,
                isDefault: false,
                sortOrder: 1,
                units: {
                  create: [
                    { unit: 'PIECE', label: 'قطعة', labelEn: 'Piece', piecesPerUnit: 1, price: 10, isDefault: true, sortOrder: 0 },
                  ],
                },
              },
            ],
          },
        },
      })
      console.log('✅ Created sample product: أرز بسمتي (2 variants)')
    }
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
