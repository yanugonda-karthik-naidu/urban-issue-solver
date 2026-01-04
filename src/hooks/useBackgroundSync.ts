import { useState, useEffect, useCallback, useRef } from 'react';
import { syncQueue, QueuedRequest } from '@/lib/syncQueue';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { pushNotifications } from '@/lib/pushNotifications';

interface BackgroundSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  lastSyncError: string | null;
  processQueue: () => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const useBackgroundSync = (): BackgroundSyncState => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);

  // Update queue length
  const updateQueueLength = useCallback(async () => {
    try {
      const length = await syncQueue.getQueueLength();
      setQueueLength(length);
    } catch (error) {
      console.error('Failed to get queue length:', error);
    }
  }, []);

  // Process a single request
  const processRequest = useCallback(async (request: QueuedRequest): Promise<boolean> => {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      if (response.ok) {
        await syncQueue.removeFromQueue(request.id);
        return true;
      }

      // If server error, we might want to retry
      if (response.status >= 500) {
        await syncQueue.updateRetryCount(request.id);
        return false;
      }

      // Client error (4xx) - remove from queue as retrying won't help
      await syncQueue.removeFromQueue(request.id);
      return true;
    } catch (error) {
      // Network error - keep in queue for retry
      await syncQueue.updateRetryCount(request.id);
      return false;
    }
  }, []);

  // Process entire queue
  const processQueue = useCallback(async () => {
    if (syncInProgressRef.current || !navigator.onLine) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const queue = await syncQueue.getQueue();
      
      if (queue.length === 0) {
        setIsSyncing(false);
        syncInProgressRef.current = false;
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const request of queue) {
        // Skip if max retries exceeded
        if (request.retryCount >= MAX_RETRIES) {
          await syncQueue.removeFromQueue(request.id);
          failCount++;
          continue;
        }

        const success = await processRequest(request);
        if (success) {
          successCount++;
        } else {
          failCount++;
          // Add delay between retries
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }

      await updateQueueLength();

      if (successCount > 0) {
        triggerHaptic('success');
        toast.success(`Synced ${successCount} pending ${successCount === 1 ? 'request' : 'requests'}`);
        
        // Send push notification if app is in background
        await pushNotifications.notifySyncComplete(successCount, failCount);
      }

      if (failCount > 0) {
        setLastSyncError(`${failCount} requests failed to sync`);
        await pushNotifications.notifySyncFailed(`${failCount} requests failed to sync`);
      }
    } catch (error) {
      console.error('Background sync error:', error);
      setLastSyncError('Sync failed');
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [processRequest, updateQueueLength]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Send push notification when back online
      await pushNotifications.notifyBackOnline();
      // Auto-process queue when coming back online
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial queue length check
    updateQueueLength();

    // Check for service worker background sync support
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        // Listen for sync events from service worker
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
    };
  }, [processQueue, updateQueueLength]);

  // Periodically check queue when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      updateQueueLength();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, updateQueueLength]);

  return {
    isOnline,
    isSyncing,
    queueLength,
    lastSyncError,
    processQueue,
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
  
  // Dispatch custom event for UI updates
  window.dispatchEvent(new CustomEvent('sync-queue-updated'));
  
  return id;
};
