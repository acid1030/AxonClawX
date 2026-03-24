// AxonClaw - Vite Configuration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '',
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },

  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2200,
  },
});
