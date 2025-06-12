/**
 * Email Service Interface
 * Handles sending various types of emails
 */

export interface EmailService {
  /**
   * Send email verification email
   */
  sendEmailVerification(email: string, token: string): Promise<void>;

  /**
   * Send verification email (alias for sendEmailVerification)
   */
  sendVerificationEmail(email: string, token: string): Promise<void>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(email: string, token: string): Promise<void>;

  /**
   * Send login notification email
   */
  sendLoginNotification(email: string, deviceInfo: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  }): Promise<void>;

  /**
   * Send security alert email
   */
  sendSecurityAlert(email: string, alertType: string, details: Record<string, unknown>): Promise<void>;
}
