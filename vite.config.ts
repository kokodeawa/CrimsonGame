
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use absolute path matching the repository name for GitHub Pages
  base: '/CrimsonGame/', 
  build: {
    outDir: 'dist',
  },
});
