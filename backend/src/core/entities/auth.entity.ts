/**
 * Authentication domain entities
 * Core business logic for authentication and authorization
 */

import { BaseEntity } from '@universe-book-writer/core';

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

export enum TokenStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  USED = 'used',
}

/**
 * JWT Token claims interface
 */
export interface TokenClaims {
  sub: string; // Subject (user ID)
  email: string;
  username: string;
  role: string;
  iat: number; // Issued at
  exp: number; // Expires at
  jti?: string; // JWT ID
  tokenType: TokenType;
}

/**
 * Authentication Token entity
 */
export class AuthToken implements BaseEntity {
  public readonly id: string;
  public readonly userId: string;
  public readonly type: TokenType;
  public readonly token: string;
  public readonly status: TokenStatus;
  public readonly expiresAt: Date;
  public readonly usedAt?: Date;
  public readonly revokedAt?: Date;
  public readonly revokedBy?: string;
  public readonly deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
    browser?: string;
  };
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly metadata?: Record<string, unknown>;

  constructor(data: {
    id: string;
    userId: string;
    type: TokenType;
    token: string;
    status?: TokenStatus;
    expiresAt: Date;
    usedAt?: Date;
    revokedAt?: Date;
    revokedBy?: string;
    deviceInfo?: {
      userAgent?: string;
      ip?: string;
      platform?: string;
      browser?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
    metadata?: Record<string, unknown>;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.type = data.type;
    this.token = data.token;
    this.status = data.status || TokenStatus.ACTIVE;
    this.expiresAt = data.expiresAt;
    this.usedAt = data.usedAt;
    this.revokedAt = data.revokedAt;
    this.revokedBy = data.revokedBy;
    this.deviceInfo = data.deviceInfo;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata;

    this.validateEntity();
  }

  /**
   * Validate token entity data
   */
  private validateEntity(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Token ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!this.token || this.token.trim().length === 0) {
      throw new Error('Token value is required');
    }

    if (!this.expiresAt) {
      throw new Error('Token expiration date is required');
    }
  }

  /**
   * Check if token is expired
   */
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if token is valid (active and not expired)
   */
  public isValid(): boolean {
    return this.status === TokenStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Check if token can be used
   */
  public canBeUsed(): boolean {
    return this.isValid() && !this.usedAt && !this.revokedAt;
  }
  /**
   * Mark token as used
   */
  public markAsUsed(): AuthToken {
    if (!this.canBeUsed()) {
      throw new Error('Token cannot be used');
    }

    return new AuthToken({
      ...(this.toPlainObject() as ConstructorParameters<typeof AuthToken>[0]),
      status:
        this.type === TokenType.EMAIL_VERIFICATION || this.type === TokenType.PASSWORD_RESET
          ? TokenStatus.USED
          : this.status,
      usedAt: new Date(),
      updatedAt: new Date(),
    });
  }
  /**
   * Revoke token
   */
  public revoke(revokedBy?: string): AuthToken {
    return new AuthToken({
      ...this.toPlainObject(),
      status: TokenStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy,
      updatedAt: new Date(),
    } as ConstructorParameters<typeof AuthToken>[0]);
  }

  /**
   * Get time until expiration in milliseconds
   */
  public getTimeToExpiration(): number {
    return Math.max(0, this.expiresAt.getTime() - Date.now());
  }

  /**
   * Convert to plain object (for serialization)
   */
  public toPlainObject(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      token: this.token,
      status: this.status,
      expiresAt: this.expiresAt,
      usedAt: this.usedAt,
      revokedAt: this.revokedAt,
      revokedBy: this.revokedBy,
      deviceInfo: this.deviceInfo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }
}

/**
 * Authentication Session entity
 */
export class AuthSession implements BaseEntity {
  public readonly id: string;
  public readonly userId: string;
  public readonly refreshTokenId: string;
  public readonly deviceInfo: {
    userAgent?: string;
    ip?: string;
    platform?: string;
    browser?: string;
    deviceId?: string;
  };
  public readonly isActive: boolean;
  public readonly lastActivityAt: Date;
  public readonly expiresAt: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly metadata?: Record<string, unknown>;

  constructor(data: {
    id: string;
    userId: string;
    refreshTokenId: string;
    deviceInfo: {
      userAgent?: string;
      ip?: string;
      platform?: string;
      browser?: string;
      deviceId?: string;
    };
    isActive?: boolean;
    lastActivityAt?: Date;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
    metadata?: Record<string, unknown>;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.refreshTokenId = data.refreshTokenId;
    this.deviceInfo = data.deviceInfo;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.lastActivityAt = data.lastActivityAt || new Date();
    this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata;

    this.validateEntity();
  }

  /**
   * Validate session entity data
   */
  private validateEntity(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Session ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!this.refreshTokenId || this.refreshTokenId.trim().length === 0) {
      throw new Error('Refresh token ID is required');
    }

    if (!this.expiresAt) {
      throw new Error('Session expiration date is required');
    }
  }

  /**
   * Check if session is expired
   */
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if session is valid
   */
  public isValid(): boolean {
    return this.isActive && !this.isExpired();
  }
  /**
   * Update activity timestamp
   */
  public updateActivity(): AuthSession {
    return new AuthSession({
      ...this.toPlainObject(),
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    } as ConstructorParameters<typeof AuthSession>[0]);
  }
  /**
   * Deactivate session
   */
  public deactivate(): AuthSession {
    return new AuthSession({
      ...this.toPlainObject(),
      isActive: false,
      updatedAt: new Date(),
    } as ConstructorParameters<typeof AuthSession>[0]);
  }

  /**
   * Convert to plain object (for serialization)
   */
  public toPlainObject(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      refreshTokenId: this.refreshTokenId,
      deviceInfo: this.deviceInfo,
      isActive: this.isActive,
      lastActivityAt: this.lastActivityAt,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }
}
