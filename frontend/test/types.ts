// Types for frontend testing utilities
import type { ReactElement } from 'react';
import type { RenderResult } from '@testing-library/react';
import type { Mock } from 'jest-mock';

export type AuthContextType = {
    user: {
        id: string;
        username: string;
        email: string;
        role: 'user' | 'admin';
        emailVerified: boolean;
        preferences: Record<string, unknown>;
        createdAt: string;
        updatedAt: string;
        permissions?: {
            canAccessAdminPanel: boolean;
            canManageUsers: boolean;
            canViewAnalytics: boolean;
        };
    } | null;
    isAdmin: boolean;
    isAuthenticated: boolean;
};

export interface AuthProviderProps {
    initialState?: AuthContextType;
}

export interface RenderWithProvidersOptions {
    initialAuthState?: AuthContextType;
    route?: string;
}

export interface MockAuthStore {
    user: AuthContextType['user'];
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | null;
    login: Mock;
    register: Mock;
    logout: Mock;
    updateProfile: Mock;
    changePassword: Mock;
    forgotPassword: Mock;
    resetPassword: Mock;
    verifyEmail: Mock;
    resendVerification: Mock;
    clearError: Mock;
    checkAuthStatus: Mock;
    isAdmin: Mock;
    hasRole: Mock;
    hasPermission: Mock;
}

export interface ApiResponse<T = unknown> {
    data: {
        success: boolean;
        data: T;
        message: string;
    };
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: Record<string, unknown>;
}

export interface ErrorResponse {
    response: {
        data: {
            success: false;
            message: string;
            field?: string;
        };
        status: number;
        statusText: string;
    };
    request: Record<string, unknown>;
    config: Record<string, unknown>;
}

// Storage mock types
type StorageKey = string;
type StorageValue = string | null;

export interface MockStorage {
    getItem: Mock;
    setItem: Mock;
    clear: Mock;
    removeItem: Mock;
    key: Mock;
    length: number;
}

// Export all types from a single location
export type {
    ReactElement,
    RenderResult,
    Mock,
};
