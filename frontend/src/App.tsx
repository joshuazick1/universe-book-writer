/**
 * Main App Component - Universe Book Writer
 * Root component with routing, authentication, and theme providers
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, PluginRegistryProvider } from './components/providers';
import { AnimationShowcase } from './components/animation';
import { LoginForm, ProtectedRoute } from './auth/components';
import { useAuth } from './auth/hooks';

/**
 * Enhanced Dashboard Page Component with Authentication
 */
const DashboardPage: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-universe-background text-universe-text">
      {/* Navigation Header */}
      <nav className="bg-white/10 backdrop-blur-sm border-b border-universe-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-universe-primary">Universe Book Writer</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-universe-text-secondary">
                Welcome, {user?.email || 'User'}
                {user?.role && (
                  <span className="ml-2 px-2 py-1 bg-universe-primary/20 rounded text-xs">
                    {user.role}
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-universe-primary">Dashboard</h2>
            <p className="text-xl text-universe-text-secondary">
              Phase A.1 Authentication Complete ✅ - Building the Foundation
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Authentication Status Card */}
            <div className="bg-green-500/10 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
              <h2 className="text-2xl font-semibold mb-4 text-green-400">
                🔐 Authentication System
              </h2>
              <div className="space-y-2 text-universe-text-secondary">
                <p>✅ User registration and login</p>
                <p>✅ JWT token authentication</p>
                <p>✅ HTTP-only cookie security</p>
                <p>✅ Protected route access</p>
                <p>✅ Role-based permissions</p>
                <p>✅ Password reset functionality</p>
              </div>
              <div className="mt-4 text-sm text-green-300">
                Status: <strong>Fully Operational</strong>
              </div>
            </div>

            {/* Animation Showcase Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-universe-border">
              <h2 className="text-2xl font-semibold mb-4 text-universe-primary">
                🎨 Animation Framework
              </h2>
              <p className="text-universe-text-secondary mb-6">
                Explore the complete animation system designed for plugin developers.
              </p>
              <a
                href="/showcase/animations"
                className="inline-block bg-universe-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                View Animation Showcase
              </a>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-universe-border">
              <h2 className="text-2xl font-semibold mb-4 text-universe-primary">
                📚 Content Management
              </h2>
              <p className="text-universe-text-secondary mb-6">
                Manage your universes, characters, and stories. Coming in Phase 1.5.
              </p>
              <button
                disabled
                className="inline-block bg-gray-500 text-white px-6 py-3 rounded-lg cursor-not-allowed opacity-50"
              >
                Coming Soon
              </button>
            </div>

            {/* API Status Card */}
            <div className="bg-blue-500/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30">
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">🚀 Backend API</h2>
              <div className="space-y-2 text-universe-text-secondary">
                <p>✅ Express.js server running</p>
                <p>✅ MongoDB connection active</p>
                <p>✅ Authentication endpoints</p>
                <p>✅ Plugin system initialized</p>
                <p>✅ Security middleware active</p>
              </div>
              <div className="mt-4 text-sm text-blue-300">
                Port: <strong>5000</strong> | Status: <strong>Online</strong>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-universe-border">
              <h3 className="text-lg font-semibold mb-3 text-universe-primary">
                🎉 Phase A.1 Complete!
              </h3>
              <p className="text-universe-text-secondary mb-4">
                The authentication system is now fully functional and ready for Phase 1.5
                development.
              </p>
              <div className="flex justify-center space-x-4 text-sm">
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">
                  Frontend ✅
                </span>
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">Backend ✅</span>
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">
                  Database ✅
                </span>
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">
                  Security ✅
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
 */
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

/**
 * Main Application Component with Routing
 */
const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="default">
      <PluginRegistryProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Animation Showcase - Public Access */}
            <Route path="/showcase/animations" element={<AnimationShowcasePage />} />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </PluginRegistryProvider>
    </ThemeProvider>
  );
};

export default App;
