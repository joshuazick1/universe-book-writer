/**
 * MongoDB Admin Settings Repository Implementation
 */

import { Collection, Db } from 'mongodb';
import { AdminSettings } from '../../core/domain/entities/admin-settings.entity.js';
import { AdminSettingsRepository } from '../../core/interfaces/repositories/admin-settings.repository.js';

interface AdminSettingsDocument {
  _id: string;
  id: string;
  emailVerification: {
    enabled: boolean;
    skipForNewUsers: boolean;
    requireForAccess: boolean;
  };
  userRegistration: {
    enabled: boolean;
    requireApproval: boolean;
    defaultRole: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireStrongPasswords: boolean;
  };
  features: {
    allowGuestAccess: boolean;
    enableCollaboration: boolean;
    enableAIFeatures: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB implementation of AdminSettingsRepository
 */
export class MongoAdminSettingsRepository implements AdminSettingsRepository {
  private collection: Collection<AdminSettingsDocument>;
  private readonly SETTINGS_ID = 'admin-settings-default';

  constructor(db: Db) {
    this.collection = db.collection<AdminSettingsDocument>('admin_settings');
  }

  /**
   * Get admin settings
   */
  async getSettings(): Promise<AdminSettings | null> {
    const doc = await this.collection.findOne({ _id: this.SETTINGS_ID });

    if (!doc) {
      return null;
    }

    return this.documentToEntity(doc);
  }

  /**
   * Save admin settings
   */
  async saveSettings(settings: AdminSettings): Promise<AdminSettings> {
    const doc = this.entityToDocument(settings);

    await this.collection.replaceOne({ _id: this.SETTINGS_ID }, doc, { upsert: true });

    return settings;
  }

  /**
   * Check if settings exist
   */
  async exists(): Promise<boolean> {
    const count = await this.collection.countDocuments({ _id: this.SETTINGS_ID });
    return count > 0;
  }

  /**
   * Convert MongoDB document to AdminSettings entity
   */
  private documentToEntity(doc: AdminSettingsDocument): AdminSettings {
    return new AdminSettings({
      id: doc.id,
      emailVerification: doc.emailVerification,
      userRegistration: doc.userRegistration,
      security: doc.security,
      features: doc.features,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Convert AdminSettings entity to MongoDB document
   */
  private entityToDocument(settings: AdminSettings): AdminSettingsDocument {
    return {
      _id: this.SETTINGS_ID,
      id: settings.id,
      emailVerification: settings.emailVerification,
      userRegistration: settings.userRegistration,
      security: settings.security,
      features: settings.features,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
