/**
 * Typed DTOs mirroring the NestJS backend response shapes.
 * Numeric money fields may arrive as strings because Prisma serialises Decimal
 * values as strings; always coerce with `toNumber()` before formatting.
 */

export type UserRole = 'ADMINISTRATOR' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'COOK';
export type OrderStatus = 'DRAFT' | 'CLOSED' | 'CANCELLED';
export type OrderKitchenStatus = 'PENDING' | 'PREPARING' | 'READY';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

export const MANAGER_ROLES: readonly UserRole[] = ['ADMINISTRATOR', 'MANAGER'];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn?: number;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  isVirtual: boolean;
  isActive: boolean;
  tablesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  isActive: boolean;
  areaId: string;
  areaName?: string;
  ordersCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  productsCount?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  categoryId: string;
  categoryName: string;
  isAvailable: boolean;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number | string;
  discountAmount: number | string;
  subtotal: number | string;
  notes?: string;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  kitchenStatus: OrderKitchenStatus;
  serviceType: string;
  subtotal: number | string;
  discountAmount: number | string;
  tipAmount: number | string;
  total: number | string;
  tableId: string;
  tableName: string;
  areaId: string;
  createdById: string;
  createdByName: string;
  attendedById?: string;
  attendedByName?: string;
  closedById?: string;
  closedByName?: string;
  items: OrderItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface CreateOrderPayload {
  tableId: string;
  createdById: string;
  attendedById?: string;
  initialItems?: { productId: string; quantity: number; notes?: string }[];
}

export interface AddOrderItemPayload {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface UpdateOrderItemPayload {
  quantity: number;
  notes?: string;
}

export interface ChangeOrderStatusPayload {
  status: OrderStatus;
  autoPrint?: boolean;
  printerName?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface ProcessPaymentPayload {
  paymentMethodId: string;
  amountReceived: number;
  isExtraTip?: boolean;
  notes?: string;
}

export type PaymentProcessStatus =
  | 'PENDING_CONFIRMATION'
  | 'COMPLETED'
  | 'ERROR'
  | 'PARTIAL_PAYMENT';

export interface PaymentProcessResult {
  status: PaymentProcessStatus;
  message: string;
  orderId?: string;
  orderNumber?: string;
  paymentId?: string;
  amountReceived?: number;
  amountApplied?: number;
  changeAmount?: number | null;
  tipAmount?: number;
  totalDue?: number;
  paymentMethod?: string;
  orderStatus?: OrderStatus;
  totalPaidSoFar?: number;
  pendingBalance?: number;
  isPaid?: boolean;
  difference?: number;
  error?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  amountReceived: number;
  amountApplied: number;
  changeAmount: number | null;
  tipAmount: number;
  paymentMethod: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  createdAt: string;
}

export interface DailySales {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalDiscount: number;
  totalTips: number;
  tableOrders: number;
  virtualOrders: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  categoryName: string;
  quantitySold: number;
  unitPrice: number;
  totalRevenue: number;
}

export interface DailyReport {
  date: string;
  sales: DailySales;
  topProducts: TopProduct[];
}
