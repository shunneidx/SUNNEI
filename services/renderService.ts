
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
 * 2つの画像の位置ズレを検出し、最適なオフセット(dx, dy)を返す
 * 高解像度での計算を避けるため、内部でダウンサンプリングして高速処理する
 */
const findAlignmentOffset = (original: HTMLImageElement, person: HTMLImageElement): { dx: number, dy: number } => {
  const searchSize = 400; // 計算用の基準サイズ
  const canvas1 = document.createElement('canvas');
  const canvas2 = document.createElement('canvas');
  canvas1.width = canvas2.width = searchSize;
  canvas1.height = canvas2.height = searchSize * (4/3);
  
  const ctx1 = canvas1.getContext('2d');
  const ctx2 = canvas2.getContext('2d');
  if (!ctx1 || !ctx2) return { dx: 0, dy: 0 };

  ctx1.drawImage(original, 0, 0, canvas1.width, canvas1.height);
  ctx2.drawImage(person, 0, 0, canvas2.width, canvas2.height);

  const data1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height).data;
  const data2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height).data;

  // 顔の中心付近（鼻のあたり）のテンプレートを取得 (100x100)
  const templateW = 100;
  const templateH = 100;
  const startX = Math.floor(canvas1.width / 2 - templateW / 2);
  const startY = Math.floor(canvas1.height * 0.4 - templateH / 2);

  let bestDX = 0;
  let bestDY = 0;
  let minDiff = Infinity;

  const searchRange = 25; // ±25ピクセルの範囲で探索

  for (let dy = -searchRange; dy <= searchRange; dy++) {
    for (let dx = -searchRange; dx <= searchRange; dx++) {
      let diff = 0;
      for (let ty = 0; ty < templateH; ty += 4) { // 高速化のため4ピクセル飛ばし
        for (let tx = 0; tx < templateW; tx += 4) {
          const idx1 = ((startY + ty) * canvas1.width + (startX + tx)) * 4;
          const idx2 = ((startY + ty + dy) * canvas2.width + (startX + tx + dx)) * 4;
          
          if (idx2 < 0 || idx2 >= data2.length) continue;

          // 輝度の差分を計算
          const gray1 = (data1[idx1] + data1[idx1 + 1] + data1[idx1 + 2]) / 3;
          const gray2 = (data2[idx2] + data2[idx2 + 1] + data2[idx2 + 2]) / 3;
          diff += Math.abs(gray1 - gray2);
        }
      }
      if (diff < minDiff) {
        minDiff = diff;
        bestDX = dx;
        bestDY = dy;
      }
    }
  }

  // searchSizeから元のスケールに変換
  const scale = original.width / searchSize;
  return { dx: bestDX * scale, dy: bestDY * scale };
};

/**
 * 目と口をピンポイントで守るマイクロマスクを作成する
 */
const createMicroPartsMask = (width: number, height: number): HTMLCanvasElement => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) return maskCanvas;

  const drawPart = (cx: number, cy: number, rx: number, ry: number) => {
    mctx.save();
    mctx.translate(cx, cy);
    const grad = mctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    mctx.scale(1, ry / rx);
    mctx.fillStyle = grad;
    mctx.beginPath();
    mctx.arc(0, 0, rx, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  };

  // 目と口のおおよその位置（日本人の平均的な比率）
  // 実際にはもっと精密な位置合わせをオフセット側で行う
  drawPart(width * 0.40, height * 0.38, width * 0.08, height * 0.05); // 左目
  drawPart(width * 0.60, height * 0.38, width * 0.08, height * 0.05); // 右目
  drawPart(width * 0.50, height * 0.53, width * 0.12, height * 0.06); // 口

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
    
    if (g > maxRB + 45) {
      data[i + 3] = 0; 
    } else if (g > maxRB + 10) {
      const alpha = 1 - (g - (maxRB + 10)) / 35;
      data[i + 3] = 255 * Math.max(0, alpha);
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

  // 2. AI人物レイヤーの描画
  if (personImage && originalCropped) {
    const personImg = await loadImage(personImage);
    const originalImg = await loadImage(originalCropped);
    
    // 位置ズレを検出
    const { dx, dy } = findAlignmentOffset(originalImg, personImg);
    
    // AI画像をまず描画（背景なし）
    const transparentPerson = createTransparentCanvas(personImg);
    ctx.drawImage(transparentPerson, 0, 0, width, height);

    // 3. フェイス・ヒーリング（パーツ単位の保護合成）
    // オフセットを適用したマスクを使って、オリジナルの目鼻立ちを重ねる
    const partsMask = createMicroPartsMask(width, height);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tctx = tempCanvas.getContext('2d');
    
    if (tctx) {
      // マスクを描画
      tctx.drawImage(partsMask, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      
      // オリジナル画像を、検出したズレ(dx, dy)の逆方向にスライドさせて描画
      // これにより、AIが描いた顔の位置と完璧に一致させる
      tctx.drawImage(originalImg, -dx, -dy, width, height);
      
      // メインに重ねる
      ctx.save();
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
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
