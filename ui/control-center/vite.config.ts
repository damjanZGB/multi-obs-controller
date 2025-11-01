import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = searchForWorkspaceRoot(__dirname);
const sharedRoot = path.resolve(__dirname, '../../scripts/shared');

export default defineConfig(() => {
  const allowList = [
    workspaceRoot,
    __dirname,
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src'),
    sharedRoot
  ];

  console.log('[Vite config] workspaceRoot:', workspaceRoot);
  console.log('[Vite config] allow list:', allowList);

  return {
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    fs: {
      strict: false,
      allow: allowList
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@control-center/shared': sharedRoot
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
};
});
