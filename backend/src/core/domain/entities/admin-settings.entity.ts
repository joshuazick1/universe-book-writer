/**
 * Admin Settings Domain Entity
 */

export interface AdminSettingsData {
  readonly id: string;
  readonly emailVerification: {
    readonly enabled: boolean;
    readonly skipForNewUsers: boolean;
    readonly requireForAccess: boolean;
  };
  readonly userRegistration: {
    readonly enabled: boolean;
    readonly requireApproval: boolean;
    readonly defaultRole: string;
  };
  readonly security: {
    readonly sessionTimeout: number;
    readonly maxLoginAttempts: number;
    readonly lockoutDuration: number;
    readonly requireStrongPasswords: boolean;
  };
  readonly features: {
    readonly allowGuestAccess: boolean;
    readonly enableCollaboration: boolean;
    readonly enableAIFeatures: boolean;
  };
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Admin Settings entity
 */
export class AdminSettings {
  readonly id: string;
  readonly emailVerification: {
    readonly enabled: boolean;
    readonly skipForNewUsers: boolean;
    readonly requireForAccess: boolean;
  };
  readonly userRegistration: {
    readonly enabled: boolean;
    readonly requireApproval: boolean;
    readonly defaultRole: string;
  };
  readonly security: {
    readonly sessionTimeout: number;
    readonly maxLoginAttempts: number;
    readonly lockoutDuration: number;
    readonly requireStrongPasswords: boolean;
  };
  readonly features: {
    readonly allowGuestAccess: boolean;
    readonly enableCollaboration: boolean;
    readonly enableAIFeatures: boolean;
  };
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: AdminSettingsData) {
    this.id = data.id;
    this.emailVerification = data.emailVerification;
    this.userRegistration = data.userRegistration;
    this.security = data.security;
    this.features = data.features;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Create default admin settings
   */
  static createDefault(): AdminSettings {
    return new AdminSettings({
      id: 'admin-settings-default',
      emailVerification: {
        enabled: true,
        skipForNewUsers: false,
        requireForAccess: true,
      },
      userRegistration: {
        enabled: true,
        requireApproval: false,
        defaultRole: 'user',
      },
      security: {
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        requireStrongPasswords: true,
      },
      features: {
        allowGuestAccess: false,
        enableCollaboration: true,
        enableAIFeatures: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update admin settings
   */
  update(updates: Partial<AdminSettingsData>): AdminSettings {
    return new AdminSettings({
      ...this,
      ...updates,
      id: this.id, // Preserve ID
      createdAt: this.createdAt, // Preserve creation date
      updatedAt: new Date(), // Update timestamp
    });
  }

  /**
   * Check if email verification is enabled
   */
  isEmailVerificationEnabled(): boolean {
    return this.emailVerification.enabled;
  }

  /**
   * Check if email verification should be skipped for new users
   */
  shouldSkipEmailVerificationForNewUsers(): boolean {
    return this.emailVerification.skipForNewUsers || !this.emailVerification.enabled;
  }

  /**
   * Check if email verification is required for access
   */
  isEmailVerificationRequiredForAccess(): boolean {
    return this.emailVerification.requireForAccess && this.emailVerification.enabled;
  }

  /**
   * Check if user registration is enabled
   */
  isUserRegistrationEnabled(): boolean {
    return this.userRegistration.enabled;
  }

  /**
   * Check if new user registration requires approval
   */
  doesUserRegistrationRequireApproval(): boolean {
    return this.userRegistration.requireApproval;
  }

  /**
   * Get default role for new users
   */
  getDefaultUserRole(): string {
    return this.userRegistration.defaultRole;
  }

  /**
   * Convert to plain object for JSON serialization
   */
  toJSON(): AdminSettingsData {
    return {
      id: this.id,
      emailVerification: this.emailVerification,
      userRegistration: this.userRegistration,
      security: this.security,
      features: this.features,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
