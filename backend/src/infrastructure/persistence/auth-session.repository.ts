import { Collection, MongoClient, ObjectId, Filter } from 'mongodb';
import { AuthSession } from '../../core/entities/auth.entity.js';
import {
  AuthSessionRepository,
  SessionSearchFilters,
} from '../../core/interfaces/auth.repository.js';

// Extended search filters for implementation-specific needs
interface ExtendedSessionSearchFilters extends SessionSearchFilters {
  deviceType?: string;
  isExpired?: boolean;
  ipAddress?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// MongoDB document structure for auth sessions
interface SessionDoc {
  _id?: ObjectId;
  userId: ObjectId;
  refreshTokenId: string;
  deviceInfo: Record<string, unknown>;
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export class MongoAuthSessionRepository implements AuthSessionRepository {
  private collection: Collection;

  constructor(client: MongoClient) {
    this.collection = client.db().collection('auth_sessions');
  }

  async save(session: AuthSession): Promise<AuthSession> {
    const sessionDoc = {
      _id: new ObjectId(session.id),
      userId: new ObjectId(session.userId),
      refreshTokenId: session.refreshTokenId,
      deviceInfo: session.deviceInfo,
      isActive: session.isActive,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata,
    };

    await this.collection.replaceOne({ _id: sessionDoc._id }, sessionDoc, { upsert: true });
    return session;
  }

  async findByRefreshTokenId(refreshTokenId: string): Promise<AuthSession | null> {
    const doc = await this.collection.findOne({ refreshTokenId });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async findActiveByUserId(userId: string): Promise<AuthSession[]> {
    const now = new Date();
    const docs = await this.collection
      .find({
        userId: new ObjectId(userId),
        expiresAt: { $gt: now },
        isActive: true,
      })
      .sort({ lastActivityAt: -1 })
      .toArray();

    return docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));
  }

  async findMany(
    filters?: SessionSearchFilters,
    options?: {
      skip?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    sessions: AuthSession[];
    total: number;
    hasMore: boolean;
  }> {
    const mongoFilter: Record<string, unknown> = {};

    if (filters?.userId) {
      mongoFilter.userId = new ObjectId(filters.userId);
    }
    if (filters?.isActive !== undefined) {
      mongoFilter.isActive = filters.isActive;
    }

    const total = await this.collection.countDocuments(mongoFilter);

    let query = this.collection.find(mongoFilter);

    if (options?.sortBy) {
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      query = query.sort({ [options.sortBy]: sortOrder });
    } else {
      query = query.sort({ lastActivityAt: -1 });
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const docs = await query.toArray();
    const sessions = docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));

    return {
      sessions,
      total,
      hasMore: (options?.skip || 0) + sessions.length < total,
    };
  }

  async deactivateAllForUser(userId: string): Promise<number> {
    const result = await this.collection.updateMany(
      { userId: new ObjectId(userId) },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }

  async deleteByIds(sessionIds: string[]): Promise<number> {
    try {
      const objectIds = sessionIds.map(id => new ObjectId(id));
      const result = await this.collection.deleteMany({
        _id: { $in: objectIds },
      });
      return result.deletedCount;
    } catch {
      return 0;
    }
  }

  async create(session: Omit<AuthSession, 'id'>): Promise<AuthSession> {
    const now = new Date();
    const sessionDoc = {
      ...session,
      userId: new ObjectId(session.userId),
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(sessionDoc);
    return this.mapDocumentToEntity({ ...sessionDoc, _id: result.insertedId });
  }

  async findById(id: string): Promise<AuthSession | null> {
    try {
      const doc = await this.collection.findOne({ _id: new ObjectId(id) });
      return doc ? this.mapDocumentToEntity(doc) : null;
    } catch {
      return null;
    }
  }

  async findBySessionId(sessionId: string): Promise<AuthSession | null> {
    const doc = await this.collection.findOne({ sessionId });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }
  async findByUserId(
    userId: string,
    filters?: Partial<SessionSearchFilters>
  ): Promise<AuthSession[]> {
    const mongoFilter: Filter<SessionDoc> = { userId: new ObjectId(userId) };

    if (filters?.isActive !== undefined) {
      mongoFilter.isActive = filters.isActive;
    }

    const docs = await this.collection.find(mongoFilter).sort({ lastActivityAt: -1 }).toArray();

    return docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));
  }
  async findActiveSessions(userId: string): Promise<AuthSession[]> {
    const now = new Date();
    const docs = await this.collection
      .find({
        userId: new ObjectId(userId),
        expiresAt: { $gt: now },
        isActive: true,
      })
      .sort({ lastActivityAt: -1 })
      .toArray();

    return docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));
  }
  async search(filters: ExtendedSessionSearchFilters): Promise<AuthSession[]> {
    const mongoFilter: Record<string, unknown> = {};

    if (filters.userId) {
      mongoFilter.userId = new ObjectId(filters.userId);
    }
    if (filters.deviceType) {
      mongoFilter['deviceInfo.type'] = filters.deviceType;
    }
    if (filters.isActive !== undefined) {
      mongoFilter.isActive = filters.isActive;
    }
    if (filters.isExpired !== undefined) {
      const now = new Date();
      if (filters.isExpired) {
        mongoFilter.expiresAt = { $lte: now };
      } else {
        mongoFilter.expiresAt = { $gt: now };
      }
    }
    if (filters.ipAddress) {
      mongoFilter.ipAddress = filters.ipAddress;
    }

    let query = this.collection.find(mongoFilter);

    if (filters.sortBy) {
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      query = query.sort({ [filters.sortBy]: sortOrder });
    } else {
      query = query.sort({ lastActivityAt: -1 });
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.skip(filters.offset);
    }

    const docs = await query.toArray();
    return docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));
  }
  async update(id: string, session: AuthSession): Promise<AuthSession> {
    try {
      const sessionDoc = {
        userId: new ObjectId(session.userId),
        refreshTokenId: session.refreshTokenId,
        deviceInfo: session.deviceInfo,
        isActive: session.isActive,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        metadata: session.metadata,
        updatedAt: new Date(),
      };

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: sessionDoc },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error('Session not found');
      }

      return this.mapDocumentToEntity(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Session not found') {
        throw error;
      }
      throw new Error('Invalid session ID format');
    }
  }

  async updateActivity(sessionId: string): Promise<AuthSession | null> {
    try {
      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(sessionId) },
        {
          $set: {
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );
      return result ? this.mapDocumentToEntity(result) : null;
    } catch {
      return null;
    }
  }

  async deactivate(id: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      return result.modifiedCount > 0;
    } catch {
      return false;
    }
  }

  async deactivateByUserId(userId: string): Promise<number> {
    const result = await this.collection.updateMany(
      { userId: new ObjectId(userId) },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await this.collection.deleteMany({
      expiresAt: { $lte: now },
    });
    return result.deletedCount;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({
        _id: new ObjectId(id),
      });
      return result.deletedCount > 0;
    } catch {
      return false;
    }
  }
  async count(filters?: SessionSearchFilters): Promise<number> {
    if (!filters) {
      return await this.collection.countDocuments();
    }

    const mongoFilter: Filter<SessionDoc> = {};

    if (filters.userId) {
      mongoFilter.userId = new ObjectId(filters.userId);
    }
    if (filters.isActive !== undefined) {
      mongoFilter.isActive = filters.isActive;
    }

    return await this.collection.countDocuments(mongoFilter);
  }
  private mapDocumentToEntity(doc: Record<string, unknown>): AuthSession {
    return new AuthSession({
      id: (doc._id as Record<string, unknown>).toString(),
      userId: (doc.userId as Record<string, unknown>).toString(),
      refreshTokenId: doc.refreshTokenId as string,
      deviceInfo: doc.deviceInfo as Record<string, unknown>,
      isActive: doc.isActive as boolean,
      lastActivityAt: doc.lastActivityAt as Date,
      expiresAt: doc.expiresAt as Date,
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date,
      metadata: doc.metadata as Record<string, unknown>,
    });
  }
}
