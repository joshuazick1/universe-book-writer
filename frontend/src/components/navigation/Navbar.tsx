/**
 * Navbar Component
 * Main navigation header for the application
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks';
import { UserMenu } from '../../auth/components/UserMenu';

interface NavbarProps {
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const { user } = useAuth();
  
  return (
    <nav className="bg-white/10 backdrop-blur-sm border-b border-universe-border z-[1000] relative">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Title */}
          <div className="flex items-center">            {/* Menu Toggle Button - Single button for all screen sizes */}
            <button 
              className="mr-3 text-universe-text-secondary hover:text-universe-text transition-colors"
              onClick={onToggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                // X icon when menu is open
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              ) : (
                // Hamburger icon when menu is closed
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              )}
            </button>
            
            <Link to="/dashboard" className="flex items-center">
              <h1 className="text-xl font-bold text-universe-primary">Universe Book Writer</h1>
            </Link>
          </div>
            {/* Navigation - Only visible on extra large screens when sidebar is closed */}
          <div className="hidden xl:flex items-center space-x-6">
            <Link 
              to="/dashboard" 
              className="text-universe-text-secondary hover:text-universe-primary transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/profile" 
              className="text-universe-text-secondary hover:text-universe-primary transition-colors"
            >
              Profile
            </Link>
            <Link 
              to="/settings" 
              className="text-universe-text-secondary hover:text-universe-primary transition-colors"
            >
              Settings
            </Link>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center">
            {user && <UserMenu />}
          </div>
        </div>
      </div>
    </nav>
  );
};
