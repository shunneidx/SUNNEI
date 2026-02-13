
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
 * 顔部分を保護するためのソフトマスクを作成する（楕円形に改良）
 */
const createFaceMask = (width: number, height: number): HTMLCanvasElement => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) return maskCanvas;

  // 顔の中心位置（少し上にシフト）
  const centerX = width / 2;
  const centerY = height * 0.40;
  
  // 楕円の半径（顔のパーツ：目鼻口に限定し、背景や肩にかからないサイズ）
  const radiusX = width * 0.16; // かなり絞り込む
  const radiusY = height * 0.18;

  mctx.save();
  mctx.translate(centerX, centerY);
  
  // 楕円を描画するためのグラデーション
  const grad = mctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');      // 中心は100%オリジナル
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');  // 表情部分はしっかり保護
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');      // 外側に向けて急激に消える

  mctx.scale(1, radiusY / radiusX); // 縦方向に伸ばして楕円にする
  mctx.fillStyle = grad;
  mctx.beginPath();
  mctx.arc(0, 0, radiusX, 0, Math.PI * 2);
  mctx.fill();
  mctx.restore();
  
  return maskCanvas;
};

/**
 * 緑色(#00FF00)を透過させる透過処理（スピル抑制を強化）
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
    
    // 緑色の強さを判定
    const maxRB = Math.max(r, b);
    
    // 純粋な緑に近い場合のみ透過させる（服への干渉を避けるため閾値を厳格化）
    if (g > maxRB + 45) {
      data[i + 3] = 0; // 完全に透過
    } else if (g > maxRB + 10) {
      // 境界線のソフトエッジ
      const alpha = 1 - (g - (maxRB + 10)) / 35;
      data[i + 3] = 255 * Math.max(0, alpha);
      
      // 服の縁に残る緑色を補正（デスピル）
      data[i + 1] = maxRB;
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

    // 3. フェイス・ヒーリング（タイトな楕円マスクで顔パーツのみ復元）
    if (originalCropped) {
      const originalImg = await loadImage(originalCropped);
      const faceMask = createFaceMask(width, height);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tctx = tempCanvas.getContext('2d');
      if (tctx) {
        // マスクを適用して元の顔パーツのみを描画
        tctx.drawImage(faceMask, 0, 0);
        tctx.globalCompositeOperation = 'source-in';
        tctx.drawImage(originalImg, 0, 0, width, height);
        
        // メインキャンバスに重ねる
        ctx.save();
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
