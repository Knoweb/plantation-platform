import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import TenantOnboarding from './pages/super-admin/TenantOnboarding';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import EstateDetails from './pages/super-admin/EstateDetails';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import UserManagement from './pages/UserManagement';
import Divisions from './pages/Divisions';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import ManagerDashboard from './pages/manager/ManagerDashboard';
import FieldOfficerDashboard from './pages/field-officer/FieldOfficerDashboard';
import StoreKeeperDashboard from './pages/store-keeper/StoreKeeperDashboard';
import StoreTransactionHistory from './pages/store-keeper/StoreTransactionHistory';
import EstateAdminDashboard from './pages/estate-admin/EstateAdminDashboard';
import DailyEntry from './pages/field-officer/DailyEntry';
import CropAchievements from './pages/field-officer/tabs/CropAchievements';
import MusterApproval from './pages/field-officer/tabs/MusterApproval';
import MusterReview from './pages/field-officer/tabs/MusterReview';
import GeneralStock from './pages/field-officer/tabs/GeneralStock';
import KPIs from './pages/field-officer/tabs/KPIs';
import PendingApprovals from './pages/manager/tabs/PendingApprovals';
import CropBook from './pages/manager/tabs/CropBook';
import WorkerRegistry from './pages/field-officer/WorkerRegistry';

// Placeholder Component for the Main Dashboard View
const DashboardHome = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role;

  if (role === 'ESTATE_ADMIN') return <Navigate to="/dashboard/admin" replace />;
  if (role === 'MANAGER') return <Navigate to="/dashboard/manager" replace />;
  if (role === 'FIELD_OFFICER') return <Navigate to="/dashboard/field" replace />;
  if (role === 'STORE_KEEPER') return <Navigate to="/dashboard/inventory" replace />;

  return <Navigate to="/dashboard/admin" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<TenantOnboarding />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Dashboard Routes (Estate Owner/Manager) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />

          {/* Explicit Role Dashboards */}
          <Route path="admin" element={<EstateAdminDashboard />} />
          <Route path="manager" element={<ManagerDashboard />} />
          <Route path="field" element={<FieldOfficerDashboard />} />
          <Route path="store" element={<StoreKeeperDashboard />} />
          <Route path="store/history" element={<StoreTransactionHistory />} />
          <Route path="inventory" element={<StoreKeeperDashboard />} /> {/* Legacy/Direct link */}

          {/* Feature Routes */}
          <Route path="users" element={<UserManagement />} />
          <Route path="workers" element={<WorkerRegistry />} />
          <Route path="divisions" element={<Divisions />} />
          <Route path="harvest" element={<DailyEntry />} />
          <Route path="muster" element={<DailyEntry />} />

          {/* Field Officer Tabs */}
          <Route path="crop-achievements" element={<CropAchievements />} />
          <Route path="muster-approval" element={<MusterApproval />} />
          <Route path="muster-review" element={<MusterReview />} />
          <Route path="stock" element={<GeneralStock />} />
          <Route path="kpis" element={<KPIs />} />
          <Route path="inventory" element={<StoreKeeperDashboard />} /> {/* Main Store Keeper View */}

          {/* Manager Tabs */}
          <Route path="approvals" element={<PendingApprovals />} />
          <Route path="crop-book" element={<CropBook />} />
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
