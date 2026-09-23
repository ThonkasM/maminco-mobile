/** Formatting helpers. Currency is Bolivianos (Bs). */

export function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function formatCurrency(value: number | string | null | undefined): string {
  return `Bs ${toNumber(value).toFixed(2)}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return toNumber(value).toLocaleString('es-BO');
}

export function formatPercent(value: number | string | null | undefined, digits = 0): string {
  return `${toNumber(value).toFixed(digits)}%`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Ocurrió un error inesperado.';
}

export function shortId(id?: string | null): string {
  if (!id) return '—';
  return id.slice(0, 8).toUpperCase();
}

export function roleLabel(role?: string | null): string {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'Administrador';
    case 'MANAGER':
      return 'Gerente';
    case 'CASHIER':
      return 'Cajero';
    case 'WAITER':
      return 'Mesero';
    default:
      return 'Usuario';
  }
}

export function orderStatusLabel(status?: string | null): string {
  switch (status) {
    case 'DRAFT':
      return 'Abierta';
    case 'CLOSED':
      return 'Cerrada';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return '—';
  }
}
