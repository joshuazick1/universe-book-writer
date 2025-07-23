/**
 * Jest Configuration for Frontend Testing
 * Note: This file exists for Vite build compatibility
 * Actual testing is handled by the root Jest configuration
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
