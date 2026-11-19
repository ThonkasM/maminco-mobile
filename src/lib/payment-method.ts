const LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
};

export function paymentMethodLabel(code: string, name: string): string {
  return LABELS[code] ?? name;
}
