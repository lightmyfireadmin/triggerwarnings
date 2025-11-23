import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import path from 'path';

const target = process.env.TARGET_BROWSER || 'chrome';

function generateManifest() {
  const manifest = readJsonFile('src/manifest/manifest.json');
  const pkg = readJsonFile('package.json');

  const manifestResult = {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };

  if (process.env.TARGET_BROWSER === 'firefox') {
    // Firefox uses background.scripts instead of background.service_worker in MV3
    if (manifestResult.background && manifestResult.background.service_worker) {
      manifestResult.background = {
        scripts: [manifestResult.background.service_worker],
        type: 'module',
      };
    }

    // Firefox requires browser_specific_settings for ID
    manifestResult.browser_specific_settings = {
      gecko: {
        id: 'trigger-warnings@example.com',
        strict_min_version: '109.0',
      },
    };
  }

  return manifestResult;
}

export default defineConfig({
  plugins: [
    svelte(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ['package.json', 'src/manifest/manifest.json'],
      browser: target,
      disableAutoLaunch: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@content': path.resolve(__dirname, './src/content'),
      '@background': path.resolve(__dirname, './src/background'),
      '@popup': path.resolve(__dirname, './src/popup'),
      '@options': path.resolve(__dirname, './src/options'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
