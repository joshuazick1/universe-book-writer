/**
 * User Entity Unit Tests
 * Comprehensive tests for User domain entity
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { User, UserRole, UserStatus, UserProfile, UserPermissions } from '../../../../src/core/entities/user.entity.js';

describe('User Entity', () => {
    let validUserData: {
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
    };

    beforeEach(() => {
        validUserData = {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            passwordHash: 'hashed-password-123',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
        };
    });

    describe('Constructor and Validation', () => {
        it('should create a valid user with all required fields', () => {
            // Act
            const user = new User(validUserData);

            // Assert
            expect(user.id).toBe(validUserData.id);
            expect(user.email).toBe(validUserData.email.toLowerCase());
            expect(user.username).toBe(validUserData.username);
            expect(user.passwordHash).toBe(validUserData.passwordHash);
            expect(user.role).toBe(UserRole.USER);
            expect(user.status).toBe(UserStatus.ACTIVE);
            expect(user.emailVerified).toBe(true);
        });

        it('should set default values for optional fields', () => {
            // Arrange
            const minimalData = {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'hashed-password-123',
            };

            // Act
            const user = new User(minimalData);

            // Assert
            expect(user.role).toBe(UserRole.USER);
            expect(user.status).toBe(UserStatus.PENDING);
            expect(user.emailVerified).toBe(false);
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when ID is empty or missing', () => {
            // Arrange
            const invalidData = { ...validUserData, id: '' };

            // Act & Assert
            expect(() => new User(invalidData)).toThrow('User ID is required');
        });

        it('should throw error when ID is only whitespace', () => {
            // Arrange
            const invalidData = { ...validUserData, id: '   ' };

            // Act & Assert
            expect(() => new User(invalidData)).toThrow('User ID is required');
        });

        it('should throw error when email is invalid', () => {
            // Arrange
            const invalidData = { ...validUserData, email: 'invalid-email' };

            // Act & Assert
            expect(() => new User(invalidData)).toThrow('Valid email is required');
        });

        it('should throw error when username is too short', () => {
            // Arrange
            const invalidData = { ...validUserData, username: 'ab' };

            // Act & Assert
            expect(() => new User(invalidData)).toThrow('Username must be between 3 and 30 characters');
        });

        it('should throw error when username is too long', () => {
            // Arrange
            const invalidData = { ...validUserData, username: 'a'.repeat(31) };

            // Act & Assert
            expect(() => new User(invalidData)).toThrow('Username must be between 3 and 30 characters');
        });

        it('should throw error when password hash is empty', () => {
            // Arrange
            const invalidData = { ...validUserData, passwordHash: '' };

            // Act & Assert
            expect(() => new User(invalidData)).toThrow('Password hash is required');
        });

        it('should normalize email to lowercase and trim whitespace', () => {
            // Arrange
            const dataWithCapsEmail = { ...validUserData, email: '  TEST@EXAMPLE.COM  ' };

            // Act
            const user = new User(dataWithCapsEmail);

            // Assert
            expect(user.email).toBe('test@example.com');
        });

        it('should trim username whitespace', () => {
            // Arrange
            const dataWithSpaces = { ...validUserData, username: '  testuser  ' };

            // Act
            const user = new User(dataWithSpaces);

            // Assert
            expect(user.username).toBe('testuser');
        });
    });

    describe('Default Profile Settings', () => {
        it('should set default profile preferences', () => {
            // Act
            const user = new User(validUserData);

            // Assert
            expect(user.profile.preferences.theme).toBe('auto');
            expect(user.profile.preferences.language).toBe('en');
            expect(user.profile.preferences.timezone).toBe('UTC');
            expect(user.profile.preferences.notifications.email).toBe(true);
            expect(user.profile.preferences.notifications.push).toBe(true);
            expect(user.profile.preferences.notifications.mentions).toBe(true);
        });

        it('should preserve custom profile data when provided', () => {
            // Arrange
            const customProfile: Partial<UserProfile> = {
                firstName: 'John',
                lastName: 'Doe',
                preferences: {
                    theme: 'dark',
                    language: 'es',
                    timezone: 'America/New_York',
                    notifications: {
                        email: false,
                        push: true,
                        mentions: false,
                    },
                },
            };
            const dataWithProfile = { ...validUserData, profile: customProfile };

            // Act
            const user = new User(dataWithProfile);

            // Assert
            expect(user.profile.firstName).toBe('John');
            expect(user.profile.lastName).toBe('Doe');
            expect(user.profile.preferences.theme).toBe('dark');
            expect(user.profile.preferences.language).toBe('es');
            expect(user.profile.preferences.timezone).toBe('America/New_York');
            expect(user.profile.preferences.notifications.email).toBe(false);
            expect(user.profile.preferences.notifications.push).toBe(true);
            expect(user.profile.preferences.notifications.mentions).toBe(false);
        });
    });

    describe('Permission System', () => {
        it('should set default USER permissions', () => {
            // Arrange
            const userData = { ...validUserData, role: UserRole.USER };

            // Act
            const user = new User(userData);

            // Assert
            expect(user.permissions.canCreateUniverse).toBe(true);
            expect(user.permissions.canEditOwnContent).toBe(true);
            expect(user.permissions.canEditOtherContent).toBe(false);
            expect(user.permissions.canDeleteContent).toBe(false);
            expect(user.permissions.canManageUsers).toBe(false);
            expect(user.permissions.canManagePlugins).toBe(false);
            expect(user.permissions.canAccessAdminPanel).toBe(false);
        });

        it('should set MODERATOR permissions', () => {
            // Arrange
            const userData = { ...validUserData, role: UserRole.MODERATOR };

            // Act
            const user = new User(userData);

            // Assert
            expect(user.permissions.canCreateUniverse).toBe(true);
            expect(user.permissions.canEditOwnContent).toBe(true);
            expect(user.permissions.canEditOtherContent).toBe(true);
            expect(user.permissions.canDeleteContent).toBe(true);
            expect(user.permissions.canManageUsers).toBe(false);
            expect(user.permissions.canManagePlugins).toBe(false);
            expect(user.permissions.canAccessAdminPanel).toBe(false);
        });

        it('should set ADMIN permissions', () => {
            // Arrange
            const userData = { ...validUserData, role: UserRole.ADMIN };

            // Act
            const user = new User(userData);

            // Assert
            expect(user.permissions.canCreateUniverse).toBe(true);
            expect(user.permissions.canEditOwnContent).toBe(true);
            expect(user.permissions.canEditOtherContent).toBe(true);
            expect(user.permissions.canDeleteContent).toBe(true);
            expect(user.permissions.canManageUsers).toBe(true);
            expect(user.permissions.canManagePlugins).toBe(true);
            expect(user.permissions.canAccessAdminPanel).toBe(true);
        });

        it('should override default permissions with custom ones', () => {
            // Arrange
            const customPermissions: Partial<UserPermissions> = {
                canCreateUniverse: false,
                canManageUsers: true,
            };
            const userData = { ...validUserData, role: UserRole.USER, permissions: customPermissions };

            // Act
            const user = new User(userData);

            // Assert
            expect(user.permissions.canCreateUniverse).toBe(false); // overridden
            expect(user.permissions.canManageUsers).toBe(true); // overridden
            expect(user.permissions.canEditOwnContent).toBe(true); // default USER permission
        });

        it('should check if user has specific permission', () => {
            // Arrange
            const user = new User({ ...validUserData, role: UserRole.ADMIN });

            // Act & Assert
            expect(user.hasPermission('canManageUsers')).toBe(true);
            expect(user.hasPermission('canAccessAdminPanel')).toBe(true);

            // Test with USER role
            const regularUser = new User({ ...validUserData, role: UserRole.USER });
            expect(regularUser.hasPermission('canManageUsers')).toBe(false);
            expect(regularUser.hasPermission('canEditOwnContent')).toBe(true);
        });
    });

    describe('Status and Login Methods', () => {
        it('should check if user is active', () => {
            // Arrange
            const activeUser = new User({ ...validUserData, status: UserStatus.ACTIVE });
            const inactiveUser = new User({ ...validUserData, status: UserStatus.INACTIVE });

            // Act & Assert
            expect(activeUser.isActive()).toBe(true);
            expect(inactiveUser.isActive()).toBe(false);
        });

        it('should check if user can login (active and email verified)', () => {
            // Arrange
            const canLoginUser = new User({
                ...validUserData,
                status: UserStatus.ACTIVE,
                emailVerified: true
            });
            const cantLoginUser = new User({
                ...validUserData,
                status: UserStatus.INACTIVE,
                emailVerified: true
            });
            const unverifiedUser = new User({
                ...validUserData,
                status: UserStatus.ACTIVE,
                emailVerified: false
            });

            // Act & Assert
            expect(canLoginUser.canLogin()).toBe(true);
            expect(cantLoginUser.canLogin()).toBe(false);
            expect(unverifiedUser.canLogin()).toBe(false);
        });
    });

    describe('Display Name Generation', () => {
        it('should return full name when both first and last names are provided', () => {
            // Arrange
            const userData = {
                ...validUserData,
                profile: {
                    firstName: 'John',
                    lastName: 'Doe',
                    preferences: {
                        theme: 'auto' as const,
                        language: 'en',
                        timezone: 'UTC',
                        notifications: { email: true, push: true, mentions: true },
                    },
                },
            };
            const user = new User(userData);

            // Act
            const displayName = user.getDisplayName();

            // Assert
            expect(displayName).toBe('John Doe');
        });

        it('should return first name when only first name is provided', () => {
            // Arrange
            const userData = {
                ...validUserData,
                profile: {
                    firstName: 'John',
                    preferences: {
                        theme: 'auto' as const,
                        language: 'en',
                        timezone: 'UTC',
                        notifications: { email: true, push: true, mentions: true },
                    },
                },
            };
            const user = new User(userData);

            // Act
            const displayName = user.getDisplayName();

            // Assert
            expect(displayName).toBe('John');
        });

        it('should return username when no first or last name is provided', () => {
            // Arrange
            const user = new User(validUserData); // No profile names

            // Act
            const displayName = user.getDisplayName();

            // Assert
            expect(displayName).toBe('testuser');
        });

        it('should return username when first name is empty string', () => {
            // Arrange
            const userData = {
                ...validUserData,
                profile: {
                    firstName: '',
                    lastName: 'Doe',
                    preferences: {
                        theme: 'auto' as const,
                        language: 'en',
                        timezone: 'UTC',
                        notifications: { email: true, push: true, mentions: true },
                    },
                },
            };
            const user = new User(userData);

            // Act
            const displayName = user.getDisplayName();

            // Assert
            expect(displayName).toBe('testuser');
        });
    });

    describe('Update Method', () => {
        it('should create new user instance with updated data', () => {
            // Arrange
            const user = new User(validUserData);
            const updateData = {
                email: 'newemail@example.com',
                status: UserStatus.SUSPENDED,
                emailVerified: false,
            };

            // Act
            const updatedUser = user.update(updateData);

            // Assert
            expect(updatedUser).not.toBe(user); // Different instance
            expect(updatedUser.email).toBe('newemail@example.com');
            expect(updatedUser.status).toBe(UserStatus.SUSPENDED);
            expect(updatedUser.emailVerified).toBe(false);
            expect(updatedUser.id).toBe(user.id); // ID should remain same
            expect(updatedUser.username).toBe(user.username); // Unchanged fields preserved
            expect(updatedUser.updatedAt).not.toEqual(user.updatedAt); // Updated timestamp
        });

        it('should preserve original data when no updates provided', () => {
            // Arrange
            const user = new User(validUserData);

            // Act
            const updatedUser = user.update({});

            // Assert
            expect(updatedUser).not.toBe(user); // Different instance
            expect(updatedUser.email).toBe(user.email);
            expect(updatedUser.username).toBe(user.username);
            expect(updatedUser.id).toBe(user.id);
        });
    });

    describe('Serialization', () => {
        it('should convert to plain object for serialization', () => {
            // Arrange
            const user = new User(validUserData);

            // Act
            const plainObject = user.toPlainObject();

            // Assert
            expect(plainObject).toEqual({
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                status: user.status,
                profile: user.profile,
                permissions: user.permissions,
                emailVerified: user.emailVerified,
                lastLoginAt: user.lastLoginAt,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                metadata: user.metadata,
            });
            expect(typeof plainObject).toBe('object');
            expect(plainObject.constructor).toBe(Object);
        });

        it('should include metadata in serialization when present', () => {
            // Arrange
            const metadata = { source: 'api', version: '1.0' };
            const userData = { ...validUserData, metadata };
            const user = new User(userData);

            // Act
            const plainObject = user.toPlainObject();

            // Assert
            expect(plainObject.metadata).toEqual(metadata);
        });
    });
});
