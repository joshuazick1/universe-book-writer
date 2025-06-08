/**
 * MongoDB User Repository Implementation
 * Infrastructure layer data access for user entities
 */

import { Db, Collection, ObjectId, Filter } from 'mongodb';
import { User, UserRole, UserStatus } from '../../core/entities/user.entity.js';
import { UserRepository, UserSearchFilters } from '../../core/interfaces/user.repository.js';

interface UserDocument {
  _id?: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  profile: {
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
  };
  permissions: {
    canCreateUniverse: boolean;
    canEditOwnContent: boolean;
    canEditOtherContent: boolean;
    canDeleteContent: boolean;
    canManageUsers: boolean;
    canManagePlugins: boolean;
    canAccessAdminPanel: boolean;
  };
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * MongoDB implementation of UserRepository
 */
export class MongoUserRepository implements UserRepository {
  private collection: Collection<UserDocument>;

  constructor(private db: Db) {
    this.collection = db.collection<UserDocument>('users');
  }

  /**
   * Save a user entity
   */
  async save(user: User): Promise<User> {
    const document = this.toDocument(user);
    const result = await this.collection.insertOne(document);

    return this.toEntity({
      ...document,
      _id: result.insertedId,
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const objectId = new ObjectId(id);
      const document = await this.collection.findOne({ _id: objectId });
      return document ? this.toEntity(document) : null;
    } catch (error) {
      // Invalid ObjectId format
      return null;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const document = await this.collection.findOne({
      email: email.toLowerCase().trim(),
    });
    return document ? this.toEntity(document) : null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const document = await this.collection.findOne({
      username: username.trim(),
    });
    return document ? this.toEntity(document) : null;
  }

  /**
   * Check if email exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      email: email.toLowerCase().trim(),
    });
    return count > 0;
  }

  /**
   * Check if username exists
   */
  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      username: username.trim(),
    });
    return count > 0;
  }

  /**
   * Find users with pagination and filters
   */
  async findMany(
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
  }> {
    const query = this.buildQuery(filters);
    const limit = options?.limit || 20;
    const skip = options?.skip || 0;

    // Build sort criteria
    const sortCriteria: Record<string, 1 | -1> = {};
    if (options?.sortBy) {
      sortCriteria[options.sortBy] = options.sortOrder === 'asc' ? 1 : -1;
    }

    // Execute queries in parallel
    const [documents, total] = await Promise.all([
      this.collection.find(query).sort(sortCriteria).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(query),
    ]);

    const users = documents.map(doc => this.toEntity(doc));
    const hasMore = skip + documents.length < total;

    return {
      users,
      total,
      hasMore,
    };
  }

  /**
   * Update user entity
   */
  async update(id: string, user: User): Promise<User> {
    try {
      const objectId = new ObjectId(id);
      const document = this.toDocument(user);

      const result = await this.collection.findOneAndUpdate(
        { _id: objectId },
        { $set: document },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error('User not found');
      }

      return this.toEntity(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        throw error;
      }
      throw new Error('Invalid user ID format');
    }
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const objectId = new ObjectId(id);
      const result = await this.collection.deleteOne({ _id: objectId });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user count by filters
   */
  async count(filters?: UserSearchFilters): Promise<number> {
    const query = this.buildQuery(filters);
    return this.collection.countDocuments(query);
  }

  /**
   * Bulk update users
   */
  async bulkUpdate(updates: { id: string; data: Partial<User> }[]): Promise<User[]> {
    const bulkOps = updates.map(update => {
      try {
        const objectId = new ObjectId(update.id);
        return {
          updateOne: {
            filter: { _id: objectId },
            update: { $set: this.toPartialDocument(update.data) },
          },
        };
      } catch (error) {
        throw new Error(`Invalid user ID format: ${update.id}`);
      }
    });

    await this.collection.bulkWrite(bulkOps);

    // Return updated users
    const ids = updates.map(u => u.id);
    return this.findByIds(ids);
  }

  /**
   * Find users by IDs
   */
  async findByIds(ids: string[]): Promise<User[]> {
    const objectIds = ids
      .map(id => {
        try {
          return new ObjectId(id);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean) as ObjectId[];

    const documents = await this.collection.find({ _id: { $in: objectIds } }).toArray();

    return documents.map(doc => this.toEntity(doc));
  }

  /**
   * Build MongoDB query from filters
   */
  private buildQuery(filters?: UserSearchFilters): Filter<UserDocument> {
    const query: Filter<UserDocument> = {};

    if (!filters) {
      return query;
    }

    if (filters.email) {
      query.email = filters.email.toLowerCase().trim();
    }

    if (filters.username) {
      query.username = filters.username.trim();
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.emailVerified !== undefined) {
      query.emailVerified = filters.emailVerified;
    }

    // Date range filters
    if (filters.createdAfter || filters.createdBefore) {
      query.createdAt = {};
      if (filters.createdAfter) {
        query.createdAt.$gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        query.createdAt.$lte = filters.createdBefore;
      }
    }

    if (filters.lastLoginAfter || filters.lastLoginBefore) {
      query.lastLoginAt = {};
      if (filters.lastLoginAfter) {
        query.lastLoginAt.$gte = filters.lastLoginAfter;
      }
      if (filters.lastLoginBefore) {
        query.lastLoginAt.$lte = filters.lastLoginBefore;
      }
    }

    return query;
  }

  /**
   * Convert User entity to MongoDB document
   */
  private toDocument(user: User): Omit<UserDocument, '_id'> {
    return {
      email: user.email,
      username: user.username,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      profile: user.profile,
      permissions: user.permissions,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      metadata: user.metadata,
    };
  }

  /**
   * Convert partial User entity to MongoDB document
   */
  private toPartialDocument(user: Partial<User>): Partial<UserDocument> {
    const document: Partial<UserDocument> = {};

    if (user.email !== undefined) document.email = user.email;
    if (user.username !== undefined) document.username = user.username;
    if (user.passwordHash !== undefined) document.passwordHash = user.passwordHash;
    if (user.role !== undefined) document.role = user.role;
    if (user.status !== undefined) document.status = user.status;
    if (user.profile !== undefined) document.profile = user.profile;
    if (user.permissions !== undefined) document.permissions = user.permissions;
    if (user.emailVerified !== undefined) document.emailVerified = user.emailVerified;
    if (user.lastLoginAt !== undefined) document.lastLoginAt = user.lastLoginAt;
    if (user.updatedAt !== undefined) document.updatedAt = user.updatedAt;
    if (user.metadata !== undefined) document.metadata = user.metadata;

    return document;
  }

  /**
   * Convert MongoDB document to User entity
   */
  private toEntity(document: UserDocument): User {
    if (!document._id) {
      throw new Error('Document missing _id field');
    }

    return new User({
      id: document._id.toString(),
      email: document.email,
      username: document.username,
      passwordHash: document.passwordHash,
      role: document.role,
      status: document.status,
      profile: document.profile,
      permissions: document.permissions,
      emailVerified: document.emailVerified,
      lastLoginAt: document.lastLoginAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      metadata: document.metadata,
    });
  }
}
