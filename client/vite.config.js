import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative paths so assets load correctly from file:// in Electron
  base: './',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
