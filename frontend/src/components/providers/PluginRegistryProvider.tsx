/**
 * Plugin Component Registry - Universe Book Writer
 * Manages registration and loading of universe-specific components
 */

import React, { ComponentType, createContext, useContext, useState, ReactNode } from 'react';
import { useTheme } from './ThemeProvider';

/* === TYPES === */

export interface PluginComponent {
  name: string;
  component: ComponentType<any>;
  props?: Record<string, any>;
  universe: string;
  version: string;
}

export interface ComponentRegistration {
  originalName: string;
  pluginName: string;
  component: ComponentType<any>;
  props?: Record<string, any>;
  universe: string;
}

export interface PluginRegistryContextValue {
  registeredComponents: Record<string, ComponentRegistration>;
  registerComponent: (
    originalName: string,
    pluginName: string,
    component: ComponentType<any>,
    universe: string,
    props?: Record<string, any>
  ) => void;
  unregisterComponent: (originalName: string, universe: string) => void;
  getComponent: (name: string, universe?: string) => ComponentType<any> | null;
  getComponentProps: (name: string, universe?: string) => Record<string, any> | null;
  isPluginComponent: (name: string) => boolean;
  getAvailableComponents: (universe?: string) => string[];
}

/* === CONTEXT === */

const PluginRegistryContext = createContext<PluginRegistryContextValue | undefined>(undefined);

/* === PROVIDER COMPONENT === */

interface PluginRegistryProviderProps {
  children: ReactNode;
}

export const PluginRegistryProvider: React.FC<PluginRegistryProviderProps> = ({ children }) => {
  const [registeredComponents, setRegisteredComponents] = useState<
    Record<string, ComponentRegistration>
  >({});
  const { currentTheme } = useTheme();

  /* === COMPONENT MANAGEMENT === */

  const registerComponent = (
    originalName: string,
    pluginName: string,
    component: ComponentType<any>,
    universe: string,
    props: Record<string, any> = {}
  ) => {
    const key = `${originalName}:${universe}`;

    setRegisteredComponents(prev => ({
      ...prev,
      [key]: {
        originalName,
        pluginName,
        component,
        props,
        universe,
      },
    }));

    console.log(`Registered plugin component: ${pluginName} for ${originalName} (${universe})`);
  };

  const unregisterComponent = (originalName: string, universe: string) => {
    const key = `${originalName}:${universe}`;

    setRegisteredComponents(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });

    console.log(`Unregistered plugin component for ${originalName} (${universe})`);
  };

  const getComponent = (name: string, universe?: string): ComponentType<any> | null => {
    // Try to find universe-specific component first
    if (universe) {
      const key = `${name}:${universe}`;
      const registration = registeredComponents[key];
      if (registration) {
        return registration.component;
      }
    }

    // Try to find component for current theme if it matches a universe
    const themeKey = `${name}:${currentTheme}`;
    const themeRegistration = registeredComponents[themeKey];
    if (themeRegistration) {
      return themeRegistration.component;
    }

    // No plugin component found
    return null;
  };

  const getComponentProps = (name: string, universe?: string): Record<string, any> | null => {
    if (universe) {
      const key = `${name}:${universe}`;
      const registration = registeredComponents[key];
      return registration?.props || null;
    }

    const themeKey = `${name}:${currentTheme}`;
    const themeRegistration = registeredComponents[themeKey];
    return themeRegistration?.props || null;
  };

  const isPluginComponent = (name: string): boolean => {
    return Object.keys(registeredComponents).some(key => key.startsWith(`${name}:`));
  };

  const getAvailableComponents = (universe?: string): string[] => {
    const components = Object.values(registeredComponents);

    if (universe) {
      return components.filter(reg => reg.universe === universe).map(reg => reg.originalName);
    }

    // Return all unique component names
    return [...new Set(components.map(reg => reg.originalName))];
  };

  /* === CONTEXT VALUE === */

  const contextValue: PluginRegistryContextValue = {
    registeredComponents,
    registerComponent,
    unregisterComponent,
    getComponent,
    getComponentProps,
    isPluginComponent,
    getAvailableComponents,
  };

  return (
    <PluginRegistryContext.Provider value={contextValue}>{children}</PluginRegistryContext.Provider>
  );
};

/* === HOOK === */

export const usePluginRegistry = (): PluginRegistryContextValue => {
  const context = useContext(PluginRegistryContext);
  if (context === undefined) {
    throw new Error('usePluginRegistry must be used within a PluginRegistryProvider');
  }
  return context;
};

/* === HIGHER-ORDER COMPONENT === */

export interface WithPluginComponentProps {
  universe?: string;
  fallbackComponent?: ComponentType<any>;
  [key: string]: any;
}

export const withPluginComponent = <P extends Record<string, any>>(
  baseComponentName: string,
  defaultComponent: ComponentType<P>
) => {
  return (props: P & WithPluginComponentProps) => {
    const { universe, fallbackComponent, ...restProps } = props;
    const { getComponent, getComponentProps } = usePluginRegistry();

    // Try to get plugin component
    const PluginComponent = getComponent(baseComponentName, universe);
    const pluginProps = getComponentProps(baseComponentName, universe);

    if (PluginComponent) {
      return <PluginComponent {...restProps} {...pluginProps} />;
    }

    // Use fallback or default component
    const FallbackComponent = fallbackComponent || defaultComponent;
    return <FallbackComponent {...(restProps as P)} />;
  };
};
