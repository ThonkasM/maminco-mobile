import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getExistingOrdersSocket } from '@/lib/realtime/socket';

/**
 * Runs `onResume` when the app returns to the foreground and each time the
 * orders socket reconnects (not on the first connection), so screens refetch
 * whatever they missed while offline.
 */
export function useRealtimeResume(onResume: () => void, enabled = true): void {
  const callbackRef = useRef(onResume);

  useEffect(() => {
    callbackRef.current = onResume;
  }, [onResume]);

  useEffect(() => {
    if (!enabled) return;

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') callbackRef.current();
    });

    const socket = getExistingOrdersSocket();
    let connectedOnce = socket?.connected ?? false;
    const handleConnect = () => {
      if (connectedOnce) callbackRef.current();
      connectedOnce = true;
    };
    socket?.on('connect', handleConnect);

    return () => {
      appSub.remove();
      socket?.off('connect', handleConnect);
    };
  }, [enabled]);
}
