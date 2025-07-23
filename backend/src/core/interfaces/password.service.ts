/**
 * Password Service Interface
 * Handles password hashing, verification, and validation
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordService {
  /**
   * Hash a plain text password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify a password against its hash
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Validate password strength and requirements
   */
  validatePassword(password: string): Promise<PasswordValidationResult>;
}
