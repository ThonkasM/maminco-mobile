import { apiFetch } from './client';
import type { Payment, PaymentMethod, ProcessPaymentPayload, PaymentProcessResult } from './types';

/** GET /api/payments/methods */
export function getPaymentMethods(): Promise<PaymentMethod[]> {
  return apiFetch<PaymentMethod[]>('/api/payments/methods');
}

/** GET /api/payments/orders/:orderId */
export function getPaymentsByOrder(orderId: string): Promise<Payment[]> {
  return apiFetch<Payment[]>(`/api/payments/orders/${orderId}`);
}

/** POST /api/payments/orders/:orderId */
export function processPayment(
  orderId: string,
  payload: ProcessPaymentPayload,
): Promise<PaymentProcessResult> {
  return apiFetch<PaymentProcessResult>(`/api/payments/orders/${orderId}`, {
    method: 'POST',
    body: payload,
  });
}
