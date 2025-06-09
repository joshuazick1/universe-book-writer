/**
 * Provider Components Exports
 */

export { ThemeProvider, useTheme, DEFAULT_THEMES } from './ThemeProvider';
export type { ThemeConfig, ThemeContextValue } from './ThemeProvider';

export {
  PluginRegistryProvider,
  usePluginRegistry,
  withPluginComponent,
} from './PluginRegistryProvider';
export type {
  PluginComponent,
  ComponentRegistration,
  PluginRegistryContextValue,
  WithPluginComponentProps,
} from './PluginRegistryProvider';
