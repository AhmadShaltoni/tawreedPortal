// Type definitions for the B2B Grocery Marketplace
// These types mirror the Prisma schema

// Enums
export type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN'
export type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED' | 'EXPIRED'
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type NotificationType = 'NEW_REQUEST' | 'NEW_OFFER' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'ORDER_UPDATE' | 'NEW_ORDER' | 'ORDER_STATUS_CHANGE' | 'SYSTEM'
export type ProductCategory = 'SUGAR' | 'RICE' | 'CANDY_SNACKS' | 'DAIRY' | 'BEVERAGES' | 'CANNED_GOODS' | 'COOKING_OIL' | 'FLOUR_GRAINS' | 'SPICES' | 'CLEANING' | 'PERSONAL_CARE' | 'OTHER'
export type Unit = 'KG' | 'GRAM' | 'LITER' | 'PIECE' | 'PACK' | 'BOX' | 'CARTON' | 'DOZEN' | 'PALLET'

// Base model types
export interface User {
  id: string
  email: string | null
  passwordHash: string
  username: string
  phone: string
  role: UserRole
  storeName: string | null
  businessAddress: string | null
  city: string | null
  deliveryAreas: string[]
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Request {
  id: string
  title: string
  description: string | null
  category: ProductCategory
  productName: string
  quantity: number
  unit: Unit
  brand: string | null
  specifications: string | null
  deliveryCity: string
  deliveryAddress: string | null
  deliveryDeadline: Date | null
  maxBudget: number | null
  status: RequestStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  buyerId: string
}

export interface Offer {
  id: string
  pricePerUnit: number
  totalPrice: number
  quantity: number
  unit: Unit
  deliveryDays: number
  deliveryNotes: string | null
  notes: string | null
  validUntil: Date
  status: OfferStatus
  createdAt: Date
  updatedAt: Date
  requestId: string
  supplierId: string
}

export interface Order {
  id: string
  orderNumber: string
  totalPrice: number
  deliveryAddress: string
  deliveryCity: string
  expectedDelivery: Date | null
  actualDelivery: Date | null
  status: OrderStatus
  statusHistory: unknown
  buyerNotes: string | null
  adminNotes: string | null
  createdAt: Date
  updatedAt: Date
  buyerId: string
  supplierId: string | null
  requestId: string | null
  offerId: string | null
}

export interface OrderItem {
  id: string
  productId: string | null
  productName: string
  productNameEn: string | null
  productImage: string | null
  variantSize: string | null
  variantSizeEn: string | null
  unitLabel: string | null
  unitLabelEn: string | null
  piecesPerUnit: number
  quantity: number
  unit: Unit
  pricePerUnit: number
  totalPrice: number
  orderId: string
}

export interface ProductUnit {
  id: string
  unit: Unit
  label: string
  labelEn: string | null
  piecesPerUnit: number
  price: number
  wholesalePrice: number | null
  compareAtPrice: number | null
  isDefault: boolean
  sortOrder: number
  variantId: string
  createdAt: Date
  updatedAt: Date
}

export interface ProductVariant {
  id: string
  size: string
  sizeEn: string | null
  sku: string | null
  barcode: string | null
  stock: number
  minOrderQuantity: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  productId: string
  createdAt: Date
  updatedAt: Date
}

// E-commerce models
export interface Category {
  id: string
  name: string
  nameEn: string | null
  slug: string
  image: string | null
  sortOrder: number
  isActive: boolean
  parentId: string | null
  depth: number
  path: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  image: string | null
  images: string[]
  categoryId: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  id: string
  quantity: number
  buyerId: string
  variantId: string
  productUnitId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  linkUrl: string | null
  isRead: boolean
  createdAt: Date
  userId: string
}

// Extended types with relations
export type RequestWithRelations = Request & {
  buyer: User
  offers: OfferWithSupplier[]
  order?: Order | null
}

export type OfferWithSupplier = Offer & {
  supplier: User
}

export type OfferWithRequest = Offer & {
  request: Request & {
    buyer: User
  }
}

export type OrderWithRelations = Order & {
  buyer: User
  supplier: User | null
  items: OrderItemWithProduct[]
  request?: Request | null
  offer?: Offer | null
}

export type OrderItemWithProduct = OrderItem & {
  product: Product | null
}

export type ProductWithCategory = Product & {
  category: Category
}

export type ProductVariantWithUnits = ProductVariant & {
  units: ProductUnit[]
}

export type ProductWithVariants = Product & {
  category: Category
  variants: ProductVariantWithUnits[]
}

export type CartItemWithProduct = CartItem & {
  variant: ProductVariant & {
    product: ProductWithCategory
    units: ProductUnit[]
  }
  productUnit: ProductUnit | null
}

export type CategoryWithProducts = Category & {
  products: Product[]
  _count?: { products: number }
}

export type CategoryWithChildren = Category & {
  children: CategoryWithChildren[]
  _count?: { products: number; children: number }
}

export type CategoryBreadcrumb = {
  id: string
  name: string
  nameEn: string | null
  slug: string
}

export type NotificationWithUser = Notification & {
  user: User
}

// Form types for creating/updating entities
export interface CreateRequestInput {
  title: string
  description?: string
  category: ProductCategory
  productName: string
  quantity: number
  unit: Unit
  brand?: string
  specifications?: string
  deliveryCity: string
  deliveryAddress?: string
  deliveryDeadline?: Date
  maxBudget?: number
  expiresAt: Date
}

export interface CreateOfferInput {
  requestId: string
  pricePerUnit: number
  totalPrice: number
  quantity: number
  unit: Unit
  deliveryDays: number
  deliveryNotes?: string
  notes?: string
  validUntil: Date
}

export interface UpdateOrderStatusInput {
  orderId: string
  status: OrderStatus
  note?: string
}

// Auth types
export interface SignUpInput {
  email: string
  password: string
  username: string
  phone?: string
  role: UserRole
  storeName?: string
  businessAddress?: string
  city?: string
}

export interface SignInInput {
  email: string
  password: string
}

// API response types
export interface ActionResponse<T = void> {
  success: boolean
  data?: T
  error?: string
  errors?: Record<string, string[]>
}

// Discount Code types
export interface DiscountCode {
  id: string
  code: string
  discountPercent: number
  isSingleUse: boolean
  maxUsage: number | null
  minOrderAmount: number | null
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DiscountCodeUsage {
  id: string
  discountAmount: number
  orderTotal: number
  createdAt: Date
  discountCodeId: string
  userId: string
  orderId: string | null
}

export type DiscountCodeWithStats = DiscountCode & {
  _count: { usages: number }
}

export type DiscountCodeWithUsages = DiscountCode & {
  usages: (DiscountCodeUsage & { user: Pick<User, 'id' | 'username' | 'phone'> })[]
  _count: { usages: number }
}

export interface ValidateDiscountCodeResult {
  valid: boolean
  discountPercent?: number
  discountAmount?: number
  finalTotal?: number
  error?: string
  message?: string
}

// Dashboard stats types
export interface BuyerDashboardStats {
  totalRequests: number
  activeRequests: number
  totalOffers: number
  completedOrders: number
  pendingOrders: number
}

export interface SupplierDashboardStats {
  availableRequests: number
  submittedOffers: number
  acceptedOffers: number
  activeOrders: number
  completedOrders: number
}

export interface AdminDashboardStats {
  totalProducts: number
  activeProducts: number
  totalOrders: number
  pendingOrders: number
  activeOrders: number
  completedOrders: number
  totalRevenue: number
  totalBuyers: number
  totalCategories: number
}

// UI types
export interface SelectOption {
  value: string
  label: string
}

// Category labels for display
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  SUGAR: 'Sugar',
  RICE: 'Rice',
  CANDY_SNACKS: 'Candy & Snacks',
  DAIRY: 'Dairy Products',
  BEVERAGES: 'Beverages',
  CANNED_GOODS: 'Canned Goods',
  COOKING_OIL: 'Cooking Oil',
  FLOUR_GRAINS: 'Flour & Grains',
  SPICES: 'Spices',
  CLEANING: 'Cleaning Products',
  PERSONAL_CARE: 'Personal Care',
  OTHER: 'Other',
}

// Unit labels for display
export const UNIT_LABELS: Record<Unit, string> = {
  KG: 'Kilogram (kg)',
  GRAM: 'Gram (g)',
  LITER: 'Liter (L)',
  PIECE: 'Piece',
  PACK: 'Pack',
  BOX: 'Box',
  CARTON: 'Carton',
  DOZEN: 'Dozen',
  PALLET: 'Pallet',
}

// Status labels for display
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}
