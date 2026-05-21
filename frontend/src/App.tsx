import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy imports for pages
const TenantOnboarding = lazy(() => import('./pages/super-admin/TenantOnboarding'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard'));
const EstateDetails = lazy(() => import('./pages/super-admin/EstateDetails'));
const Login = lazy(() => import('./pages/Login'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Divisions = lazy(() => import('./pages/Divisions'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const FieldOfficerDashboard = lazy(() => import('./pages/field-officer/FieldOfficerDashboard'));
const StoreKeeperDashboard = lazy(() => import('./pages/store-keeper/StoreKeeperDashboard'));
const StoreTransactionHistory = lazy(() => import('./pages/store-keeper/StoreTransactionHistory'));
const EstateAdminDashboard = lazy(() => import('./pages/estate-admin/EstateAdminDashboard'));
const DailyEntry = lazy(() => import('./pages/field-officer/DailyEntry'));
const CropAchievements = lazy(() => import('./pages/field-officer/tabs/CropAchievements'));
const CropAge = lazy(() => import('./pages/field-officer/tabs/CropAge'));
const MusterApproval = lazy(() => import('./pages/field-officer/tabs/MusterApproval'));
const MusterReview = lazy(() => import('./pages/field-officer/tabs/MusterReview'));
const GeneralStock = lazy(() => import('./pages/field-officer/tabs/GeneralStock'));
const PendingApprovals = lazy(() => import('./pages/manager/tabs/PendingApprovals'));
const MusterReviewManager = lazy(() => import('./pages/manager/tabs/MusterReviewManager'));
const AttendanceReport = lazy(() => import('./pages/manager/tabs/AttendanceReport'));
const WorkerRegistry = lazy(() => import('./pages/field-officer/WorkerRegistry'));
const MorningMuster = lazy(() => import('./pages/field-officer/MorningMuster'));
const DistributionOfWorks = lazy(() => import('./pages/field-officer/tabs/DistributionOfWorks'));
const LeaveApplication = lazy(() => import('./pages/field-officer/tabs/LeaveApplication'));
const LeaveManagement = lazy(() => import('./pages/manager/tabs/LeaveManagement'));
const OrderRequest = lazy(() => import('./pages/field-officer/tabs/OrderRequest'));
const PendingOrders = lazy(() => import('./pages/field-officer/tabs/PendingOrders'));
const Correspondence = lazy(() => import('./pages/field-officer/tabs/Correspondence'));
const CostAnalysis = lazy(() => import('./pages/field-officer/tabs/CostAnalysis'));
const FOCropBook = lazy(() => import('./pages/field-officer/tabs/CropBook'));
const Fertilizer = lazy(() => import('./pages/field-officer/tabs/Fertilizer'));
const EstateSettings = lazy(() => import('./pages/estate-admin/EstateSettings'));

// Chief Clerk specific imports
const ChiefClerkDashboard = lazy(() => import('./pages/chief-clerk/ChiefClerkDashboard'));
const NormSettings = lazy(() => import('./pages/manager/tabs/NormSettings'));
const TaskTypeSettings = lazy(() => import('./pages/chief-clerk/tabs/TaskTypeSettings'));
const CostAnalysisManager = lazy(() => import('./pages/chief-clerk/tabs/CostAnalysisManager'));
const WorkProgramManager = lazy(() => import('./pages/chief-clerk/tabs/WorkProgramManager'));
const DivisionView = lazy(() => import('./pages/manager/DivisionView'));

// Loading Fallback Component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
    color: '#1B4332',
    backgroundColor: '#f9fbf9'
  }}>
    <h3>Loading...</h3>
  </div>
);

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
      <Suspense fallback={<LoadingFallback />}>
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
            <Route path="manager-cost-analysis" element={<CostAnalysisManager />} />
            <Route path="division-view/:divisionId" element={<DivisionView />} />

            {/* Chief Clerk Tabs */}
            <Route path="norms" element={<NormSettings />} />
            <Route path="job-roles" element={<TaskTypeSettings />} />
            <Route path="chief-cost-analysis" element={<CostAnalysisManager />} />
            <Route path="chief-distribution-works" element={<WorkProgramManager />} />
            <Route path="chief-inventory" element={<StoreKeeperDashboard />} />
            <Route path="evening-muster-history" element={<DailyEntry defaultTab={1} />} />
          </Route>

          {/* Super Admin Routes */}
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="estate/:id" element={<EstateDetails />} />
            <Route path="new-estate" element={<TenantOnboarding />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
