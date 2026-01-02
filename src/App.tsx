import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { FloatingChatbot } from "./components/FloatingChatbot";
import { AdminRoute } from "./components/auth/AdminRoute";

// Eagerly loaded public pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy loaded user pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const CivicGuide = lazy(() => import("./pages/CivicGuide"));
const Profile = lazy(() => import("./pages/Profile"));
const PostFeed = lazy(() => import("./pages/PostFeed"));

// Lazy loaded admin pages (heavy components)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AllIssues = lazy(() => import("./pages/admin/AllIssues"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ManageAdmins = lazy(() => import("./pages/admin/ManageAdmins"));
const ManageWorkers = lazy(() => import("./pages/admin/ManageWorkers"));
const Settings = lazy(() => import("./pages/admin/Settings"));

// Lazy loaded department pages
const DepartmentDashboard = lazy(() => import("./pages/department/DepartmentDashboard"));
const DepartmentIssues = lazy(() => import("./pages/department/DepartmentIssues"));
const DepartmentWorkers = lazy(() => import("./pages/department/DepartmentWorkers"));
const DepartmentAnalytics = lazy(() => import("./pages/department/DepartmentAnalytics"));

import "./i18n/config";

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Render the floating chatbot on all non-admin routes */}
        {/* ChatbotVisibility must be rendered inside BrowserRouter so useLocation works */}
        {/* Define a small component that hides the bot on admin routes */}
        {/* eslint-disable-next-line react/display-name */}
        {(() => {
          function ChatbotVisibility() {
            const location = useLocation();
            // hide on admin and department routes
            if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/department')) return null;
            return <FloatingChatbot />;
          }

          return <ChatbotVisibility />;
        })()}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 🌍 Public Routes */}
            <Route path="/" element={<><Header /><Home /></>} />
            <Route path="/login" element={<><Header /><Login /></>} />

            {/* 👥 User Routes */}
            <Route path="/dashboard" element={<><Header /><Dashboard /></>} />
            <Route path="/report" element={<><Header /><ReportIssue /></>} />
            <Route path="/civic-guide" element={<><Header /><CivicGuide /></>} />
            <Route path="/profile" element={<><Header /><Profile /></>} />

            {/* 🌐 New Community Page */}
            <Route path="/community" element={<><Header /><PostFeed /></>} />  {/* ✅ Added */}

            {/* 🧑‍💼 Admin Routes - Protected with AdminRoute guard */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/issues" element={<AdminRoute><AllIssues /></AdminRoute>} />
            <Route path="/admin/workers" element={<AdminRoute><ManageWorkers /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
            <Route path="/admin/manage-admins" element={<AdminRoute><ManageAdmins /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />

            {/* 🏢 Department Routes - Protected with AdminRoute guard */}
            <Route path="/department" element={<AdminRoute><DepartmentDashboard /></AdminRoute>} />
            <Route path="/department/issues" element={<AdminRoute><DepartmentIssues /></AdminRoute>} />
            <Route path="/department/workers" element={<AdminRoute><DepartmentWorkers /></AdminRoute>} />
            <Route path="/department/analytics" element={<AdminRoute><DepartmentAnalytics /></AdminRoute>} />

            {/* 🚫 404 Route */}
            <Route path="*" element={<><Header /><NotFound /></>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
