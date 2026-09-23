import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

/**
 * Locks the device orientation while the calling layout stays mounted, and
 * releases the lock on unmount. Pass `null` to leave rotation free (used by the
 * POS so waiters can work in landscape). The manager passes `PORTRAIT_UP`.
 */
export function useOrientationLock(lock: ScreenOrientation.OrientationLock | null) {
  useEffect(() => {
    if (lock) {
      void ScreenOrientation.lockAsync(lock).catch(() => undefined);
    } else {
      void ScreenOrientation.unlockAsync().catch(() => undefined);
    }
    return () => {
      void ScreenOrientation.unlockAsync().catch(() => undefined);
    };
  }, [lock]);
}
