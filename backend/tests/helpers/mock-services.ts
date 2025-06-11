/**
 * Mock Services for Testing
 * Provides mock implementations of external services
 */

export class MockEmailService {
  async sendVerificationEmail(user: any, token: string): Promise<void> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Verification email sent to ${user.email} with token ${token}`);
  }

  async sendPasswordResetEmail(user: any, token: string): Promise<void> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Password reset email sent to ${user.email} with token ${token}`);
  }

  async sendLoginNotification(user: any, deviceInfo: any): Promise<void> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Login notification sent to ${user.email}`);
  }

  async sendSecurityAlert(user: any, alertType: string, details: any): Promise<void> {
    // Mock implementation - no actual email sent
    console.log(`Mock: Security alert sent to ${user.email}: ${alertType}`);
  }

  // Add the missing method that tests expect
  async sendEmailVerification(user: any, token: string): Promise<void> {
    return this.sendVerificationEmail(user, token);
  }
}
