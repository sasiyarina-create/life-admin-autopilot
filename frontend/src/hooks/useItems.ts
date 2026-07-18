import { useCallback, useEffect, useState } from 'react';
import { getItems, type ItemSort } from '../services/item-service';
import type { Item } from '../types/item';

interface UseItemsResult {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useItems(sortBy: ItemSort = 'cancelByDate'): UseItemsResult {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const reload = useCallback(() => setRequestVersion((version) => version + 1), []);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    void getItems(sortBy)
      .then((nextItems) => {
        if (isActive) setItems(nextItems);
      })
      .catch((requestError: unknown) => {
        if (isActive) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load items.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [requestVersion, sortBy]);

  return { items, isLoading, error, reload };
}
