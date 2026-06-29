import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 500 * 1024, // 500KB，跳过音频
        globIgnores: ['**/audio/*'], // 不预缓存音频文件
        runtimeCaching: [{
          urlPattern: /\.(?:mp3|m4a)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'audio-cache', expiration: { maxEntries: 20 } },
        }],
      },
      manifest: {
        name: '英语重启号 - 新概念英语智能练习',
        short_name: 'NCE',
        description: '新概念英语智能练习系统',
        theme_color: '#FFFBF5',
        background_color: '#FFFBF5',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173, open: true, watch: { ignored: ['**/data/**', '**/backend/**'] } },
});
