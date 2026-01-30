import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import TenantOnboarding from './pages/super-admin/TenantOnboarding';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import EstateDetails from './pages/super-admin/EstateDetails';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import UserManagement from './pages/UserManagement';

// Placeholder Component for the Main Dashboard View
const DashboardHome = () => (
  <Box>
    <Typography variant="h4" color="primary" gutterBottom fontWeight="bold">
      Estate Overview
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Welcome to your plantation management dashboard. Select a module from the sidebar to get started.
    </Typography>

    {/* Future: Add Widgets here (Summary Cards, recent activity) */}
  </Box>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes - Wrapped in Layout */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="users" element={<UserManagement />} />
          {/* Future sub-routes: 
            <Route path="map" element={<MapPage />} />
            <Route path="harvest" element={<HarvestPage />} />
            <Route path="muster" element={<MusterPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            */}
        </Route>

        {/* Public/Admin Routes */}
        <Route path="/register" element={<TenantOnboarding />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/estate/:id" element={<EstateDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
