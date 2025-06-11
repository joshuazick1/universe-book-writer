/**
 * Simplified Token Service Unit Tests
 * Tests core JWT token functionality with real tokens
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { JwtTokenService } from '../../../src/infrastructure/services/token.service.js';
import { TokenClaims, TokenType } from '../../../src/core/entities/auth.entity.js';
import { User, UserRole } from '../../../src/core/entities/user.entity.js';

describe('TokenService - Simplified Tests', () => {
  let tokenService: JwtTokenService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      accessTokenSecret: 'test-access-secret',
      refreshTokenSecret: 'test-refresh-secret',
      emailTokenSecret: 'test-email-secret',
      passwordResetTokenSecret: 'test-reset-secret',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      emailTokenExpiry: '24h',
      passwordResetTokenExpiry: '1h',
    };

    tokenService = new JwtTokenService(mockConfig);
  });

  describe('generateToken', () => {
    it('should generate valid JWT tokens', async () => {
      // Arrange
      const tokenClaims: Omit<TokenClaims, 'iat' | 'exp'> = {
        sub: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
        jti: 'session123',
        tokenType: TokenType.ACCESS,
      };

      // Act
      const result = await tokenService.generateToken(tokenClaims);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate different tokens for different token types', async () => {
      // Arrange
      const baseClaims = {
        sub: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
        jti: 'session123',
      };

      // Act
      const accessToken = await tokenService.generateToken({
        ...baseClaims,
        tokenType: TokenType.ACCESS,
      });

      const refreshToken = await tokenService.generateToken({
        ...baseClaims,
        tokenType: TokenType.REFRESH,
      });

      // Assert
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify tokens correctly', async () => {
      // Arrange
      const tokenClaims: Omit<TokenClaims, 'iat' | 'exp'> = {
        sub: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
        jti: 'session123',
        tokenType: TokenType.ACCESS,
      };

      const token = await tokenService.generateToken(tokenClaims);

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toBeDefined();
      expect(result.sub).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.role).toBe(UserRole.USER);
      expect(result.jti).toBe('session123');
      expect(result.tokenType).toBe(TokenType.ACCESS);
      expect(result.iat).toBeDefined();
      expect(result.exp).toBeDefined();
    });

    it('should handle invalid tokens', async () => {
      // Arrange
      const invalidToken = 'invalid.token.here';

      // Act & Assert
      await expect(tokenService.verifyToken(invalidToken)).rejects.toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', async () => {
      // Arrange
      const tokenClaims: Omit<TokenClaims, 'iat' | 'exp' | 'jti' | 'tokenType'> = {
        sub: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      // Act
      const result = await tokenService.generateTokenPair(tokenClaims);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.refreshTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.accessToken).not.toBe(result.refreshToken);
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate email verification tokens', async () => {
      // Arrange
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'test@example.com',
      } as User;

      // Act
      const result = await tokenService.generateVerificationToken(
        mockUser,
        TokenType.EMAIL_VERIFICATION
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(typeof result.token).toBe('string');
    });

    it('should generate password reset tokens', async () => {
      // Arrange
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'test@example.com',
      } as User;

      // Act
      const result = await tokenService.generateVerificationToken(
        mockUser,
        TokenType.PASSWORD_RESET
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(typeof result.token).toBe('string');
    });
  });

  describe('getTokenExpiration', () => {
    it('should return correct expiration times for different token types', () => {
      // Assert
      expect(tokenService.getTokenExpiration(TokenType.ACCESS)).toBe(15 * 60 * 1000); // 15 minutes
      expect(tokenService.getTokenExpiration(TokenType.REFRESH)).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(tokenService.getTokenExpiration(TokenType.EMAIL_VERIFICATION)).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(tokenService.getTokenExpiration(TokenType.PASSWORD_RESET)).toBe(60 * 60 * 1000); // 1 hour
    });
  });
});
