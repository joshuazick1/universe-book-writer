import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { TokenService } from '../../core/interfaces/auth.service.js';
import { TokenType, TokenClaims } from '../../core/entities/auth.entity.js';
import { User } from '../../core/entities/user.entity.js';

export class JwtTokenService implements TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly emailTokenSecret: string;
  private readonly resetTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly emailTokenExpiry: string;
  private readonly resetTokenExpiry: string;

  constructor(config: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    emailTokenSecret: string;
    passwordResetTokenSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    emailTokenExpiry: string;
    passwordResetTokenExpiry: string;
  }) {
    this.accessTokenSecret = config.accessTokenSecret;
    this.refreshTokenSecret = config.refreshTokenSecret;
    this.emailTokenSecret = config.emailTokenSecret;
    this.resetTokenSecret = config.passwordResetTokenSecret;
    this.accessTokenExpiry = config.accessTokenExpiry;
    this.refreshTokenExpiry = config.refreshTokenExpiry;
    this.emailTokenExpiry = config.emailTokenExpiry;
    this.resetTokenExpiry = config.passwordResetTokenExpiry;
  }

  async generateToken(claims: Omit<TokenClaims, 'iat' | 'exp'>): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = this.getTokenExpiration(claims.tokenType);

    const tokenPayload: TokenClaims = {
      ...claims,
      iat: now,
      exp: now + Math.floor(expiry / 1000), // Convert ms to seconds
      jti: claims.jti || crypto.randomUUID(), // Use provided jti or generate new one
    };

    const secret = this.getSecretForType(claims.tokenType);

    return jwt.sign(tokenPayload, secret, {
      issuer: 'universe-book-writer',
      audience: 'universe-book-writer-app',
    });
  }

  async verifyToken(token: string): Promise<TokenClaims> {
    // Try to decode without verification first to get the token type
    const decoded = jwt.decode(token) as TokenClaims;
    if (!decoded || !decoded.tokenType) {
      throw new Error('Invalid token format');
    }

    const secret = this.getSecretForType(decoded.tokenType);

    try {
      const verified = jwt.verify(token, secret, {
        issuer: 'universe-book-writer',
        audience: 'universe-book-writer-app',
      }) as TokenClaims;

      return verified;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  async generateTokenPair(
    user: User,
    _deviceInfo?: Record<string, unknown>
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }> {
    const baseClaims = {
      sub: user.id,
      email: user.email,
      username: user.username || user.email,
      role: user.role,
    };

    const accessToken = await this.generateToken({
      ...baseClaims,
      tokenType: TokenType.ACCESS,
    });

    const refreshToken = await this.generateToken({
      ...baseClaims,
      tokenType: TokenType.REFRESH,
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + this.getTokenExpiration(TokenType.ACCESS)),
      refreshTokenExpiresAt: new Date(Date.now() + this.getTokenExpiration(TokenType.REFRESH)),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }> {
    try {
      const claims = await this.verifyToken(refreshToken);

      if (claims.tokenType !== TokenType.REFRESH) {
        throw new Error('Invalid token type for refresh');
      }

      // Generate new token pair
      const baseClaims = {
        sub: claims.sub,
        email: claims.email,
        username: claims.username,
        role: claims.role,
      };

      const newAccessToken = await this.generateToken({
        ...baseClaims,
        tokenType: TokenType.ACCESS,
      });

      const newRefreshToken = await this.generateToken({
        ...baseClaims,
        tokenType: TokenType.REFRESH,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessTokenExpiresAt: new Date(Date.now() + this.getTokenExpiration(TokenType.ACCESS)),
        refreshTokenExpiresAt: new Date(Date.now() + this.getTokenExpiration(TokenType.REFRESH)),
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async generateVerificationToken(
    user: User,
    type: TokenType
  ): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const token = await this.generateToken({
      sub: user.id,
      email: user.email,
      username: user.username || user.email,
      role: user.role,
      tokenType: type,
    });

    return {
      token,
      expiresAt: new Date(Date.now() + this.getTokenExpiration(type)),
    };
  }

  async verifyVerificationToken(
    token: string,
    type: TokenType
  ): Promise<{
    userId: string;
    isValid: boolean;
    claims?: TokenClaims;
  }> {
    try {
      const claims = await this.verifyToken(token);

      if (claims.tokenType !== type) {
        return { userId: claims.sub, isValid: false };
      }

      return {
        userId: claims.sub,
        isValid: true,
        claims,
      };
    } catch (error) {
      // Try to decode without verification to get user ID
      try {
        const decoded = jwt.decode(token) as TokenClaims;
        return { userId: decoded?.sub || 'unknown', isValid: false };
      } catch {
        return { userId: 'unknown', isValid: false };
      }
    }
  }

  async revokeToken(_tokenId: string, _revokedBy?: string): Promise<boolean> {
    // This would typically interact with a token blacklist in the database
    // For now, we'll return true as a placeholder
    // TODO: Implement token blacklist functionality
    return true;
  }

  getTokenExpiration(tokenType: TokenType): number {
    switch (tokenType) {
      case TokenType.ACCESS:
        return 15 * 60 * 1000; // 15 minutes in milliseconds
      case TokenType.REFRESH:
        return 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      case TokenType.EMAIL_VERIFICATION:
        return 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      case TokenType.PASSWORD_RESET:
        return 60 * 60 * 1000; // 1 hour in milliseconds
      default:
        return 15 * 60 * 1000; // Default to 15 minutes
    }
  }

  private getSecretForType(type: TokenType): string {
    switch (type) {
      case TokenType.ACCESS:
        return this.accessTokenSecret;
      case TokenType.REFRESH:
        return this.refreshTokenSecret;
      case TokenType.EMAIL_VERIFICATION:
        return this.emailTokenSecret;
      case TokenType.PASSWORD_RESET:
        return this.resetTokenSecret;
      default:
        return this.accessTokenSecret;
    }
  }
}
