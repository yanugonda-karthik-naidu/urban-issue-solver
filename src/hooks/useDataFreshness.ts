import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface DataFreshness {
  lastSynced: Date | null;
  isSyncing: boolean;
  syncData: () => Promise<void>;
  getRelativeTime: () => string;
}

export const useDataFreshness = (): DataFreshness => {
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const stored = localStorage.getItem('lastSyncedAt');
    return stored ? new Date(stored) : null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const syncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries();
      const now = new Date();
      setLastSynced(now);
      localStorage.setItem('lastSyncedAt', now.toISOString());
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  const getRelativeTime = useCallback((): string => {
    if (!lastSynced) return 'Never synced';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSynced.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }, [lastSynced]);

  // Update lastSynced on mount if queries are fresh
  useEffect(() => {
    if (!lastSynced) {
      const now = new Date();
      setLastSynced(now);
      localStorage.setItem('lastSyncedAt', now.toISOString());
    }
  }, []);

  return { lastSynced, isSyncing, syncData, getRelativeTime };
};
