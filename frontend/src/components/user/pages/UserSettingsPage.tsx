/**
 * User Settings Page Component
 * Allows users to manage their account settings and preferences
 */

import React, { useState } from 'react';
import { useAuth } from '../../../auth/hooks';
import { Card, CardHeader, CardContent } from '../../base/Card';

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

export const UserSettingsPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'security' | 'notifications' | 'privacy' | 'account'>(
    'security'
  );
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    securityAlerts: true,
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      // TODO: Implement API call to change password
      console.log('Changing password...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      alert('Password changed successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const tabs = [
    { id: 'security' as const, label: 'Security', icon: '🔒' },
    { id: 'notifications' as const, label: 'Notifications', icon: '🔔' },
    { id: 'privacy' as const, label: 'Privacy', icon: '🛡️' },
    { id: 'account' as const, label: 'Account', icon: '⚙️' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account preferences and security settings</p>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3 text-lg">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Password & Authentication</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Keep your account secure with a strong password
                      </p>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={e =>
                              setPasswordData(prev => ({
                                ...prev,
                                currentPassword: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={e =>
                              setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={e =>
                              setPasswordData(prev => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isChangingPassword}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                        </button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Add an extra layer of security to your account
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Authenticator App</p>
                          <p className="text-sm text-gray-600">
                            Use an authenticator app to generate secure codes
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Enable
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Notification Preferences</h2>
                    <p className="text-gray-600 text-sm mt-1">
                      Choose what notifications you want to receive
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.entries(notificationSettings).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {key === 'emailNotifications' &&
                                'Receive notifications via email about important updates'}
                              {key === 'pushNotifications' &&
                                'Get browser push notifications for real-time updates'}
                              {key === 'weeklyDigest' &&
                                'Weekly summary of your activity and updates'}
                              {key === 'securityAlerts' &&
                                'Important security notifications and alerts'}
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={() => handleNotificationToggle(key as keyof NotificationSettings)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Privacy Settings</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Control who can see your information and activity
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Profile Visibility</p>
                            <p className="text-sm text-gray-600">
                              Who can see your profile information
                            </p>
                          </div>
                          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>Public</option>
                            <option>Friends Only</option>
                            <option>Private</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Activity Status</p>
                            <p className="text-sm text-gray-600">
                              Show when you're online or last active
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Data & Privacy</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Manage your personal data and privacy preferences
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <button className="w-full px-4 py-3 text-left bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                          Download Your Data
                        </button>
                        <button className="w-full px-4 py-3 text-left bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                          Data Processing Preferences
                        </button>
                        <button className="w-full px-4 py-3 text-left bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                          Request Data Deletion
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Account Information</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Basic information about your account
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <p className="text-gray-900">{user?.email}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Role
                            </label>
                            <p className="text-gray-900 capitalize">{user?.role || 'user'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Member Since
                            </label>
                            <p className="text-gray-900">
                              {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last Login
                            </label>
                            <p className="text-gray-900">
                              {new Date(user?.lastLoginAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Irreversible actions that will affect your account
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                          <h3 className="font-medium text-red-800 mb-2">Delete Account</h3>
                          <p className="text-sm text-red-600 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                          </p>
                          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
