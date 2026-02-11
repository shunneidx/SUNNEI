
import React, { useEffect, useRef, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { EditAction } from '../types';

interface PhotoCanvasProps {
  originalCropped: string | null; // 背景用
  personImage: string | null;      // 人物レイヤー（背景白）
  appliedBg: EditAction | null;
  isLoading: boolean;
  loadingMessage: string;
}

const PhotoCanvas: React.FC<PhotoCanvasProps> = ({ 
  originalCropped, 
  personImage,
  appliedBg,
  isLoading, 
  loadingMessage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transparentPerson, setTransparentPerson] = useState<string | null>(null);

  // ホワイトキー（白を透過）処理
  useEffect(() => {
    if (!personImage) {
      setTransparentPerson(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 白(#FFFFFF)に近いピクセルを透過させる
      const threshold = 240; // 240以上を白とみなす
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        if (r > threshold && g > threshold && b > threshold) {
          data[i+3] = 0; // Alphaを0に
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setTransparentPerson(canvas.toDataURL());
    };
    img.src = personImage;
  }, [personImage]);

  if (!originalCropped) return null;

  const getBgStyle = (): React.CSSProperties => {
    if (!appliedBg) return {};
    
    switch (appliedBg) {
      case EditAction.REMOVE_BG_BLUE:
        return { background: 'radial-gradient(circle at center, #ffffff 0%, #bfdbfe 100%)' };
      case EditAction.REMOVE_BG_GRAY:
        return { background: 'radial-gradient(circle at center, #ffffff 0%, #d1d5db 100%)' };
      case EditAction.REMOVE_BG_PINK:
        return { background: 'radial-gradient(circle at center, #ffffff 0%, #fbcfe8 100%)' };
      case EditAction.REMOVE_BG_YELLOW:
        return { background: 'radial-gradient(circle at center, #ffffff 0%, #fef3c7 100%)' };
      case EditAction.REMOVE_BG_PURPLE:
        return { background: 'radial-gradient(circle at center, #ffffff 0%, #e9d5ff 100%)' };
      case EditAction.REMOVE_BG_WHITE:
        return { background: '#ffffff' };
      default:
        return {};
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div 
        className="aspect-[5/6] overflow-hidden relative select-none rounded-lg border-4 border-white shadow-xl bg-gray-200"
        style={getBgStyle()}
      >
        {isLoading && <LoadingSpinner message={loadingMessage} />}
        
        {/* 背景レイヤー: 
            背景色が選択されていない時は元の写真、選択されている時は非表示（CSSの背景色が見えるように） */}
        {!appliedBg && (
          <img 
            src={originalCropped} 
            alt="Original Background" 
            className="absolute inset-0 w-full h-full object-cover block opacity-100"
          />
        )}

        {/* 人物レイヤー: 透過済みの人物を表示 */}
        {transparentPerson && (
          <img 
            src={transparentPerson} 
            alt="Person Layer" 
            className="absolute inset-0 w-full h-full object-cover block z-10"
            draggable={false}
          />
        )}

        {/* 枠線シミュレーション */}
        {!isLoading && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="absolute inset-[3%] border border-dashed border-white/30 rounded-sm"></div>
            <div className="absolute inset-0 shadow-[inset_0_0_0_12px_rgba(0,0,0,0.1)]"></div>
          </div>
        )}
      </div>
      
      {!isLoading && (
        <div className="mt-4 text-center">
          <p className="text-[12px] text-gray-400 font-sans tracking-wider font-bold">
            ※背景変更は即座に反映されます
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoCanvas;
