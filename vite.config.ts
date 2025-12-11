
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative path for greater flexibility on hosting environments (like GitHub Pages subdirs)
  base: './', 
  build: {
    outDir: 'dist',
  },
});
