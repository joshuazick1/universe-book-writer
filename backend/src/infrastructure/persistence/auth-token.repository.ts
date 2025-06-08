import { Collection, MongoClient, ObjectId } from 'mongodb';
import { AuthToken, TokenType, TokenStatus } from '../../core/entities/auth.entity.js';
import { AuthTokenRepository, TokenSearchFilters } from '../../core/interfaces/auth.repository.js';

export class MongoAuthTokenRepository implements AuthTokenRepository {
  private collection: Collection;

  constructor(client: MongoClient) {
    this.collection = client.db().collection('auth_tokens');
  }

  async save(token: AuthToken): Promise<AuthToken> {
    const tokenDoc = {
      _id: new ObjectId(token.id),
      userId: new ObjectId(token.userId),
      type: token.type,
      token: token.token,
      status: token.status,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      revokedAt: token.revokedAt,
      revokedBy: token.revokedBy,
      deviceInfo: token.deviceInfo,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      metadata: token.metadata,
    };

    await this.collection.replaceOne({ _id: tokenDoc._id }, tokenDoc, { upsert: true });
    return token;
  }

  async create(token: Omit<AuthToken, 'id'>): Promise<AuthToken> {
    const now = new Date();
    const tokenDoc = {
      ...token,
      userId: new ObjectId(token.userId),
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(tokenDoc);
    return this.mapDocumentToEntity({ ...tokenDoc, _id: result.insertedId });
  }

  async findById(id: string): Promise<AuthToken | null> {
    try {
      const doc = await this.collection.findOne({ _id: new ObjectId(id) });
      return doc ? this.mapDocumentToEntity(doc) : null;
    } catch {
      return null;
    }
  }

  async findByToken(token: string): Promise<AuthToken | null> {
    const doc = await this.collection.findOne({ token });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }
  async findByUserId(userId: string, filters?: Partial<TokenSearchFilters>): Promise<AuthToken[]> {
    const filter: Record<string, unknown> = { userId: new ObjectId(userId) };

    if (filters?.type) filter.type = filters.type;
    if (filters?.status) filter.status = filters.status;
    if (filters?.expiresAfter) filter.expiresAt = { $gt: filters.expiresAfter };
    if (filters?.expiresBefore) {
      filter.expiresAt = filter.expiresAt
        ? { ...filter.expiresAt, $lt: filters.expiresBefore }
        : { $lt: filters.expiresBefore };
    }

    const docs = await this.collection.find(filter).sort({ createdAt: -1 }).toArray();

    return docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));
  }
  async findActiveTokens(userId: string, type?: TokenType): Promise<AuthToken[]> {
    const now = new Date();
    const filter: Record<string, unknown> = {
      userId: new ObjectId(userId),
      expiresAt: { $gt: now },
      status: TokenStatus.ACTIVE,
    };
    if (type) filter.type = type;

    const docs = await this.collection.find(filter).sort({ createdAt: -1 }).toArray();

    return docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));
  }
  async search(filters: TokenSearchFilters): Promise<AuthToken[]> {
    const mongoFilter: Record<string, unknown> = {};

    if (filters.userId) {
      mongoFilter.userId = new ObjectId(filters.userId);
    }
    if (filters.type) {
      mongoFilter.type = filters.type;
    }
    if (filters.status) {
      mongoFilter.status = filters.status;
    }
    if (filters.expiresAfter) {
      mongoFilter.expiresAt = { $gt: filters.expiresAfter };
    }
    if (filters.expiresBefore) {
      mongoFilter.expiresAt = mongoFilter.expiresAt
        ? { ...mongoFilter.expiresAt, $lt: filters.expiresBefore }
        : { $lt: filters.expiresBefore };
    }

    const docs = await this.collection.find(mongoFilter).sort({ createdAt: -1 }).toArray();

    return docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));
  }
  async update(id: string, token: AuthToken): Promise<AuthToken> {
    try {
      const tokenDoc = {
        userId: new ObjectId(token.userId),
        token: token.token,
        type: token.type,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        metadata: token.metadata,
        updatedAt: new Date(),
      };

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: tokenDoc },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error('Token not found');
      }

      return this.mapDocumentToEntity(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Token not found') {
        throw error;
      }
      throw new Error('Invalid token ID format');
    }
  }
  async revoke(id: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: TokenStatus.REVOKED,
            revokedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      return result.modifiedCount > 0;
    } catch {
      return false;
    }
  }
  async revokeByUserId(userId: string, type?: TokenType): Promise<number> {
    const filter: Record<string, unknown> = { userId: new ObjectId(userId) };
    if (type) filter.type = type;

    const result = await this.collection.updateMany(filter, {
      $set: {
        status: TokenStatus.REVOKED,
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return result.modifiedCount;
  }

  async revokeAllForUser(userId: string, tokenType?: TokenType): Promise<number> {
    return this.revokeByUserId(userId, tokenType);
  }
  async revokeByIds(tokenIds: string[], revokedBy?: string): Promise<number> {
    try {
      const objectIds = tokenIds.map(id => new ObjectId(id));
      const result = await this.collection.updateMany(
        { _id: { $in: objectIds } },
        {
          $set: {
            status: TokenStatus.REVOKED,
            revokedAt: new Date(),
            revokedBy,
            updatedAt: new Date(),
          },
        }
      );
      return result.modifiedCount;
    } catch {
      return 0;
    }
  }

  async findMany(
    filters?: TokenSearchFilters,
    options?: {
      skip?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    tokens: AuthToken[];
    total: number;
    hasMore: boolean;
  }> {
    const mongoFilter: Record<string, unknown> = {};

    if (filters?.userId) {
      mongoFilter.userId = new ObjectId(filters.userId);
    }
    if (filters?.type) {
      mongoFilter.type = filters.type;
    }
    if (filters?.status) {
      mongoFilter.status = filters.status;
    }
    if (filters?.expiresAfter) {
      mongoFilter.expiresAt = { $gt: filters.expiresAfter };
    }
    if (filters?.expiresBefore) {
      mongoFilter.expiresAt = mongoFilter.expiresAt
        ? { ...mongoFilter.expiresAt, $lt: filters.expiresBefore }
        : { $lt: filters.expiresBefore };
    }
    if (filters?.createdAfter) {
      mongoFilter.createdAt = { $gte: filters.createdAfter };
    }
    if (filters?.createdBefore) {
      mongoFilter.createdAt = mongoFilter.createdAt
        ? { ...mongoFilter.createdAt, $lte: filters.createdBefore }
        : { $lte: filters.createdBefore };
    }
    if (filters?.deviceIp) {
      mongoFilter['deviceInfo.ip'] = filters.deviceIp;
    }

    const total = await this.collection.countDocuments(mongoFilter);

    let query = this.collection.find(mongoFilter);

    if (options?.sortBy) {
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      query = query.sort({ [options.sortBy]: sortOrder });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const docs = await query.toArray();
    const tokens = docs.map((doc: Record<string, unknown>) => this.mapDocumentToEntity(doc));

    return {
      tokens,
      total,
      hasMore: (options?.skip || 0) + tokens.length < total,
    };
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
  async count(filters?: TokenSearchFilters): Promise<number> {
    if (!filters) {
      return await this.collection.countDocuments();
    }

    const mongoFilter: Record<string, unknown> = {};

    if (filters.userId) {
      mongoFilter.userId = new ObjectId(filters.userId);
    }
    if (filters.type) {
      mongoFilter.type = filters.type;
    }
    if (filters.status) {
      mongoFilter.status = filters.status;
    }
    if (filters.expiresAfter) {
      mongoFilter.expiresAt = { $gt: filters.expiresAfter };
    }
    if (filters.expiresBefore) {
      mongoFilter.expiresAt = mongoFilter.expiresAt
        ? { ...mongoFilter.expiresAt, $lt: filters.expiresBefore }
        : { $lt: filters.expiresBefore };
    }
    if (filters.createdAfter) {
      mongoFilter.createdAt = { $gte: filters.createdAfter };
    }
    if (filters.createdBefore) {
      mongoFilter.createdAt = mongoFilter.createdAt
        ? { ...mongoFilter.createdAt, $lte: filters.createdBefore }
        : { $lte: filters.createdBefore };
    }
    if (filters.deviceIp) {
      mongoFilter['deviceInfo.ip'] = filters.deviceIp;
    }

    return await this.collection.countDocuments(mongoFilter);
  }
  private mapDocumentToEntity(doc: Record<string, unknown>): AuthToken {
    return new AuthToken({
      id: (doc._id as { toString(): string }).toString(),
      userId: (doc.userId as { toString(): string }).toString(),
      token: doc.token as string,
      type: doc.type as TokenType,
      status: doc.status as TokenStatus,
      expiresAt: doc.expiresAt as Date,
      usedAt: doc.usedAt as Date | undefined,
      revokedAt: doc.revokedAt as Date | undefined,
      revokedBy: doc.revokedBy as string | undefined,
      deviceInfo: doc.deviceInfo as
        | { userAgent?: string; ip?: string; platform?: string; browser?: string }
        | undefined,
      createdAt: doc.createdAt as Date | undefined,
      updatedAt: doc.updatedAt as Date | undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
    });
  }
}
