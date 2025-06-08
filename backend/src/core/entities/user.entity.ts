/**
 * User domain entity
 * Core business logic for user management
 */

import { BaseEntity } from '@universe-book-writer/core';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      mentions: boolean;
    };
  };
}

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

export interface UserPermissions {
  canCreateUniverse: boolean;
  canEditOwnContent: boolean;
  canEditOtherContent: boolean;
  canDeleteContent: boolean;
  canManageUsers: boolean;
  canManagePlugins: boolean;
  canAccessAdminPanel: boolean;
}

/**
 * User domain entity representing a system user
 */
export class User implements BaseEntity {
  public readonly id: string;
  public readonly email: string;
  public readonly username: string;
  public readonly passwordHash: string;
  public readonly role: UserRole;
  public readonly status: UserStatus;
  public readonly profile: UserProfile;
  public readonly permissions: UserPermissions;
  public readonly emailVerified: boolean;
  public readonly lastLoginAt?: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly metadata?: Record<string, unknown>;

  constructor(data: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    role?: UserRole;
    status?: UserStatus;
    profile?: Partial<UserProfile>;
    permissions?: Partial<UserPermissions>;
    emailVerified?: boolean;
    lastLoginAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    metadata?: Record<string, unknown>;
  }) {
    this.id = data.id;
    this.email = data.email.toLowerCase().trim();
    this.username = data.username.trim();
    this.passwordHash = data.passwordHash;
    this.role = data.role || UserRole.USER;
    this.status = data.status || UserStatus.PENDING;
    this.emailVerified = data.emailVerified || false;
    this.lastLoginAt = data.lastLoginAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata;

    // Set default profile
    this.profile = {
      firstName: data.profile?.firstName,
      lastName: data.profile?.lastName,
      avatar: data.profile?.avatar,
      bio: data.profile?.bio,
      preferences: {
        theme: data.profile?.preferences?.theme || 'auto',
        language: data.profile?.preferences?.language || 'en',
        timezone: data.profile?.preferences?.timezone || 'UTC',
        notifications: {
          email: data.profile?.preferences?.notifications?.email ?? true,
          push: data.profile?.preferences?.notifications?.push ?? true,
          mentions: data.profile?.preferences?.notifications?.mentions ?? true,
        },
      },
    };

    // Set default permissions based on role
    this.permissions = this.calculatePermissions(this.role, data.permissions);

    this.validateEntity();
  }

  /**
   * Validate user entity data
   */
  private validateEntity(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      throw new Error('Valid email is required');
    }

    if (!this.username || this.username.length < 3 || this.username.length > 30) {
      throw new Error('Username must be between 3 and 30 characters');
    }

    if (!this.passwordHash || this.passwordHash.length === 0) {
      throw new Error('Password hash is required');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Calculate permissions based on role
   */
  private calculatePermissions(
    role: UserRole,
    overrides?: Partial<UserPermissions>
  ): UserPermissions {
    const basePermissions: Record<UserRole, UserPermissions> = {
      [UserRole.USER]: {
        canCreateUniverse: true,
        canEditOwnContent: true,
        canEditOtherContent: false,
        canDeleteContent: false,
        canManageUsers: false,
        canManagePlugins: false,
        canAccessAdminPanel: false,
      },
      [UserRole.MODERATOR]: {
        canCreateUniverse: true,
        canEditOwnContent: true,
        canEditOtherContent: true,
        canDeleteContent: true,
        canManageUsers: false,
        canManagePlugins: false,
        canAccessAdminPanel: false,
      },
      [UserRole.ADMIN]: {
        canCreateUniverse: true,
        canEditOwnContent: true,
        canEditOtherContent: true,
        canDeleteContent: true,
        canManageUsers: true,
        canManagePlugins: true,
        canAccessAdminPanel: true,
      },
    };

    return {
      ...basePermissions[role],
      ...overrides,
    };
  }

  /**
   * Check if user has a specific permission
   */
  public hasPermission(permission: keyof UserPermissions): boolean {
    return this.permissions[permission];
  }

  /**
   * Check if user is active
   */
  public isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /**
   * Check if user can login
   */
  public canLogin(): boolean {
    return this.isActive() && this.emailVerified;
  }

  /**
   * Get display name
   */
  public getDisplayName(): string {
    const firstName = this.profile.firstName;
    const lastName = this.profile.lastName;

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    if (firstName) {
      return firstName;
    }

    return this.username;
  }
  /**
   * Create a new user instance with updated data
   */
  public update(data: {
    email?: string;
    username?: string;
    passwordHash?: string;
    role?: UserRole;
    status?: UserStatus;
    profile?: Partial<UserProfile>;
    permissions?: Partial<UserPermissions>;
    emailVerified?: boolean;
    lastLoginAt?: Date;
    metadata?: Record<string, unknown>;
  }): User {
    return new User({
      id: this.id,
      email: data.email || this.email,
      username: data.username || this.username,
      passwordHash: data.passwordHash || this.passwordHash,
      role: data.role || this.role,
      status: data.status || this.status,
      profile: data.profile ? { ...this.profile, ...data.profile } : this.profile,
      permissions: data.permissions
        ? { ...this.permissions, ...data.permissions }
        : this.permissions,
      emailVerified: data.emailVerified !== undefined ? data.emailVerified : this.emailVerified,
      lastLoginAt: data.lastLoginAt || this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      metadata: data.metadata ? { ...this.metadata, ...data.metadata } : this.metadata,
    });
  }

  /**
   * Convert to plain object (for serialization)
   */
  public toPlainObject(): Record<string, unknown> {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      role: this.role,
      status: this.status,
      profile: this.profile,
      permissions: this.permissions,
      emailVerified: this.emailVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }
}
