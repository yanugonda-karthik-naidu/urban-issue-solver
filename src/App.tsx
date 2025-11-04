import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
<<<<<<< HEAD

// User Pages
=======
import { FloatingChatbot } from "./components/FloatingChatbot";
>>>>>>> 949905ba54fc4674617491ad364d423873314628
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import CivicGuide from "./pages/CivicGuide";
import Profile from "./pages/Profile";
import PostFeed from "./pages/PostFeed"; // ✅ Community page

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AllIssues from "./pages/admin/AllIssues";
import Analytics from "./pages/admin/Analytics";
import ManageAdmins from "./pages/admin/ManageAdmins";
import Settings from "./pages/admin/Settings";

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
        <FloatingChatbot />
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

          {/* 🧑‍💼 Admin Routes (No Header) */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/issues" element={<AllIssues />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/manage-admins" element={<ManageAdmins />} />
          <Route path="/admin/settings" element={<Settings />} />

          {/* 🚫 404 Route */}
          <Route path="*" element={<><Header /><NotFound /></>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
