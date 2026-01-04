// Push notification utilities for sync events

export interface SyncNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
}

class PushNotificationManager {
  private permission: NotificationPermission = 'default';

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    }

    return false;
  }

  getPermission(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  async showNotification(options: SyncNotificationOptions): Promise<void> {
    // Only show if app is not visible
    if (document.visibilityState === 'visible') {
      return;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) return;

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      tag: options.tag || 'sync-notification',
      requireInteraction: options.requireInteraction || false,
      data: options.data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Navigate to sync page if data contains route
      if (options.data?.route) {
        window.location.href = options.data.route as string;
      }
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }

  async notifySyncComplete(successCount: number, failCount: number): Promise<void> {
    if (successCount === 0 && failCount === 0) return;

    const title = failCount > 0 ? 'Sync Partially Complete' : 'Sync Complete';
    const body = failCount > 0
      ? `${successCount} synced, ${failCount} failed`
      : `${successCount} ${successCount === 1 ? 'request' : 'requests'} synced successfully`;

    await this.showNotification({
      title,
      body,
      tag: 'sync-complete',
      data: failCount > 0 ? { route: '/sync' } : undefined,
    });
  }

  async notifySyncFailed(error: string): Promise<void> {
    await this.showNotification({
      title: 'Sync Failed',
      body: error,
      tag: 'sync-failed',
      requireInteraction: true,
      data: { route: '/sync' },
    });
  }

  async notifyBackOnline(): Promise<void> {
    await this.showNotification({
      title: 'Back Online',
      body: 'Your connection has been restored. Syncing data...',
      tag: 'online-status',
    });
  }
}

export const pushNotifications = new PushNotificationManager();
