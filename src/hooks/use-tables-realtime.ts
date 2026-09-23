import { useCallback, useEffect, useMemo, useState } from 'react';

import { isForbidden, tablesApi } from '@/lib/api';
import type { TableStatus } from '@/lib/api/types';
import { getErrorMessage } from '@/lib/format';
import {
  getExistingOrdersSocket,
  getOrdersSocket,
  subscribeTablesStatus,
  type TableSnapshotItem,
  type TableStatusChangedEvent,
  type TablesSnapshotEvent,
} from '@/lib/realtime/socket';
import { useAuth } from '@/providers/auth-provider';

export interface TablesRealtimeResult {
  tables: TableSnapshotItem[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  refresh: () => Promise<void>;
}

/**
 * Live table state.
 *
 * `GET /api/tables` is restricted to ADMINISTRATOR, so we treat it as a
 * best-effort bootstrap and rely on the `/orders` socket snapshot
 * (`tables:state:snapshot` / `tables:status:changed`) as the source of truth.
 */
export function useTablesRealtime(): TablesRealtimeResult {
  const { session } = useAuth();
  const token = session?.token;

  const [byId, setById] = useState<Record<string, TableSnapshotItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const loadRest = useCallback(async () => {
    try {
      const response = await tablesApi.getTables({ limit: 100 });
      setById((prev) => {
        const next = { ...prev };
        for (const table of response.data) {
          next[table.id] = {
            id: table.id,
            number: table.number,
            status: table.status,
            areaId: table.areaId,
            areaName: table.areaName,
          };
        }
        return next;
      });
      setError(null);
    } catch (err) {
      // 401/403 is expected for manager & POS roles; keep whatever the socket has.
      if (!isForbidden(err)) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRest();
  }, [loadRest]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const socket = getOrdersSocket(token);

    const onSnapshot = (event: TablesSnapshotEvent) => {
      if (!event?.tables) return;
      const next: Record<string, TableSnapshotItem> = {};
      for (const table of event.tables) next[table.id] = table;
      setById(next);
      setLoading(false);
      setError(null);
    };

    const onStatusChanged = (event: TableStatusChangedEvent) => {
      if (!event?.tableId) return;
      setById((prev) => {
        const existing = prev[event.tableId];
        const updated: TableSnapshotItem = {
          id: event.tableId,
          number: existing?.number ?? 0,
          status: event.status,
          areaId: event.areaId ?? existing?.areaId ?? '',
          areaName: event.areaName ?? existing?.areaName,
          hasActiveOrder: existing?.hasActiveOrder,
          currentOrderTotal: existing?.currentOrderTotal,
          itemCount: existing?.itemCount,
          createdByName: existing?.createdByName,
        };
        return { ...prev, [event.tableId]: updated };
      });
    };

    const onConnect = () => {
      setConnected(true);
      subscribeTablesStatus(socket);
    };
    const onDisconnect = () => setConnected(false);

    socket.on('tables:state:snapshot', onSnapshot);
    socket.on('tables:status:changed', onStatusChanged);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off('tables:state:snapshot', onSnapshot);
      socket.off('tables:status:changed', onStatusChanged);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token]);

  const tables = useMemo(
    () => Object.values(byId).sort((a, b) => a.number - b.number),
    [byId],
  );

  const refresh = useCallback(async () => {
    await loadRest();
    const socket = getExistingOrdersSocket();
    if (socket) subscribeTablesStatus(socket);
  }, [loadRest]);

  return { tables, loading, error, connected, refresh };
}

export function countByStatus(tables: TableSnapshotItem[]): Record<TableStatus, number> {
  return tables.reduce<Record<TableStatus, number>>(
    (acc, table) => {
      acc[table.status] = (acc[table.status] ?? 0) + 1;
      return acc;
    },
    { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0 },
  );
}
