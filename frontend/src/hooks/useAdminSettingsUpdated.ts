/**
 * Admin Settings Hook
 * Manages admin panel settings and configurations
 */

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';

export interface AdminSettings {
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
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
  };
  updatedAt: string;
  updatedBy: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<{
        success: boolean;
        data: AdminSettings;
      }>(`${API_BASE_URL}/admin/settings`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setSettings(response.data.data);
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch (err) {
      logger.error('Error fetching admin settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');

      // Fallback to mock data in development
      if (import.meta.env.DEV) {
        logger.warn('Falling back to mock settings data for development');
        const mockSettings: AdminSettings = {
          id: 'default',
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
            maxLoginAttempts: 5,
            lockoutDuration: 15,
            sessionTimeout: 60,
          },
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
        };
        setSettings(mockSettings);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<AdminSettings>) => {
      setSaving(true);
      setError(null);

      try {
        const response = await axios.put<{
          success: boolean;
          data: AdminSettings;
        }>(`${API_BASE_URL}/admin/settings`, newSettings, { withCredentials: true });

        if (response.data.success) {
          setSettings(response.data.data);
          return true;
        } else {
          throw new Error('Failed to update settings');
        }
      } catch (err) {
        logger.error('Error updating admin settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to update settings');

        // In development, simulate success
        if (import.meta.env.DEV && settings) {
          logger.warn('Simulating settings update for development');
          setSettings({
            ...settings,
            ...newSettings,
            updatedAt: new Date().toISOString(),
          });
          return true;
        }

        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings]
  );

  const resetToDefaults = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await axios.post<{
        success: boolean;
        data: AdminSettings;
      }>(`${API_BASE_URL}/admin/settings/reset`, {}, { withCredentials: true });

      if (response.data.success) {
        setSettings(response.data.data);
        return true;
      } else {
        throw new Error('Failed to reset settings');
      }
    } catch (err) {
      logger.error('Error resetting admin settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    saving,
    updateSettings,
    resetToDefaults,
    refetch: fetchSettings,
  };
};
