import { useCallback, useEffect, useState } from 'react';
import { getUpcomingItems } from '../services/item-service';
import type { UpcomingItem } from '../types/item';

export function useUpcomingItems() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const reload = useCallback(() => setRequestVersion((version) => version + 1), []);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);
    void getUpcomingItems()
      .then((nextItems) => { if (isActive) setItems(nextItems); })
      .catch((requestError: unknown) => { if (isActive) setError(requestError instanceof Error ? requestError.message : 'Unable to load upcoming deadlines.'); })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [requestVersion]);

  return { items, isLoading, error, reload };
}
