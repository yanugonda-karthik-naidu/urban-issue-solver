import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle, CloudOff, Upload, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { Button } from './ui/button';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { queueLength, processQueue, isSyncing: isQueueSyncing } = useBackgroundSync();

  const syncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Process queued requests first
      await processQueue();
      
      // Then invalidate all queries to refetch fresh data
      await queryClient.invalidateQueries();
      
      // Small delay to show sync animation
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, processQueue]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setShowReconnected(true);
      
      // Auto-sync data when coming back online
      await syncData();
      
      // Hide reconnected message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncData]);

  const showIndicator = !isOnline || showReconnected || queueLength > 0;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-2 px-4 pointer-events-none"
        >
          <motion.div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md
              pointer-events-auto
              ${!isOnline 
                ? 'bg-destructive/90 text-destructive-foreground' 
                : queueLength > 0 
                  ? 'bg-amber-500/90 text-white'
                  : 'bg-green-500/90 text-white'
              }
            `}
            layout
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">You're offline</span>
                {queueLength > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {queueLength} pending
                  </span>
                )}
              </>
            ) : isSyncing || isQueueSyncing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
                <span className="text-sm font-medium">
                  Syncing {queueLength > 0 ? `${queueLength} requests...` : 'data...'}
                </span>
              </>
            ) : queueLength > 0 ? (
              <>
                <CloudOff className="w-4 h-4" />
                <span className="text-sm font-medium">{queueLength} pending requests</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30"
                  onClick={syncData}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Sync now
                </Button>
                <a
                  href="/sync"
                  className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30 rounded inline-flex items-center"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Back online</span>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
