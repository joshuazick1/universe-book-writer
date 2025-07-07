/**
 * Frontend Test Utilities
 * Jest-compatible testing utilities for React components and hooks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { jest } from '@jest/globals';
import type { ReactElement, PropsWithChildren } from 'react';
import type {
    AuthContextType,
    AuthProviderProps,
    RenderWithProvidersOptions,
    MockAuthStore,
    ApiResponse,
    ErrorResponse,
    MockStorage,
    RenderResult,
} from './types.js';

// Mock user data for testing
export const mockUser: AuthContextType['user'] = {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    emailVerified: true,
    preferences: {},
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
};

export const mockAdminUser: AuthContextType['user'] = {
    ...mockUser,
    id: 'admin-123',
    username: 'adminuser',
    email: 'admin@example.com',
    role: 'admin',
    permissions: {
        canAccessAdminPanel: true,
        canManageUsers: true,
        canViewAnalytics: true,
    },
};

// Mock credentials for testing
export const validCredentials = {
    email: 'test@example.com',
    password: 'TestPassword123!',
};

export const invalidCredentials = {
    email: 'invalid@example.com',
    password: 'wrongpassword',
};

// Mock AuthContext with test data
export const AuthContext = React.createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    isAuthenticated: false,
});

// Create provider with default mock data
export function AuthProvider({
    children,
    initialState
}: PropsWithChildren<AuthProviderProps>): JSX.Element {
    const [state] = React.useState<AuthContextType>(initialState ?? {
        user: mockUser,
        isAdmin: false,
        isAuthenticated: true,
    });

    return (
        <AuthContext.Provider value={state}>
            {children}
        </AuthContext.Provider>
    );
}

// Mock localStorage with proper initialization
const mockStorage: MockStorage = {
    getItem: jest.fn().mockImplementation(() => null),
    setItem: jest.fn().mockImplementation(() => undefined),
    clear: jest.fn().mockImplementation(() => undefined),
    removeItem: jest.fn().mockImplementation(() => undefined),
    key: jest.fn().mockImplementation(() => null),
    length: 0,
};

// Setup mock storage before tests
beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true
    });
});

// Test wrapper component
function TestWrapper({
    children,
    initialAuthState,
}: PropsWithChildren<RenderWithProvidersOptions>): JSX.Element {
    return (
        <BrowserRouter>
            <AuthProvider initialState={initialAuthState}>
                {children}
            </AuthProvider>
        </BrowserRouter>
    );
}

// Enhanced render function with router and auth context
export function renderWithProviders(
    ui: ReactElement,
    options: RenderWithProvidersOptions = {}
): RenderResult {
    const {
        initialAuthState,
        route = '/',
        ...renderOptions
    } = options;

    if (route) {
        window.history.pushState({}, 'Test page', route);
    }

    return render(ui, {
        wrapper: ({ children }) => (
            <TestWrapper initialAuthState={initialAuthState}>
                {children}
            </TestWrapper>
        ),
        ...renderOptions
    });
}

// Create mock auth store
export function createMockAuthStore(overrides = {}): MockAuthStore {
    return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn(),
        changePassword: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
        verifyEmail: jest.fn(),
        resendVerification: jest.fn(),
        clearError: jest.fn(),
        checkAuthStatus: jest.fn(),
        isAdmin: jest.fn().mockReturnValue(false),
        hasRole: jest.fn().mockReturnValue(false),
        hasPermission: jest.fn().mockReturnValue(false),
        ...overrides,
    };
}

// Create mock API response
export function createMockApiResponse<T>(data: T, success = true): ApiResponse<T> {
    return {
        data: {
            success,
            data,
            message: success ? 'Operation successful' : 'Operation failed',
        },
        status: success ? 200 : 400,
        statusText: success ? 'OK' : 'Bad Request',
        headers: {},
        config: {},
    };
}

// Create mock error response
export function createMockErrorResponse(
    message: string,
    status = 400,
    field?: string
): ErrorResponse {
    return {
        response: {
            data: {
                success: false,
                message,
                field,
            },
            status,
            statusText: status === 400 ? 'Bad Request' : 'Internal Server Error',
        },
        request: {},
        config: {},
    };
}

// Helper to wait for async operations
export const waitForAsync = (ms = 100): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

// Cleanup mocks after each test
export function cleanupMocks(): void {
    jest.clearAllMocks();
    if (global.fetch && jest.isMockFunction(global.fetch)) {
        (global.fetch as jest.MockedFunction<typeof fetch>).mockRestore();
    }
    mockStorage.getItem.mockClear();
    mockStorage.setItem.mockClear();
    mockStorage.clear.mockClear();
    mockStorage.removeItem.mockClear();
    mockStorage.key.mockClear();
}

// Re-export common testing utilities
export { render, screen, fireEvent, waitFor, userEvent, jest };
