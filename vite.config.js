import { defineConfig } from 'vite';

// Relative base so the built site works from any folder (GitHub Pages, a USB stick, a school server).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500, assetsInlineLimit: 0 }
});
