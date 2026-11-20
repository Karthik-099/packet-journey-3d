import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves from /<repo>/; Docker/nginx serves from /
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
    // three pages: landing, the 3D journey, the learning reference
    rollupOptions: { input: { index: 'index.html', app: 'app.html', learn: 'learn.html' } },
  },
  test: { environment: 'node' },
});
