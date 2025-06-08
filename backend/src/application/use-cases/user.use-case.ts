/**
 * User management use cases
 * Application layer orchestrating user-related business operations
 */

import { User, UserRole, UserStatus, UserProfile } from '../../core/entities/user.entity.js';
import { UserRepository, UserSearchFilters } from '../../core/interfaces/user.repository.js';
import {
  PasswordService,
  EmailService,
  SecurityService,
} from '../../core/interfaces/auth.service.js';

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

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: UserSearchFilters;
}

/**
 * User management use cases
 */
export class UserUseCase {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private emailService: EmailService,
    private securityService: SecurityService
  ) {}

  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    // Validate email uniqueness
    if (await this.userRepository.existsByEmail(request.email)) {
      throw new Error('Email already exists');
    }

    // Validate username uniqueness
    if (await this.userRepository.existsByUsername(request.username)) {
      throw new Error('Username already exists');
    }

    // Validate password strength
    const passwordValidation = await this.passwordService.validatePassword(request.password, {
      email: request.email,
      username: request.username,
    });

    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(request.password);

    // Create user entity
    const user = new User({
      id: this.securityService.generateSecureRandom(24),
      email: request.email,
      username: request.username,
      passwordHash,
      role: request.role || UserRole.USER,
      status: request.skipEmailVerification ? UserStatus.ACTIVE : UserStatus.PENDING,
      profile: request.profile,
      emailVerified: request.skipEmailVerification || false,
    });

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Log security event
    await this.securityService.logSecurityEvent(savedUser.id, 'user_created', {
      email: savedUser.email,
      username: savedUser.username,
      role: savedUser.role,
    });

    // Send welcome email if not skipping verification
    if (!request.skipEmailVerification) {
      try {
        await this.emailService.sendWelcomeEmail(savedUser);
      } catch (error) {
        console.warn('Failed to send welcome email:', error);
      }
    }

    return savedUser;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  /**
   * Get user by ID (alias for getUserById)
   */
  async findById(id: string): Promise<User | null> {
    return this.getUserById(id);
  }

  /**
   * Update user
   */
  async updateUser(request: UpdateUserRequest): Promise<User> {
    const existingUser = await this.userRepository.findById(request.id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check email uniqueness if changing email
    if (request.email && request.email !== existingUser.email) {
      if (await this.userRepository.existsByEmail(request.email)) {
        throw new Error('Email already exists');
      }
    }

    // Check username uniqueness if changing username
    if (request.username && request.username !== existingUser.username) {
      if (await this.userRepository.existsByUsername(request.username)) {
        throw new Error('Username already exists');
      }
    }

    // Update user
    const updatedUser = existingUser.update({
      email: request.email,
      username: request.username,
      role: request.role,
      status: request.status,
      profile: request.profile,
      emailVerified: request.emailVerified,
    });

    const savedUser = await this.userRepository.update(request.id, updatedUser);

    // Log security event
    await this.securityService.logSecurityEvent(savedUser.id, 'user_updated', {
      changes: {
        email:
          request.email !== existingUser.email
            ? { from: existingUser.email, to: request.email }
            : undefined,
        username:
          request.username !== existingUser.username
            ? { from: existingUser.username, to: request.username }
            : undefined,
        role:
          request.role !== existingUser.role
            ? { from: existingUser.role, to: request.role }
            : undefined,
        status:
          request.status !== existingUser.status
            ? { from: existingUser.status, to: request.status }
            : undefined,
      },
    });

    return savedUser;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<User> {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Merge profile data with existing profile
    const updatedProfile = {
      ...existingUser.profile,
      ...profileData,
    };

    const updatedUser = existingUser.update({
      profile: updatedProfile,
    });

    const savedUser = await this.userRepository.update(userId, updatedUser);

    // Log security event
    await this.securityService.logSecurityEvent(savedUser.id, 'profile_updated', {
      updatedFields: Object.keys(profileData),
    });

    return savedUser;
  }

  /**
   * Change user password
   */
  async changePassword(request: ChangePasswordRequest): Promise<void>;
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  async changePassword(
    userIdOrRequest: string | ChangePasswordRequest,
    currentPassword?: string,
    newPassword?: string
  ): Promise<void> {
    // Handle both call signatures
    let request: ChangePasswordRequest;
    if (typeof userIdOrRequest === 'string') {
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }
      request = {
        userId: userIdOrRequest,
        currentPassword,
        newPassword,
      };
    } else {
      request = userIdOrRequest;
    }

    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      request.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = await this.passwordService.validatePassword(
      request.newPassword,
      user
    );

    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(request.newPassword);

    // Update user with new password hash
    const updatedUser = new User({
      ...user.toPlainObject(),
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    } as ConstructorParameters<typeof User>[0]);

    await this.userRepository.update(request.userId, updatedUser);

    // Log security event
    await this.securityService.logSecurityEvent(user.id, 'password_changed', {
      method: 'user_initiated',
    });
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string, reason?: string): Promise<User> {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.status === UserStatus.SUSPENDED) {
      return existingUser; // Already suspended
    }

    const updatedUser = existingUser.update({
      status: UserStatus.SUSPENDED,
    });

    const savedUser = await this.userRepository.update(userId, updatedUser);

    // Log security event
    await this.securityService.logSecurityEvent(savedUser.id, 'user_suspended', {
      reason: reason || 'No reason provided',
      previousStatus: existingUser.status,
    });

    return savedUser;
  }

  /**
   * Update user roles
   */
  async updateUserRoles(userId: string, newRole: UserRole): Promise<User> {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updatedUser = existingUser.update({
      role: newRole,
    });

    const savedUser = await this.userRepository.update(userId, updatedUser);

    // Log security event
    await this.securityService.logSecurityEvent(savedUser.id, 'user_role_updated', {
      previousRole: existingUser.role,
      newRole: newRole,
    });

    return savedUser;
  }
  /**
   * Delete user
   */
  async deleteUser(id: string, password?: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // If password is provided, verify it for additional security
    if (password) {
      const isPasswordValid = await this.passwordService.verifyPassword(
        password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        throw new Error('Invalid password for account deletion');
      }
    }

    const deleted = await this.userRepository.delete(id);

    if (deleted) {
      // Log security event
      await this.securityService.logSecurityEvent(user.id, 'user_deleted', {
        email: user.email,
        username: user.username,
      });
    }

    return deleted;
  }

  /**
   * List users with pagination and filters
   */
  async listUsers(options: UserListOptions = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const result = await this.userRepository.findMany(options.filters, {
      skip,
      limit,
      sortBy: options.sortBy || 'createdAt',
      sortOrder: options.sortOrder || 'desc',
    });

    return {
      users: result.users,
      total: result.total,
      page,
      limit,
      hasMore: result.hasMore,
    };
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      return user; // Already verified
    }

    const updatedUser = user.update({
      emailVerified: true,
      status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
    });

    const savedUser = await this.userRepository.update(userId, updatedUser);

    // Log security event
    await this.securityService.logSecurityEvent(savedUser.id, 'email_verified', {
      email: savedUser.email,
    });

    return savedUser;
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return; // User might have been deleted
    }

    const updatedUser = user.update({
      lastLoginAt: new Date(),
    });

    await this.userRepository.update(userId, updatedUser);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    suspended: number;
    verifiedEmails: number;
    newThisMonth: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, pending, suspended, verifiedEmails, newThisMonth] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ status: UserStatus.ACTIVE }),
      this.userRepository.count({ status: UserStatus.PENDING }),
      this.userRepository.count({ status: UserStatus.SUSPENDED }),
      this.userRepository.count({ emailVerified: true }),
      this.userRepository.count({ createdAfter: monthStart }),
    ]);

    return {
      total,
      active,
      pending,
      suspended,
      verifiedEmails,
      newThisMonth,
    };
  }
}
