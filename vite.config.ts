import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 全体のprocess.envを注入すると肥大化してクラッシュするため、API_KEYのみを安全に注入します
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    host: true,
  },
  preview: {
    port: Number(process.env.PORT) || 3000,
    host: true,
    allowedHosts: true
  }
});