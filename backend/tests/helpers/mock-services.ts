/**
 * Mock Services for Testing
 * Provides mock implementations of external services
 */

import type { User } from '../../src/core/entities/user.entity.js';

export class MockEmailService {
  async sendVerificationEmail(user: User, token: string): Promise<boolean> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Verification email sent to ${user.email} with token ${token}`);
    return true;
  }

  async sendPasswordResetEmail(user: User, token: string): Promise<boolean> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Password reset email sent to ${user.email} with token ${token}`);
    return true;
  }

  async sendLoginNotification(user: User, _deviceInfo: Record<string, unknown>): Promise<boolean> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Login notification sent to ${user.email}`);
    return true;
  }

  async sendWelcomeEmail(user: User, verificationToken?: string): Promise<boolean> {
    // Mock implementation - no actual email sent
    console.log(
      `Mock: Welcome email sent to ${user.email}${verificationToken ? ' with token ' + verificationToken : ''}`
    );
    return true;
  }

  async sendSecurityAlert(
    user: User,
    alertType: string,
    _details: Record<string, unknown>
  ): Promise<boolean> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Security alert sent to ${user.email}: ${alertType}`);
    return true;
  }

  // Add the missing method that tests expect
  async sendEmailVerification(user: User, token: string): Promise<boolean> {
    return this.sendVerificationEmail(user, token);
  }
}
