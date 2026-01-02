import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const RouteProgress = () => {
  const [progress, setProgress] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start progress on route change
    setIsNavigating(true);
    setProgress(0);

    // Rapidly progress to 90%
    const timer1 = setTimeout(() => setProgress(30), 10);
    const timer2 = setTimeout(() => setProgress(60), 50);
    const timer3 = setTimeout(() => setProgress(80), 100);
    const timer4 = setTimeout(() => setProgress(90), 150);

    // Complete and hide
    const timer5 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsNavigating(false), 150);
    }, 200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [location.pathname]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent">
      <div
        className="h-full bg-primary transition-all duration-100 ease-out shadow-[0_0_10px_hsl(var(--primary))]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
