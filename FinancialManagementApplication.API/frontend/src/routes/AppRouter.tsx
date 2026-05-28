// src/routes/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Onboarding from "../pages/Onboarding";
import Dashboard from "../pages/Dashboard";
import AllocationPlans from "../pages/AllocationPlans";
import PortfolioAllocation from "../pages/PortfolioAllocation";
import Wallets from "../pages/Wallets";
import Assets from "../pages/Assets";
import History from "../pages/History";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import { useFinanceStore } from "../store/financeStore";

// Guarded route component
function PrivateRoute({ children }: { children: JSX.Element }) {
  const user = useFinanceStore(state => state.user);
  const hasPlan = useFinanceStore(state => state.hasAllocationPlan);
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPlan) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/allocation-plans"
          element={
            <PrivateRoute>
              <AllocationPlans />
            </PrivateRoute>
          }
        />
        <Route
          path="/portfolio"
          element={
            <PrivateRoute>
              <PortfolioAllocation />
            </PrivateRoute>
          }
        />
        <Route
          path="/wallets"
          element={
            <PrivateRoute>
              <Wallets />
            </PrivateRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <PrivateRoute>
              <Assets />
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
