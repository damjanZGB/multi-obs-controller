import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const uiRoot = __dirname;
const sharedRoot = path.resolve(uiRoot, '../../scripts/shared');

export default defineConfig({
  root: uiRoot,
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    fs: {
      strict: false,
      allow: [
        searchForWorkspaceRoot(uiRoot),
        uiRoot,
        path.resolve(uiRoot, 'index.html'),
        path.resolve(uiRoot, 'src'),
        sharedRoot
      ]
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
});
