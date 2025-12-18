import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { FloatingChatbot } from "./components/FloatingChatbot";
import { AdminRoute } from "./components/auth/AdminRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import CivicGuide from "./pages/CivicGuide";
import Profile from "./pages/Profile";
import PostFeed from "./pages/PostFeed";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AllIssues from "./pages/admin/AllIssues";
import Analytics from "./pages/admin/Analytics";
import ManageAdmins from "./pages/admin/ManageAdmins";
import ManageWorkers from "./pages/admin/ManageWorkers";
import Settings from "./pages/admin/Settings";

// Department Pages
import DepartmentDashboard from "./pages/department/DepartmentDashboard";
import DepartmentIssues from "./pages/department/DepartmentIssues";
import DepartmentWorkers from "./pages/department/DepartmentWorkers";
import DepartmentAnalytics from "./pages/department/DepartmentAnalytics";

// Other
import NotFound from "./pages/NotFound";

import "./i18n/config";

const queryClient = new QueryClient();

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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
