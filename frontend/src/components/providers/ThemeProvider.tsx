/**
 * Theme Provider - VerseForge
 * Manages theme state and provides context for components
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { useAuth } from '../../auth/hooks';

/* === TYPES === */

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts?: {
    primary?: string;
    secondary?: string;
  };
  layout?: {
    borderRadius?: string;
    padding?: string;
    margin?: string;
  };
  animations?: {
    transition?: string;
    hover?: string;
    active?: string;
  };
}

export interface ThemeContextValue {
  currentTheme: string;
  themeConfig: ThemeConfig | null;
  availableThemes: string[];
  setTheme: (themeName: string) => void;
  registerTheme: (themeName: string, config: ThemeConfig) => void;
  unregisterTheme: (themeName: string) => void;
  isPluginTheme: (themeName: string) => boolean;
}

/* === DEFAULT THEMES === */

export const DEFAULT_THEMES: Record<string, ThemeConfig> = {
  default: {
    name: 'Default',
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#d946ef',
      background: '#fafafa',
      surface: '#f4f4f5',
      text: '#18181b',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#d946ef',
      background: '#18181b',
      surface: '#27272a',
      text: '#fafafa',
    },
  },
};

/* === CONTEXT === */

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/* === PROVIDER COMPONENT === */

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'default',
}) => {
  const [currentTheme, setCurrentTheme] = useState<string>(defaultTheme);
  const [registeredThemes, setRegisteredThemes] =
    useState<Record<string, ThemeConfig>>(DEFAULT_THEMES);
  const [pluginThemes, setPluginThemes] = useState<Set<string>>(new Set());

  /* === AUTH & USER PROFILE INTEGRATION === */

  const { user, updateProfile, isAuthenticated } = useAuth();

  /* === THEME MANAGEMENT === */

  const setTheme = useCallback(async (themeName: string) => {
    if (registeredThemes[themeName]) {
      setCurrentTheme(themeName);

      // Save to localStorage for immediate persistence
      localStorage.setItem('universe-theme', themeName);

      // If user is authenticated, also save to user profile
      if (isAuthenticated && user) {
        try {
          await updateProfile({
            preferences: {
              ...user.preferences,
              theme: themeName as any, // Temporary type assertion - TODO: Fix type alignment
            },
          });
          logger.info(`Theme preference saved to user profile: ${themeName}`);
        } catch (error) {
          logger.warn('Failed to save theme preference to user profile, falling back to localStorage', error);
        }
      }

      logger.info(`Theme changed to: ${themeName}`);
    } else {
      logger.warn(`Theme "${themeName}" is not registered`);
    }
  }, [registeredThemes, isAuthenticated, user, updateProfile]);

  const registerTheme = useCallback((themeName: string, config: ThemeConfig) => {
    setRegisteredThemes(prev => {
      // Check if theme is already registered to avoid unnecessary updates
      if (prev[themeName]) {
        return prev;
      }
      return {
        ...prev,
        [themeName]: config,
      };
    });
    setPluginThemes(prev => {
      // Check if already in plugin themes to avoid unnecessary updates
      if (prev.has(themeName)) {
        return prev;
      }
      return new Set([...prev, themeName]);
    });
  }, []);

  const unregisterTheme = useCallback((themeName: string) => {
    if (pluginThemes.has(themeName)) {
      setRegisteredThemes(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [themeName]: _removed, ...rest } = prev;
        return rest;
      });
      setPluginThemes(prev => {
        const newSet = new Set(prev);
        newSet.delete(themeName);
        return newSet;
      });

      // If current theme is being unregistered, switch to default
      if (currentTheme === themeName) {
        setTheme('default');
      }
    }
  }, [pluginThemes, currentTheme, setTheme]);

  const isPluginTheme = useCallback((themeName: string) => pluginThemes.has(themeName), [pluginThemes]);

  /* === CSS VARIABLE APPLICATION === */

  const applyThemeVariables = (config: ThemeConfig) => {
    const root = document.documentElement;

    // Apply color variables
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-universe-${key}`, value);
    });

    // Apply font variables
    if (config.fonts) {
      if (config.fonts.primary) {
        root.style.setProperty('--font-primary', config.fonts.primary);
      }
      if (config.fonts.secondary) {
        root.style.setProperty('--font-secondary', config.fonts.secondary);
      }
    }

    // Apply layout variables
    if (config.layout) {
      if (config.layout.borderRadius) {
        root.style.setProperty('--border-radius-universe', config.layout.borderRadius);
      }
      if (config.layout.padding) {
        root.style.setProperty('--padding-universe', config.layout.padding);
      }
      if (config.layout.margin) {
        root.style.setProperty('--margin-universe', config.layout.margin);
      }
    }

    // Apply animation variables
    if (config.animations) {
      if (config.animations.transition) {
        root.style.setProperty('--transition-universe', config.animations.transition);
      }
    }

    // Set theme attribute for CSS selectors
    root.setAttribute('data-universe-theme', currentTheme);
  };

  /* === EFFECTS === */

  // Initialize theme from user profile or localStorage
  useEffect(() => {
    // Priority: 1. User profile theme, 2. localStorage, 3. default
    let themeToSet = 'default';

    if (isAuthenticated && user?.preferences?.theme) {
      // User is logged in and has a theme preference
      themeToSet = user.preferences.theme;
      logger.info(`Loading theme from user profile: ${themeToSet}`);
    } else {
      // Fall back to localStorage
      const savedTheme = localStorage.getItem('universe-theme');
      if (savedTheme && registeredThemes[savedTheme]) {
        themeToSet = savedTheme;
        logger.info(`Loading theme from localStorage: ${themeToSet}`);
      }
    }

    if (registeredThemes[themeToSet]) {
      setCurrentTheme(themeToSet);
    }
  }, [isAuthenticated, user?.preferences?.theme, registeredThemes]);

  // Apply theme variables when current theme changes
  useEffect(() => {
    const config = registeredThemes[currentTheme];
    if (config) {
      applyThemeVariables(config);
    }
  }, [currentTheme, registeredThemes]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (currentTheme === 'default' || currentTheme === 'dark') {
        setTheme(e.matches ? 'dark' : 'default').catch(error => {
          logger.warn('Failed to update theme based on system preference', error);
        });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme, setTheme]);

  /* === CONTEXT VALUE === */

  const contextValue: ThemeContextValue = {
    currentTheme,
    themeConfig: registeredThemes[currentTheme] || null,
    availableThemes: Object.keys(registeredThemes),
    setTheme,
    registerTheme,
    unregisterTheme,
    isPluginTheme,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

/* === HOOK === */

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
