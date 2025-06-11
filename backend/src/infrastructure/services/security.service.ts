import * as crypto from 'crypto';
import {
  SecurityService,
  SecurityCheck,
  RateLimitConfig,
  AuditLogEntry,
} from '../../core/interfaces/auth.service.js';
import { User } from '../../core/entities/user.entity.js';

export class CryptoSecurityService implements SecurityService {
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private auditLogs: AuditLogEntry[] = [];
  private suspiciousIPs = new Set<string>();
  private deviceFingerprints = new Map<
    string,
    { userId: string; lastSeen: Date; riskScore: number }
  >();
  private maxAuditLogs = 10000; // Keep last 10k logs in memory

  public detectSuspiciousActivity(
    userId: string,
    ipAddress: string,
    _userAgent: string,
    _action: string
  ): boolean {
    // Check for suspicious IP
    if (this.suspiciousIPs.has(ipAddress)) {
      return true;
    }

    // Check for suspicious patterns
    // Add more sophisticated detection logic here
    return false;
  }

  checkPasswordStrength(password: string): SecurityCheck {
    const issues: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      issues.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Character variety
    if (!/[a-z]/.test(password)) {
      issues.push('Password should contain lowercase letters');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      issues.push('Password should contain uppercase letters');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      issues.push('Password should contain numbers');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
      issues.push('Password should contain special characters');
    } else {
      score += 1;
    }

    // Pattern checks
    if (/(.)\1{2,}/.test(password)) {
      issues.push('Password should not contain repeated characters');
      score -= 1;
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      issues.push('Password should not contain common patterns or words');
      score -= 2;
    }

    const isSecure = issues.length === 0 && score >= 4;

    return {
      isSecure,
      issues,
      score: Math.max(0, Math.min(10, score)),
    };
  }

  validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  isRateLimited(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const key = `${identifier}:${config.windowMs}`;
    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return false;
    }

    if (record.count >= config.maxAttempts) {
      return true;
    }

    record.count++;
    return false;
  }

  generateSecureId(): string {
    return crypto.randomUUID();
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  compareHash(data: string, hash: string): boolean {
    const dataHash = this.hashData(data);
    return crypto.timingSafeEqual(Buffer.from(dataHash, 'hex'), Buffer.from(hash, 'hex'));
  }

  encryptData(data: string, key?: string): { encrypted: string; iv: string } {
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!!';
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  decryptData(encryptedData: string, iv: string, key?: string): string {
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!!';
    const algorithm = 'aes-256-cbc';

    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async checkSuspiciousActivity(
    user: User,
    deviceInfo: Record<string, unknown>
  ): Promise<{
    isSuspicious: boolean;
    reason?: string;
    riskScore: number;
    recommendedAction: 'allow' | 'challenge' | 'block';
  }> {
    let riskScore = 0;
    const reasons: string[] = [];

    // Check for suspicious IP
    if (deviceInfo.ip && this.isSuspiciousIP(deviceInfo.ip as string)) {
      riskScore += 40;
      reasons.push('IP address flagged as suspicious');
    }

    // Check for unusual user agent
    if (deviceInfo.userAgent && this.isUnusualUserAgent(deviceInfo.userAgent as string)) {
      riskScore += 20;
      reasons.push('Unusual user agent detected');
    }

    // Check for unusual location (simplified)
    if (deviceInfo.location && deviceInfo.location !== user.metadata?.lastKnownLocation) {
      riskScore += 15;
      reasons.push('Login from new location');
    }

    // Check for unusual time (if user has consistent patterns)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) {
      riskScore += 10;
      reasons.push('Login at unusual time');
    }

    // Check device fingerprint
    if (deviceInfo.fingerprint) {
      const fingerprintCheck = await this.validateDeviceFingerprint(
        deviceInfo.fingerprint as string,
        user.id
      );
      if (!fingerprintCheck.isKnownDevice) {
        riskScore += 25;
        reasons.push('Unknown device');
      }
      riskScore += fingerprintCheck.riskScore;
    }

    const isSuspicious = riskScore > 30;
    let recommendedAction: 'allow' | 'challenge' | 'block' = 'allow';

    if (riskScore > 70) {
      recommendedAction = 'block';
    } else if (riskScore > 30) {
      recommendedAction = 'challenge';
    }

    return {
      isSuspicious,
      reason: reasons.length > 0 ? reasons.join(', ') : undefined,
      riskScore,
      recommendedAction,
    };
  }

  async logSecurityEvent(
    userId: string,
    eventType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: this.generateSecureId(),
      userId,
      action: eventType,
      resource: 'security',
      timestamp: new Date(),
      ipAddress: (details.ipAddress as string) || 'unknown',
      userAgent: (details.userAgent as string) || 'unknown',
      result: 'success',
      details,
    };

    this.auditLogs.push(logEntry);

    // Keep only recent logs
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
    }

    // In production, you'd save this to a persistent store
    console.log('Security event logged:', logEntry);
  }

  async checkRateLimit(
    identifier: string,
    action: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    const now = Date.now();
    const key = `${identifier}:${action}`;
    const record = this.rateLimitStore.get(key);

    // Default rate limit config per action
    const configs: Record<string, RateLimitConfig> = {
      login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
      registration: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
      password_reset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
      email_verification: { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 attempts per hour
      default: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 attempts per hour
    };

    const config = configs[action] || configs.default;
    if (!config) {
      throw new Error(`Invalid rate limit configuration for action: ${action}`);
    }

    const resetTime = new Date(now + config.windowMs);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime,
      };
    }

    if (record.count >= config.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(record.resetTime),
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: config.maxAttempts - record.count,
      resetTime: new Date(record.resetTime),
    };
  }

  generateSecureRandom(length: number): string {
    const bytes = crypto.randomBytes(Math.ceil(length / 2));
    return bytes.toString('hex').slice(0, length);
  }

  async validateDeviceFingerprint(
    fingerprint: string,
    userId: string
  ): Promise<{
    isValid: boolean;
    isKnownDevice: boolean;
    riskScore: number;
  }> {
    if (!fingerprint || fingerprint.length < 10) {
      return {
        isValid: false,
        isKnownDevice: false,
        riskScore: 50,
      };
    }

    const existing = this.deviceFingerprints.get(fingerprint);

    if (existing) {
      const isKnownDevice = existing.userId === userId;
      const daysSinceLastSeen = (Date.now() - existing.lastSeen.getTime()) / (1000 * 60 * 60 * 24);

      // Update last seen
      existing.lastSeen = new Date();

      let riskScore = existing.riskScore;

      // Increase risk if device hasn't been seen in a long time
      if (daysSinceLastSeen > 30) {
        riskScore += 20;
      } else if (daysSinceLastSeen > 7) {
        riskScore += 10;
      }

      // Different user using same device fingerprint is suspicious
      if (!isKnownDevice) {
        riskScore += 40;
      }

      return {
        isValid: true,
        isKnownDevice,
        riskScore: Math.min(100, riskScore),
      };
    }

    // New device
    this.deviceFingerprints.set(fingerprint, {
      userId,
      lastSeen: new Date(),
      riskScore: 15, // Base risk for new devices
    });

    return {
      isValid: true,
      isKnownDevice: false,
      riskScore: 15,
    };
  }

  clearRateLimit(identifier: string): void {
    // Clear all rate limit records for this identifier
    for (const key of Array.from(this.rateLimitStore.keys())) {
      if (key.startsWith(identifier + ':')) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  markIPAsSuspicious(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);

    // Auto-remove after 24 hours
    setTimeout(
      () => {
        this.suspiciousIPs.delete(ipAddress);
      },
      24 * 60 * 60 * 1000
    );
  }

  unmarkIPAsSuspicious(ipAddress: string): void {
    this.suspiciousIPs.delete(ipAddress);
  }

  isSuspiciousIP(ipAddress: string): boolean {
    return this.suspiciousIPs.has(ipAddress);
  }

  private isUnusualUserAgent(userAgent: string): boolean {
    if (!userAgent || userAgent.length < 10) {
      return true;
    }

    // Check for common bot patterns
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
    ];

    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  // Cleanup method to be called periodically
  cleanup(): void {
    const now = Date.now();

    // Clean expired rate limit records
    for (const [key, record] of Array.from(this.rateLimitStore.entries())) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }

    // Keep only recent audit logs
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > oneWeekAgo);
  }
}

// Export the concrete implementation
export { CryptoSecurityService as SecurityService };
