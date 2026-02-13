
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
 * 顔部分を保護するためのソフトマスクを作成する
 */
const createFaceMask = (width: number, height: number): HTMLCanvasElement => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) return maskCanvas;

  // 顔の位置を想定（3:4の構図において、上から40%付近を中心に円形グラデーション）
  const centerX = width / 2;
  const centerY = height * 0.42;
  const radiusInner = width * 0.15; // 完全に不透明（100%オリジナル）な範囲
  const radiusOuter = width * 0.38; // 徐々にAI画像と馴染ませる範囲

  const grad = mctx.createRadialGradient(centerX, centerY, radiusInner, centerX, centerY, radiusOuter);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  mctx.fillStyle = grad;
  mctx.fillRect(0, 0, width, height);
  return maskCanvas;
};

/**
 * 緑色(#00FF00)を透過させる透過処理
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
    const maxRB = Math.max(r, b);
    if (g > maxRB + 30) {
      data[i + 3] = 0;
    } else if (g > maxRB - 10) {
      // 境界線のソフトエッジ
      data[i + 3] = 255 * (1 - (g - (maxRB - 10)) / 40);
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
      ctx.drawImage(img, 0, 0, width, height);
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

  // 2. AI人物レイヤー（服装変更済み・背景なし）の描画
  if (personImage) {
    const rawImg = await loadImage(personImage);
    const transparentPerson = createTransparentCanvas(rawImg);
    ctx.drawImage(transparentPerson, 0, 0, width, height);

    // 3. フェイス・ヒーリング（元の顔をAI画像の上にソフトに重ねる）
    if (originalCropped) {
      const originalImg = await loadImage(originalCropped);
      const faceMask = createFaceMask(width, height);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tctx = tempCanvas.getContext('2d');
      if (tctx) {
        // マスクを適用して元の顔を描画
        tctx.drawImage(faceMask, 0, 0);
        tctx.globalCompositeOperation = 'source-in';
        tctx.drawImage(originalImg, 0, 0, width, height);
        
        // メインキャンバスに重ねる
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
      }
    }
  }

  // 4. 装飾フレーム
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
