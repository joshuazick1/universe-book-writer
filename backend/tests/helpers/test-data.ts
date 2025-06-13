/**
 * Test Data Helpers
 * Utilities for creating and managing test data
 */

import { Db, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../src/core/entities/user.entity.js';

export interface TestUserOptions {
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
}

export async function createTestUser(db: Db, options: TestUserOptions = {}): Promise<any> {
  const {
    email = 'test@example.com',
    password = 'SecureTestP@ssw0rd!',
    role = UserRole.USER,
    status = UserStatus.ACTIVE, // Default to ACTIVE for tests
    emailVerified = true,
    firstName = 'Test',
    lastName = 'User',
  } = options;

  const _id = new ObjectId();
  const userId = _id.toString(); // Use the same ObjectId for both _id and id
  const passwordHash = await bcrypt.hash(password, 12);

  const userData = {
    _id,
    id: userId,
    email,
    username: email.split('@')[0] + '_' + Date.now(),
    passwordHash,
    role,
    status,
    emailVerified,
    profile: {
      firstName,
      lastName,
      preferences: {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: false,
          mentions: true,
        },
      },
    },
    permissions: {
      canCreateUniverse: true,
      canEditOwnContent: true,
      canEditOtherContent: role === UserRole.ADMIN,
      canDeleteContent: role === UserRole.ADMIN,
      canManageUsers: role === UserRole.ADMIN,
      canManagePlugins: role === UserRole.ADMIN,
      canAccessAdminPanel: role === UserRole.ADMIN,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const users = db.collection('users');
  await users.insertOne(userData);

  return { ...userData, id: userId };
}

export async function createTestSession(
  db: Db,
  userId: string,
  options: {
    refreshTokenId?: string;
    deviceInfo?: any;
    expiresAt?: Date;
    isActive?: boolean;
  } = {}
): Promise<any> {
  const {
    refreshTokenId = 'refresh-token-' + Date.now(),
    deviceInfo = {
      userAgent: 'Mozilla/5.0 (Test Browser)',
      ip: '127.0.0.1',
      deviceId: 'test-device-123',
    },
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    isActive = true,
  } = options;

  const sessionId = 'session-' + Date.now();

  const sessionData = {
    _id: new ObjectId(),
    id: sessionId,
    userId,
    refreshTokenId,
    deviceInfo,
    expiresAt,
    isActive,
    createdAt: new Date(),
    lastActivity: new Date(),
  };

  const sessions = db.collection('authSessions');
  await sessions.insertOne(sessionData);

  return sessionData;
}

export async function createTestToken(
  db: Db,
  userId: string,
  type: 'ACCESS' | 'REFRESH' | 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  options: {
    token?: string;
    expiresAt?: Date;
    isRevoked?: boolean;
    usedAt?: Date | null;
  } = {}
): Promise<any> {
  const {
    token = `test-${type.toLowerCase()}-token-${Date.now()}`,
    expiresAt = new Date(
      Date.now() + (type === 'ACCESS' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
    ),
    isRevoked = false,
    usedAt = null,
  } = options;

  const tokenId = 'token-' + Date.now();

  const tokenData = {
    _id: new ObjectId(),
    id: tokenId,
    userId,
    type,
    token,
    expiresAt,
    isRevoked,
    usedAt,
    deviceInfo: {
      userAgent: 'Mozilla/5.0 (Test Browser)',
      ip: '127.0.0.1',
    },
    createdAt: new Date(),
  };

  const tokens = db.collection('authTokens');
  await tokens.insertOne(tokenData);

  return tokenData;
}

export async function createTestSecurityLog(
  db: Db,
  userId: string,
  eventType: string,
  options: {
    metadata?: any;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    timestamp?: Date;
  } = {}
): Promise<any> {
  const { metadata = {}, severity = 'low', timestamp = new Date() } = options;

  const logData = {
    _id: new ObjectId(),
    id: 'log-' + Date.now(),
    userId,
    eventType,
    severity,
    timestamp,
    metadata,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
  };

  const logs = db.collection('securityLogs');
  await logs.insertOne(logData);

  return logData;
}

export async function cleanTestData(db: Db): Promise<void> {
  // Clean all test collections
  const collections = ['users', 'authSessions', 'authTokens', 'securityLogs', 'adminSettings'];

  for (const collectionName of collections) {
    try {
      await db.collection(collectionName).deleteMany({});
    } catch (error) {
      // Collection might not exist, that's okay
    }
  }
}

export async function createTestAdminUser(db: Db): Promise<any> {
  return createTestUser(db, {
    email: 'admin@test.com',
    password: 'AdminPassword123!',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    firstName: 'Test',
    lastName: 'Admin',
  });
}

export async function createTestRegularUser(db: Db): Promise<any> {
  return createTestUser(db, {
    email: 'user@test.com',
    password: 'UserPassword123!',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    firstName: 'Test',
    lastName: 'User',
  });
}

export async function createExpiredToken(
  db: Db,
  userId: string,
  type: 'ACCESS' | 'REFRESH'
): Promise<any> {
  return createTestToken(db, userId, type, {
    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
  });
}

export async function createRevokedToken(
  db: Db,
  userId: string,
  type: 'ACCESS' | 'REFRESH'
): Promise<any> {
  return createTestToken(db, userId, type, {
    isRevoked: true,
  });
}

export async function createSuspiciousSecurityLogs(
  db: Db,
  userId: string,
  count: number = 5
): Promise<any[]> {
  const logs = [];

  for (let i = 0; i < count; i++) {
    const log = await createTestSecurityLog(db, userId, 'login_failed', {
      severity: 'medium',
      metadata: {
        reason: 'invalid_password',
        attempt: i + 1,
      },
    });
    logs.push(log);
  }

  return logs;
}

export function generateRandomEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@example.com`;
}

export function generateRandomPassword(): string {
  const length = 12;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one of each required character type
  password += 'A'; // uppercase
  password += 'a'; // lowercase
  password += '1'; // number
  password += '!'; // special

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

export async function waitForDatabaseWrite(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
