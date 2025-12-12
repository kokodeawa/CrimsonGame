
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path to ensure it works on any repo name (fixes black screen)
  base: './', 
  build: {
    outDir: 'dist',
  },
});
