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

/**
 * 画像を読み込むプロミス
 */
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
 * 白背景を透過させる処理を行ったCanvasを取得
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

  // 白(#FFFFFF)に近いピクセルを透過させる（ホワイトキー）
  const threshold = 240;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * 遺影写真のメイン描画ロジック
 * プレビュー(小)と保存用(大)で共通化し、見た目の差異をなくす
 */
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

  // キャンバスサイズの初期化
  canvas.width = width;
  canvas.height = height;

  // 1. 背景の描画
  if (!appliedBg) {
    // 背景色が未指定の場合、元の写真を表示（CSSのobject-coverを再現）
    if (originalCropped) {
      const img = await loadImage(originalCropped);
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = width;
        drawH = width / imgRatio;
        drawX = 0;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
  } else {
    // 背景色が指定されている場合
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX ** 2 + centerY ** 2); // 隅まで届く半径

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
    // 人物レイヤーも枠いっぱいに描画（object-coverと同じ比率で）
    ctx.drawImage(transparentCanvas, 0, 0, width, height);
  }

  // 3. 装飾（内側のシャドウと額縁ライン）
  // プレビューと保存画像の両方に重厚感を与える
  
  // 内側のシャドウ
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = isHighRes ? 100 : 15;
  // Fix: shadowInset is not a standard property of CanvasRenderingContext2D. 
  // We remove it to fix the TypeScript error. The effect is substituted by the strokeRect below.
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 40 : 10;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();

  // 額縁のセーフエリア（点線）- プレビュー時のみ薄く表示、保存時は基本なし
  if (!isHighRes) {
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    const margin = width * 0.03;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
  }
};