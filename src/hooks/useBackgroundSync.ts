import { useState, useEffect, useCallback, useRef } from 'react';
import { syncQueue, QueuedRequest } from '@/lib/syncQueue';
import { syncSettings } from '@/lib/syncSettings';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { pushNotifications } from '@/lib/pushNotifications';

interface BackgroundSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  lastSyncError: string | null;
  nextRetryAt: Date | null;
  isAutoRetryEnabled: boolean;
  processQueue: () => Promise<void>;
  cancelAutoRetry: () => void;
}

// Calculate exponential backoff delay
const getBackoffDelay = (retryCount: number): number => {
  const settings = syncSettings.getSettings();
  const delay = Math.min(settings.baseDelayMs * Math.pow(2, retryCount), settings.maxDelayMs);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
};

export const useBackgroundSync = (): BackgroundSyncState => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<Date | null>(null);
  const [isAutoRetryEnabled, setIsAutoRetryEnabled] = useState(true);
  const syncInProgressRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update queue length
  const updateQueueLength = useCallback(async () => {
    try {
      const length = await syncQueue.getQueueLength();
      setQueueLength(length);
    } catch (error) {
      console.error('Failed to get queue length:', error);
    }
  }, []);

  // Schedule next retry with exponential backoff
  const scheduleRetry = useCallback((retryCount: number) => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const delay = getBackoffDelay(retryCount);
    const retryTime = new Date(Date.now() + delay);
    setNextRetryAt(retryTime);

    console.log(`Scheduling retry in ${delay}ms (attempt ${retryCount + 1})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      setNextRetryAt(null);
      if (navigator.onLine) {
        processQueueInternal();
      }
    }, delay);
  }, []);

  // Process a single request
  const processRequest = useCallback(async (request: QueuedRequest): Promise<{ success: boolean; shouldRetry: boolean }> => {
    const urlPath = new URL(request.url).pathname;
    
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      if (response.ok) {
        await syncQueue.removeFromQueue(request.id);
        return { success: true, shouldRetry: false };
      }

      // If server error, we might want to retry
      if (response.status >= 500) {
        await syncQueue.updateRetryCount(request.id);
        return { success: false, shouldRetry: true };
      }

      // Client error (4xx) - remove from queue as retrying won't help
      await syncQueue.removeFromQueue(request.id);
      return { success: false, shouldRetry: false };
    } catch (error) {
      // Network error - keep in queue for retry
      await syncQueue.updateRetryCount(request.id);
      return { success: false, shouldRetry: true };
    }
  }, []);

  // Internal process queue function
  const processQueueInternal = useCallback(async () => {
    if (syncInProgressRef.current || !navigator.onLine) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);
    const settings = syncSettings.getSettings();

    try {
      const queue = await syncQueue.getQueue();
      
      if (queue.length === 0) {
        setIsSyncing(false);
        syncInProgressRef.current = false;
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let maxRetryCount = 0;
      let hasRetryableFailures = false;

      for (const request of queue) {
        // Skip if max retries exceeded
        if (request.retryCount >= settings.maxRetries) {
          await syncQueue.removeFromQueue(request.id);
          failCount++;
          continue;
        }

        const { success, shouldRetry } = await processRequest(request);
        if (success) {
          successCount++;
        } else {
          failCount++;
          if (shouldRetry) {
            hasRetryableFailures = true;
            maxRetryCount = Math.max(maxRetryCount, request.retryCount + 1);
          }
        }
      }

      await updateQueueLength();

      if (successCount > 0) {
        triggerHaptic('success');
        toast.success(`Synced ${successCount} pending ${successCount === 1 ? 'request' : 'requests'}`);
        await pushNotifications.notifySyncComplete(successCount, failCount);
      }

      if (failCount > 0) {
        setLastSyncError(`${failCount} requests failed to sync`);
        
        // Schedule automatic retry with exponential backoff (only if enabled)
        if (hasRetryableFailures && isAutoRetryEnabled) {
          scheduleRetry(maxRetryCount);
          toast.error(`${failCount} requests failed. Retrying automatically...`);
        } else if (!isAutoRetryEnabled) {
          toast.error(`${failCount} requests failed. Auto-retry is disabled.`);
        } else {
          await pushNotifications.notifySyncFailed(`${failCount} requests failed to sync`);
        }
      }
    } catch (error) {
      console.error('Background sync error:', error);
      setLastSyncError('Sync failed');
      // Schedule retry on general failure (only if enabled)
      if (isAutoRetryEnabled) {
        scheduleRetry(0);
      }
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [processRequest, updateQueueLength, scheduleRetry, isAutoRetryEnabled]);

  // Cancel auto-retry function
  const cancelAutoRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setNextRetryAt(null);
    setIsAutoRetryEnabled(false);
    triggerHaptic('medium');
    toast.info('Auto-retry cancelled');
  }, []);

  // Public process queue function
  const processQueue = useCallback(async () => {
    // Re-enable auto-retry when manually triggered
    setIsAutoRetryEnabled(true);
    // Clear any pending retry when manually triggered
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      setNextRetryAt(null);
    }
    await processQueueInternal();
  }, [processQueueInternal]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await pushNotifications.notifyBackOnline();
      // Auto-process queue when coming back online
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Clear retry timer when going offline
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        setNextRetryAt(null);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial queue length check
    updateQueueLength();

    // Check for service worker background sync support
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(() => {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_COMPLETE') {
            updateQueueLength();
          }
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [processQueue, updateQueueLength]);

  // Periodically check queue when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      updateQueueLength();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, updateQueueLength]);

  return {
    isOnline,
    isSyncing,
    queueLength,
    lastSyncError,
    nextRetryAt,
    isAutoRetryEnabled,
    processQueue,
    cancelAutoRetry,
  };
};

// Utility function to queue a failed request
export const queueFailedRequest = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null
): Promise<string> => {
  const id = await syncQueue.addToQueue({ url, method, headers, body });
  window.dispatchEvent(new CustomEvent('sync-queue-updated'));
  return id;
};
