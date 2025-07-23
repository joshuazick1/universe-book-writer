/**
 * Dashboard Page Component
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../auth/hooks';

export const DashboardPage: React.FC = () => {
  const { isAdmin } = usePermissions();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-universe-primary">Dashboard</h2>
          <p className="text-xl text-universe-text-secondary">
            Phase A.1 Authentication Complete ✅ - Building the Foundation
          </p>
        </header>

        <div
          className={`grid gap-8 ${isAdmin() ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}
        >
          {/* Admin Panel Card - Only show for admin users */}
          {isAdmin() && (
            <div
              className="backdrop-blur-sm rounded-lg p-6 border"
              style={{
                backgroundColor: 'var(--color-universe-accent)',
                borderColor: 'var(--color-universe-primary)',
                opacity: 0.9
              }}
            >
              <h2
                className="text-2xl font-semibold mb-4"
                style={{ color: 'var(--color-universe-background)' }}
              >
                🛡️ Admin Panel
              </h2>
              <p
                className="mb-6 opacity-90"
                style={{ color: 'var(--color-universe-background)' }}
              >
                Manage users, system settings, and security configurations.
              </p>
              <Link
                to="/admin"
                className="inline-block px-6 py-3 rounded-lg transition-colors hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-universe-primary)',
                  color: 'var(--color-universe-background)'
                }}
              >
                Open Admin Panel
              </Link>
            </div>
          )}

          {/* Universe Management Card */}
          <div
            className="backdrop-blur-sm rounded-lg p-6 border"
            style={{
              backgroundColor: 'var(--color-universe-surface)',
              borderColor: 'var(--color-universe-primary)'
            }}
          >
            <h2
              className="text-2xl font-semibold mb-4"
              style={{ color: 'var(--color-universe-primary)' }}
            >
              📚 Universe Management
            </h2>
            <p
              className="mb-6 opacity-75"
              style={{ color: 'var(--color-universe-text)' }}
            >
              Create and manage your fictional universes for your book series.
            </p>
            <Link
              to="/universes"
              className="inline-block px-6 py-3 rounded-lg transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-universe-primary)',
                color: 'var(--color-universe-background)'
              }}
            >
              Manage Universes
            </Link>
          </div>

          {/* Authentication Status Card */}
          <div className="bg-green-500/10 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
            <h2 className="text-2xl font-semibold mb-4 text-green-400">🔐 Authentication System</h2>
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
              The authentication system is now fully functional and ready for Phase 1.5 development.
            </p>
            <div className="flex justify-center space-x-4 text-sm">
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">Frontend ✅</span>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">Backend ✅</span>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">Database ✅</span>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded">Security ✅</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
