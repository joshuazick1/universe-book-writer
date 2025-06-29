/**
 * Main App Component - Universe Book Writer
 * Root component with routing, authentication, and theme providers
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, PluginRegistryProvider } from './components/providers';
import { PluginThemeRegistrar } from './components/theme/PluginThemeRegistrar';
// import { AnimationShowcase } from './components/animation';
import { Layout } from './components/navigation';
import { LoginForm, ProtectedRoute, PublicRoute } from './auth/components';
import { useAuth } from './auth/hooks';
import { AdminAuthWrapper } from './components/admin/AdminAuthWrapper';
import { AdminLayout } from './components/admin/layout/AdminLayout';
import { AdminDashboardPage } from './components/admin/pages/AdminDashboardPage';
import { UserManagementPage } from './components/admin/pages/UserManagementPage';
import { AdminSettingsPage } from './components/admin/pages/AdminSettingsPage';
import { SecurityLogsPage } from './components/admin/pages/SecurityLogsPage';
import { UserProfilePage, UserSettingsPage } from './components/user';
import { DashboardPage } from './pages/DashboardPage';
import { UniversesPage } from './pages/UniversesPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';

/**
 * Login Page Component
 */
const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-universe-background text-universe-text flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-universe-primary mb-2">Universe Book Writer</h1>
          <p className="text-universe-text-secondary">Sign in to access your writing universe</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

/**
 * Animation Showcase Page (preserving original functionality)
 * Currently unused - commented out to avoid linting warnings
 */
/*
const AnimationShowcasePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-universe-background text-universe-text">
      <div className="fixed top-4 left-4 z-50">
        <a
          href="/dashboard"
          className="bg-neutral-800 text-white px-3 py-2 rounded-md text-sm hover:bg-neutral-700 transition-colors"
        >
          ← Back to Dashboard
        </a>
      </div>
      <AnimationShowcase />
    </div>
  );
};
*/

/**
 * Authentication Initializer Component
 * Handles app startup authentication check
 */
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkAuthStatus } = useAuth();
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        await checkAuthStatus();
        if (mounted) {
          setAuthChecked(true);
        }
      } catch (error) {
        // console.error('Auth initialization error:', error); // Commented out for linting
        if (mounted) {
          setAuthChecked(true);
        }
      }
    };

    if (!authChecked) {
      initAuth();
    }

    return () => {
      mounted = false;
    };
  }, [checkAuthStatus, authChecked]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-universe-background">
        <div className="text-universe-text">Initializing...</div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Main Application Component with Routing
 */
const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="default">
      <PluginRegistryProvider>
        <PluginThemeRegistrar />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthInitializer>
            <Routes>
              {/* Public Authentication Routes */}
              <Route
                path="/auth/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/auth/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/auth/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                }
              />

              {/* Protected Routes with Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="universes" element={<UniversesPage />} />
                <Route path="profile" element={<UserProfilePage />} />
                <Route path="settings" element={<UserSettingsPage />} />
                // ...existing code...
                <Route index element={<Navigate to="/dashboard" replace />} />
              </Route>

              {/* Admin Panel Routes */}
              <Route
                path="/admin"
                element={
                  <AdminAuthWrapper>
                    <AdminLayout />
                  </AdminAuthWrapper>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="logs" element={<SecurityLogsPage />} />
              </Route>

              {/* Redirect root to login if not authenticated */}
              <Route path="/" element={<Navigate to="/auth/login" replace />} />

              {/* Catch All - Redirect to login */}
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </AuthInitializer>
        </BrowserRouter>
      </PluginRegistryProvider>
    </ThemeProvider>
  );
};

export default App;
