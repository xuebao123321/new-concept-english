import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
// import { VitePWA } from 'vite-plugin-pwa'; // 暂禁用排查部署问题

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // VitePWA({ ... }), // 暂时禁用，排查缓存问题
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    watch: { ignored: ['**/data/**', '**/backend/**'] },
  },
});
