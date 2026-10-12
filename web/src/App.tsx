import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { WebSocketProvider } from './context/WebSocketContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { BackendsPage } from './pages/dashboard/BackendsPage';
import { ConnectionsPage } from './pages/dashboard/ConnectionsPage';
import { RulesPage } from './pages/dashboard/RulesPage';
import { FailureSimulatorPage } from './pages/dashboard/FailureSimulatorPage';
import { LogsPage } from './pages/dashboard/LogsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// Optional protected route guard: allows visitors to preview or forces login if preferred
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-teal-400 font-mono text-xs">
        <span className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />
        CONNECTING RELAY SESSION...
      </div>
    );
  }
  // If not logged in, we can redirect to login or allow guest viewing for demos. Let's redirect to login if no user
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WebSocketProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Dashboard Shell */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<OverviewPage />} />
                  <Route path="backends" element={<BackendsPage />} />
                  <Route path="connections" element={<ConnectionsPage />} />
                  <Route path="rules" element={<RulesPage />} />
                  <Route path="simulator" element={<FailureSimulatorPage />} />
                  <Route path="logs" element={<LogsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* 404 Page */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </WebSocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
