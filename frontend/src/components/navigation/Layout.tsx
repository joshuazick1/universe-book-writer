/**
 * Layout Component
 * Provides consistent layout structure for all authenticated pages
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MobileMenu } from './MobileMenu';

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-universe-background text-universe-text flex flex-col">
      <Navbar onToggleMobileMenu={toggleMobileMenu} isMobileMenuOpen={mobileMenuOpen} />

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content Area */}
      <div className="flex flex-1 relative">
        {/* Sidebar space on larger screens when menu is open */}
        <div
          className={`
          hidden lg:block transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'w-64' : 'w-0'}
        `}
        />

        {/* Main content */}
        <main
          className={`
          flex-1 transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'lg:ml-0' : ''}
        `}
        >
          <Outlet />
        </main>

        {/* Backdrop for mobile - only visible on small screens */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] lg:hidden"
            onClick={closeMobileMenu}
          />
        )}
      </div>
    </div>
  );
};
