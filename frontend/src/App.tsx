/**
 * Main App Component - Universe Book Writer
 * Root component with theme and plugin providers
 */

import React, { useState } from 'react';
import { ThemeProvider, PluginRegistryProvider } from './components/providers';
import { AnimationShowcase } from './components/animation';

/**
 * Main Application Component
 */
const App: React.FC = () => {
  const [showAnimationShowcase, setShowAnimationShowcase] = useState(false);

  if (showAnimationShowcase) {
    return (
      <ThemeProvider defaultTheme="default">
        <PluginRegistryProvider>
          <div className="min-h-screen bg-universe-background text-universe-text">
            <div className="fixed top-4 left-4 z-50">
              <button
                onClick={() => setShowAnimationShowcase(false)}
                className="bg-neutral-800 text-white px-3 py-2 rounded-md text-sm hover:bg-neutral-700 transition-colors"
              >
                ← Back to Main
              </button>
            </div>
            <AnimationShowcase />
          </div>
        </PluginRegistryProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="default">
      <PluginRegistryProvider>
        <div className="min-h-screen bg-universe-background text-universe-text">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center space-y-6">
              <h1 className="text-4xl font-bold mb-4 text-universe-primary">
                Universe Book Writer
              </h1>
              <p className="text-xl text-universe-text-secondary">
                Phase 1 Foundation - Animation Framework Complete
              </p>
              <p className="text-sm text-universe-text-secondary">
                User interface coming in Phase 1.5
              </p>

              <div className="mt-8">
                <button
                  onClick={() => setShowAnimationShowcase(true)}
                  className="bg-universe-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  View Animation Showcase
                </button>
              </div>

              <div className="mt-4 text-xs text-universe-text-secondary">
                <p>For plugin developers: Animation framework showcase available above</p>
              </div>
            </div>
          </div>
        </div>
      </PluginRegistryProvider>
    </ThemeProvider>
  );
};

export default App;
