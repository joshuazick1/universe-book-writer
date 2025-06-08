/**
 * Authentication repository interfaces
 * Defines data access contracts for authentication entities
 */

import { AuthToken, AuthSession, TokenType, TokenStatus } from '../entities/auth.entity.js';

export interface TokenSearchFilters {
  userId?: string;
  type?: TokenType;
  status?: TokenStatus;
  expiresAfter?: Date;
  expiresBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  deviceIp?: string;
}

export interface SessionSearchFilters {
  userId?: string;
  isActive?: boolean;
  expiresAfter?: Date;
  expiresBefore?: Date;
  deviceIp?: string;
  deviceId?: string;
}

export interface AuthTokenRepository {
  /**
   * Save an authentication token
   */
  save(token: AuthToken): Promise<AuthToken>;

  /**
   * Find token by ID
   */
  findById(id: string): Promise<AuthToken | null>;

  /**
   * Find token by token value
   */
  findByToken(token: string): Promise<AuthToken | null>;

  /**
   * Find tokens by user ID
   */
  findByUserId(userId: string, filters?: Partial<TokenSearchFilters>): Promise<AuthToken[]>;

  /**
   * Find tokens with filters
   */
  findMany(
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
  }>;

  /**
   * Update token
   */
  update(id: string, token: AuthToken): Promise<AuthToken>;

  /**
   * Delete token by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete expired tokens
   */
  deleteExpired(): Promise<number>;

  /**
   * Revoke all tokens for a user
   */
  revokeAllForUser(userId: string, tokenType?: TokenType): Promise<number>;

  /**
   * Revoke tokens by IDs
   */
  revokeByIds(tokenIds: string[], revokedBy?: string): Promise<number>;

  /**
   * Count tokens by filters
   */
  count(filters?: TokenSearchFilters): Promise<number>;
}

export interface AuthSessionRepository {
  /**
   * Save an authentication session
   */
  save(session: AuthSession): Promise<AuthSession>;

  /**
   * Find session by ID
   */
  findById(id: string): Promise<AuthSession | null>;

  /**
   * Find session by refresh token ID
   */
  findByRefreshTokenId(refreshTokenId: string): Promise<AuthSession | null>;

  /**
   * Find sessions by user ID
   */
  findByUserId(userId: string, filters?: Partial<SessionSearchFilters>): Promise<AuthSession[]>;

  /**
   * Find active sessions for user
   */
  findActiveByUserId(userId: string): Promise<AuthSession[]>;

  /**
   * Find sessions with filters
   */
  findMany(
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
  }>;

  /**
   * Update session
   */
  update(id: string, session: AuthSession): Promise<AuthSession>;

  /**
   * Delete session by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete expired sessions
   */
  deleteExpired(): Promise<number>;

  /**
   * Deactivate all sessions for a user
   */
  deactivateAllForUser(userId: string): Promise<number>;

  /**
   * Delete sessions by IDs
   */
  deleteByIds(sessionIds: string[]): Promise<number>;

  /**
   * Count sessions by filters
   */
  count(filters?: SessionSearchFilters): Promise<number>;

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): Promise<AuthSession | null>;
}
