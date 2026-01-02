import { useCallback } from 'react';

// Module-level cache to track which routes have been prefetched
const prefetchedRoutes = new Set<string>();

// Route to dynamic import mapping
const routeImports: Record<string, () => Promise<unknown>> = {
  '/admin': () => import('@/pages/AdminDashboard'),
  '/admin/issues': () => import('@/pages/admin/AllIssues'),
  '/admin/workers': () => import('@/pages/admin/ManageWorkers'),
  '/admin/analytics': () => import('@/pages/admin/Analytics'),
  '/admin/manage-admins': () => import('@/pages/admin/ManageAdmins'),
  '/admin/settings': () => import('@/pages/admin/Settings'),
  '/department': () => import('@/pages/department/DepartmentDashboard'),
  '/department/issues': () => import('@/pages/department/DepartmentIssues'),
  '/department/workers': () => import('@/pages/department/DepartmentWorkers'),
  '/department/analytics': () => import('@/pages/department/DepartmentAnalytics'),
  '/dashboard': () => import('@/pages/Dashboard'),
  '/report': () => import('@/pages/ReportIssue'),
  '/civic-guide': () => import('@/pages/CivicGuide'),
  '/profile': () => import('@/pages/Profile'),
  '/community': () => import('@/pages/PostFeed'),
};

export const useRoutePrefetch = () => {
  const prefetch = useCallback((path: string) => {
    // Don't prefetch if already done
    if (prefetchedRoutes.has(path)) return;

    const importFn = routeImports[path];
    if (importFn) {
      // Mark as prefetched immediately to prevent duplicate calls
      prefetchedRoutes.add(path);
      // Execute immediately for instant loading
      importFn();
    }
  }, []);

  const onMouseEnter = useCallback((path: string) => () => prefetch(path), [prefetch]);

  return { prefetch, onMouseEnter };
};
