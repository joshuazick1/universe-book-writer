/**
 * Admin Dashboard Overview Page
 * Displays key metrics and quick actions for administrators
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../../base/Card';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { useAdminSettings } from '../../../hooks/useAdminSettings';
import { useAuth } from '../../../auth';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  newUsersThisWeek: number;
  totalSessions: number;
  activeSessions: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { users, fetchUsers, loading, error } = useAdminUsers();
  const { settings } = useAdminSettings();
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    newUsersThisWeek: 0,
    totalSessions: 0,
    activeSessions: 0,
  });

  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];  // Calculate stats from users data
  useEffect(() => {
    if (safeUsers.length > 0) {
      const activeUsers = safeUsers.filter(user => user.status === 'active').length;
      const pendingUsers = safeUsers.filter(user => user.status === 'pending').length;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newUsersThisWeek = safeUsers.filter(
        user => new Date(user.createdAt) > weekAgo
      ).length;

      const newStats = {
        totalUsers: safeUsers.length,
        activeUsers,
        pendingUsers,
        newUsersThisWeek,
        totalSessions: safeUsers.length * 2, // Mock data
        activeSessions: activeUsers, // Mock data
      };

      setStats(newStats);
    }
  }, [safeUsers]);
  // Load initial data - but only after authentication is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers({
        page: 1,
        limit: 100, // Get more users for stats
        search: '',
        filters: {},
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    }
  }, [fetchUsers, isAuthenticated]);
  const quickActions = [
    {
      title: 'System Settings',
      description: 'Configure application settings',
      href: '/admin/settings',
      icon: '⚙️',
      color: 'bg-purple-500',
    },
    {
      title: 'Security Logs',
      description: 'View security and audit logs',
      href: '/admin/logs',
      icon: '🔍',
      color: 'bg-orange-500',
    },
    {
      title: 'System Health',
      description: 'Monitor system performance',
      href: '/admin/system',
      icon: '📊',
      color: 'bg-green-500',
    },
    {
      title: 'Backup & Export',
      description: 'Manage data backup and exports',
      href: '/admin/backup',
      icon: '💾',
      color: 'bg-blue-500',
    },
  ];

  const recentActivity = [
    {
      id: '1',
      type: 'user_created',
      message: 'New user registration: user@example.com',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      severity: 'info',
    },
    {
      id: '2',
      type: 'settings_updated',
      message: 'Email verification settings updated',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      severity: 'info',
    },
    {
      id: '3',
      type: 'security_alert',
      message: 'Failed login attempts from IP 192.168.1.100',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      severity: 'warning',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of system status and key metrics</p>
      </div>      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Combined User Management Button */}
        <Link to="/admin/users" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-300">
            <CardContent>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">👥</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">User Management</p>
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{stats.totalUsers}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{stats.activeUsers}</p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                  </div>
                </div>
                <div className="ml-2">
                  <div className="w-5 h-5 text-gray-400">→</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>        {/* Pending Users - Clickable */}
        <Link to="/admin/users?status=pending" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-yellow-300">
            <CardContent>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">⏳</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Pending Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingUsers}</p>
                  <p className="text-xs text-yellow-600 mt-1">Requires approval</p>
                </div>
                <div className="ml-2">
                  <div className="w-5 h-5 text-gray-400">→</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📈</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.newUsersThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🔗</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">⚡</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <p className="text-gray-600 text-sm mt-1">Common administrative tasks</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map(action => (
                <Link
                  key={action.title}
                  to={action.href}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                    <span className="text-white text-xl">{action.icon}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 text-center">{action.title}</h3>
                  <p className="text-xs text-gray-600 text-center mt-1">{action.description}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <p className="text-gray-600 text-sm mt-1">Latest system events and changes</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.severity === 'warning'
                        ? 'bg-yellow-400'
                        : activity.severity === 'error'
                        ? 'bg-red-400'
                        : 'bg-blue-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                to="/admin/logs"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all activity →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">System Status</h2>
          <p className="text-gray-600 text-sm mt-1">Current system configuration and health</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">            <div>
              <h3 className="font-medium text-gray-900 mb-2">Email Verification</h3>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    settings?.emailVerification?.enabled ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {settings?.emailVerification?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">User Registration</h3>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    settings?.userRegistration?.enabled ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />                <span className="text-sm text-gray-600">
                  {settings?.userRegistration?.enabled ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Security</h3>              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-sm text-gray-600">
                  {settings?.security?.maxLoginAttempts || 5} max attempts
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Database</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-sm text-gray-600">Connected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
