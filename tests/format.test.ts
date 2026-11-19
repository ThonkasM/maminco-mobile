import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatPercent,
  formatUptime,
  getErrorMessage,
  orderStatusLabel,
  roleLabel,
  shortId,
  toNumber,
} from '@/lib/format';

describe('toNumber', () => {
  it('passes finite numbers through', () => {
    expect(toNumber(12.5)).toBe(12.5);
  });

  it('parses Decimal strings', () => {
    expect(toNumber('10.50')).toBe(10.5);
  });

  it('returns the fallback for invalid input', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined, 7)).toBe(7);
    expect(toNumber('abc', 3)).toBe(3);
    expect(toNumber('  ')).toBe(0);
    expect(toNumber(Number.NaN)).toBe(0);
    expect(toNumber(Infinity, 1)).toBe(1);
  });
});

describe('money formatting', () => {
  it('formats currency with two decimals', () => {
    expect(formatCurrency('5')).toBe('Bs 5.00');
    expect(formatCurrency(null)).toBe('Bs 0.00');
    expect(formatCurrency(1.005 * 100)).toBe('Bs 100.50');
  });

  it('formats percentages', () => {
    expect(formatPercent(12.345, 1)).toBe('12.3%');
    expect(formatPercent('50')).toBe('50%');
  });
});

describe('formatUptime', () => {
  it('picks the largest relevant units', () => {
    expect(formatUptime(45)).toBe('45 s');
    expect(formatUptime(125)).toBe('2 min 5 s');
    expect(formatUptime(3700)).toBe('1 h 1 min');
    expect(formatUptime(2 * 86400 + 4 * 3600)).toBe('2 d 4 h');
  });

  it('clamps negative and missing values', () => {
    expect(formatUptime(-10)).toBe('0 s');
    expect(formatUptime(undefined)).toBe('0 s');
  });
});

describe('labels and misc helpers', () => {
  it('maps roles to Spanish labels', () => {
    expect(roleLabel('ADMINISTRATOR')).toBe('Administrador');
    expect(roleLabel('WAITER')).toBe('Mesero');
    expect(roleLabel('COOK')).toBe('Usuario');
    expect(roleLabel(null)).toBe('Usuario');
  });

  it('maps order statuses to Spanish labels', () => {
    expect(orderStatusLabel('DRAFT')).toBe('Abierta');
    expect(orderStatusLabel('CLOSED')).toBe('Cerrada');
    expect(orderStatusLabel('CANCELLED')).toBe('Cancelada');
    expect(orderStatusLabel('nope')).toBe('—');
  });

  it('extracts error messages', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('plain')).toBe('plain');
    expect(getErrorMessage(42)).toBe('Ocurrió un error inesperado.');
  });

  it('shortens ids', () => {
    expect(shortId('abcdef1234567')).toBe('ABCDEF12');
    expect(shortId(null)).toBe('—');
  });
});
