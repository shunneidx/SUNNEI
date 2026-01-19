import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Railwayが割り当てるポート番号（PORT環境変数）を優先し、なければ3000を使用します
    port: Number(process.env.PORT) || 3000,
    // 0.0.0.0で待ち受けることで、外部ネットワークからの接続を許可します
    host: true,
  },
});