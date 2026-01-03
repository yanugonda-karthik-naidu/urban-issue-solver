import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

const PullToRefresh = ({ children, onRefresh, threshold = 80 }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  
  const opacity = useTransform(pullDistance, [0, threshold], [0, 1]);
  const scale = useTransform(pullDistance, [0, threshold], [0.5, 1]);
  const rotate = useTransform(pullDistance, [0, threshold * 2], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
      setHasTriggeredHaptic(false);
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, (currentY - startY.current) * 0.5);
    const newPullDistance = Math.min(diff, threshold * 1.5);
    pullDistance.set(newPullDistance);
    
    // Trigger haptic when crossing threshold
    if (newPullDistance >= threshold && !hasTriggeredHaptic) {
      triggerHaptic('medium');
      setHasTriggeredHaptic(true);
    } else if (newPullDistance < threshold && hasTriggeredHaptic) {
      setHasTriggeredHaptic(false);
    }
  }, [isPulling, isRefreshing, pullDistance, threshold, hasTriggeredHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    const currentPull = pullDistance.get();
    
    if (currentPull >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('success');
      animate(pullDistance, threshold, { duration: 0.2 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { duration: 0.3 });
      }
    } else {
      animate(pullDistance, 0, { duration: 0.3 });
    }
    
    setIsPulling(false);
    setHasTriggeredHaptic(false);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  return (
    <div className="relative h-full overflow-hidden">
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{ 
          top: useTransform(pullDistance, [0, threshold], [-40, 16]),
          opacity,
          scale
        }}
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center shadow-lg border border-primary/20"
          style={{ rotate: isRefreshing ? undefined : rotate }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
        >
          <RefreshCw className="w-5 h-5 text-primary" />
        </motion.div>
      </motion.div>
      
      <motion.div
        ref={containerRef}
        className="h-full overflow-auto"
        style={{ y: pullDistance }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
