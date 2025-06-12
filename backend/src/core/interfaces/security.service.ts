/**
 * Security Service Interface
 * Handles security operations and threat detection
 */

export interface SecurityCheckResult {
  isSuspicious: boolean;
  recommendedAction: 'allow' | 'block' | 'challenge';
  riskScore: number;
  reason: string;
}

export interface SecurityService {
  /**
   * Generate secure random string/ID
   */
  generateSecureRandom(): string;

  /**
   * Check for suspicious activity
   */
  checkSuspiciousActivity(userId: string, deviceInfo: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  }): Promise<SecurityCheckResult>;

  /**
   * Log security events
   */
  logSecurityEvent(
    userId: string,
    eventType: string,
    details: Record<string, unknown>
  ): Promise<void>;

  /**
   * Validate security token
   */
  validateSecurityToken(token: string): Promise<boolean>;
}
