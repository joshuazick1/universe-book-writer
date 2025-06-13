/**
 * Admin use case for administrative operations
 */

import * as crypto from 'crypto';
import { AdminSettings } from '../../core/domain/entities/admin-settings.entity.js';
import { AdminSettingsRepository } from '../../core/interfaces/repositories/admin-settings.repository.js';
import { SecurityService, PasswordService } from '../../core/interfaces/auth.service.js';
import { EmailService } from '../../core/interfaces/auth.service.js';
import { User, UserRole, UserStatus } from '../../core/entities/user.entity.js';
import { UserRepository } from '../../core/interfaces/user.repository.js';

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  skipEmailVerification?: boolean;
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

export interface SecurityLogOptions {
  page: number;
  limit: number;
  filters: {
    eventType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SecurityLogEntry {
  id: string;
  userId: string;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

/**
 * Admin use cases for administrative operations
 */
export class AdminUseCase {
  constructor(
    private userRepository: UserRepository,
    private adminSettingsRepository: AdminSettingsRepository,
    private securityService: SecurityService,
    private passwordService: PasswordService,
    private emailService: EmailService
  ) {} /**
   * Get all users with filtering and pagination
   */
  async getAllUsers(options: UserListOptions): Promise<PaginatedResult<User>> {
    const { page, limit, search, filters, sortBy, sortOrder } = options;

    // Build search filters using UserSearchFilters interface
    const searchFilters: Record<string, unknown> = {};

    // Add text search if provided
    if (search) {
      searchFilters.search = search;
    }

    // Add filters
    if (filters.role) {
      searchFilters.role = filters.role;
    }
    if (filters.status) {
      searchFilters.status = filters.status;
    }
    if (filters.emailVerified !== undefined) {
      searchFilters.emailVerified = filters.emailVerified;
    }

    // Get users with pagination
    const result = await this.userRepository.findMany(searchFilters, {
      skip: (page - 1) * limit,
      limit,
      sortBy,
      sortOrder,
    });

    return {
      items: result.users,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate role
    if (!Object.values(UserRole).includes(newRole)) {
      throw new Error('Invalid role');
    }

    // Update user
    const updatedUser = user.update({
      role: newRole,
    });

    return await this.userRepository.update(userId, updatedUser);
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, newStatus: UserStatus): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate status
    if (!Object.values(UserStatus).includes(newStatus)) {
      throw new Error('Invalid status');
    }

    // Update user
    const updatedUser = user.update({
      status: newStatus,
    });

    return await this.userRepository.update(userId, updatedUser);
  }

  /**
   * Manually verify user email
   */
  async verifyUserEmail(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      return user; // Already verified
    }

    // Update user
    const updatedUser = user.update({
      emailVerified: true,
      status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
    });

    return await this.userRepository.update(userId, updatedUser);
  }

  /**
   * Get admin settings
   */
  async getAdminSettings(): Promise<AdminSettings> {
    let settings = await this.adminSettingsRepository.getSettings();

    if (!settings) {
      // Create default settings if none exist
      settings = AdminSettings.createDefault();
      await this.adminSettingsRepository.saveSettings(settings);
    }

    return settings;
  }

  /**
   * Update admin settings
   */
  async updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    const currentSettings = await this.getAdminSettings();

    const updatedSettings = currentSettings.update(updates);

    return await this.adminSettingsRepository.saveSettings(updatedSettings);
  }
  /**
   * Get security audit logs
   */
  async getSecurityLogs(options: SecurityLogOptions): Promise<PaginatedResult<SecurityLogEntry>> {
    // This would typically query a security logs repository
    // For now, we'll return a mock implementation
    const { page, limit, filters } = options;

    // Build query for security logs
    const query: Record<string, unknown> = {};

    if (filters.eventType) {
      query.eventType = filters.eventType;
    }
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.startDate || filters.endDate) {
      query.timestamp = {} as Record<string, Date>;
      if (filters.startDate) {
        (query.timestamp as Record<string, Date>).$gte = filters.startDate;
      }
      if (filters.endDate) {
        (query.timestamp as Record<string, Date>).$lte = filters.endDate;
      }
    }

    // Mock implementation - in reality, this would query the security logs collection
    const mockLogs: SecurityLogEntry[] = [];
    const total = 0;

    return {
      items: mockLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create new user with admin privileges
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    const {
      email,
      password,
      firstName,
      lastName,
      role = UserRole.USER,
      skipEmailVerification = false,
    } = request;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    } // Hash password
    const passwordHash = await this.passwordService.hashPassword(password);

    // Generate user ID
    const userId = crypto.randomUUID();

    // Create user
    const user = new User({
      id: userId,
      email,
      username: email, // Use email as username
      passwordHash,
      role,
      status: skipEmailVerification ? UserStatus.ACTIVE : UserStatus.PENDING,
      profile: {
        firstName,
        lastName,
        preferences: {
          theme: 'auto',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            mentions: true,
          },
        },
      },
      permissions: {
        canCreateUniverse: role !== UserRole.USER || true,
        canEditOwnContent: true,
        canEditOtherContent: role !== UserRole.USER,
        canDeleteContent: role === UserRole.ADMIN,
        canManageUsers: role === UserRole.ADMIN,
        canManagePlugins: role === UserRole.ADMIN,
        canAccessAdminPanel: role === UserRole.ADMIN,
      },
      emailVerified: skipEmailVerification,
    });

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Send welcome email if not skipping verification
    if (!skipEmailVerification) {
      try {
        await this.emailService.sendWelcomeEmail(savedUser);
      } catch (error) {
        console.warn('Failed to send welcome email:', error);
      }
    }

    return savedUser;
  }
}
