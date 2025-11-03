import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import CivicGuide from "./pages/CivicGuide";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AllIssues from "./pages/admin/AllIssues";
import Analytics from "./pages/admin/Analytics";
import Settings from "./pages/admin/Settings";
import ManageAdmins from "./pages/admin/ManageAdmins";
import NotFound from "./pages/NotFound";
import "./i18n/config";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<><Header /><Home /></>} />
          <Route path="/login" element={<><Header /><Login /></>} />
          
          {/* User Routes */}
          <Route path="/dashboard" element={<><Header /><Dashboard /></>} />
          <Route path="/report" element={<><Header /><ReportIssue /></>} />
          <Route path="/civic-guide" element={<><Header /><CivicGuide /></>} />
          <Route path="/profile" element={<><Header /><Profile /></>} />
          
          {/* Admin Routes - No Header */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/issues" element={<AllIssues />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/manage-admins" element={<ManageAdmins />} />
          <Route path="/admin/settings" element={<Settings />} />
          
          <Route path="*" element={<><Header /><NotFound /></>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
