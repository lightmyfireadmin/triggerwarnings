/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import path from 'path';

function generateManifest() {
  const manifest = readJsonFile('manifest.json');
  const pkg = readJsonFile('package.json');
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    svelte(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ['package.json', 'manifest.json'],
    }),
  ],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@background': path.resolve(__dirname, './src/background'),
      '@content': path.resolve(__dirname, './src/content'),
      '@core': path.resolve(__dirname, './src/core'),
      '@database': path.resolve(__dirname, './src/database'),
      '@manifest': path.resolve(__dirname, './src/manifest'),
      '@moderation': path.resolve(__dirname, './src/moderation'),
      '@options': path.resolve(__dirname, './src/options'),
      '@popup': path.resolve(__dirname, './src/popup'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});
