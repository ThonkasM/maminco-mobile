import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import { API_BASE } from '@/lib/api/client';
import type { OrderKitchenStatus, OrderStatus, TableStatus } from '@/lib/api/types';

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

export interface OrderKitchenStatusChangedEvent {
  orderId: string;
  tableId: string;
  kitchenStatus: OrderKitchenStatus;
}

export interface OrdersServerEvents {
  'order:created': (event: unknown) => void;
  'order:item:added': (event: OrderItemAddedEvent) => void;
  'order:item:removed': (event: unknown) => void;
  'order:item:updated': (event: unknown) => void;
  'order:status:changed': (event: OrderStatusChangedEvent) => void;
  'order:kitchen-status:changed': (event: OrderKitchenStatusChangedEvent) => void;
  'table:state:updated': (event: unknown) => void;
  'tables:status:changed': (event: TableStatusChangedEvent) => void;
  'tables:state:snapshot': (event: TablesSnapshotEvent) => void;
  'kitchen:orders:snapshot': (event: unknown) => void;
}

export interface OrdersClientEvents {
  'join:table': (tableId: string) => void;
  'leave:table': (tableId: string) => void;
  'subscribe:tables:status': () => void;
  'unsubscribe:tables:status': () => void;
  'subscribe:kitchen': () => void;
  'unsubscribe:kitchen': () => void;
}

export type OrdersSocket = Socket<OrdersServerEvents, OrdersClientEvents>;

let ordersSocket: OrdersSocket | null = null;
let foregroundSub: { remove: () => void } | null = null;
let netSub: (() => void) | null = null;

function reconnectIfNeeded(): void {
  if (ordersSocket && !ordersSocket.connected && !ordersSocket.active) ordersSocket.connect();
}

function installLifecycleListeners(): void {
  if (!foregroundSub) {
    foregroundSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconnectIfNeeded();
    });
  }
  if (!netSub) {
    let wasOffline = false;
    netSub = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      if (wasOffline && !offline) reconnectIfNeeded();
      wasOffline = offline;
    });
  }
}

/** Creates (or reuses) the authenticated `/orders` socket connection. */
export function getOrdersSocket(token: string): OrdersSocket {
  if (ordersSocket) {
    ordersSocket.auth = { token };
    if (!ordersSocket.connected && !ordersSocket.active) ordersSocket.connect();
    return ordersSocket;
  }

  ordersSocket = io(ORDERS_NAMESPACE, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
  });
  installLifecycleListeners();
  return ordersSocket;
}

export function getExistingOrdersSocket(): OrdersSocket | null {
  return ordersSocket;
}

export function disconnectOrdersSocket(): void {
  if (!ordersSocket) return;
  ordersSocket.removeAllListeners();
  ordersSocket.disconnect();
  ordersSocket = null;
  foregroundSub?.remove();
  foregroundSub = null;
  netSub?.();
  netSub = null;
}

/** Joins the room dedicated to a table (order + table events). */
export function joinTable(socket: OrdersSocket, tableId: string): void {
  socket.emit('join:table', tableId);
}

export function leaveTable(socket: OrdersSocket, tableId: string): void {
  socket.emit('leave:table', tableId);
}

/** Subscribes to the global table-status room. */
export function subscribeTablesStatus(socket: OrdersSocket): void {
  socket.emit('subscribe:tables:status');
}

export function unsubscribeTablesStatus(socket: OrdersSocket): void {
  socket.emit('unsubscribe:tables:status');
}

/** Subscribes to the kitchen room (open orders + kitchen status changes). */
export function subscribeKitchen(socket: OrdersSocket): void {
  socket.emit('subscribe:kitchen');
}

export function unsubscribeKitchen(socket: OrdersSocket): void {
  socket.emit('unsubscribe:kitchen');
}
