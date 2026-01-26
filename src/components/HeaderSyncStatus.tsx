import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';

export const HeaderSyncStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { queueLength, processQueue, isSyncing: isQueueSyncing } = useBackgroundSync();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleClick = () => {
    triggerHaptic('medium');
    navigate('/sync');
  };

  const statusText = !isOnline 
    ? 'Offline' 
    : queueLength > 0 
      ? `${queueLength} pending` 
      : 'Sync Status';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className={`gap-2 relative ${
            !isOnline 
              ? 'text-destructive hover:text-destructive' 
              : queueLength > 0 
                ? 'text-amber-500 hover:text-amber-600' 
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <motion.div
            animate={isSyncing || isQueueSyncing ? { rotate: 360 } : {}}
            transition={isSyncing || isQueueSyncing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            {isOnline ? (
              <RefreshCcw className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
          </motion.div>
          {queueLength > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center font-medium">
              {queueLength > 9 ? '9+' : queueLength}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>{statusText}</span>
      </TooltipContent>
    </Tooltip>
  );
};
