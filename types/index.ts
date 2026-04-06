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
  quantity: number
  unit: Unit
  pricePerUnit: number
  totalPrice: number
  orderId: string
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
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  price: number
  compareAtPrice: number | null
  image: string | null
  images: string[]
  categoryId: string
  unit: Unit
  sku: string | null
  barcode: string | null
  stock: number
  minOrderQuantity: number
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  id: string
  quantity: number
  buyerId: string
  productId: string
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

export type CartItemWithProduct = CartItem & {
  product: ProductWithCategory
}

export type CategoryWithProducts = Category & {
  products: Product[]
  _count?: { products: number }
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
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}
