import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import TenantOnboarding from './pages/super-admin/TenantOnboarding';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import EstateDetails from './pages/super-admin/EstateDetails';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import UserManagement from './pages/UserManagement';
import Divisions from './pages/Divisions';

// Placeholder Component for the Main Dashboard View
const DashboardHome = () => (
  <Box>
    <Typography variant="h4" color="primary" gutterBottom fontWeight="bold">
      Estate Overview
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Welcome to your plantation management dashboard. Select a module from the sidebar to get started.
    </Typography>
  </Box>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<TenantOnboarding />} />

        {/* Protected Dashboard Routes (Estate Owner/Manager) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="divisions" element={<Divisions />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="estate/:id" element={<EstateDetails />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
