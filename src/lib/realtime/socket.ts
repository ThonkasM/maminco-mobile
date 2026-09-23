import { io, type Socket } from 'socket.io-client';

import { API_BASE } from '@/lib/api/client';
import type { OrderStatus, TableStatus } from '@/lib/api/types';

const SOCKET_BASE = (process.env.EXPO_PUBLIC_SOCKET_URL || API_BASE).replace(/\/+$/, '');

/** socket.io namespace used by the orders/tables gateway. */
export const ORDERS_NAMESPACE = `${SOCKET_BASE}/orders`;
/** socket.io namespace used by the payments gateway. */
export const PAYMENTS_NAMESPACE = `${SOCKET_BASE}/payments`;

export interface TableSnapshotItem {
  id: string;
  number: number;
  status: TableStatus;
  areaId: string;
  areaName?: string;
  hasActiveOrder?: boolean;
  currentOrderTotal?: number;
  itemCount?: number;
  createdByName?: string;
}

export interface TablesSnapshotEvent {
  tables: TableSnapshotItem[];
  timestamp: string;
}

export interface TableStatusChangedEvent {
  tableId: string;
  status: TableStatus;
  tableName?: string;
  areaId?: string;
  areaName?: string;
  timestamp?: string;
}

export interface OrderItemAddedEvent {
  orderId: string;
  tableId: string;
  itemId: string;
  productName?: string;
  quantity?: number;
  addedByName?: string;
  unitPrice?: number;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  tableId: string;
  newStatus: OrderStatus;
}

let ordersSocket: Socket | null = null;

/** Creates (or reuses) the authenticated `/orders` socket connection. */
export function getOrdersSocket(token: string): Socket {
  if (ordersSocket) {
    ordersSocket.auth = { token };
    if (!ordersSocket.connected) ordersSocket.connect();
    return ordersSocket;
  }

  ordersSocket = io(ORDERS_NAMESPACE, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  return ordersSocket;
}

export function getExistingOrdersSocket(): Socket | null {
  return ordersSocket;
}

export function disconnectOrdersSocket(): void {
  if (!ordersSocket) return;
  ordersSocket.removeAllListeners();
  ordersSocket.disconnect();
  ordersSocket = null;
}

/** Joins the room dedicated to a table (order + table events). */
export function joinTable(socket: Socket, tableId: string): void {
  socket.emit('join:table', tableId);
}

export function leaveTable(socket: Socket, tableId: string): void {
  socket.emit('leave:table', tableId);
}

/** Subscribes to the global table-status room. */
export function subscribeTablesStatus(socket: Socket): void {
  socket.emit('subscribe:tables:status');
}

export function unsubscribeTablesStatus(socket: Socket): void {
  socket.emit('unsubscribe:tables:status');
}
