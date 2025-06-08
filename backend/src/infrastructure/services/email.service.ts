import nodemailer, { Transporter } from 'nodemailer';
import { EmailService } from '../../core/interfaces/auth.service.js';
import { User } from '../../core/entities/user.entity.js';

/**
 * Email service implementation using Nodemailer
 */
export class NodemailerEmailService implements EmailService {
  private transporter: Transporter;

  constructor(config: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }) {
    this.transporter = nodemailer.createTransport(config);
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user: User, verificationToken?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
        to: user.email,
        subject: 'Welcome to Universe Book Writer',
        html: `
          <h1>Welcome, ${user.profile.firstName || user.username}!</h1>
          <p>Thank you for joining Universe Book Writer. We're excited to have you on board!</p>
          ${
            verificationToken
              ? `
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verify Email</a>
          `
              : ''
          }
          <p>Happy writing!</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(user: User, verificationToken: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
        to: user.email,
        subject: 'Verify Your Email Address',
        html: `
          <h1>Email Verification</h1>
          <p>Hello ${user.profile.firstName || user.username},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send email verification:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset</h1>
          <p>Hello ${user.profile.firstName || user.username},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send login notification
   */
  async sendLoginNotification(user: User, deviceInfo: Record<string, unknown>): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
        to: user.email,
        subject: 'New Login to Your Account',
        html: `
          <h1>New Login Detected</h1>
          <p>Hello ${user.profile.firstName || user.username},</p>
          <p>We detected a new login to your account:</p>
          <ul>
            <li>Device: ${deviceInfo.device || 'Unknown'}</li>
            <li>Browser: ${deviceInfo.browser || 'Unknown'}</li>
            <li>Location: ${deviceInfo.location || 'Unknown'}</li>
            <li>IP Address: ${deviceInfo.ip || 'Unknown'}</li>
            <li>Time: ${new Date().toLocaleString()}</li>
          </ul>
          <p>If this wasn't you, please secure your account immediately.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send login notification:', error);
      return false;
    }
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    user: User,
    alertType: string,
    details: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@universe-book-writer.com',
        to: user.email,
        subject: `Security Alert: ${alertType}`,
        html: `
          <h1>Security Alert</h1>
          <p>Hello ${user.profile.firstName || user.username},</p>
          <p>We detected security-related activity on your account:</p>
          <p><strong>Alert Type:</strong> ${alertType}</p>
          <p><strong>Details:</strong></p>
          <ul>
            ${Object.entries(details)
              .map(([key, value]) => `<li>${key}: ${value}</li>`)
              .join('')}
          </ul>
          <p>If you didn't perform this action, please contact support immediately.</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send security alert:', error);
      return false;
    }
  }
}
