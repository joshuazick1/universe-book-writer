# Authentication System Documentation

## Overview

The VerseForge authentication system provides secure user management, session handling, and role-based access control. Built on JWT tokens with refresh token rotation, the system ensures security while maintaining user convenience.

## Architecture

### Components

1. **User Management**: User entities, profiles, and preferences
2. **Authentication Service**: Login, registration, and token management
3. **Authorization Service**: Role-based access control and permissions
4. **Session Management**: Active session tracking and cleanup
5. **Security Services**: Password hashing, rate limiting, and monitoring

### Layer Structure

```
Authentication System
├── Core Layer (Domain)
│   ├── entities/          # User, Role, Permission entities
│   ├── value-objects/     # Email, Password value objects
│   ├── repositories/      # Repository interfaces
│   └── services/          # Domain services
├── Application Layer
│   ├── use-cases/         # Authentication use cases
│   ├── dto/              # Data transfer objects
│   └── services/         # Application services
└── Infrastructure Layer
    ├── repositories/      # Repository implementations
    ├── services/         # External service integrations
    └── middleware/       # Express middleware
```

## User Management

### User Entity

```typescript
interface User {
  readonly id: UserId;
  readonly email: Email;
  readonly username: string;
  readonly passwordHash: PasswordHash;
  readonly profile: UserProfile;
  readonly roles: Role[];
  readonly preferences: UserPreferences;
  readonly metadata: UserMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt?: Date;
  readonly isActive: boolean;
  readonly isVerified: boolean;
}

interface UserProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly avatar?: string;
  readonly bio?: string;
  readonly timezone: string;
  readonly locale: string;
}

interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly language: string;
  readonly notifications: NotificationPreferences;
  readonly privacy: PrivacySettings;
  readonly editor: EditorPreferences;
}
```

### Role-Based Access Control

```typescript
interface Role {
  readonly id: RoleId;
  readonly name: string;
  readonly description: string;
  readonly permissions: Permission[];
  readonly isSystem: boolean;
}

interface Permission {
  readonly id: PermissionId;
  readonly name: string;
  readonly resource: string;
  readonly action: string;
  readonly conditions?: PermissionCondition[];
}

// Example roles
const SYSTEM_ROLES = {
  ADMIN: {
    name: 'admin',
    permissions: ['*:*'] // All permissions
  },
  USER: {
    name: 'user',
    permissions: [
      'universe:read',
      'universe:write:own',
      'story:read:own',
      'story:write:own',
      'character:read:own',
      'character:write:own'
    ]
  },
  COLLABORATOR: {
    name: 'collaborator',
    permissions: [
      'universe:read:shared',
      'story:read:shared',
      'story:write:shared',
      'character:read:shared'
    ]
  }
};
```

## Authentication Flow

### Registration Process

1. **User Registration**
   ```typescript
   interface RegisterUserRequest {
     email: string;
     username: string;
     password: string;
     firstName: string;
     lastName: string;
   }

   interface RegisterUserResponse {
     user: UserDto;
     accessToken: string;
     refreshToken: string;
   }
   ```

2. **Email Verification**
   ```typescript
   interface EmailVerificationRequest {
     token: string;
   }

   interface EmailVerificationResponse {
     success: boolean;
     message: string;
   }
   ```

### Login Process

1. **User Login**
   ```typescript
   interface LoginRequest {
     email: string;
     password: string;
     rememberMe?: boolean;
   }

   interface LoginResponse {
     user: UserDto;
     accessToken: string;
     refreshToken: string;
     expiresAt: Date;
   }
   ```

2. **Token Refresh**
   ```typescript
   interface RefreshTokenRequest {
     refreshToken: string;
   }

   interface RefreshTokenResponse {
     accessToken: string;
     refreshToken: string;
     expiresAt: Date;
   }
   ```

### Logout Process

1. **Single Session Logout**
   ```typescript
   interface LogoutRequest {
     refreshToken: string;
   }

   interface LogoutResponse {
     success: boolean;
   }
   ```

2. **All Sessions Logout**
   ```typescript
   interface LogoutAllSessionsRequest {
     userId: string;
   }

   interface LogoutAllSessionsResponse {
     success: boolean;
     sessionsTerminated: number;
   }
   ```

## JWT Token Management

### Token Structure

```typescript
interface AccessTokenPayload {
  sub: string;          // User ID
  email: string;        // User email
  username: string;     // Username
  roles: string[];      // User roles
  permissions: string[]; // Flattened permissions
  iat: number;          // Issued at
  exp: number;          // Expires at
  jti: string;          // JWT ID
}

interface RefreshTokenPayload {
  sub: string;          // User ID
  tokenFamily: string;  // Token family ID
  iat: number;          // Issued at
  exp: number;          // Expires at
  jti: string;          // JWT ID
}
```

### Token Configuration

```typescript
const JWT_CONFIG = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '15m',
    algorithm: 'HS256'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',
    algorithm: 'HS256'
  }
};
```

### Token Rotation

The system implements automatic token rotation for enhanced security:

1. **Refresh Token Rotation**: Each refresh generates a new refresh token
2. **Token Family Tracking**: Tracks token families to detect replay attacks
3. **Automatic Cleanup**: Expired tokens are automatically cleaned up

```typescript
class TokenService {
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    
    // Invalidate old refresh token
    await this.invalidateRefreshToken(refreshToken);
    
    // Generate new token pair
    const user = await this.userRepository.findById(payload.sub);
    return this.generateTokenPair(user);
  }
}
```

## Security Features

### Password Security

```typescript
class PasswordService {
  private readonly saltRounds = 12;
  
  async hashPassword(password: string): Promise<PasswordHash> {
    const salt = await bcrypt.genSalt(this.saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return PasswordHash.create(hash);
  }
  
  async verifyPassword(password: string, hash: PasswordHash): Promise<boolean> {
    return bcrypt.compare(password, hash.value);
  }
  
  validatePasswordStrength(password: string): ValidationResult {
    const requirements = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    };
    
    return this.validateAgainstRequirements(password, requirements);
  }
}
```

### Rate Limiting

```typescript
const RATE_LIMITS = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                    // 5 attempts per window
    message: 'Too many login attempts'
  },
  register: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 3,                    // 3 registrations per hour
    message: 'Too many registration attempts'
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 3,                    // 3 reset attempts per hour
    message: 'Too many password reset attempts'
  }
};
```

### Security Headers

```typescript
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

## Session Management

### Session Tracking

```typescript
interface UserSession {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly tokenFamily: string;
  readonly deviceInfo: DeviceInfo;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly location?: GeoLocation;
  readonly createdAt: Date;
  readonly lastAccessAt: Date;
  readonly expiresAt: Date;
  readonly isActive: boolean;
}

interface DeviceInfo {
  readonly deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  readonly browser: string;
  readonly os: string;
  readonly deviceFingerprint: string;
}
```

### Session Operations

```typescript
class SessionService {
  async createSession(user: User, deviceInfo: DeviceInfo): Promise<UserSession> {
    const session = UserSession.create({
      userId: user.id,
      tokenFamily: crypto.randomUUID(),
      deviceInfo,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      expiresAt: this.calculateExpiry()
    });
    
    await this.sessionRepository.save(session);
    return session;
  }
  
  async getActiveSessions(userId: UserId): Promise<UserSession[]> {
    return this.sessionRepository.findActiveByUserId(userId);
  }
  
  async terminateSession(sessionId: SessionId): Promise<void> {
    await this.sessionRepository.deactivate(sessionId);
  }
  
  async terminateAllSessions(userId: UserId): Promise<number> {
    return this.sessionRepository.deactivateAllByUserId(userId);
  }
}
```

## Middleware

### Authentication Middleware

```typescript
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    const payload = await jwtService.verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid user');
    }
    
    req.user = user;
    req.permissions = payload.permissions;
    
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
};
```

### Authorization Middleware

```typescript
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.permissions) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const hasPermissions = requiredPermissions.every(permission =>
      hasPermission(req.permissions, permission)
    );
    
    if (!hasPermissions) {
      throw new ForbiddenError('Insufficient permissions');
    }
    
    next();
  };
};

export const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const userRoles = req.user.roles.map(role => role.name);
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenError('Insufficient role');
    }
    
    next();
  };
};
```

## API Endpoints

### Authentication Routes

```typescript
// POST /api/auth/register
router.post('/register', 
  validateRegistration,
  rateLimitMiddleware('register'),
  registerController
);

// POST /api/auth/login
router.post('/login',
  validateLogin,
  rateLimitMiddleware('login'),
  loginController
);

// POST /api/auth/logout
router.post('/logout',
  authenticateJWT,
  logoutController
);

// POST /api/auth/logout-all
router.post('/logout-all',
  authenticateJWT,
  logoutAllController
);

// POST /api/auth/refresh
router.post('/refresh',
  validateRefreshToken,
  refreshTokenController
);

// POST /api/auth/verify-email
router.post('/verify-email',
  validateEmailVerification,
  verifyEmailController
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  validateForgotPassword,
  rateLimitMiddleware('passwordReset'),
  forgotPasswordController
);

// POST /api/auth/reset-password
router.post('/reset-password',
  validatePasswordReset,
  resetPasswordController
);
```

### User Management Routes

```typescript
// GET /api/users/profile
router.get('/profile',
  authenticateJWT,
  getUserProfileController
);

// PUT /api/users/profile
router.put('/profile',
  authenticateJWT,
  validateProfileUpdate,
  updateUserProfileController
);

// GET /api/users/sessions
router.get('/sessions',
  authenticateJWT,
  getUserSessionsController
);

// DELETE /api/users/sessions/:sessionId
router.delete('/sessions/:sessionId',
  authenticateJWT,
  validateSessionId,
  terminateSessionController
);

// PUT /api/users/password
router.put('/password',
  authenticateJWT,
  validatePasswordChange,
  changePasswordController
);

// PUT /api/users/preferences
router.put('/preferences',
  authenticateJWT,
  validatePreferences,
  updatePreferencesController
);
```

## Error Handling

### Authentication Errors

```typescript
export class AuthenticationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class UnauthorizedError extends AuthenticationError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AuthenticationError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN');
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED');
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor() {
    super('Invalid token', 'INVALID_TOKEN');
  }
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

// Example error responses
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "timestamp": "2025-06-07T12:00:00Z",
    "requestId": "req_123456789"
  }
}

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    },
    "timestamp": "2025-06-07T12:00:00Z",
    "requestId": "req_123456790"
  }
}
```

## Testing

### Unit Tests

```typescript
describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let userRepository: MockUserRepository;
  let passwordService: MockPasswordService;
  let tokenService: MockTokenService;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    passwordService = new MockPasswordService();
    tokenService = new MockTokenService();
    authService = new AuthenticationService(
      userRepository,
      passwordService,
      tokenService
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const request = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = await authService.register(request);

      expect(result.user.email).toBe(request.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      userRepository.setExistingEmail('test@example.com');

      const request = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      await expect(authService.register(request))
        .rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const user = createMockUser();
      userRepository.setUser(user);
      passwordService.setPasswordValid(true);

      const result = await authService.login({
        email: user.email.value,
        password: 'ValidPassword123!'
      });

      expect(result.user.id).toBe(user.id.value);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      passwordService.setPasswordValid(false);

      await expect(authService.login({
        email: 'test@example.com',
        password: 'WrongPassword'
      })).rejects.toThrow(InvalidCredentialsError);
    });
  });
});
```

### Integration Tests

```typescript
describe('Authentication API', () => {
  let app: Application;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    app = createTestApp(testDb);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('POST /api/auth/register', () => {
    it('should register user and return tokens', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.user.id).toBe(user.id);
      expect(response.body.accessToken).toBeDefined();
    });
  });
});
```

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Password Configuration
BCRYPT_SALT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Session Configuration
SESSION_TIMEOUT=24h
MAX_SESSIONS_PER_USER=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# Email Configuration (for verification)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@verseforge.com

# Security
CORS_ORIGIN=http://localhost:3000
SECURE_COOKIES=true
SAME_SITE_COOKIES=strict
```

### Database Configuration

```typescript
const AUTH_DATABASE_CONFIG = {
  collections: {
    users: 'users',
    sessions: 'user_sessions',
    refreshTokens: 'refresh_tokens',
    roles: 'roles',
    permissions: 'permissions'
  },
  indexes: [
    { collection: 'users', fields: { email: 1 }, unique: true },
    { collection: 'users', fields: { username: 1 }, unique: true },
    { collection: 'sessions', fields: { userId: 1, isActive: 1 } },
    { collection: 'sessions', fields: { expiresAt: 1 }, expireAfterSeconds: 0 },
    { collection: 'refreshTokens', fields: { tokenFamily: 1 } },
    { collection: 'refreshTokens', fields: { expiresAt: 1 }, expireAfterSeconds: 0 }
  ]
};
```

## Monitoring and Logging

### Security Events

```typescript
interface SecurityEvent {
  type: 'login' | 'logout' | 'register' | 'password_change' | 'failed_login';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
}

class SecurityLogger {
  async logEvent(event: SecurityEvent): Promise<void> {
    await this.auditRepository.save(event);
    
    // Alert on suspicious activity
    if (this.isSuspiciousActivity(event)) {
      await this.alertingService.sendAlert(event);
    }
  }
  
  private isSuspiciousActivity(event: SecurityEvent): boolean {
    return event.type === 'failed_login' && 
           this.getRecentFailedAttempts(event.ipAddress) > 5;
  }
}
```

### Performance Metrics

```typescript
interface AuthMetrics {
  loginAttemptsPerMinute: number;
  successfulLogins: number;
  failedLogins: number;
  tokenRefreshes: number;
  activeSessions: number;
  averageSessionDuration: number;
}

class AuthMetricsCollector {
  async collectMetrics(): Promise<AuthMetrics> {
    return {
      loginAttemptsPerMinute: await this.getLoginAttemptsPerMinute(),
      successfulLogins: await this.getSuccessfulLogins(),
      failedLogins: await this.getFailedLogins(),
      tokenRefreshes: await this.getTokenRefreshes(),
      activeSessions: await this.getActiveSessions(),
      averageSessionDuration: await this.getAverageSessionDuration()
    };
  }
}
```

## Security Best Practices

### Implementation Guidelines

1. **Token Management**
   - Use short-lived access tokens (15 minutes)
   - Implement refresh token rotation
   - Store refresh tokens securely
   - Implement token family tracking

2. **Password Security**
   - Use bcrypt with appropriate salt rounds
   - Implement password strength requirements
   - Store password hashes, never plaintext
   - Implement password history tracking

3. **Session Security**
   - Implement session timeout
   - Track and limit concurrent sessions
   - Implement secure session invalidation
   - Monitor suspicious session activity

4. **Rate Limiting**
   - Implement aggressive rate limiting on auth endpoints
   - Use progressive delays for failed attempts
   - Track attempts by IP and user
   - Implement CAPTCHA for repeated failures

5. **Monitoring**
   - Log all authentication events
   - Monitor for brute force attacks
   - Track unusual login patterns
   - Implement real-time alerting

## Related Documentation

- [User Management Guide](./USER_MANAGEMENT.md)
- [Session Management Guide](./SESSION_MANAGEMENT.md)
- [Security Configuration](./SECURITY_CONFIG.md)
- [API Reference](./API_REFERENCE.md)

---

*Authentication System Version: 1.0.0*  
*Security Last Reviewed: June 7, 2025*
