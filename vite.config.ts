
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Fixed base path for GitHub Pages deployment to match repository name
  base: '/CrimsonGame/', 
  build: {
    outDir: 'dist',
  },
});
