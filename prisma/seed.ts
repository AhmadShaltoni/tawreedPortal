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
  name: 'عمّان',
  nameEn: 'Amman',
  sortOrder: 1,
  areas: [
    { name: 'الجبيهة', nameEn: 'Jubeiha' },
    { name: 'طبربور', nameEn: 'Tabarbour' },
    { name: 'أبو نصير', nameEn: 'Abu Nsair' },
    { name: 'شفا بدران', nameEn: 'Shafa Badran' },
    { name: 'صويلح', nameEn: 'Sweileh' },
    { name: 'تلاع العلي', nameEn: 'Tlaa Al-Ali' },
    { name: 'خلدا', nameEn: 'Khalda' },
    { name: 'أم السماق الشمالي', nameEn: 'Um Al-Summaq North' },
    { name: 'أم السماق الجنوبي', nameEn: 'Um Al-Summaq South' },
    { name: 'عبدون', nameEn: 'Abdoun' },
    { name: 'الرابية', nameEn: 'Al-Rabieh' },
    { name: 'دير غبار', nameEn: 'Deir Ghbar' },
    { name: 'أم أذينة', nameEn: 'Um Uthaina' },
    { name: 'الشميساني', nameEn: 'Shmeisani' },
    { name: 'العبدلي', nameEn: 'Al-Abdali' },
    { name: 'جبل عمّان', nameEn: 'Jabal Amman' },
    { name: 'جبل الحسين', nameEn: 'Jabal Al-Hussein' },
    { name: 'جبل اللويبدة', nameEn: 'Jabal Al-Lweibdeh' },
    { name: 'رأس العين', nameEn: 'Ras Al-Ain' },
    { name: 'وسط البلد', nameEn: 'Downtown' },
    { name: 'المهاجرين', nameEn: 'Al-Muhajireen' },
    { name: 'المحطة', nameEn: 'Al-Mahatta' },
    { name: 'رغدان', nameEn: 'Raghadan' },
    { name: 'ماركا الشمالية', nameEn: 'Marka North' },
    { name: 'ماركا الجنوبية', nameEn: 'Marka South' },
    { name: 'ماركا', nameEn: 'Marka' },
    { name: 'الهاشمي الشمالي', nameEn: 'Al-Hashmi North' },
    { name: 'الهاشمي الجنوبي', nameEn: 'Al-Hashmi South' },
    { name: 'الأشرفية', nameEn: 'Ashrafiyeh' },
    { name: 'جبل التاج', nameEn: 'Jabal Al-Taj' },
    { name: 'جبل النصر', nameEn: 'Jabal Al-Nasr' },
    { name: 'جبل النظيف', nameEn: 'Jabal Al-Natheef' },
    { name: 'بسمان', nameEn: 'Basman' },
    { name: 'النزهة', nameEn: 'Al-Nuzha' },
    { name: 'القصور', nameEn: 'Al-Qusour' },
    { name: 'اليرموك', nameEn: 'Yarmouk' },
    { name: 'الزهور', nameEn: 'Al-Zohour' },
    { name: 'النصر', nameEn: 'Al-Nasr' },
    { name: 'المنارة', nameEn: 'Al-Manarah' },
    { name: 'القويسمة', nameEn: 'Al-Qweismeh' },
    { name: 'أبو علندا', nameEn: 'Abu Alanda' },
    { name: 'خريبة السوق', nameEn: 'Khraibet Al-Souq' },
    { name: 'اليادودة', nameEn: 'Al-Yadoudeh' },
    { name: 'البنيات', nameEn: 'Al-Bnayyat' },
    { name: 'المقابلين', nameEn: 'Al-Muqabalein' },
    { name: 'الياسمين', nameEn: 'Al-Yasmin' },
    { name: 'الظهير', nameEn: 'Al-Thahir' },
    { name: 'الجندويل', nameEn: 'Al-Jandaweel' },
    { name: 'ضاحية الرشيد', nameEn: 'Dahiyat Al-Rasheed' },
    { name: 'ضاحية الأمير حسن', nameEn: 'Dahiyat Al-Amir Hassan' },
    { name: 'ضاحية الحسين', nameEn: 'Dahiyat Al-Hussein' },
    { name: 'ضاحية النخيل', nameEn: 'Dahiyat Al-Nakheel' },
    { name: 'المدينة الرياضية', nameEn: 'Sports City' },
    { name: 'وادي السير', nameEn: 'Wadi Al-Seer' },
    { name: 'البيادر', nameEn: 'Al-Bayader' },
    { name: 'مرج الحمام', nameEn: 'Marj Al-Hamam' },
    { name: 'الكرسي', nameEn: 'Al-Kursi' },
    { name: 'بدر الجديدة', nameEn: 'Bader Al-Jadida' },
    { name: 'بدر', nameEn: 'Bader' },
    { name: 'ناعور', nameEn: 'Naur' },
    { name: 'حسبان', nameEn: 'Hesban' },
    { name: 'أم البساتين', nameEn: 'Um Al-Basateen' },
    { name: 'أم العمد', nameEn: 'Um Al-Amad' },
    { name: 'سحاب', nameEn: 'Sahab' },
    { name: 'أم نوارة', nameEn: 'Um Nowarah' },
    { name: 'الجيزة', nameEn: 'Al-Jizah' },
    { name: 'الموقر', nameEn: 'Al-Muwaqqar' },
    { name: 'الذهيبة الشرقية', nameEn: 'Dhuhaybah East' },
    { name: 'الذهيبة الغربية', nameEn: 'Dhuhaybah West' },
    { name: 'أم الرصاص', nameEn: 'Um Al-Rasas' },
    { name: 'مادبا طريق المطار', nameEn: 'Airport Road' },
    { name: 'الطنيب', nameEn: 'Al-Tunaib' },
    { name: 'الحمر', nameEn: 'Al-Hammar' }
  ]
},
  {
  name: 'إربد',
  nameEn: 'Irbid',
  sortOrder: 2,
  areas: [
    { name: 'وسط إربد', nameEn: 'Irbid Downtown' },
    { name: 'إيدون', nameEn: 'Aydoun' },
    { name: 'الحي الشرقي', nameEn: 'Eastern District' },
    { name: 'الحي الجنوبي', nameEn: 'Southern District' },
    { name: 'الحي الشمالي', nameEn: 'Northern District' },
    { name: 'الحي الغربي', nameEn: 'Western District' },
    { name: 'الحصن', nameEn: 'Al-Husn' },
    { name: 'الصريح', nameEn: 'Al-Sareeh' },
    { name: 'بيت راس', nameEn: 'Beit Ras' },
    { name: 'حوارة', nameEn: 'Hawara' },
    { name: 'سال', nameEn: 'Saal' },
    { name: 'بشرى', nameEn: 'Bushra' },
    { name: 'كتم', nameEn: 'Kitim' },
    { name: 'النعيمة', nameEn: 'Al-Nuaymah' },
    { name: 'بني عبيد', nameEn: 'Bani Obeid' },
    { name: 'الرمثا', nameEn: 'Al-Ramtha' },
    { name: 'الشجرة', nameEn: 'Al-Shajara' },
    { name: 'ذنيبة', nameEn: 'Dhnaibah' },
    { name: 'الطرة', nameEn: 'Al-Turra' },
    { name: 'عمراوة', nameEn: 'Amrawa' },
    { name: 'بني كنانة', nameEn: 'Bani Kinanah' },
    { name: 'سما الروسان', nameEn: 'Sama Al-Rosan' },
    { name: 'كفرسوم', nameEn: 'Kufrsoum' },
    { name: 'حريما', nameEn: 'Hareema' },
    { name: 'يبلا', nameEn: 'Yabla' },
    { name: 'ملكا', nameEn: 'Malka' },
    { name: 'خرجا', nameEn: 'Kharja' },
    { name: 'المزار الشمالي', nameEn: 'Al-Mazar Al-Shamali' },
    { name: 'حبكا', nameEn: 'Hibka' },
    { name: 'دير يوسف', nameEn: 'Deir Yousef' },
    { name: 'عنبة', nameEn: 'Anbah' },
    { name: 'الكورة', nameEn: 'Al-Koura' },
    { name: 'كفر الماء', nameEn: 'Kufr Al-Maa' },
    { name: 'كفر راكب', nameEn: 'Kufr Rakib' },
    { name: 'دير أبي سعيد', nameEn: 'Deir Abi Saeed' },
    { name: 'تبنة', nameEn: 'Tibnah' },
    { name: 'جديتا', nameEn: 'Jdita' },
    { name: 'الطيبة', nameEn: 'Al-Taybeh' },
    { name: 'صما', nameEn: 'Samma' },
    { name: 'الوسطية', nameEn: 'Al-Wastiyyeh' },
    { name: 'كفر أسد', nameEn: 'Kufr Asad' },
    { name: 'قم', nameEn: 'Qum' },
    { name: 'الأغوار الشمالية', nameEn: 'Northern Ghors' },
    { name: 'الشونة الشمالية', nameEn: 'North Shouneh' },
    { name: 'وقاص', nameEn: 'Waqqas' },
    { name: 'المشارع', nameEn: 'Al-Masharea' },
    { name: 'أبو سيدو', nameEn: 'Abu Sido' }
  ]
},
 {
  name: 'الزرقاء',
  nameEn: 'Zarqa',
  sortOrder: 3,
  areas: [
    { name: 'وسط الزرقاء', nameEn: 'Zarqa Downtown' },
    { name: 'الزرقاء الجديدة', nameEn: 'New Zarqa' },
    { name: 'الزرقاء القديمة', nameEn: 'Old Zarqa' },
    { name: 'جبل الأمير حسن', nameEn: 'Jabal Al-Amir Hassan' },
    { name: 'جبل طارق', nameEn: 'Jabal Tareq' },
    { name: 'جبل الأميرة رحمة', nameEn: 'Jabal Al-Amira Rahma' },
    { name: 'حي رمزي', nameEn: 'Ramzi District' },
    { name: 'حي معصوم', nameEn: 'Masoum District' },
    { name: 'حي الأمير محمد', nameEn: 'Prince Mohammad District' },
    { name: 'حي الإسكان', nameEn: 'Al-Iskan' },
    { name: 'الغويرية', nameEn: 'Ghuweiriyeh' },
    { name: 'البتراوي', nameEn: 'Al-Batrawi' },
    { name: 'المدينة الصناعية', nameEn: 'Industrial City' },
    { name: 'الهاشمية', nameEn: 'Al-Hashimiyya' },
    { name: 'السخنة', nameEn: 'Sukhna' },
    { name: 'الضليل', nameEn: 'Dhlail' },
    { name: 'بيرين', nameEn: 'Bireen' },
    { name: 'الرصيفة', nameEn: 'Russeifa' },
    { name: 'حي الرشيد', nameEn: 'Al-Rasheed District' },
    { name: 'حي الملك عبدالله', nameEn: 'King Abdullah District' },
    { name: 'حي الحسين', nameEn: 'Al-Hussein District' },
    { name: 'جبل الحديد', nameEn: 'Jabal Al-Hadid' },
    { name: 'أبو صياح', nameEn: 'Abu Sayyah' },
    { name: 'أم صليح', nameEn: 'Um Sleih' },
    { name: 'الكمشة', nameEn: 'Al-Kamsha' },
    { name: 'الأزرق الشمالي', nameEn: 'North Azraq' },
    { name: 'الأزرق الجنوبي', nameEn: 'South Azraq' },
    { name: 'الأزرق', nameEn: 'Azraq' }
  ]
},
 {
  name: 'المفرق',
  nameEn: 'Mafraq',
  sortOrder: 4,
  areas: [
    { name: 'وسط المفرق', nameEn: 'Mafraq Downtown' },
    { name: 'حي الحسين', nameEn: 'Al-Hussein District' },
    { name: 'حي نوارة', nameEn: 'Nuwarah' },
    { name: 'رحاب', nameEn: 'Rehab' },
    { name: 'الخالدية', nameEn: 'Al-Khalidiyya' },
    { name: 'الصالحية', nameEn: 'Al-Salhiyya' },
    { name: 'صبحا', nameEn: 'Sabha' },
    { name: 'المنشية', nameEn: 'Al-Manshiyah' },
    { name: 'مغير السرحان', nameEn: 'Mughayyir Al-Sarhan' },
    { name: 'أم الجمال', nameEn: 'Umm Al-Jimal' },
    { name: 'الزعتري', nameEn: 'Al-Zaatari' },
    { name: 'الرويشد', nameEn: 'Al-Ruwaished' },
    { name: 'الصفاوي', nameEn: 'Al-Safawi' },
    { name: 'الحمراء', nameEn: 'Al-Hamra' },
    { name: 'الدجنية', nameEn: 'Al-Dajaniyah' },
    { name: 'البلعما', nameEn: 'Al-Balama' },
    { name: 'دير الكهف', nameEn: 'Deir Al-Kahf' },
    { name: 'السرحان', nameEn: 'Al-Sarhan' },
    { name: 'سما السرحان', nameEn: 'Sama Al-Sarhan' },
    { name: 'منشية بني حسن', nameEn: 'Manshiyat Bani Hassan' },
    { name: 'حبراص', nameEn: 'Habras' },
    { name: 'الرفاعيات', nameEn: 'Al-Rafaiyat' },
    { name: 'أم القطين', nameEn: 'Umm Al-Quttain' },
    { name: 'الحمرا', nameEn: 'Al-Hamra' },
    { name: 'الخشاعنة', nameEn: 'Al-Khashaaneh' }
  ]
},
 {
  name: 'عجلون',
  nameEn: 'Ajloun',
  sortOrder: 5,
  areas: [
    { name: 'وسط عجلون', nameEn: 'Ajloun Downtown' },
    { name: 'كفرنجة', nameEn: 'Kufranjah' },
    { name: 'عنجرة', nameEn: 'Anjarah' },
    { name: 'عبين', nameEn: 'Abeen' },
    { name: 'راجب', nameEn: 'Rajeb' },
    { name: 'عين جنا', nameEn: 'Ain Janna' },
    { name: 'صخرة', nameEn: 'Sakhrah' },
    { name: 'حلاوة', nameEn: 'Halawa' },
    { name: 'الوهادنة', nameEn: 'Al-Wahadneh' },
    { name: 'الهاشمية', nameEn: 'Al-Hashimiyah' },
    { name: 'باعون', nameEn: 'Baoun' },
    { name: 'سامتا', nameEn: 'Samta' },
    { name: 'أوصرة', nameEn: 'Awsarah' },
    { name: 'إشتفينا', nameEn: 'Eshtafina' },
    { name: 'الصفصافة', nameEn: 'Al-Safsafah' },
    { name: 'عرجان', nameEn: 'Arjan' },
    { name: 'مرصع', nameEn: 'Marsa' },
    { name: 'أم الينابيع', nameEn: 'Um Al-Yanabee' },
    { name: 'ثغرة الجب', nameEn: 'Thaghrat Al-Jub' },
    { name: 'راسون', nameEn: 'Rasoun' },
    { name: 'قلعة عجلون', nameEn: 'Ajloun Castle' }
  ]
},
{
  name: 'جرش',
  nameEn: 'Jerash',
  sortOrder: 6,
  areas: [
    { name: 'وسط جرش', nameEn: 'Jerash Downtown' },
    { name: 'سوف', nameEn: 'Souf' },
    { name: 'ساكب', nameEn: 'Sakeb' },
    { name: 'المصطبة', nameEn: 'Al-Mastabah' },
    { name: 'برما', nameEn: 'Burma' },
    { name: 'الكتة', nameEn: 'Al-Kittah' },
    { name: 'ريمون', nameEn: 'Raymun' },
    { name: 'نحلة', nameEn: 'Nahla' },
    { name: 'مرصع', nameEn: 'Marsa' },
    { name: 'قفقفا', nameEn: 'Qafqafa' },
    { name: 'دبين', nameEn: 'Dibeen' },
    { name: 'الحدادة', nameEn: 'Al-Haddadah' },
    { name: 'بليلا', nameEn: 'Balila' },
    { name: 'جبة', nameEn: 'Jubbah' },
    { name: 'الكفير', nameEn: 'Al-Kufair' },
    { name: 'مخيم جرش', nameEn: 'Jerash Camp' },
    { name: 'النسيم', nameEn: 'Al-Naseem' },
    { name: 'ظهر السرو', nameEn: 'Dhahr Al-Sarw' },
    { name: 'العين', nameEn: 'Al-Ain' },
    { name: 'الهاشمية', nameEn: 'Al-Hashimiyah' }
  ]
},
{
  name: 'مادبا',
  nameEn: 'Madaba',
  sortOrder: 7,
  areas: [
    { name: 'وسط مادبا', nameEn: 'Madaba Downtown' },
    { name: 'ذيبان', nameEn: 'Dhiban' },
    { name: 'ماعين', nameEn: 'Main' },
    { name: 'مليح', nameEn: 'Maleeh' },
    { name: 'لب', nameEn: 'Libb' },
    { name: 'الفيصلية', nameEn: 'Al-Faisaliyah' },
    { name: 'الجيزة الجنوبية', nameEn: 'South Jizah' },
    { name: 'أم الرصاص', nameEn: 'Umm Al-Rasas' },
    { name: 'المريجمة', nameEn: 'Al-Mraijmeh' },
    { name: 'النديم', nameEn: 'Al-Nadeem' },
    { name: 'حي الجامعة', nameEn: 'University District' },
    { name: 'حي الأمير حمزة', nameEn: 'Prince Hamzah District' },
    { name: 'حي المشقر', nameEn: 'Al-Mashqar' },
    { name: 'الحي الشرقي', nameEn: 'Eastern District' },
    { name: 'الحي الغربي', nameEn: 'Western District' },
    { name: 'الحي الجنوبي', nameEn: 'Southern District' },
    { name: 'الحي الشمالي', nameEn: 'Northern District' },
    { name: 'الحميمة', nameEn: 'Al-Humaimah' },
    { name: 'أم العمد', nameEn: 'Um Al-Amad' },
    { name: 'الراشدية', nameEn: 'Al-Rashidiyah' }
  ]
},
  {
  name: 'البلقاء',
  nameEn: 'Balqa',
  sortOrder: 8,
  areas: [
    { name: 'السلط', nameEn: 'Al-Salt' },
    { name: 'عين الباشا', nameEn: 'Ain Al-Basha' },
    { name: 'الفحيص', nameEn: 'Al-Fuheis' },
    { name: 'ماحص', nameEn: 'Mahis' },
    { name: 'دير علا', nameEn: 'Deir Alla' },
    { name: 'الشونة الجنوبية', nameEn: 'South Shouneh' },

    { name: 'الكرامة', nameEn: 'Al-Karamah' },
    { name: 'سويمة', nameEn: 'Sweimeh' },
    { name: 'الصبيحي', nameEn: 'Al-Subaihi' },
    { name: 'يرقا', nameEn: 'Yarqa' },
    { name: 'علان', nameEn: 'Allan' },
    { name: 'زي', nameEn: 'Zi' },
    { name: 'عارضة', nameEn: 'Arda' },
    { name: 'روضة الأمير راشد', nameEn: 'Prince Rashid Garden' },

    { name: 'أم جوزة', nameEn: 'Um Jozah' },
    { name: 'كفر هودا', nameEn: 'Kufr Huda' },
    { name: 'جديتا', nameEn: 'Jdeita' },
    { name: 'معدي', nameEn: 'Maddi' },
    { name: 'الرامة', nameEn: 'Al-Ramah' },

    { name: 'وادي شعيب', nameEn: 'Wadi Shuayb' },
    { name: 'صافوط', nameEn: 'Safout' },
    { name: 'دابوق السلط', nameEn: 'Dabouq Salt' },

    { name: 'حي الجدعة', nameEn: 'Al-Jadaa District' },
    { name: 'حي الخضر', nameEn: 'Al-Khader District' },
    { name: 'حي السلالم', nameEn: 'Al-Salalem District' },
    { name: 'حي الميدان', nameEn: 'Al-Midan District' },
    { name: 'حي الصوانية', nameEn: 'Al-Sawaniyah District' },

    { name: 'وادي الحور', nameEn: 'Wadi Al-Hour' },
    { name: 'أم خروبة', nameEn: 'Um Kharouba' },
    { name: 'المشارع', nameEn: 'Al-Masharea' }
  ]
},
 {
  name: 'الكرك',
  nameEn: 'Karak',
  sortOrder: 9,
  areas: [
    { name: 'وسط الكرك', nameEn: 'Karak Downtown' },
    { name: 'المزار الجنوبي', nameEn: 'Al-Mazar Al-Janoubi' },
    { name: 'مؤتة', nameEn: 'Mutah' },
    { name: 'القصر', nameEn: 'Al-Qasr' },
    { name: 'عي', nameEn: 'Ai' },
    { name: 'الطيبة', nameEn: 'Al-Taybah' },
    { name: 'فقوع', nameEn: 'Faqou' },
    { name: 'أدر', nameEn: 'Adir' },
    { name: 'راكين', nameEn: 'Rakin' },
    { name: 'كثربا', nameEn: 'Kathraba' },
    { name: 'الغوير', nameEn: 'Al-Ghweir' },
    { name: 'الربة', nameEn: 'Al-Rabba' },
    { name: 'جديدة', nameEn: 'Jdeideh' },
    { name: 'الثنية', nameEn: 'Al-Thaniyah' },
    { name: 'القطرانة', nameEn: 'Al-Qatraneh' },
    { name: 'الشيحان', nameEn: 'Al-Shihan' },
    { name: 'الوسية', nameEn: 'Al-Wasiyah' },
    { name: 'الأغوار الجنوبية', nameEn: 'Southern Ghors' },
    { name: 'غور الصافي', nameEn: 'Ghor Al-Safi' },
    { name: 'الحديثة', nameEn: 'Al-Haditha' },
    { name: 'فيفة', nameEn: 'Feifa' },
    { name: 'النقع', nameEn: 'Al-Naq' },
    { name: 'الخناصري', nameEn: 'Al-Khanasri' },
    { name: 'المنشية', nameEn: 'Al-Manshiyah' }
  ]
},
{
  name: 'الطفيلة',
  nameEn: 'Tafilah',
  sortOrder: 10,
  areas: [
    { name: 'وسط الطفيلة', nameEn: 'Tafilah Downtown' },
    { name: 'بصيرا', nameEn: 'Busayra' },
    { name: 'الحسا', nameEn: 'Al-Hasa' },
    { name: 'العيص', nameEn: 'Al-Ays' },
    { name: 'غرندل', nameEn: 'Ghrandal' },
    { name: 'ضانا', nameEn: 'Dana' },
    { name: 'القادسية', nameEn: 'Al-Qadisiyah' },
    { name: 'الرشادية', nameEn: 'Al-Rashadiyah' },
    { name: 'العين البيضاء', nameEn: 'Ain Al-Bayda' },
    { name: 'أبو بنا', nameEn: 'Abu Banna' },
    { name: 'أم سراب', nameEn: 'Um Sarab' },
    { name: 'السلع', nameEn: 'Al-Sila' },
    { name: 'وادي زيد', nameEn: 'Wadi Zaid' },
    { name: 'المنصورة', nameEn: 'Al-Mansoura' },
    { name: 'القطب', nameEn: 'Al-Qutb' },
    { name: 'الحديثة', nameEn: 'Al-Haditha' },
    { name: 'العراقي', nameEn: 'Al-Iraqi' },
    { name: 'جرف الدراويش', nameEn: 'Jurf Al-Darawish' }
  ]
},
{
  name: 'معان',
  nameEn: 'Maan',
  sortOrder: 11,
  areas: [
    { name: 'وسط معان', nameEn: 'Maan Downtown' },
    { name: 'الشوبك', nameEn: 'Al-Shobak' },
    { name: 'وادي موسى', nameEn: 'Wadi Musa' },
    { name: 'البتراء', nameEn: 'Petra' },
    { name: 'الحسينية', nameEn: 'Al-Hussainiya' },
    { name: 'الجفر', nameEn: 'Al-Jafr' },
    { name: 'الطيبة', nameEn: 'Al-Taybeh' },
    { name: 'الراجف', nameEn: 'Al-Rajif' },
    { name: 'أم صيحون', nameEn: 'Um Sayhoun' },
    { name: 'دلاغة', nameEn: 'Dlagha' },
    { name: 'أيل', nameEn: 'Ayl' },
    { name: 'المدورة', nameEn: 'Al-Mudawwarah' },
    { name: 'القطرانة الجنوبية', nameEn: 'South Qatraneh' },
    { name: 'بسطا', nameEn: 'Basta' },
    { name: 'المنشية', nameEn: 'Al-Manshiyah' },
    { name: 'البيضا', nameEn: 'Al-Bayda' },
    { name: 'الرمثية', nameEn: 'Al-Ramthiya' },
    { name: 'أبو اللسن', nameEn: 'Abu Al-Lasan' }
  ]
},
 {
  name: 'العقبة',
  nameEn: 'Aqaba',
  sortOrder: 12,
  areas: [
    { name: 'وسط العقبة', nameEn: 'Aqaba Downtown' },
    { name: 'المنطقة الاقتصادية', nameEn: 'Economic Zone' },
    { name: 'الشلالة', nameEn: 'Al-Shallalah' },
    { name: 'التاسعة', nameEn: 'Al-Tasea' },

    { name: 'الرابعة', nameEn: 'Al-Rabea' },
    { name: 'الخامسة', nameEn: 'Al-Khamisa' },
    { name: 'السادسة', nameEn: 'Al-Sadisa' },
    { name: 'السابعة', nameEn: 'Al-Sabea' },
    { name: 'الثامنة', nameEn: 'Al-Thamina' },

    { name: 'الكرامة', nameEn: 'Al-Karamah' },
    { name: 'الحرفية', nameEn: 'Al-Herfiyah' },
    { name: 'الريشة', nameEn: 'Al-Risha' },
    { name: 'القويرة', nameEn: 'Al-Quwayrah' },
    { name: 'الديسة', nameEn: 'Al-Diseh' },
    { name: 'وادي رم', nameEn: 'Wadi Rum' },

    { name: 'الشاطئ الجنوبي', nameEn: 'South Beach' },
    { name: 'الشاطئ الشمالي', nameEn: 'North Beach' },
    { name: 'تالا باي', nameEn: 'Tala Bay' },
    { name: 'المحدود', nameEn: 'Al-Mahdood' },
    { name: 'مارينا العقبة', nameEn: 'Aqaba Marina' },
    { name: 'حي الأمير حمزة', nameEn: 'Prince Hamzah District' },
    { name: 'حي الحسين', nameEn: 'Al-Hussein District' }
  ]
},
]

async function main() {
  console.log('🌱 Seeding database...')

  // Seed default selling unit types (admin-manageable at /admin/units)
  const defaultUnitTypes = [
    { code: 'PIECE', name: 'حبة', nameEn: 'Piece', defaultPieces: 1, sortOrder: 0 },
    { code: 'DOZEN', name: 'دزينة', nameEn: 'Dozen', defaultPieces: 12, sortOrder: 1 },
    { code: 'CARTON', name: 'كرتونة', nameEn: 'Carton', defaultPieces: 1, sortOrder: 2 },
    { code: 'BOX', name: 'صندوق', nameEn: 'Box', defaultPieces: 1, sortOrder: 3 },
    { code: 'PACK', name: 'عبوة', nameEn: 'Pack', defaultPieces: 1, sortOrder: 4 },
    { code: 'KG', name: 'كيلو', nameEn: 'Kilogram', defaultPieces: 1, sortOrder: 5 },
    { code: 'GRAM', name: 'جرام', nameEn: 'Gram', defaultPieces: 1, sortOrder: 6 },
    { code: 'LITER', name: 'لتر', nameEn: 'Liter', defaultPieces: 1, sortOrder: 7 },
    { code: 'PALLET', name: 'طبلية', nameEn: 'Pallet', defaultPieces: 1, sortOrder: 8 },
  ]
  for (const ut of defaultUnitTypes) {
    await prisma.unitType.upsert({
      where: { code: ut.code },
      update: {},
      create: ut,
    })
  }
  console.log(`✅ Seeded ${defaultUnitTypes.length} unit types`)

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

  // Seed loyalty system config singletons
  const loyaltyConfig = await prisma.loyaltyConfig.findFirst()
  if (!loyaltyConfig) {
    await prisma.loyaltyConfig.create({
      data: {
        isEnabled: true,
        pointsPerJod: 10,        // 1 JOD = 10 points
        calculationBase: 1,       // Calculate per 1 JOD
        minOrderValue: null,      // No minimum
        excludeDeliveryFees: true,
        roundingMode: 'FLOOR',
      },
    })
    console.log('✅ Initialized loyalty system config')
  }

  const welcomeBonusConfig = await prisma.welcomeBonusConfig.findFirst()
  if (!welcomeBonusConfig) {
    await prisma.welcomeBonusConfig.create({
      data: {
        isEnabled: true,
        points: 100,
        trigger: 'SIGNUP',
      },
    })
    console.log('✅ Initialized welcome bonus config')
  }

  const referralConfig = await prisma.referralConfig.findFirst()
  if (!referralConfig) {
    await prisma.referralConfig.create({
      data: {
        isEnabled: true,
        inviterPoints: 50,
        inviteePoints: 50,
        trigger: 'FIRST_DELIVERED_ORDER',
      },
    })
    console.log('✅ Initialized referral config')
  }

  // Seed delivery system config
  const deliveryConfig = await prisma.deliveryConfig.findFirst()
  if (!deliveryConfig) {
    await prisma.deliveryConfig.create({
      data: {
        isEnabled: true,
        defaultFee: 3.0,
        freeDeliveryEnabled: false,
        freeDeliveryThreshold: null,
        freeDeliveryScope: 'ALL_CITIES',
        minOrderAmount: null,
        estimatedDeliveryDays: 2,
      },
    })
    console.log('✅ Initialized delivery config')
  }

  // Seed delivery zones for all cities
  const allCities = await prisma.city.findMany()
  let zonesCreated = 0
  for (const city of allCities) {
    const existingZone = await prisma.deliveryZone.findUnique({ where: { cityId: city.id } })
    if (!existingZone) {
      await prisma.deliveryZone.create({
        data: {
          cityId: city.id,
          fee: 3.0,
          isActive: true,
          isVisible: true,
          sortOrder: city.sortOrder,
        },
      })
      zonesCreated++
    }
  }
  if (zonesCreated > 0) {
    console.log(`✅ Created ${zonesCreated} delivery zones`)
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
