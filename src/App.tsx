import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { FloatingChatbot } from "./components/FloatingChatbot";
import { RouteProgress } from "./components/RouteProgress";
import { AnimatedRoutes } from "./components/AnimatedRoutes";
import OfflineIndicator from "./components/OfflineIndicator";

import "./i18n/config";

const queryClient = new QueryClient();

// Component to conditionally show chatbot
const ChatbotVisibility = () => {
  const location = useLocation();
  // hide on admin and department routes
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/department')) return null;
  return <FloatingChatbot />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <BrowserRouter>
        <RouteProgress />
        <ChatbotVisibility />
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
