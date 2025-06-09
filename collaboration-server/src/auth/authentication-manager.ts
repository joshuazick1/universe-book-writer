/**
 * Authentication Manager
 * Handles WebSocket authentication, session management, and authorization
 */

import { EventEmitter } from 'node:events';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import type { AuthConfig } from '../config/collaboration.config.js';

export interface UserSession {
  /** User identifier */
  userId: string;
  /** Session identifier */
  sessionId: string;
  /** User metadata */
  userData: {
    username?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: unknown;
  };
  /** Session creation time */
  createdAt: Date;
  /** Last activity time */
  lastActivity: Date;
  /** Session expiration time */
  expiresAt: Date;
}

export interface AuthResult {
  /** Authentication success status */
  success: boolean;
  /** User session if successful */
  session?: UserSession;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface JWTPayload {
  /** User ID */
  userId: string;
  /** Session ID */
  sessionId: string;
  /** User data */
  userData: UserSession['userData'];
  /** Token issued at */
  iat: number;
  /** Token expiration */
  exp: number;
}

export class AuthenticationManager extends EventEmitter {
  private sessions = new Map<string, UserSession>();
  private userSessions = new Map<string, Set<string>>();
  private config: AuthConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: AuthConfig) {
    super();
    this.config = config;

    if (config.enableSessions) {
      this.startSessionCleanup();
    }
  }

  /**
   * Authenticate a WebSocket connection
   */
  public async authenticate(socket: Socket): Promise<AuthResult> {
    if (!this.config.enabled) {
      // Authentication disabled - create anonymous session
      return this.createAnonymousSession(socket);
    }

    try {
      // Extract token from handshake
      const token = this.extractToken(socket);
      if (!token) {
        return { success: false, error: 'No authentication token provided' };
      }

      // Verify JWT token
      const payload = this.verifyToken(token);
      if (!payload) {
        return { success: false, error: 'Invalid authentication token' };
      }

      // Check if session exists and is valid
      const existingSession = this.sessions.get(payload.sessionId);
      if (existingSession && this.isSessionValid(existingSession)) {
        // Update last activity
        existingSession.lastActivity = new Date();
        this.emit('sessionRefreshed', existingSession);
        return { success: true, session: existingSession };
      }

      // Create new session
      const session = this.createSession(payload);
      return { success: true, session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.emit('authenticationFailed', socket.id, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create a new user session
   */
  public createSession(payload: JWTPayload): UserSession {
    const session: UserSession = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      userData: payload.userData,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(payload.exp * 1000),
    };

    // Store session
    this.sessions.set(session.sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(session.userId)) {
      this.userSessions.set(session.userId, new Set());
    }
    this.userSessions.get(session.userId)!.add(session.sessionId);

    this.emit('sessionCreated', session);
    return session;
  }

  /**
   * Create anonymous session for unauthenticated connections
   */
  private createAnonymousSession(socket: Socket): AuthResult {
    const anonymousUserId = `anonymous-${socket.id}`;
    const sessionId = `session-${socket.id}`;

    const session: UserSession = {
      userId: anonymousUserId,
      sessionId,
      userData: {
        username: 'Anonymous',
        roles: ['anonymous'],
        permissions: ['read'],
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout),
    };

    this.sessions.set(session.sessionId, session);
    this.emit('anonymousSessionCreated', session);

    return { success: true, session };
  }

  /**
   * Invalidate a session
   */
  public invalidateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Remove from user sessions
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Remove session
    this.sessions.delete(sessionId);
    this.emit('sessionInvalidated', session);

    return true;
  }

  /**
   * Invalidate all sessions for a user
   */
  public invalidateUserSessions(userId: string): number {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      return 0;
    }

    const sessionCount = userSessions.size;

    // Remove all sessions
    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.sessions.delete(sessionId);
        this.emit('sessionInvalidated', session);
      }
    }

    this.userSessions.delete(userId);
    return sessionCount;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): UserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && this.isSessionValid(session)) {
      return session;
    }
    return undefined;
  }

  /**
   * Get all sessions for a user
   */
  public getUserSessions(userId: string): UserSession[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    const sessions: UserSession[] = [];
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && this.isSessionValid(session)) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Update session activity
   */
  public updateSessionActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !this.isSessionValid(session)) {
      return false;
    }

    session.lastActivity = new Date();
    return true;
  }

  /**
   * Check if user has permission
   */
  public hasPermission(sessionId: string, permission: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const permissions = (session.userData.permissions as string[]) || [];
    return permissions.includes(permission) || permissions.includes('*');
  }

  /**
   * Check if user has role
   */
  public hasRole(sessionId: string, role: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const roles = (session.userData.roles as string[]) || [];
    return roles.includes(role) || roles.includes('admin');
  }

  /**
   * Generate JWT token for a session
   */
  public generateToken(session: UserSession): string {
    const payload: JWTPayload = {
      userId: session.userId,
      sessionId: session.sessionId,
      userData: session.userData,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(session.expiresAt.getTime() / 1000),
    };

    return jwt.sign(payload, this.config.jwtSecret);
  }

  /**
   * Extract token from socket handshake
   */
  private extractToken(socket: Socket): string | null {
    // Try different token sources
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    const queryToken = socket.handshake.query.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    // Try auth object
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return authToken;
    }

    return null;
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as JWTPayload;

      // Validate payload structure
      if (!payload.userId || !payload.sessionId || !payload.userData) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Check if session is valid
   */
  private isSessionValid(session: UserSession): boolean {
    const now = new Date();
    return session.expiresAt > now;
  }

  /**
   * Start session cleanup process
   */
  private startSessionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];

      // Find expired sessions
      for (const [sessionId, session] of this.sessions) {
        if (session.expiresAt <= now) {
          expiredSessions.push(sessionId);
        }
      }

      // Remove expired sessions
      for (const sessionId of expiredSessions) {
        const session = this.sessions.get(sessionId);
        if (session) {
          // Remove from user sessions
          const userSessions = this.userSessions.get(session.userId);
          if (userSessions) {
            userSessions.delete(sessionId);
            if (userSessions.size === 0) {
              this.userSessions.delete(session.userId);
            }
          }

          this.sessions.delete(sessionId);
          this.emit('sessionExpired', session);
        }
      }

      if (expiredSessions.length > 0) {
        console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Get authentication statistics
   */
  public getStats() {
    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => this.isSessionValid(s)).length,
      expiredSessions: Array.from(this.sessions.values()).filter(s => !this.isSessionValid(s))
        .length,
    };
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.sessions.clear();
    this.userSessions.clear();
    this.removeAllListeners();
  }
}
