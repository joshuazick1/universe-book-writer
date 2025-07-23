/**
 * Admin Users Hook
 * Handles user management operations for administrators
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserListOptions {
  page: number;
  limit: number;
  search?: string;
  filters: {
    role?: string;
    status?: string;
    emailVerified?: boolean;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedUsers {
  users: AdminUser[]; // Changed from 'items' to 'users'
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const fetchUsers = useCallback(async (options: UserListOptions) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: options.page.toString(),
        limit: options.limit.toString(),
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
      });

      if (options.search) {
        params.append('search', options.search);
      }

      if (options.filters.role) {
        params.append('role', options.filters.role);
      }

      if (options.filters.status) {
        params.append('status', options.filters.status);
      }

      if (options.filters.emailVerified !== undefined) {
        params.append('emailVerified', options.filters.emailVerified.toString());
      }
      const url = `${API_BASE_URL}/admin/users?${params}`;

      const response = await axios.get<{
        success: boolean;
        data: PaginatedUsers;
      }>(url, {
        withCredentials: true,
      });

      logger.info('📦 [useAdminUsers] Response received:', {
        status: response.status,
        success: response.data.success,
        dataStructure: {
          hasData: !!response.data.data,
          hasUsers: !!response.data.data?.users, // Changed from 'hasItems' to 'hasUsers'
          usersLength: response.data.data?.users?.length || 0, // Changed from 'itemsLength'
          hasPagination: !!response.data.data?.pagination,
          totalUsers: response.data.data?.pagination?.total || 0,
        },
        fullResponse: response.data,
      });
      if (response.data.success) {
        const users = response.data.data.users; // Changed from 'items' to 'users'
        const pagination = response.data.data.pagination;

        logger.info('✅ [useAdminUsers] Setting users:', users);
        logger.info('📊 [useAdminUsers] Setting pagination:', pagination);

        setUsers(users);
        setPagination(pagination);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      logger.error('❌ [useAdminUsers] Error fetching users:', err);
      logger.error('📍 [useAdminUsers] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        status: (err as { response?: { status?: number } })?.response?.status,
        statusText: (err as { response?: { statusText?: string } })?.response?.statusText,
        data: (err as { response?: { data?: unknown } })?.response?.data,
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      // Fallback to mock data in development
      if (import.meta.env.DEV) {
        logger.warn('⚠️ [useAdminUsers] Falling back to mock data for development');
        logger.info('🏗️ [useAdminUsers] Development environment detected, using fallback');
        const mockUsers: AdminUser[] = [
          {
            id: '1',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            status: 'active',
            emailVerified: true,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            email: 'user@example.com',
            firstName: 'Regular',
            lastName: 'User',
            role: 'user',
            status: 'active',
            emailVerified: false,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
        logger.info('🎭 [useAdminUsers] Setting mock users:', mockUsers);
        setUsers(mockUsers);
        setPagination({
          page: 1,
          limit: 10,
          total: mockUsers.length,
          totalPages: 1,
        });
      } else {
        logger.info('🚫 [useAdminUsers] Not in development mode, not using fallback');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: string) => {
    setError(null);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/admin/users/${userId}/role`,
        { role },
        { withCredentials: true }
      );

      if (response.data.success) {
        setUsers(prev => prev.map(user => (user.id === userId ? { ...user, role } : user)));
        return true;
      } else {
        throw new Error('Failed to update user role');
      }
    } catch (err) {
      logger.error('Error updating user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user role');
      return false;
    }
  }, []);

  const updateUserStatus = useCallback(async (userId: string, status: string) => {
    setError(null);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/admin/users/${userId}/status`,
        { status },
        { withCredentials: true }
      );

      if (response.data.success) {
        setUsers(prev => prev.map(user => (user.id === userId ? { ...user, status } : user)));
        return true;
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (err) {
      logger.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user status');
      return false;
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    setError(null);

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        return true;
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err) {
      logger.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      return false;
    }
  }, []);

  const createUser = useCallback(
    async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
      skipEmailVerification?: boolean;
    }) => {
      setError(null);

      try {
        const response = await axios.post(`${API_BASE_URL}/admin/users`, userData, {
          withCredentials: true,
        });

        if (response.data.success) {
          const newUser = response.data.data.user;
          setUsers(prev => [newUser, ...prev]);
          return true;
        } else {
          throw new Error('Failed to create user');
        }
      } catch (err) {
        logger.error('Error creating user:', err);
        setError(err instanceof Error ? err.message : 'Failed to create user');
        return false;
      }
    },
    []
  );

  const verifyUserEmail = useCallback(async (userId: string) => {
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/users/${userId}/verify-email`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, emailVerified: true } : user
          )
        );
        return true;
      } else {
        throw new Error('Failed to verify user email');
      }
    } catch (err) {
      logger.error('Error verifying user email:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify user email');
      return false;
    }
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    createUser,
    verifyUserEmail,
  };
};
