import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PasswordService } from '../../core/interfaces/auth.service.js';
import { User } from '../../core/entities/user.entity.js';

export class BcryptPasswordService implements PasswordService {
  private readonly saltRounds = 12;
  private readonly minPasswordLength = 8;
  private readonly maxPasswordLength = 128;
  async hashPassword(password: string): Promise<string> {
    if (!this.isValidPassword(password)) {
      throw new Error('Password does not meet security requirements');
    }

    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Log error but don't expose details to avoid information leakage
      return false;
    }
  }

  generateSecurePassword(length: number = 16): string {
    if (length < this.minPasswordLength || length > this.maxPasswordLength) {
      throw new Error(
        `Password length must be between ${this.minPasswordLength} and ${this.maxPasswordLength} characters`
      );
    }

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowercase + uppercase + numbers + symbols;

    // Ensure at least one character from each category
    let password = '';
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += symbols[crypto.randomInt(symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.minPasswordLength) {
      feedback.push(`Password must be at least ${this.minPasswordLength} characters long`);
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain uppercase letters');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain numbers');
    }

    if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain special characters');
    }

    // Common patterns check
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Password should not contain repeated characters');
      score -= 1;
    }

    if (/123|abc|qwe|asd|zxc/i.test(password)) {
      feedback.push('Password should not contain common patterns');
      score -= 1;
    }

    // Dictionary words check (basic)
    const commonWords = ['password', 'admin', 'user', 'login', 'welcome'];
    if (commonWords.some(word => password.toLowerCase().includes(word))) {
      feedback.push('Password should not contain common words');
      score -= 2;
    }

    const isValid = feedback.length === 0 && score >= 4;

    if (isValid && feedback.length === 0) {
      if (score >= 6) {
        feedback.push('Strong password');
      } else if (score >= 4) {
        feedback.push('Good password');
      }
    }

    return {
      isValid,
      score: Math.max(0, Math.min(10, score)),
      feedback,
    };
  }
  async validatePassword(
    password: string,
    user?: Partial<User>
  ): Promise<{
    isValid: boolean;
    score: number;
    feedback: string[];
    errors: string[];
  }> {
    const validation = this.validatePasswordStrength(password);
    const errors: string[] = [];

    // Check if password is compromised
    try {
      const isCompromised = await this.isPasswordCompromised(password);
      if (isCompromised) {
        errors.push('Password has been found in data breaches and should not be used');
        validation.isValid = false;
      }
    } catch (error) {
      // If compromise check fails, log but don't fail validation
      console.warn('Password compromise check failed:', error);
    }

    // User-specific checks
    if (user) {
      const userInfo = [
        user.email?.toLowerCase(),
        user.profile?.firstName?.toLowerCase(),
        user.profile?.lastName?.toLowerCase(),
        user.username?.toLowerCase(),
      ].filter(Boolean);

      const passwordLower = password.toLowerCase();
      const containsUserInfo = userInfo.some(
        info => info && (passwordLower.includes(info) || info.includes(passwordLower))
      );

      if (containsUserInfo) {
        errors.push('Password should not contain personal information');
        validation.isValid = false;
      }
    }
    return {
      ...validation,
      errors,
    };
  }

  async isPasswordCompromised(password: string): Promise<boolean> {
    // Simple implementation - in production, you'd use HaveIBeenPwned API
    // For now, check against common passwords
    const commonPasswords = [
      'password',
      '123456',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
      'qwerty',
      'abc123',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  private isValidPassword(password: string): boolean {
    return (
      Boolean(password) &&
      password.length >= this.minPasswordLength &&
      password.length <= this.maxPasswordLength
    );
  }
}

export { BcryptPasswordService as PasswordService };
