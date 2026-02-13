
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

interface Point {
  x: number;
  y: number;
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
 * 画像内の「瞳」の推定中心座標を検出する
 * 3:4の構文において、瞳は顔の特定エリアにある最も暗い領域であることを利用する
 */
const findEyeCenters = (img: HTMLImageElement, width: number, height: number): { left: Point, right: Point } => {
  const canvas = document.createElement('canvas');
  canvas.width = 200; // 高速化のため縮小して解析
  canvas.height = 266;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { left: { x: width * 0.4, y: height * 0.4 }, right: { x: width * 0.6, y: height * 0.4 } };

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const findDarkestInRect = (rx: number, ry: number, rw: number, rh: number): Point => {
    let minBrightness = Infinity;
    let bestX = rx + rw / 2;
    let bestY = ry + rh / 2;

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const idx = (y * canvas.width + x) * 4;
        const brightness = data[idx] + data[idx + 1] + data[idx + 2];
        if (brightness < minBrightness) {
          minBrightness = brightness;
          bestX = x;
          bestY = y;
        }
      }
    }
    return { 
      x: (bestX / canvas.width) * width, 
      y: (bestY / canvas.height) * height 
    };
  };

  // 3:4比率における一般的な目の位置範囲 (左目: 30-48%, 33-45% | 右目: 52-70%, 33-45%)
  const leftEye = findDarkestInRect(canvas.width * 0.3, canvas.height * 0.33, canvas.width * 0.18, canvas.height * 0.12);
  const rightEye = findDarkestInRect(canvas.width * 0.52, canvas.height * 0.33, canvas.width * 0.18, canvas.height * 0.12);

  return { left: leftEye, right: rightEye };
};

/**
 * 検出された瞳の位置に基づき、動的なパーツマスクを作成する
 */
const createDynamicPartsMask = (width: number, height: number, leftEye: Point, rightEye: Point): HTMLCanvasElement => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) return maskCanvas;

  const drawPart = (pt: Point, rx: number, ry: number) => {
    mctx.save();
    mctx.translate(pt.x, pt.y);
    const grad = mctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    mctx.scale(1, ry / rx);
    mctx.fillStyle = grad;
    mctx.beginPath();
    mctx.arc(0, 0, rx, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  };

  // 瞳の距離からスケールを計算し、マスクサイズを調整
  const eyeDist = Math.sqrt((rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2);
  const eyeRadiusX = eyeDist * 0.25;
  const eyeRadiusY = eyeRadiusX * 0.6;

  drawPart(leftEye, eyeRadiusX, eyeRadiusY);
  drawPart(rightEye, eyeRadiusX, eyeRadiusY);

  // 口の位置を瞳の中間から推定
  const mouthPos = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2 + (eyeDist * 0.75)
  };
  drawPart(mouthPos, eyeDist * 0.35, eyeDist * 0.2);

  return maskCanvas;
};

/**
 * 緑色(#00FF00)を透過させる処理
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

  // 1. 背景描画
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

  // 2. AI人物レイヤーの描画 (生成画像を「正」とする)
  if (personImage && originalCropped) {
    const personImg = await loadImage(personImage);
    const originalImg = await loadImage(originalCropped);
    
    // AI画像（生成後）の瞳の位置を特定（これが「正」の座標になる）
    const aiEyes = findEyeCenters(personImg, width, height);
    // オリジナル画像の瞳の位置を特定
    const origEyes = findEyeCenters(originalImg, width, height);
    
    // AI画像を先に描画
    const transparentPerson = createTransparentCanvas(personImg);
    ctx.drawImage(transparentPerson, 0, 0, width, height);

    // 3. 逆転アライメント・ヒーリング
    // AIの瞳位置に合わせて、オリジナル画像をアフィン変換（平行移動・拡大縮小・回転）して重ねる
    const partsMask = createDynamicPartsMask(width, height, aiEyes.left, aiEyes.right);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tctx = tempCanvas.getContext('2d');
    
    if (tctx) {
      tctx.drawImage(partsMask, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      
      // オリジナルをAIの顔に吸着させるための行列計算
      const aiMid = { x: (aiEyes.left.x + aiEyes.right.x) / 2, y: (aiEyes.left.y + aiEyes.right.y) / 2 };
      const origMid = { x: (origEyes.left.x + origEyes.right.x) / 2, y: (origEyes.left.y + origEyes.right.y) / 2 };
      
      const aiDist = Math.sqrt((aiEyes.right.x - aiEyes.left.x) ** 2 + (aiEyes.right.y - aiEyes.left.y) ** 2);
      const origDist = Math.sqrt((origEyes.right.x - origEyes.left.x) ** 2 + (origEyes.right.y - origEyes.left.y) ** 2);
      const scale = aiDist / origDist;
      
      const aiAngle = Math.atan2(aiEyes.right.y - aiEyes.left.y, aiEyes.right.x - aiEyes.left.x);
      const origAngle = Math.atan2(origEyes.right.y - origEyes.left.y, origEyes.right.x - origEyes.left.x);
      const rotation = aiAngle - origAngle;

      tctx.save();
      // AIの瞳の中心に原点を移動
      tctx.translate(aiMid.x, aiMid.y);
      tctx.rotate(rotation);
      tctx.scale(scale, scale);
      // オリジナルの瞳の中心を原点に合わせて描画
      tctx.drawImage(originalImg, -origMid.x, -origMid.y, width, height);
      tctx.restore();
      
      ctx.drawImage(tempCanvas, 0, 0);
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
