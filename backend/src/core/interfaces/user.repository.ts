/**
 * User repository interface
 * Defines data access contract for user entities
 */

import { User, UserRole, UserStatus } from '../entities/user.entity.js';

export interface UserSearchFilters {
  email?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  search?: string;
}

export interface UserRepository {
  /**
   * Save a user entity
   */
  save(user: User): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Check if email exists
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Check if username exists
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * Find users with pagination and filters
   */
  findMany(
    filters?: UserSearchFilters,
    options?: {
      skip?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    users: User[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Update user entity
   */
  update(id: string, user: User): Promise<User>;

  /**
   * Update user metadata only
   */
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;

  /**
   * Delete user by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get user count by filters
   */
  count(filters?: UserSearchFilters): Promise<number>;

  /**
   * Bulk update users
   */
  bulkUpdate(updates: { id: string; data: Partial<User> }[]): Promise<User[]>;

  /**
   * Find users by IDs
   */
  findByIds(ids: string[]): Promise<User[]>;
}
