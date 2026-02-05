import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { AdminRoute } from './auth/AdminRoute';
import { PageSkeleton, AdminPageSkeleton, MapPageSkeleton } from './PageSkeleton';
import { PageTransition } from './PageTransition';

// Eagerly loaded public pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// Lazy loaded user pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ReportIssue = lazy(() => import('@/pages/ReportIssue'));
const CivicGuide = lazy(() => import('@/pages/CivicGuide'));
const Profile = lazy(() => import('@/pages/Profile'));
const PostFeed = lazy(() => import('@/pages/PostFeed'));
const SyncStatus = lazy(() => import('@/pages/SyncStatus'));

// Lazy loaded admin pages (heavy components)
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AllIssues = lazy(() => import('@/pages/admin/AllIssues'));
const Analytics = lazy(() => import('@/pages/admin/Analytics'));
const ManageAdmins = lazy(() => import('@/pages/admin/ManageAdmins'));
const ManageWorkers = lazy(() => import('@/pages/admin/ManageWorkers'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const LegalRulesAdmin = lazy(() => import('@/pages/admin/LegalRulesAdmin'));
const UserVerificationAdmin = lazy(() => import('@/pages/admin/UserVerificationAdmin'));

// Lazy loaded department pages
const DepartmentDashboard = lazy(() => import('@/pages/department/DepartmentDashboard'));
const DepartmentIssues = lazy(() => import('@/pages/department/DepartmentIssues'));
const DepartmentWorkers = lazy(() => import('@/pages/department/DepartmentWorkers'));
const DepartmentAnalytics = lazy(() => import('@/pages/department/DepartmentAnalytics'));

// Wrapper to show appropriate skeleton based on route
const RouteSkeleton = () => {
  const location = useLocation();
  
  if (location.pathname.startsWith('/admin/issues') || 
      location.pathname.startsWith('/department/issues')) {
    return <MapPageSkeleton />;
  }
  
  if (location.pathname.startsWith('/admin') || 
      location.pathname.startsWith('/department')) {
    return <AdminPageSkeleton />;
  }
  
  return <PageSkeleton />;
};

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<RouteSkeleton />} key={location.pathname}>
        <Routes location={location}>
          {/* 🌍 Public Routes */}
          <Route path="/" element={
            <PageTransition>
              <Header /><Home />
            </PageTransition>
          } />
          <Route path="/login" element={
            <PageTransition>
              <Header /><Login />
            </PageTransition>
          } />

          {/* 👥 User Routes */}
          <Route path="/dashboard" element={
            <PageTransition>
              <Header /><Dashboard />
            </PageTransition>
          } />
          <Route path="/report" element={
            <PageTransition>
              <Header /><ReportIssue />
            </PageTransition>
          } />
          <Route path="/civic-guide" element={
            <PageTransition>
              <Header /><CivicGuide />
            </PageTransition>
          } />
          <Route path="/profile" element={
            <PageTransition>
              <Header /><Profile />
            </PageTransition>
          } />

          {/* 🌐 Community Page */}
          <Route path="/community" element={
            <PageTransition>
              <Header /><PostFeed />
            </PageTransition>
          } />

          {/* 🔄 Sync Status Page */}
          <Route path="/sync" element={
            <PageTransition>
              <SyncStatus />
            </PageTransition>
          } />

          {/* 🧑‍💼 Admin Routes */}
          <Route path="/admin" element={
            <PageTransition>
              <AdminRoute><AdminDashboard /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/admin/issues" element={
            <PageTransition>
              <AdminRoute><AllIssues /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/admin/workers" element={
            <PageTransition>
              <AdminRoute><ManageWorkers /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/admin/analytics" element={
            <PageTransition>
              <AdminRoute><Analytics /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/admin/manage-admins" element={
            <PageTransition>
              <AdminRoute><ManageAdmins /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/admin/settings" element={
            <PageTransition>
              <AdminRoute><Settings /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/admin/legal-rules" element={
            <PageTransition>
              <AdminRoute><LegalRulesAdmin /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/admin/verification" element={
            <PageTransition>
              <AdminRoute><UserVerificationAdmin /></AdminRoute>
            </PageTransition>
          } />

          {/* 🏢 Department Routes */}
          <Route path="/department" element={
            <PageTransition>
              <AdminRoute><DepartmentDashboard /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/department/issues" element={
            <PageTransition>
              <AdminRoute><DepartmentIssues /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/department/workers" element={
            <PageTransition>
              <AdminRoute><DepartmentWorkers /></AdminRoute>
            </PageTransition>
          } />
          <Route path="/department/analytics" element={
            <PageTransition>
              <AdminRoute><DepartmentAnalytics /></AdminRoute>
            </PageTransition>
          } />

          {/* 🚫 404 Route */}
          <Route path="*" element={
            <PageTransition>
              <Header /><NotFound />
            </PageTransition>
          } />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};
