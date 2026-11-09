import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        react: ['react', 'react-dom'],
                        motion: ['motion/react'],
                        supabase: ['@supabase/supabase-js'],
                    },
                },
            },
        },
        server: {
            hmr: process.env.DISABLE_HMR !== 'true',
        },
    };
});
