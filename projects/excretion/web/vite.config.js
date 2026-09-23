import { defineConfig } from 'vite';
import { qaCapture } from './scripts/qa-capture-plugin.js';

export default defineConfig({
  base: './',
  plugins: [qaCapture()],
  server: { port: 5174, strictPort: false },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
