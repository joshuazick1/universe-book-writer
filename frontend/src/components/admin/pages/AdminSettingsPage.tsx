/**
 * Admin Settings Page Component - Simplified
 */

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { useAdminSettings, type AdminSettings } from '../../../hooks';

export const AdminSettingsPage: React.FC = () => {
  const { settings, loading, error, updateSettings, saving } = useAdminSettings();
  const [formData, setFormData] = useState<AdminSettings | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      const success = await updateSettings(formData);
      if (success) {
        setSaveMessage('Settings updated successfully!');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage('Failed to update settings');
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };
  const updateNestedField = (section: keyof AdminSettings, field: string, value: any) => {
    if (!formData) return;

    setFormData({
      ...formData,
      [section]: {
        ...(formData[section] as any),
        [field]: value,
      },
    });
  };

  if (loading || !formData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 ml-4">Loading settings...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Message */}
        {saveMessage && (
          <div
            className={`border rounded-lg p-4 ${
              saveMessage.includes('successfully')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm">{saveMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Verification Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Email Verification</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailVerificationEnabled"
                  checked={formData.emailVerification.enabled}
                  onChange={e =>
                    updateNestedField('emailVerification', 'enabled', e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="emailVerificationEnabled" className="ml-2 text-sm text-gray-700">
                  Enable email verification
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="skipEmailVerificationForNewUsers"
                  checked={formData.emailVerification.skipForNewUsers}
                  onChange={e =>
                    updateNestedField('emailVerification', 'skipForNewUsers', e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="skipEmailVerificationForNewUsers"
                  className="ml-2 text-sm text-gray-700"
                >
                  Skip email verification for new users
                </label>
                <p className="ml-2 text-xs text-gray-500">
                  (New users will be immediately active without email verification)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireEmailVerificationForAccess"
                  checked={formData.emailVerification.requireForAccess}
                  onChange={e =>
                    updateNestedField('emailVerification', 'requireForAccess', e.target.checked)
                  }
                  disabled={!formData.emailVerification.enabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label
                  htmlFor="requireEmailVerificationForAccess"
                  className="ml-2 text-sm text-gray-700"
                >
                  Require email verification for system access
                </label>
              </div>
            </div>
          </div>

          {/* User Registration Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">User Registration</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="userRegistrationEnabled"
                  checked={formData.userRegistration.enabled}
                  onChange={e => updateNestedField('userRegistration', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="userRegistrationEnabled" className="ml-2 text-sm text-gray-700">
                  Allow user registration
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireApproval"
                  checked={formData.userRegistration.requireApproval}
                  onChange={e =>
                    updateNestedField('userRegistration', 'requireApproval', e.target.checked)
                  }
                  disabled={!formData.userRegistration.enabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label htmlFor="requireApproval" className="ml-2 text-sm text-gray-700">
                  Require admin approval for new registrations
                </label>
              </div>

              <div>
                <label
                  htmlFor="defaultRole"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Default role for new users
                </label>
                <select
                  id="defaultRole"
                  value={formData.userRegistration.defaultRole}
                  onChange={e =>
                    updateNestedField('userRegistration', 'defaultRole', e.target.value)
                  }
                  disabled={!formData.userRegistration.enabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Security</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sessionTimeout"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Session timeout (minutes)
                </label>
                <input
                  type="number"
                  id="sessionTimeout"
                  min="15"
                  max="1440"
                  value={formData.security.sessionTimeout}
                  onChange={e =>
                    updateNestedField('security', 'sessionTimeout', parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="maxLoginAttempts"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Max login attempts
                </label>
                <input
                  type="number"
                  id="maxLoginAttempts"
                  min="3"
                  max="10"
                  value={formData.security.maxLoginAttempts}
                  onChange={e =>
                    updateNestedField('security', 'maxLoginAttempts', parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="lockoutDuration"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Lockout duration (minutes)
                </label>
                <input
                  type="number"
                  id="lockoutDuration"
                  min="5"
                  max="60"
                  value={formData.security.lockoutDuration}
                  onChange={e =>
                    updateNestedField('security', 'lockoutDuration', parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};
