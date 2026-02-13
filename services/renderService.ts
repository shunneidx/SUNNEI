
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
 * 鮮やかな緑色(#00FF00)を透過させるクロマキー処理
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

  // クロマキー判定: 緑成分が赤と青よりも有意に大きく、かつ一定以上の強さである場合
  // AI生成の #00FF00 は非常に純粋なので、このロジックで白い服を完璧に保護できる
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 緑色が支配的かどうかの判定 (RとBに対して緑が強い、かつ絶対的な緑の強さ)
    if (g > 100 && g > r * 1.3 && g > b * 1.3) {
      // 完全に透明にする
      data[i + 3] = 0;
    } 
    // アンチエイリアス（エッジ）部分のセミ透過処理
    else if (g > 80 && g > r * 1.1 && g > b * 1.1) {
      const alpha = 255 - ((g - Math.max(r, b)) * 2);
      data[i + 3] = Math.max(0, Math.min(255, alpha));
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
      // object-coverの再現
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

  // 2. 人物レイヤーの描画
  if (personImage) {
    const rawImg = await loadImage(personImage);
    const transparentCanvas = createTransparentCanvas(rawImg);
    // アスペクト比が統一されているため、そのまま描画して歪まない
    ctx.drawImage(transparentCanvas, 0, 0, width, height);
  }

  // 3. 装飾
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = isHighRes ? 100 : 15;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 40 : 10;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();

  if (!isHighRes) {
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    const margin = width * 0.03;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
  }
};
