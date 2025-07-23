/**
 * User Profile Page Component
 * Displays and allows editing of user profile information
 */

import React, { useState } from 'react';
import { useAuth } from '../../../auth/hooks';
import { Card, CardHeader, CardContent } from '../../base/Card';
import { logger } from '../../../utils/logger';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
}

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

export const UserProfilePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
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

  // Helper functions for consistent styling
  const getInputStyles = (hasError?: boolean) => ({
    backgroundColor: 'var(--color-universe-surface)',
    borderColor: hasError ? 'rgba(239, 68, 68, 0.5)' : 'var(--color-universe-primary)',
    color: 'var(--color-universe-text)',
    '--placeholder-color': 'rgba(var(--color-universe-text-rgb), 0.5)'
  } as React.CSSProperties);

  const getLabelStyles = () => ({
    color: 'var(--color-universe-text)',
    opacity: 0.8
  });

  const getSecondaryTextStyles = () => ({
    color: 'var(--color-universe-text)',
    opacity: 0.6
  });

  const getAvatarStyles = () => ({
    background: `linear-gradient(135deg, var(--color-universe-primary), var(--color-universe-accent))`,
    color: 'var(--color-universe-background)'
  });

  const getSurfaceStyles = () => ({
    backgroundColor: 'var(--color-universe-surface)',
    borderColor: 'var(--color-universe-primary)',
    color: 'var(--color-universe-text)'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to update profile
      logger.info('Saving profile:', formData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsEditing(false);
    } catch (error) {
      logger.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      bio: user?.bio || '',
    });
    setIsEditing(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      // TODO: Implement API call to change password
      logger.info('Changing password...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
      alert('Password changed successfully');
    } catch (error) {
      logger.error('Failed to change password:', error);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-universe-background)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-universe-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-universe-background)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-universe-text)' }}>Profile & Settings</h1>
            <p className="mt-2" style={{ color: 'var(--color-universe-text)', opacity: 0.7 }}>
              Manage your personal information, preferences, and account settings
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold" style={{ color: 'var(--color-universe-text)' }}>Personal Information</h2>
                      <p className="text-sm mt-1" style={getSecondaryTextStyles()}>
                        Update your personal details and bio
                      </p>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'var(--color-universe-primary)',
                          color: 'var(--color-universe-surface)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={getAvatarStyles()}
                      >
                        {(formData.firstName[0] || user?.email[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium" style={{ color: 'var(--color-universe-text)' }}>
                          {formData.firstName || formData.lastName
                            ? `${formData.firstName} ${formData.lastName}`.trim()
                            : 'Unnamed User'}
                        </h3>
                        <p style={getSecondaryTextStyles()}>{formData.email}</p>
                        <p className="text-sm" style={getSecondaryTextStyles()}>
                          Member since{' '}
                          {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={getLabelStyles()}>
                          First Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-opacity-50"
                            placeholder="Enter your first name"
                            style={getInputStyles()}
                          />
                        ) : (
                          <p className="py-2" style={{ color: 'var(--color-universe-text)' }}>{formData.firstName || 'Not set'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={getLabelStyles()}>
                          Last Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-opacity-50"
                            placeholder="Enter your last name"
                            style={getInputStyles()}
                          />
                        ) : (
                          <p className="py-2" style={{ color: 'var(--color-universe-text)' }}>{formData.lastName || 'Not set'}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={getLabelStyles()}>
                        Email Address
                      </label>
                      <p className="py-2 px-3 rounded-lg border" style={getSurfaceStyles()}>
                        {formData.email}
                        <span className="text-sm ml-2" style={getSecondaryTextStyles()}>
                          (Email cannot be changed here)
                        </span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={getLabelStyles()}>Bio</label>
                      {isEditing ? (
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-opacity-50"
                          style={getInputStyles()}
                          placeholder="Tell us about yourself..."
                        />
                      ) : (
                        <p className="py-2 min-h-[100px]" style={{ color: 'var(--color-universe-text)' }}>
                          {formData.bio || 'No bio added yet.'}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="flex justify-end space-x-4 pt-4 border-t">
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="px-4 py-2 border rounded-lg transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--color-universe-surface)',
                            borderColor: 'var(--color-universe-primary)',
                            color: 'var(--color-universe-text)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                          style={{
                            backgroundColor: 'var(--color-universe-primary)',
                            color: 'var(--color-universe-background)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          {isSaving && (
                            <svg
                              className="animate-spin -ml-1 mr-3 h-4 w-4"
                              style={{ color: 'var(--color-universe-surface)' }}
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          )}
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Status */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Account Status</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={getSecondaryTextStyles()}>Email Verified</span>
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: user?.emailVerified
                            ? 'rgba(34, 197, 94, 0.1)'
                            : 'rgba(245, 158, 11, 0.1)',
                          color: user?.emailVerified
                            ? 'rgb(34, 197, 94)'
                            : 'rgb(245, 158, 11)'
                        }}
                      >
                        {user?.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={getSecondaryTextStyles()}>Account Status</span>
                      <span className="px-2 py-1 text-xs rounded-full" style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: 'rgb(34, 197, 94)'
                      }}>
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={getSecondaryTextStyles()}>Role</span>
                      <span className="px-2 py-1 text-xs rounded-full capitalize" style={{
                        backgroundColor: 'rgba(var(--color-universe-primary-rgb), 0.1)',
                        color: 'var(--color-universe-primary)'
                      }}>
                        {user?.role || 'user'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Settings & Security */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Security & Settings</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="w-full px-4 py-2 text-left text-sm rounded-lg transition-colors flex justify-between items-center"
                      style={{
                        color: 'var(--color-universe-primary)',
                        backgroundColor: showPasswordForm ? 'rgba(var(--color-universe-primary-rgb), 0.1)' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--color-universe-primary-rgb), 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = showPasswordForm ? 'rgba(var(--color-universe-primary-rgb), 0.1)' : 'transparent'}
                    >
                      Change Password
                      <span className="text-xs" style={getSecondaryTextStyles()}>{showPasswordForm ? '−' : '+'}</span>
                    </button>

                    {showPasswordForm && (
                      <div className="p-4 rounded-lg" style={getSurfaceStyles()}>
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={getLabelStyles()}>
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
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50"
                              style={getInputStyles()}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={getLabelStyles()}>
                              New Password
                            </label>
                            <input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={e =>
                                setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                              }
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50"
                              required
                              style={getInputStyles()}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={getLabelStyles()}>
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
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50"
                              required
                              style={getInputStyles()}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={isChangingPassword}
                              className="px-3 py-1 text-sm rounded-lg transition-colors disabled:opacity-50"
                              style={{
                                backgroundColor: 'var(--color-universe-primary)',
                                color: 'var(--color-universe-surface)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `rgba(var(--color-universe-primary-rgb), 0.8)`}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-universe-primary)'}
                            >
                              {isChangingPassword ? 'Changing...' : 'Update'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowPasswordForm(false);
                                setPasswordData({
                                  currentPassword: '',
                                  newPassword: '',
                                  confirmPassword: '',
                                });
                              }}
                              className="px-3 py-1 text-sm border rounded-lg transition-colors"
                              style={{
                                borderColor: 'rgba(var(--color-universe-text-rgb), 0.3)',
                                color: 'var(--color-universe-text)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--color-universe-text-rgb), 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <button
                      className="w-full px-4 py-2 text-left text-sm rounded-lg transition-colors"
                      style={{
                        color: 'var(--color-universe-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--color-universe-primary-rgb), 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Privacy Settings
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm rounded-lg transition-colors"
                      style={{
                        color: 'var(--color-universe-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--color-universe-primary-rgb), 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Download Data
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm rounded-lg transition-colors"
                      style={{
                        color: 'var(--color-universe-accent)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--color-universe-accent-rgb), 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Delete Account
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Notifications</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(notificationSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-xs" style={getSecondaryTextStyles()}>
                            {key === 'emailNotifications' && 'Email updates'}
                            {key === 'pushNotifications' && 'Browser notifications'}
                            {key === 'weeklyDigest' && 'Weekly summary'}
                            {key === 'securityAlerts' && 'Security alerts'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={() =>
                              handleNotificationToggle(key as keyof NotificationSettings)
                            }
                            className="sr-only peer"
                          />
                          <div
                            className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all"
                            style={{
                              backgroundColor: value ? 'var(--color-universe-primary)' : 'rgba(var(--color-universe-text-rgb), 0.3)',
                              borderColor: value ? 'var(--color-universe-primary)' : 'rgba(var(--color-universe-text-rgb), 0.3)'
                            }}
                          ></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
