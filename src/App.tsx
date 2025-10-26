import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Admin from "./pages/Admin";
import Dashboard from "./pages/admin/Dashboard";
import Pedidos from "./pages/admin/Pedidos";
import Categorias from "./pages/admin/Categorias";
import Cardapio from "./pages/admin/Cardapio";
import Complementos from "./pages/admin/Complementos";
import Usuarios from "./pages/admin/Usuarios";
import Clientes from "./pages/admin/Clientes";
import Configuracoes from "./pages/admin/Configuracoes";
import OrderTracking from "./pages/OrderTracking";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/pedido/:orderId" element={<OrderTracking />} />
          <Route path="/admin" element={<Admin />}>
            <Route index element={<Dashboard />} />
            <Route 
              path="pedidos" 
              element={
                <ProtectedRoute permission="manage_orders">
                  <Pedidos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="categorias"
              element={
                <ProtectedRoute permission="manage_categories">
                  <Categorias />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="cardapio" 
              element={
                <ProtectedRoute permission="manage_menu_items">
                  <Cardapio />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="complementos" 
              element={
                <ProtectedRoute permission="manage_menu_items">
                  <Complementos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="usuarios"
              element={
                <ProtectedRoute permission="manage_users">
                  <Usuarios />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="clientes"
              element={
                <ProtectedRoute permission="manage_customers">
                  <Clientes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="configuracoes"
              element={
                <ProtectedRoute permission="manage_config">
                  <Configuracoes />
                </ProtectedRoute>
              } 
            />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
