/**
 * Mobile Menu Component
 * Provides navigation for mobile devices with a slide-out sidebar
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, usePermissions } from '../../auth/hooks';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { isAdmin } = usePermissions();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getInitials = (user: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
  }) => {
    if (
      user?.firstName &&
      user?.lastName &&
      user.firstName.length > 0 &&
      user.lastName.length > 0
    ) {
      const first = user.firstName.charAt(0);
      const last = user.lastName.charAt(0);
      return (first + last).toUpperCase();
    }
    return (user?.username || user?.email || 'U')
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (user: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
  }) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || user?.email || 'User';
  };
  return (
    <>
      {/* Menu Panel */}
      <div
        ref={menuRef}
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-[9999] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User Info */}
        <div className="px-6 py-6 bg-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-800 flex items-center justify-center">
              <span className="font-medium text-sm">{getInitials(user || {})}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{getDisplayName(user || {})}</span>
              <span className="text-xs text-blue-200">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-4 px-3">
          <div className="py-1">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Main
            </h3>
            <div className="mt-1 space-y-1">
              <Link
                to="/dashboard"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={onClose}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </Link>

              <Link
                to="/profile"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={onClose}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile
              </Link>

              <Link
                to="/settings"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={onClose}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </Link>

              {/* Admin Panel Link - Only shown for admin users */}
              {isAdmin() && (
                <Link
                  to="/admin"
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-purple-700 hover:bg-purple-50 hover:text-purple-900"
                  onClick={onClose}
                >
                  <svg
                    className="mr-3 h-5 w-5 text-purple-400 group-hover:text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Admin Panel
                </Link>
              )}
            </div>
          </div>

          {/* Other Section - Can be expanded later with more features */}
          <div className="py-1 mt-6 border-t border-gray-200">
            <h3 className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Help & Support
            </h3>
            <div className="mt-1 space-y-1">
              <a
                href="#"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={e => {
                  e.preventDefault();
                  // Add help functionality in the future
                  onClose();
                }}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Help Center
              </a>
            </div>
          </div>

          {/* Version Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="px-3 text-xs text-gray-500">
              <p>Universe Book Writer</p>
              <p>Version: 0.1.0</p>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};
