/**
 * Authentication controller
 * Handles HTTP requests for authentication-related operations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthUseCase } from '../../application/use-cases/auth.use-case.js';
import { UserUseCase } from '../../application/use-cases/user.use-case.js';
import { SecurityService } from '../../core/interfaces/auth.service.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  session?: {
    id: string;
    deviceId: string;
  };
}

export class AuthController {
  constructor(
    private authUseCase: AuthUseCase,
    private userUseCase: UserUseCase,
    private securityService: SecurityService
  ) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Rate limiting check
      const rateLimitKey = `register:${ipAddress}`;
      if (
        this.securityService.isRateLimited(rateLimitKey, {
          maxAttempts: 5,
          windowMs: 15 * 60 * 1000,
        })
      ) {
        res.status(429).json({
          success: false,
          message: 'Too many registration attempts. Please try again later.',
        });
        return;
      }

      // Input validation
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'All fields are required',
        });
        return;
      }

      if (!this.securityService.validateEmailFormat(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
        return;
      }

      const passwordCheck = this.securityService.checkPasswordStrength(password);
      if (!passwordCheck.isSecure) {
        res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          issues: passwordCheck.issues,
        });
        return;
      }

      const result = await this.authUseCase.register(
        {
          email,
          password,
          firstName,
          lastName,
        },
        ipAddress,
        userAgent
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      // Log security event
      await this.securityService.logSecurityEvent(
        result.data?.user?.id || 'unknown',
        'user_registered',
        {
          ipAddress,
          userAgent,
          email: result.data?.user?.email,
        }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: {
          user: {
            id: result.data?.user?.id,
            email: result.data?.user?.email,
            firstName: result.data?.user?.profile?.firstName,
            lastName: result.data?.user?.profile?.lastName,
            emailVerified: result.data?.user?.emailVerified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe = false } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Rate limiting check
      const rateLimitKey = `login:${ipAddress}`;
      if (
        this.securityService.isRateLimited(rateLimitKey, {
          maxAttempts: 5,
          windowMs: 15 * 60 * 1000,
        })
      ) {
        res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again later.',
        });
        return;
      }

      // Input validation
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      try {
        const result = await this.authUseCase.login({
          email,
          password,
          deviceInfo: {
            ip: ipAddress,
            userAgent,
          },
          rememberMe,
        });

        // Log successful login
        await this.securityService.logSecurityEvent(result.user.id, 'login_success', {
          ipAddress,
          userAgent,
          sessionId: result.sessionId,
        });

        // Set secure HTTP-only cookies
        res.cookie('accessToken', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 30 days or 7 days
        });

        res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.profile?.firstName,
              lastName: result.user.profile?.lastName,
              role: result.user.role,
              emailVerified: result.user.emailVerified,
            },
            session: {
              id: result.sessionId,
              expiresAt: result.accessTokenExpiresAt,
            },
          },
        });
      } catch (loginError) {
        // Log failed login attempt
        await this.securityService.logSecurityEvent('unknown', 'login_failed', {
          ipAddress,
          userAgent,
          email,
          reason: loginError instanceof Error ? loginError.message : 'unknown',
        });

        res.status(401).json({
          success: false,
          message: loginError instanceof Error ? loginError.message : 'Login failed',
        });
        return;
      }
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.session?.id;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (sessionId && userId) {
        await this.authUseCase.logout({
          userId,
          sessionId,
        });
      }

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      // Log logout event
      if (userId) {
        await this.securityService.logSecurityEvent(userId, 'logout', {
          ipAddress,
          userAgent,
          sessionId,
        });
      }

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token not provided',
        });
        return;
      }

      try {
        const result = await this.authUseCase.refreshToken({
          refreshToken,
          deviceInfo: {
            ip: ipAddress,
            userAgent,
          },
        });

        // Set new access token cookie
        res.cookie('accessToken', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.json({
          success: true,
          message: 'Token refreshed successfully',
          data: {
            expiresAt: result.accessTokenExpiresAt,
          },
        });
      } catch (refreshError) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.status(401).json({
          success: false,
          message: refreshError instanceof Error ? refreshError.message : 'Token refresh failed',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Rate limiting check
      const rateLimitKey = `forgot-password:${ipAddress}`;
      if (
        this.securityService.isRateLimited(rateLimitKey, {
          maxAttempts: 3,
          windowMs: 15 * 60 * 1000,
        })
      ) {
        res.status(429).json({
          success: false,
          message: 'Too many password reset attempts. Please try again later.',
        });
        return;
      }

      if (!email || !this.securityService.validateEmailFormat(email)) {
        res.status(400).json({
          success: false,
          message: 'Valid email address is required',
        });
        return;
      }

      await this.authUseCase.forgotPassword({
        email,
        deviceInfo: {
          ip: ipAddress,
          userAgent,
        },
      });

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });

      // Log the attempt
      await this.securityService.logSecurityEvent('unknown', 'password_reset_requested', {
        ipAddress,
        userAgent,
        email,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
        return;
      }

      const passwordCheck = this.securityService.checkPasswordStrength(newPassword);
      if (!passwordCheck.isSecure) {
        res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          issues: passwordCheck.issues,
        });
        return;
      }

      try {
        await this.authUseCase.resetPassword({
          token,
          newPassword,
          deviceInfo: {
            ip: ipAddress,
            userAgent,
          },
        });

        res.json({
          success: true,
          message: 'Password reset successfully',
        });
      } catch (resetError) {
        res.status(400).json({
          success: false,
          message: resetError instanceof Error ? resetError.message : 'Password reset failed',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      const _ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const _userAgent = req.get('User-Agent') || 'unknown';

      // Note: IP address and user agent extracted for potential future use
      void _ipAddress;
      void _userAgent;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
        return;
      }

      try {
        const user = await this.authUseCase.verifyEmail({
          token,
        });

        res.json({
          success: true,
          message: 'Email verified successfully',
          data: {
            user: {
              id: user.id,
              email: user.email,
              emailVerified: user.emailVerified,
            },
          },
        });
      } catch (verifyError) {
        res.status(400).json({
          success: false,
          message: verifyError instanceof Error ? verifyError.message : 'Email verification failed',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const _ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const _userAgent = req.get('User-Agent') || 'unknown';

      // Note: IP address and user agent extracted for potential future use
      void _ipAddress;
      void _userAgent;

      // Rate limiting check
      const rateLimitKey = `resend-verification:${email}`;
      if (
        this.securityService.isRateLimited(rateLimitKey, {
          maxAttempts: 3,
          windowMs: 60 * 60 * 1000,
        })
      ) {
        res.status(429).json({
          success: false,
          message: 'Too many verification requests. Please wait before requesting another.',
        });
        return;
      }

      if (!email || !this.securityService.validateEmailFormat(email)) {
        res.status(400).json({
          success: false,
          message: 'Valid email address is required',
        });
        return;
      }

      await this.authUseCase.resendEmailVerification({
        email,
      });

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message:
          'If an unverified account with that email exists, a new verification email has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const user = await this.userUseCase.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            role: user.role,
            permissions: user.permissions,
            emailVerified: user.emailVerified,
            profile: user.profile,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
