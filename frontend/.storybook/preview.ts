import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '../src/components/providers/ThemeProvider';
import { PluginRegistryProvider } from '../src/components/providers/PluginRegistryProvider';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <PluginRegistryProvider>
        <ThemeProvider theme="light">
          <div className="min-h-screen bg-background text-foreground">
            <Story />
          </div>
        </ThemeProvider>
      </PluginRegistryProvider>
    ),
  ],
};

export default preview;