import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { useDataFreshness } from '@/hooks/useDataFreshness';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';

export const SyncButton = () => {
  const { isSyncing, syncData, getRelativeTime, lastSynced } = useDataFreshness();
  const [showSuccess, setShowSuccess] = useState(false);
  const [relativeTime, setRelativeTime] = useState(getRelativeTime());

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime());
    }, 10000);
    return () => clearInterval(interval);
  }, [getRelativeTime]);

  // Update when lastSynced changes
  useEffect(() => {
    setRelativeTime(getRelativeTime());
  }, [lastSynced, getRelativeTime]);

  const handleSync = async () => {
    triggerHaptic('medium');
    await syncData();
    setShowSuccess(true);
    toast.success('Data synced successfully');
    triggerHaptic('success');
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="h-4 w-4 text-green-500" />
              </motion.div>
            ) : (
              <motion.div
                key="sync"
                animate={isSyncing ? { rotate: 360 } : {}}
                transition={isSyncing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="hidden sm:inline text-xs">
            {isSyncing ? 'Syncing...' : relativeTime}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>Last synced: {relativeTime}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
