import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: '0.0.0.0',
        fs: {
            allow: [
                path.resolve(__dirname, 'src'),
                path.resolve(__dirname, '../../scripts/shared')
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
            '@control-center/shared': path.resolve(__dirname, '../../scripts/shared')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
});
