/**
 * Security Logs Page Component
 * Displays security events, audit logs, and system activity for administrators
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../base/Card';

interface SecurityLog {
  id: string;
  timestamp: string;
  type:
    | 'login'
    | 'logout'
    | 'failed_login'
    | 'user_created'
    | 'user_updated'
    | 'settings_changed'
    | 'security_alert'
    | 'system_event';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

interface SecurityLogsFilters {
  search: string;
  type: string;
  severity: string;
  dateFrom: string;
  dateTo: string;
  userId: string;
}

export const SecurityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SecurityLogsFilters>({
    search: '',
    type: '',
    severity: '',
    dateFrom: '',
    dateTo: '',
    userId: '',
  });
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);

  // Mock data for development
  const mockLogs: SecurityLog[] = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      type: 'login',
      severity: 'info',
      message: 'User logged in successfully',
      userId: 'user1',
      userEmail: 'admin@universe-writer.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      type: 'failed_login',
      severity: 'warning',
      message: 'Failed login attempt - invalid password',
      userEmail: 'test@example.com',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      type: 'user_created',
      severity: 'info',
      message: 'New user account created',
      userId: 'user2',
      userEmail: 'newuser@example.com',
      ipAddress: '192.168.1.102',
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      type: 'settings_changed',
      severity: 'info',
      message: 'Email verification settings updated',
      userId: 'admin1',
      userEmail: 'admin@universe-writer.com',
      ipAddress: '192.168.1.100',
      details: {
        setting: 'emailVerification.enabled',
        oldValue: false,
        newValue: true,
      },
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      type: 'security_alert',
      severity: 'warning',
      message: 'Multiple failed login attempts detected',
      ipAddress: '192.168.1.105',
      details: {
        attempts: 5,
        timeWindow: '5 minutes',
      },
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
      type: 'system_event',
      severity: 'info',
      message: 'System backup completed successfully',
      details: {
        backupSize: '1.2GB',
        duration: '45 seconds',
      },
    },
  ];

  useEffect(() => {
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 500);
  }, [filters, page]);

  const handleFilterChange = (key: keyof SecurityLogsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login':
        return '🔓';
      case 'logout':
        return '🔒';
      case 'failed_login':
        return '❌';
      case 'user_created':
        return '👤';
      case 'user_updated':
        return '✏️';
      case 'settings_changed':
        return '⚙️';
      case 'security_alert':
        return '⚠️';
      case 'system_event':
        return '🔧';
      default:
        return '📝';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const filteredLogs = logs.filter(log => {
    if (
      filters.search &&
      !log.message.toLowerCase().includes(filters.search.toLowerCase()) &&
      !log.userEmail?.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (filters.type && log.type !== filters.type) return false;
    if (filters.severity && log.severity !== filters.severity) return false;
    if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(log.timestamp) > new Date(filters.dateTo)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Logs</h1>
        <p className="text-gray-600 mt-2">Monitor security events and system activity</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Filters</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder="Search logs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                id="type"
                value={filters.type}
                onChange={e => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="failed_login">Failed Login</option>
                <option value="user_created">User Created</option>
                <option value="user_updated">User Updated</option>
                <option value="settings_changed">Settings Changed</option>
                <option value="security_alert">Security Alert</option>
                <option value="system_event">System Event</option>
              </select>
            </div>

            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                id="severity"
                value={filters.severity}
                onChange={e => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="datetime-local"
                id="dateFrom"
                value={filters.dateFrom}
                onChange={e => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="datetime-local"
                id="dateTo"
                value={filters.dateTo}
                onChange={e => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    search: '',
                    type: '',
                    severity: '',
                    dateFrom: '',
                    dateTo: '',
                    userId: '',
                  })
                }
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Security Events</h2>
            <div className="text-sm text-gray-600">
              {filteredLogs.length} of {logs.length} events
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="mr-2">{getTypeIcon(log.type)}</span>
                          <span className="capitalize">{log.type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(
                            log.severity
                          )}`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userEmail || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Security Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedLog.timestamp)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Type</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">
                      {selectedLog.type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(
                        selectedLog.severity
                      )}`}
                    >
                      {selectedLog.severity}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.userEmail || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.message}</p>
                </div>

                {selectedLog.ipAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.ipAddress}</p>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                    <p className="mt-1 text-sm text-gray-900 break-all">{selectedLog.userAgent}</p>
                  </div>
                )}

                {selectedLog.details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Details
                    </label>
                    <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
