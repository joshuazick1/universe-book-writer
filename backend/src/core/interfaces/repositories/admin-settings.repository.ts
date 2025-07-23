/**
 * Admin Settings Repository Interface
 */

import { AdminSettings } from '../../domain/entities/admin-settings.entity.js';

export interface AdminSettingsRepository {
  /**
   * Get admin settings
   */
  getSettings(): Promise<AdminSettings | null>;

  /**
   * Save admin settings
   */
  saveSettings(settings: AdminSettings): Promise<AdminSettings>;

  /**
   * Check if settings exist
   */
  exists(): Promise<boolean>;
}
