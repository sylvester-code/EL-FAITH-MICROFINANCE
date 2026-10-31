import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { LoanProducts } from './pages/LoanProducts';
import { LoanApplications } from './pages/LoanApplications';
import { LoanDisbursements } from './pages/LoanDisbursements';
import { Repayments } from './pages/Repayments';
import { OverdueTracker } from './pages/OverdueTracker';
import { Cashbook } from './pages/Cashbook';
import { Expenses } from './pages/Expenses';
import { StaffManagement } from './pages/StaffManagement';
import { AuditLogs } from './pages/AuditLogs';
import { SystemSettings } from './pages/SystemSettings';
import { LoanCalculator } from './pages/LoanCalculator';

const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? <Navigate to="/portal/dashboard" replace /> : <Login />;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Prevent Client role from entering management portal
  if (user?.role === 'CLIENT') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center space-y-3">
          <h3 className="text-lg font-bold text-navy-950">Management Portal Access Only</h3>
          <p className="text-xs text-slate-600">
            This platform is strictly restricted to Super Administrator ELIJAH APPIAH, the CEO, and authorized staff members.
          </p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user?.role) && user?.role !== 'SUPER_ADMIN' && user?.role !== 'CEO') {
    return (
      <AppLayout>
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <h3 className="text-lg font-bold text-navy-950">Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your current assigned role ({user?.role}) does not have permission to access this module. Contact Super Administrator ELIJAH APPIAH.
          </p>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main entry: Direct Login Panel (No public website) */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<RootRoute />} />

          {/* Protected Management & Staff Portal Routes */}
          <Route
            path="/portal/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/calculator"
            element={
              <ProtectedRoute>
                <LoanCalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/products"
            element={
              <ProtectedRoute>
                <LoanProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/applications"
            element={
              <ProtectedRoute>
                <LoanApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/disbursements"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'CASHIER', 'ACCOUNTANT']}>
                <LoanDisbursements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/repayments"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'CASHIER', 'ACCOUNTANT', 'AUDITOR']}>
                <Repayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/overdue"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'LOAN_OFFICER']}>
                <OverdueTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/cashbook"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR', 'CASHIER']}>
                <Cashbook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/expenses"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER']}>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/staff"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO']}>
                <StaffManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO', 'AUDITOR', 'ACCOUNTANT']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/settings"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CEO']}>
                <SystemSettings />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirects back to login/dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
