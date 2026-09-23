import { apiFetch } from './client';
import type {
  AddOrderItemPayload,
  ChangeOrderStatusPayload,
  CreateOrderPayload,
  Order,
  OrderStatus,
  Paginated,
  UpdateOrderItemPayload,
} from './types';

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  tableId?: string;
  serviceType?: string;
  createdById?: string;
  onlyOpen?: boolean;
}

/** GET /api/orders */
export function getOrders(params: ListOrdersParams = {}): Promise<Paginated<Order>> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));
  if (params.status) query.set('status', params.status);
  if (params.tableId) query.set('tableId', params.tableId);
  if (params.serviceType) query.set('serviceType', params.serviceType);
  if (params.createdById) query.set('createdById', params.createdById);
  if (params.onlyOpen !== undefined) query.set('onlyOpen', String(params.onlyOpen));
  return apiFetch<Paginated<Order>>(`/api/orders?${query.toString()}`);
}

/** GET /api/orders/table/:tableId/active - returns `null` when no DRAFT order. */
export function getActiveOrderByTable(tableId: string): Promise<Order | null> {
  return apiFetch<Order | null>(`/api/orders/table/${tableId}/active`);
}

/** GET /api/orders/:id */
export function getOrderById(id: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`);
}

/** POST /api/orders */
export function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return apiFetch<Order>('/api/orders', { method: 'POST', body: payload });
}

/** POST /api/orders/:id/items */
export function addOrderItem(orderId: string, payload: AddOrderItemPayload): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/items`, { method: 'POST', body: payload });
}

/** PATCH /api/orders/:id/items/:itemId */
export function updateOrderItem(
  orderId: string,
  itemId: string,
  payload: UpdateOrderItemPayload,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    body: payload,
  });
}

/** DELETE /api/orders/:id/items/:itemId */
export function removeOrderItem(orderId: string, itemId: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/items/${itemId}`, { method: 'DELETE' });
}

/** PATCH /api/orders/:id/status (CASHIER / MANAGER / ADMINISTRATOR). */
export function changeOrderStatus(
  orderId: string,
  payload: ChangeOrderStatusPayload,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/status`, { method: 'PATCH', body: payload });
}
