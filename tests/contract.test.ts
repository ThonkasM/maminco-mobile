import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MANAGER_ROLES, type OrderStatus, type TableStatus, type UserRole } from '@/lib/api/types';
import { orderStatusLabel, roleLabel } from '@/lib/format';

const contractPath = path.resolve(__dirname, '../../contratos.md');
const contract = existsSync(contractPath) ? readFileSync(contractPath, 'utf8') : null;

function enumValues(name: string): string[] {
  const match = contract?.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm'));
  return match ? match[1].split('|').map((value) => value.trim()) : [];
}

const roles: UserRole[] = ['ADMINISTRATOR', 'MANAGER', 'CASHIER', 'WAITER', 'COOK'];
const orderStatuses: OrderStatus[] = ['DRAFT', 'CLOSED', 'CANCELLED'];
const tableStatuses: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED'];

describe('enums match contratos.md', () => {
  it.skipIf(!contract)('UserRole', () => {
    expect(enumValues('UserRole')).toEqual(roles);
  });

  it.skipIf(!contract)('OrderStatus', () => {
    expect(enumValues('OrderStatus')).toEqual(orderStatuses);
  });

  it.skipIf(!contract)('TableStatus', () => {
    expect(enumValues('TableStatus')).toEqual(tableStatuses);
  });
});

describe('role helpers', () => {
  it('treats only administrator and manager as manager roles', () => {
    expect([...MANAGER_ROLES]).toEqual(['ADMINISTRATOR', 'MANAGER']);
    expect(MANAGER_ROLES.includes('WAITER')).toBe(false);
  });

  it('labels every role except cook with a specific Spanish name', () => {
    const labels = roles.filter((r) => r !== 'COOK').map(roleLabel);
    expect(new Set(labels).size).toBe(4);
    expect(labels).not.toContain('Usuario');
  });

  it('labels every order status', () => {
    for (const status of orderStatuses) expect(orderStatusLabel(status)).not.toBe('—');
  });
});
