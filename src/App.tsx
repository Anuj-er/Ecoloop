import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";
import { Profile } from "./components/Profile";
import { NotificationToast } from "./components/NotificationToast";
import { FraudDetectionDashboard } from "./components/FraudDetectionDashboard";
import { Marketplace } from "./components/Marketplace";
import { Purchases } from "./components/Purchases";
import { ProductPage } from "./components/ProductPage";
import { Cart } from "./components/Cart";
// import { MarketplaceAdminDashboard } from "./components/MarketplaceAdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NotificationToast />
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/purchases" element={<Purchases />} />
            {/* Debug routes removed */}
            <Route path="/admin/fraud-detection" element={<FraudDetectionDashboard />} />
            {/* <Route path="/admin/marketplace" element={<MarketplaceAdminDashboard />} /> */}
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
