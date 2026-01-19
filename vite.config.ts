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
  preview: {
    // Railwayでの本番公開時（npm run preview）に使用される設定
    port: Number(process.env.PORT) || 3000,
    host: true,
    // Railwayのポート割り当てに完全に対応させるため、明示的に指定
    allowedHosts: true
  }
});