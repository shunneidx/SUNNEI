
import { EditAction } from '../types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  originalCropped: string | null;
  personImage: string | null;
  appliedBg: EditAction | null;
  width: number;
  height: number;
  isHighRes?: boolean;
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * 鮮やかな緑色(#00FF00)を透過させ、かつ境界線の緑の反射（スピル）を除去する
 * シニアエンジニア推奨のデスピル（色被り除去）アルゴリズムを採用
 */
const createTransparentCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 1. 透明度の決定 (Chroma Keying)
    // 緑成分が赤(R)と青(B)の最大値よりどれだけ大きいかを算出
    const maxRB = Math.max(r, b);
    const greenDifference = g - maxRB;
    
    if (greenDifference > 30) {
      // 背景色（純粋な緑）とみなせる領域は完全に透明にする
      data[i + 3] = 0;
    } 
    else if (greenDifference > -15) {
      // 境界線エリア（髪の毛の端や衣服の輪郭など）
      // 30から-15までの範囲で、緑の強さに応じて徐々に透明度を下げる
      const alphaFactor = (greenDifference + 15) / 45; // 0 to 1
      const alpha = 255 * (1 - Math.pow(alphaFactor, 1.5));
      data[i + 3] = Math.max(0, Math.min(255, alpha));
      
      // 2. デスピル処理 (Despill)
      // 境界線に残る「緑色の光（カラースピル）」を抑制する
      // 緑(G)の値を、赤(R)と青(B)の平均値または最大値に抑えることで、緑の縁取りを無彩色（グレー）化または本来の色に補正
      if (g > maxRB) {
        // 緑成分をRとBのバランスに合わせて抑制
        const avgRB = (r + b) / 2;
        data[i + 1] = (maxRB + avgRB) / 2; 
      }
      
      // 3. エッジ補正
      // 半透明なピクセルが「白っぽく」浮くのを防ぐため、明度をわずかに調整
      if (data[i + 3] < 200) {
        data[i] = Math.max(0, data[i] - 5);
        data[i + 2] = Math.max(0, data[i + 2] - 5);
      }
    } else {
      // 人物内部の領域
      // 背景の緑色が反射（スピル）している場合のみ補正
      if (g > maxRB * 1.05) {
        data[i + 1] = maxRB;
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const drawMemorialPhoto = async ({
  canvas,
  originalCropped,
  personImage,
  appliedBg,
  width,
  height,
  isHighRes = false
}: RenderOptions) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;

  // 1. 背景の描画
  if (!appliedBg) {
    if (originalCropped) {
      const img = await loadImage(originalCropped);
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let dW, dH, dX, dY;
      if (imgRatio > canvasRatio) {
        dW = height * imgRatio; dH = height; dX = (width - dW) / 2; dY = 0;
      } else {
        dW = width; dH = width / imgRatio; dX = 0; dY = (height - dH) / 2;
      }
      ctx.drawImage(img, dX, dY, dW, dH);
    }
  } else {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX ** 2 + centerY ** 2);

    if (appliedBg === EditAction.REMOVE_BG_WHITE) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#ffffff');
      switch (appliedBg) {
        case EditAction.REMOVE_BG_BLUE: gradient.addColorStop(1, '#bfdbfe'); break;
        case EditAction.REMOVE_BG_GRAY: gradient.addColorStop(1, '#d1d5db'); break;
        case EditAction.REMOVE_BG_PINK: gradient.addColorStop(1, '#fbcfe8'); break;
        case EditAction.REMOVE_BG_YELLOW: gradient.addColorStop(1, '#fef3c7'); break;
        case EditAction.REMOVE_BG_PURPLE: gradient.addColorStop(1, '#e9d5ff'); break;
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // 2. 人物レイヤーの描画 (クロマキー + 高精度デスピル済み)
  if (personImage) {
    const rawImg = await loadImage(personImage);
    const transparentCanvas = createTransparentCanvas(rawImg);
    
    // 描画品質の向上
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(transparentCanvas, 0, 0, width, height);
  }

  // 3. 装飾（遺影としての仕上げ）
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = isHighRes ? 80 : 12;
  ctx.strokeStyle = 'rgba(0,0,0,0.03)';
  ctx.lineWidth = isHighRes ? 30 : 8;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();

  if (!isHighRes) {
    // プレビュー用のガイドライン
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    const margin = width * 0.03;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
  }
};
