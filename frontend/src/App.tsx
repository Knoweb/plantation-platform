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
import CropAge from './pages/field-officer/tabs/CropAge';
import MusterApproval from './pages/field-officer/tabs/MusterApproval';
import MusterReview from './pages/field-officer/tabs/MusterReview';
import GeneralStock from './pages/field-officer/tabs/GeneralStock';
import PendingApprovals from './pages/manager/tabs/PendingApprovals';
import MusterReviewManager from './pages/manager/tabs/MusterReviewManager';
// import CropBook from './pages/manager/tabs/CropBook';
import AttendanceReport from './pages/manager/tabs/AttendanceReport';
import WorkerRegistry from './pages/field-officer/WorkerRegistry';
import MorningMuster from './pages/field-officer/MorningMuster';
import DistributionOfWorks from './pages/field-officer/tabs/DistributionOfWorks';
import LeaveApplication from './pages/field-officer/tabs/LeaveApplication';
import LeaveManagement from './pages/manager/tabs/LeaveManagement';
import OrderRequest from './pages/field-officer/tabs/OrderRequest';
import PendingOrders from './pages/field-officer/tabs/PendingOrders';
import Correspondence from './pages/field-officer/tabs/Correspondence';
import CostAnalysis from './pages/field-officer/tabs/CostAnalysis';
import FOCropBook from './pages/field-officer/tabs/CropBook';
import Fertilizer from './pages/field-officer/tabs/Fertilizer';
import EstateSettings from './pages/estate-admin/EstateSettings';

// Chief Clerk specific imports
import ChiefClerkDashboard from './pages/chief-clerk/ChiefClerkDashboard';
import NormSettings from './pages/manager/tabs/NormSettings';
import TaskTypeSettings from './pages/chief-clerk/tabs/TaskTypeSettings';
import CostAnalysisManager from './pages/chief-clerk/tabs/CostAnalysisManager';
import WorkProgramManager from './pages/chief-clerk/tabs/WorkProgramManager';
import DivisionView from './pages/manager/DivisionView';

// Placeholder Component for the Main Dashboard View
const DashboardHome = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role;

  if (role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
  if (role === 'ESTATE_ADMIN') return <Navigate to="/dashboard/admin" replace />;
  if (role === 'MANAGER' || role === 'MANAGER_CLERK') return <Navigate to="/dashboard/manager" replace />;
  if (role === 'CHIEF_CLERK') return <Navigate to="/dashboard/chief" replace />;
  if (role === 'FIELD_OFFICER') return <Navigate to="/dashboard/field" replace />;
  if (role === 'STORE_KEEPER') return <Navigate to="/dashboard/store/main" replace />;

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
          <Route path="chief" element={<ChiefClerkDashboard />} />
          <Route path="field" element={<FieldOfficerDashboard />} />
          <Route path="store" element={<StoreKeeperDashboard />} />
          <Route path="store/main" element={<StoreKeeperDashboard />} />
          <Route path="store/inventory" element={<StoreKeeperDashboard />} />
          <Route path="store/approvals" element={<StoreKeeperDashboard />} />
          <Route path="store/history" element={<StoreTransactionHistory />} />
          <Route path="inventory" element={<StoreKeeperDashboard />} /> {/* Legacy */}

          {/* Feature Routes */}
          <Route path="users" element={<UserManagement />} />
          <Route path="workers" element={<WorkerRegistry />} />
          <Route path="divisions" element={<Divisions />} />
          <Route path="harvest" element={<DailyEntry />} />
          <Route path="muster" element={<DailyEntry />} />

          {/* Field Officer Tabs */}
          <Route path="correspondence" element={<Correspondence />} />
          <Route path="cost-analysis" element={<CostAnalysis />} />
          <Route path="crop-book-fo" element={<FOCropBook />} />
          <Route path="morning-muster" element={<MorningMuster />} />
          <Route path="evening-muster" element={<DailyEntry />} />
          <Route path="crop-achievements" element={<CropAchievements />} />
          <Route path="crop-ages" element={<CropAge />} />
          <Route path="fertilizer-programme" element={<Fertilizer />} />
          <Route path="distribution-works" element={<DistributionOfWorks />} />
          <Route path="leave-application" element={<LeaveApplication />} />
          <Route path="muster-approval" element={<MusterApproval />} />
          <Route path="muster-review" element={<MusterReview />} />
          <Route path="order-request" element={<OrderRequest />} />
          <Route path="pending-orders" element={<PendingOrders />} />
          <Route path="stock" element={<GeneralStock />} />
          <Route path="settings" element={<EstateSettings />} />
          <Route path="kpis" element={<Navigate to="/dashboard/field" replace />} />
          <Route path="inventory" element={<StoreKeeperDashboard />} /> {/* Main Store Keeper View */}

          {/* Manager Tabs */}
          <Route path="approvals" element={<PendingApprovals />} />
          <Route path="muster-review-manager" element={<MusterReviewManager />} />
          <Route path="crop-book" element={<FOCropBook />} />
          <Route path="attendance" element={<AttendanceReport />} />
          <Route path="leave-management" element={<LeaveManagement />} />
          <Route path="division-view/:divisionId" element={<DivisionView />} />

          {/* Chief Clerk Tabs */}
          <Route path="norms" element={<NormSettings />} />
          <Route path="job-roles" element={<TaskTypeSettings />} />
          <Route path="chief-cost-analysis" element={<CostAnalysisManager />} />
          <Route path="chief-distribution-works" element={<WorkProgramManager />} />
          <Route path="chief-inventory" element={<StoreKeeperDashboard />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="estate/:id" element={<EstateDetails />} />
          <Route path="new-estate" element={<TenantOnboarding />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
