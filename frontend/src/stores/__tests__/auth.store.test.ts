/**
 * Authentication Store Tests
 * Tests authentication state management and persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authStore } from '../../stores/auth.store';
import { User } from '../../types/auth.types';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthStore', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset store state
    authStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    });
    
    // Clear localStorage
    mockLocalStorage.clear();
  });

  describe('authentication state', () => {
    it('should initialize with unauthenticated state', () => {
      const state = authStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle login state correctly', () => {
      const loginData = {
        user: mockUser,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      };

      authStore.getState().login(loginData);
      
      const state = authStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('access-token-123');
      expect(state.refreshToken).toBe('refresh-token-123');
      expect(state.error).toBeNull();
    });

    it('should handle logout cleanup', () => {
      // First login
      authStore.getState().login({
        user: mockUser,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });

      // Then logout
      authStore.getState().logout();
      
      const state = authStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should handle token refresh', () => {
      // Initial login
      authStore.getState().login({
        user: mockUser,
        accessToken: 'old-token',
        refreshToken: 'refresh-token-123',
      });

      // Refresh tokens
      authStore.getState().refreshTokens({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      
      const state = authStore.getState();
      expect(state.accessToken).toBe('new-access-token');
      expect(state.refreshToken).toBe('new-refresh-token');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle authentication errors', () => {
      const errorMessage = 'Invalid credentials';
      
      authStore.getState().setError(errorMessage);
      
      const state = authStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });

    it('should handle loading state', () => {
      authStore.getState().setLoading(true);
      
      let state = authStore.getState();
      expect(state.isLoading).toBe(true);
      
      authStore.getState().setLoading(false);
      
      state = authStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist authentication state to localStorage', () => {
      const loginData = {
        user: mockUser,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      };

      authStore.getState().login(loginData);
      
      // Check that data was persisted
      const persistedData = JSON.parse(
        mockLocalStorage.getItem('auth-storage') || '{}'
      );
      
      expect(persistedData.state.user).toEqual(mockUser);
      expect(persistedData.state.accessToken).toBe('access-token-123');
      expect(persistedData.state.refreshToken).toBe('refresh-token-123');
    });

    it('should restore authentication state from localStorage', () => {
      // Manually set localStorage data
      const persistedState = {
        state: {
          user: mockUser,
          isAuthenticated: true,
          accessToken: 'persisted-token',
          refreshToken: 'persisted-refresh',
          isLoading: false,
          error: null,
        },
        version: 0,
      };
      
      mockLocalStorage.setItem('auth-storage', JSON.stringify(persistedState));
      
      // Create new store instance to test restoration
      const restoredState = authStore.getState();
      
      expect(restoredState.user).toEqual(mockUser);
      expect(restoredState.isAuthenticated).toBe(true);
      expect(restoredState.accessToken).toBe('persisted-token');
      expect(restoredState.refreshToken).toBe('persisted-refresh');
    });

    it('should clear persistence on logout', () => {
      // Login first
      authStore.getState().login({
        user: mockUser,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });

      // Verify data is persisted
      expect(mockLocalStorage.getItem('auth-storage')).toBeTruthy();
      
      // Logout
      authStore.getState().logout();
      
      // Verify data is cleared from localStorage
      const persistedData = mockLocalStorage.getItem('auth-storage');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.user).toBeNull();
        expect(parsed.state.accessToken).toBeNull();
        expect(parsed.state.refreshToken).toBeNull();
      }
    });
  });

  describe('token expiration', () => {
    it('should handle token expiration', () => {
      // Login first
      authStore.getState().login({
        user: mockUser,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });

      // Simulate token expiration
      authStore.getState().handleTokenExpiration();
      
      const state = authStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('should detect expired tokens', () => {
      // Mock an expired token (JWT with exp in the past)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      authStore.getState().login({
        user: mockUser,
        accessToken: expiredToken,
        refreshToken: 'refresh-token-123',
      });

      const isExpired = authStore.getState().isTokenExpired();
      expect(isExpired).toBe(true);
    });
  });
});
