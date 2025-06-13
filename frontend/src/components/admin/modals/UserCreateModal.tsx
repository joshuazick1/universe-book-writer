/**
 * User Create Modal Component
 * Allows administrators to create new user accounts
 */

import React, { useState } from 'react';

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  password: string;
  confirmPassword: string;
  sendWelcomeEmail: boolean;
  skipEmailVerification: boolean;
}

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (userData: Omit<CreateUserData, 'confirmPassword'>) => Promise<void>;
}

export const UserCreateModal: React.FC<UserCreateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    status: 'active',
    password: '',
    confirmPassword: '',
    sendWelcomeEmail: true,
    skipEmailVerification: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: keyof CreateUserData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.email.includes('@')) return 'Please enter a valid email address';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters long';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { confirmPassword: _confirmPassword, ...userData } = formData;
      await onCreate(userData);

      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        status: 'active',
        password: '',
        confirmPassword: '',
        sendWelcomeEmail: true,
        skipEmailVerification: false,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({
      ...prev,
      password,
      confirmPassword: password,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
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

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
                placeholder="user@example.com"
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={e => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={e => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Role and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={e => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={e => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Password Fields */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                  placeholder="Minimum 8 characters"
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                    disabled={loading}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                    disabled={loading}
                    title="Generate password"
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={e => handleInputChange('confirmPassword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
                placeholder="Confirm password"
              />
            </div>

            {/* Options */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900">Options</h4>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  checked={formData.sendWelcomeEmail}
                  onChange={e => handleInputChange('sendWelcomeEmail', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="sendWelcomeEmail" className="ml-2 block text-sm text-gray-900">
                  Send welcome email to user
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="skipEmailVerification"
                  checked={formData.skipEmailVerification}
                  onChange={e => handleInputChange('skipEmailVerification', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="skipEmailVerification" className="ml-2 block text-sm text-gray-900">
                  Skip email verification (mark as verified)
                </label>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-md">
              <h5 className="font-medium mb-1">Password Requirements:</h5>
              <ul className="list-disc list-inside space-y-1">
                <li>At least 8 characters long</li>
                <li>Mix of uppercase and lowercase letters recommended</li>
                <li>Include numbers and special characters for security</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
