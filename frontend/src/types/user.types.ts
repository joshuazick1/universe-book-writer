/**
 * User Management Types
 * 
 * TypeScript types for user management system
 */

export enum UserRole {
    USER = 'user',
    MODERATOR = 'moderator',
    ADMIN = 'admin',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING = 'pending',
}

export interface UserProfile {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    preferences: {
        theme: string; // Support any theme name (system themes + plugin themes)
        language: string;
        timezone: string;
        notifications: {
            email: boolean;
            push: boolean;
            mentions: boolean;
        };
    };
}

export interface UserPermissions {
    canCreateUniverse: boolean;
    canEditOwnContent: boolean;
    canEditOtherContent: boolean;
    canDeleteContent: boolean;
    canManageUsers: boolean;
    canManagePlugins: boolean;
    canAccessAdminPanel: boolean;
}

export interface User {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    status: UserStatus;
    profile: UserProfile;
    permissions: UserPermissions;
    emailVerified: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}

export interface CreateUserRequest {
    email: string;
    username: string;
    password: string;
    role?: UserRole;
    profile?: Partial<UserProfile>;
    skipEmailVerification?: boolean;
}

export interface UpdateUserRequest {
    id: string;
    email?: string;
    username?: string;
    role?: UserRole;
    status?: UserStatus;
    profile?: Partial<UserProfile>;
    emailVerified?: boolean;
}

export interface UserSearchResult {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    status: UserStatus;
    canInvite: boolean;
}

export interface UserSearchResponse {
    users: UserSearchResult[];
    total: number;
}

export interface UserSearchFilters {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
}
