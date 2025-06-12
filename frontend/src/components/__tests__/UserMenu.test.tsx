/**
 * User Menu Component Tests
 * Tests for the authenticated user dropdown menu
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../../auth/components/UserMenu';
import { renderWithProviders, mockUser, mockAdminUser, cleanupMocks } from '../../test/utils';
import * as authHooks from '../../auth/hooks';

// Mock the auth hooks
jest.mock('../../auth/hooks', () => ({
  useAuth: jest.fn(),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

describe('UserMenu', () => {
  const mockLogout = jest.fn();
  
  const defaultAuthState = {
    user: mockUser,
    logout: mockLogout,
    isLoading: false,
  };

  beforeEach(() => {
    jest.mocked(authHooks.useAuth).mockReturnValue(defaultAuthState);
    mockLogout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanupMocks();
    mockNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('should render user avatar and name when user is present', () => {
      renderWithProviders(<UserMenu />);
      
      expect(screen.getByText(mockUser.email.charAt(0).toUpperCase())).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it('should render admin indicator for admin users', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: mockAdminUser,
      });

      renderWithProviders(<UserMenu />);
      
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('should not render when user is null', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: null,
      });

      const { container } = renderWithProviders(<UserMenu />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Menu Interactions', () => {
    it('should open menu when clicking user avatar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      expect(screen.getByText(/settings/i)).toBeInTheDocument();
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });

    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      // Open menu
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      
      // Click outside
      await user.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
      });
    });

    it('should close menu when pressing Escape key', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      // Open menu
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
      });
    });

    it('should toggle menu open/closed on avatar clicks', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      const avatarButton = screen.getByRole('button');
      
      // Open menu
      await user.click(avatarButton);
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      
      // Close menu
      await user.click(avatarButton);
      await waitFor(() => {
        expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Menu Items', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
    });

    it('should render profile link', () => {
      const profileLink = screen.getByRole('link', { name: /profile/i });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute('href', '/profile');
    });

    it('should render settings link', () => {
      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });

    it('should render admin panel link for admin users', async () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: mockAdminUser,
      });

      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      const adminLink = screen.getByRole('link', { name: /admin panel/i });
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('should not render admin panel link for regular users', () => {
      expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
    });

    it('should render logout button', () => {
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout and navigate when logout button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      // Open menu
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      // Click logout
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('should handle logout errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockLogout.mockRejectedValue(new Error('Logout failed'));
      
      renderWithProviders(<UserMenu />);
      
      // Open menu
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      // Click logout
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalled();
      
      // Should still attempt navigation despite error
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
      });
      
      consoleError.mockRestore();
    });

    it('should show loading state during logout', async () => {
      const user = userEvent.setup();
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      renderWithProviders(<UserMenu />);
      
      // Open menu
      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      const logoutButton = screen.getByRole('button', { name: /signing out/i });
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toBeDisabled();
    });
  });

  describe('User Information Display', () => {
    it('should display user email', () => {
      renderWithProviders(<UserMenu />);
      
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it('should display username when available', () => {
      const userWithUsername = { ...mockUser, username: 'testuser' };
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: userWithUsername,
      });

      renderWithProviders(<UserMenu />);
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should display user role badge', () => {
      renderWithProviders(<UserMenu />);
      
      expect(screen.getByText(mockUser.role)).toBeInTheDocument();
    });

    it('should display first letter of email as avatar when no profile image', () => {
      renderWithProviders(<UserMenu />);
      
      const expectedInitial = mockUser.email.charAt(0).toUpperCase();
      expect(screen.getByText(expectedInitial)).toBeInTheDocument();
    });

    it('should display profile image when available', () => {
      const userWithImage = { 
        ...mockUser, 
        profile: { ...mockUser.profile, profileImage: 'https://example.com/avatar.jpg' } 
      };
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: userWithImage,
      });

      renderWithProviders(<UserMenu />);
      
      const profileImage = screen.getByRole('img', { name: /profile/i });
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<UserMenu />);
      
      const menuButton = screen.getByRole('button');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should update ARIA attributes when menu is open', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      const menuButton = screen.getByRole('button');
      
      // Open with Enter key
      await user.type(menuButton, '{Enter}');
      
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      
      // Should be able to tab through menu items
      await user.tab();
      expect(screen.getByRole('link', { name: /profile/i })).toHaveFocus();
    });

    it('should have proper semantic structure', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserMenu />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      // Menu should have proper role
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      
      // Menu items should have proper roles
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);
    });
  });
});
