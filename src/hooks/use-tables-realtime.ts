import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

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
import { useRealtimeResume } from '@/hooks/use-realtime-resume';
import { useAuth } from '@/providers/auth-provider';

export interface TablesRealtimeResult {
  tables: TableSnapshotItem[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  refresh: () => Promise<void>;
}

interface TablesState {
  byId: Record<string, TableSnapshotItem>;
  ids: string[];
}

type TablesAction =
  | { type: 'merge'; tables: TableSnapshotItem[] }
  | { type: 'replace'; tables: TableSnapshotItem[] }
  | { type: 'status'; event: TableStatusChangedEvent };

function sameTable(a: TableSnapshotItem, b: TableSnapshotItem): boolean {
  return (
    a.number === b.number &&
    a.status === b.status &&
    a.areaId === b.areaId &&
    a.areaName === b.areaName &&
    a.hasActiveOrder === b.hasActiveOrder &&
    a.currentOrderTotal === b.currentOrderTotal &&
    a.itemCount === b.itemCount &&
    a.createdByName === b.createdByName
  );
}

function sortedIds(byId: Record<string, TableSnapshotItem>): string[] {
  return Object.keys(byId).sort((a, b) => byId[a].number - byId[b].number);
}

function upsert(state: TablesState, incoming: TableSnapshotItem[]): TablesState {
  let byId = state.byId;
  let needsSort = false;
  for (const table of incoming) {
    const current = byId[table.id];
    if (current && sameTable(current, table)) continue;
    if (byId === state.byId) byId = { ...state.byId };
    if (!current || current.number !== table.number) needsSort = true;
    byId[table.id] = table;
  }
  if (byId === state.byId) return state;
  return { byId, ids: needsSort ? sortedIds(byId) : state.ids };
}

function tablesReducer(state: TablesState, action: TablesAction): TablesState {
  switch (action.type) {
    case 'merge':
      return upsert(
        state,
        action.tables.map((table) => ({ ...state.byId[table.id], ...table })),
      );
    case 'replace': {
      const next = upsert(state, action.tables);
      const incomingIds = new Set(action.tables.map((table) => table.id));
      const stale = next.ids.filter((id) => !incomingIds.has(id));
      if (stale.length === 0) return next;
      const byId = { ...next.byId };
      for (const id of stale) delete byId[id];
      return { byId, ids: next.ids.filter((id) => incomingIds.has(id)) };
    }
    case 'status': {
      const { event } = action;
      const existing = state.byId[event.tableId];
      return upsert(state, [
        {
          ...existing,
          id: event.tableId,
          number: existing?.number ?? 0,
          status: event.status,
          areaId: event.areaId ?? existing?.areaId ?? '',
          areaName: event.areaName ?? existing?.areaName,
        },
      ]);
    }
  }
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

  const [state, dispatch] = useReducer(tablesReducer, { byId: {}, ids: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const loadRest = useCallback(async () => {
    try {
      const response = await tablesApi.getTables({ limit: 100 });
      dispatch({
        type: 'merge',
        tables: response.data.map((table) => ({
          id: table.id,
          number: table.number,
          status: table.status,
          areaId: table.areaId,
          areaName: table.areaName,
        })),
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
      dispatch({ type: 'replace', tables: event.tables });
      setLoading(false);
      setError(null);
    };

    const onStatusChanged = (event: TableStatusChangedEvent) => {
      if (!event?.tableId) return;
      dispatch({ type: 'status', event });
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

  const tables = useMemo(() => state.ids.map((id) => state.byId[id]), [state]);

  const refresh = useCallback(async () => {
    await loadRest();
    const socket = getExistingOrdersSocket();
    if (socket) subscribeTablesStatus(socket);
  }, [loadRest]);

  useRealtimeResume(() => {
    void refresh();
  }, Boolean(token));

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
