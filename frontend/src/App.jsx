import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu';
import AdminDashboard from './pages/AdminDashboard';
import ProductDetail from './pages/ProductDetail';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { SocketProvider } from './contexts/SocketContext';

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          {/* Super Admin Dashboard Routing Portal */}
          <Route path="/super-admin" element={<SuperAdminDashboard />} />

          {/* Default fallback route matching first tenant */}
          <Route path="/" element={<Navigate to="/menu/resto-1/table-5" replace />} />
          
          {/* Customer Dynamic QR Routes */}
          <Route path="/menu/:tenantId/:tableId" element={<CustomerMenu />} />
          
          {/* Dedicated Product Details Page Route */}
          <Route path="/menu/:tenantId/:tableId/item/:itemId" element={<ProductDetail />} />
          
          {/* Admin Live Kitchen Console Routes */}
          <Route path="/admin/:tenantId" element={<AdminDashboard />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
