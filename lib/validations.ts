// Zod validation schemas for form inputs
import { z } from 'zod'

// Auth validations
export const signUpSchema = z.object({
  username: z.string().min(2, 'اسم المستخدم مطلوب'),
  phone: z
    .string()
    .regex(/^07\d{8}$/, 'يجب أن يكون رقم الهاتف بصيغة 07xxxxxxxx'),
  storeName: z.string().min(2, 'اسم البقالة مطلوب'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[a-zA-Z]/, 'يجب أن تحتوي على حرف واحد على الأقل')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل'),
  confirmPassword: z.string(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  role: z
    .string()
    .transform((val) => val.toUpperCase())
    .pipe(z.enum(['BUYER', 'SUPPLIER'], { message: 'دور المستخدم غير صحيح' })),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
})

export const signInSchema = z.object({
  phone: z.string().regex(/^07\d{8}$/, 'صيغة الهاتف غير صحيحة'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

// Request validations
export const createRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  category: z.enum([
    'SUGAR',
    'RICE',
    'CANDY_SNACKS',
    'DAIRY',
    'BEVERAGES',
    'CANNED_GOODS',
    'COOKING_OIL',
    'FLOUR_GRAINS',
    'SPICES',
    'CLEANING',
    'PERSONAL_CARE',
    'OTHER',
  ]),
  productName: z.string().min(2, 'Product name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.enum(['KG', 'GRAM', 'LITER', 'PIECE', 'PACK', 'BOX', 'CARTON', 'DOZEN', 'PALLET']),
  brand: z.string().optional(),
  specifications: z.string().optional(),
  deliveryCity: z.string().min(2, 'Delivery city is required'),
  deliveryAddress: z.string().optional(),
  deliveryDeadline: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  maxBudget: z.coerce.number().positive().optional(),
  expiresAt: z.string().transform((val) => new Date(val)),
})

// Offer validations
export const createOfferSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  pricePerUnit: z.coerce.number().positive('Price per unit must be positive'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.enum(['KG', 'GRAM', 'LITER', 'PIECE', 'PACK', 'BOX', 'CARTON', 'DOZEN', 'PALLET']),
  deliveryDays: z.coerce.number().int().positive('Delivery days must be a positive integer'),
  deliveryNotes: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().transform((val) => new Date(val)),
})

// Order status update validation
export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: z.string().optional(),
})

// ============================================
// E-COMMERCE VALIDATIONS
// ============================================

// Product unit validation (for multi-unit pricing)
export const productUnitSchema = z.object({
  unit: z.enum(['KG', 'GRAM', 'LITER', 'PIECE', 'PACK', 'BOX', 'CARTON', 'DOZEN', 'PALLET']),
  label: z.string().min(1, 'Unit label is required'),
  labelEn: z.string().optional(),
  piecesPerUnit: z.coerce.number().int().positive('Pieces per unit must be at least 1'),
  price: z.coerce.number().positive('Price must be positive'),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  isDefault: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
})

// Product validations
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  price: z.coerce.number().positive('Price must be positive'),
  compareAtPrice: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  unit: z.enum(['KG', 'GRAM', 'LITER', 'PIECE', 'PACK', 'BOX', 'CARTON', 'DOZEN', 'PALLET']),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  minOrderQuantity: z.coerce.number().int().positive('Minimum order must be at least 1'),
  isActive: z.coerce.boolean().optional(),
})

export const updateProductSchema = createProductSchema.partial()

// Category validations
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  nameEn: z.string().optional(),
  slug: z.string()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

// Admin user creation validation
export const adminCreateUserSchema = z.object({
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: z.string().min(2, 'Username must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^07\d{8}$/, 'يجب أن يكون رقم الهاتف بصيغة 07xxxxxxxx'),
  role: z.enum(['BUYER', 'SUPPLIER', 'ADMIN']),
  storeName: z.string().optional(),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
})

// Cart validations
export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  productUnitId: z.string().optional(),
})

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
})

// Order from cart validation
export const createOrderFromCartSchema = z.object({
  deliveryAddress: z.string().min(5, 'Delivery address is required'),
  deliveryCity: z.string().min(2, 'City is required'),
  buyerNotes: z.string().optional(),
})

// Type exports from schemas
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type CreateOfferInput = z.infer<typeof createOfferSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
