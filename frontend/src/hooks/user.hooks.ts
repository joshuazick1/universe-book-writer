/**
 * User Management Hooks
 * 
 * React hooks for user management functionality
 */

import { useState, useCallback } from 'react';
import type { User, UserSearchResult } from '../types/user.types';
import { userService } from '../services/user.service';

/**
 * Hook for searching users (for collaboration)
 */
export function useUserSearch() {
    const [users, setUsers] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchUsers = useCallback(async (query: string, limit?: number) => {
        if (!query || query.length < 2) {
            setUsers([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await userService.searchUsersForCollaboration(query, limit);
            setUsers(result.users);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to search users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearResults = useCallback(() => {
        setUsers([]);
        setError(null);
    }, []);

    return {
        users,
        loading,
        error,
        searchUsers,
        clearResults,
    };
}

/**
 * Hook for managing user profile
 */
export function useUserProfile() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const updateProfile = useCallback(async (profileData: any) => {
        setLoading(true);
        setError(null);

        try {
            const result = await userService.updateProfile(profileData);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        updateProfile,
    };
}

/**
 * Hook for user list management (admin)
 */
export function useUserList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const loadUsers = useCallback(async (options?: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        status?: string;
    }) => {
        setLoading(true);
        setError(null);

        try {
            const result = await userService.getUsers(options);
            setUsers(result.users);
            setTotal(result.total);
            setHasMore(result.hasMore);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        users,
        loading,
        error,
        total,
        hasMore,
        loadUsers,
    };
}
