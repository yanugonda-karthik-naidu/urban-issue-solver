import { syncQueue } from './syncQueue';

type FetchFunction = typeof fetch;

// Create a wrapper around fetch that queues failed requests
export const createOfflineFetch = (originalFetch: FetchFunction): FetchFunction => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';
    
    // Only queue mutating requests (POST, PUT, PATCH, DELETE)
    const shouldQueue = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

    try {
      const response = await originalFetch(input, init);
      return response;
    } catch (error) {
      // Check if offline
      if (!navigator.onLine && shouldQueue) {
        // Extract headers
        const headers: Record<string, string> = {};
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((value, key) => {
              headers[key] = value;
            });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([key, value]) => {
              headers[key] = value;
            });
          } else {
            Object.entries(init.headers).forEach(([key, value]) => {
              headers[key] = value;
            });
          }
        }

        // Get body as string
        let body: string | null = null;
        if (init?.body) {
          if (typeof init.body === 'string') {
            body = init.body;
          } else if (init.body instanceof FormData) {
            // Can't easily serialize FormData, skip queuing
            throw error;
          } else {
            body = JSON.stringify(init.body);
          }
        }

        // Queue the request
        await syncQueue.addToQueue({
          url,
          method: method.toUpperCase(),
          headers,
          body,
        });

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('sync-queue-updated'));

        // Return a fake response indicating the request was queued
        return new Response(JSON.stringify({ queued: true, message: 'Request queued for sync' }), {
          status: 202,
          statusText: 'Accepted',
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw error;
    }
  };
};

// Register background sync with service worker
export const registerBackgroundSync = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.log('Background sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-queue');
    console.log('Background sync registered');
    return true;
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
};
