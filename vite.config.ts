import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves from /<repo>/; Docker/nginx serves from /
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
    // pages: landing, the 3D journey, the learning reference, the packet lab, the internet atlas
    rollupOptions: { input: { index: 'index.html', app: 'app.html', learn: 'learn.html', lab: 'lab.html', atlas: 'atlas.html' } },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
