import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// `./assets/…` resolves correctly when the worker serves dist/ at the site root
// (`/`, `/demo.html`, `/embed.html`) and can be rewritten with asWebviewUri.
// No `crossorigin`, so the webview CSP does not need a second origin.
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        embed: resolve(__dirname, 'embed.html'),
      },
    },
  },
  plugins: [
    {
      name: 'strip-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '');
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
