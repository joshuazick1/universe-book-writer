/**
 * Mock Services for Testing
 * Provides mock implementations of external services
 */
export class MockEmailService {
    async sendVerificationEmail(user, token) {
        // Mock implementation - no actual email sent
        console.log(`Mock: Verification email sent to ${user.email} with token ${token}`);
        return true;
    }
    async sendPasswordResetEmail(user, token) {
        // Mock implementation - no actual email sent
        console.log(`Mock: Password reset email sent to ${user.email} with token ${token}`);
        return true;
    }
    async sendLoginNotification(user, _deviceInfo) {
        // Mock implementation - no actual email sent
        console.log(`Mock: Login notification sent to ${user.email}`);
        return true;
    }
    async sendWelcomeEmail(user, verificationToken) {
        // Mock implementation - no actual email sent
        console.log(`Mock: Welcome email sent to ${user.email}${verificationToken ? ' with token ' + verificationToken : ''}`);
        return true;
    }
    async sendSecurityAlert(user, alertType, _details) {
        // Mock implementation - no actual email sent
        console.log(`Mock: Security alert sent to ${user.email}: ${alertType}`);
        return true;
    }
    // Add the missing method that tests expect
    async sendEmailVerification(user, token) {
        return this.sendVerificationEmail(user, token);
    }
}
//# sourceMappingURL=mock-services.js.map