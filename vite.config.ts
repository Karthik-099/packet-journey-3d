import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves from /<repo>/; Docker/nginx serves from /
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
    // four pages: landing, the 3D journey, the learning reference, the packet lab
    rollupOptions: { input: { index: 'index.html', app: 'app.html', learn: 'learn.html', lab: 'lab.html' } },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
