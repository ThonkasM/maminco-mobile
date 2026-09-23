import { useEffect, useRef } from 'react';

import { useFeedback } from '@/providers/feedback-provider';

/**
 * Shows a centred error notification when a refresh fails *after* data was
 * already displayed. Initial-load errors stay inline (EmptyState) to avoid
 * duplicating the same message.
 */
export function useErrorNotification(
  error: string | null | undefined,
  hasData: boolean,
) {
  const { notify } = useFeedback();
  const hadData = useRef(false);

  useEffect(() => {
    if (hasData) hadData.current = true;
  }, [hasData]);

  useEffect(() => {
    if (error && hadData.current) notify('error', error);
  }, [error, notify]);
}
