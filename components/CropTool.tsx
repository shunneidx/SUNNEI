
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CropToolProps {
  imageSrc: string;
  onConfirm: (croppedImage: string) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ASPECT_RATIO = 5 / 6; // Width / Height (遺影標準：四つ切りサイズ相当)

const CropTool: React.FC<CropToolProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  const onImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const { width, height, naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width, height, naturalWidth, naturalHeight });

      // 初期切り抜き枠の計算（画面中央に5:6で配置）
      let cropWidth = width * 0.7;
      let cropHeight = cropWidth / ASPECT_RATIO;

      if (cropHeight > height * 0.8) {
        cropHeight = height * 0.8;
        cropWidth = cropHeight * ASPECT_RATIO;
      }
      
      setCrop({
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
      });
    }
  };

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent | MouseEvent).clientX, y: (e as React.MouseEvent | MouseEvent).clientY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, action: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getClientCoordinates(e);
    setDragStart(coords);
    setStartCrop({ ...crop });
    
    if (action === 'drag') setIsDragging(true);
    if (action === 'resize') setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging && !isResizing) return;
    if (!containerRef.current || !imageDimensions.width) return;

    e.preventDefault();
    const coords = getClientCoordinates(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    
    if (isDragging) {
      let newX = startCrop.x + dx;
      let newY = startCrop.y + dy;

      newX = Math.max(0, Math.min(newX, imageDimensions.width - crop.width));
      newY = Math.max(0, Math.min(newY, imageDimensions.height - crop.height));

      setCrop(c => ({ ...c, x: newX, y: newY }));
    }

    if (isResizing) {
      let newWidth = startCrop.width + dx;
      let newHeight = newWidth / ASPECT_RATIO;

      // 最小サイズ制限
      if (newWidth < 100) {
          newWidth = 100;
          newHeight = newWidth / ASPECT_RATIO;
      }

      // 境界制限
      if (startCrop.x + newWidth > imageDimensions.width) {
        newWidth = imageDimensions.width - startCrop.x;
        newHeight = newWidth / ASPECT_RATIO;
      }
      if (startCrop.y + newHeight > imageDimensions.height) {
        newHeight = imageDimensions.height - startCrop.y;
        newWidth = newHeight * ASPECT_RATIO;
      }

      setCrop(c => ({ ...c, width: newWidth, height: newHeight }));
    }
  }, [isDragging, isResizing, dragStart, startCrop, imageDimensions, crop.width, crop.height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  /**
   * 枠通りの精密な切り抜きを実行
   */
  const executeCrop = () => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const { naturalWidth, naturalHeight } = img;
    const containerW = imageDimensions.width;
    const containerH = imageDimensions.height;

    // object-contain における実際の表示サイズとオフセットを算出
    const imageAspect = naturalWidth / naturalHeight;
    const containerAspect = containerW / containerH;

    let visualW, visualH, offsetX, offsetY;
    if (imageAspect > containerAspect) {
      visualW = containerW;
      visualH = containerW / imageAspect;
      offsetX = 0;
      offsetY = (containerH - visualH) / 2;
    } else {
      visualH = containerH;
      visualW = containerH * imageAspect;
      offsetY = 0;
      offsetX = (containerW - visualW) / 2;
    }

    // 表示サイズからオリジナルサイズへの倍率
    const scale = naturalWidth / visualW;

    // キャンバスの作成（クロップ枠を実寸スケールに変換）
    const canvas = document.createElement('canvas');
    canvas.width = crop.width * scale;
    canvas.height = crop.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. キャンバスの中心へ移動
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // 2. 指定された角度でコンテキストを回転
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. 画像の描画位置を計算
    // UI上では画像は「自身の中心」で回転している
    const visualImageCenterX = offsetX + visualW / 2;
    const visualImageCenterY = offsetY + visualH / 2;
    const cropCenterX = crop.x + crop.width / 2;
    const cropCenterY = crop.y + crop.height / 2;

    // クロップ中心から見た画像中心の相対距離（実寸スケール）
    const dx = (visualImageCenterX - cropCenterX) * scale;
    const dy = (visualImageCenterY - cropCenterY) * scale;

    // 4. 画像を描画
    ctx.drawImage(
      img,
      dx - naturalWidth / 2,
      dy - naturalHeight / 2,
      naturalWidth,
      naturalHeight
    );

    onConfirm(canvas.toDataURL('image/png'));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 animate-fade-in font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center border border-gray-100 relative">
        
        {/* Progress Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md">1</div>
            <span className="text-[12px] mt-1 text-blue-600 font-bold">範囲・傾き調整</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-200"></div>
          <div className="flex flex-col items-center opacity-30">
            <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold text-base">2</div>
            <span className="text-[12px] mt-1 text-gray-500 font-bold">画像加工</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold font-serif text-gray-800">写真の範囲と傾きを調整</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            水平を出し、点線の範囲内（セーフエリア）に<br/>故人様のお顔が収まるよう調整してください。
          </p>
        </div>

        {/* Edit Viewport */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden select-none bg-gray-900 rounded-xl shadow-2xl touch-none ring-4 ring-gray-100"
          style={{ width: '100%', height: '45vh', maxWidth: '100%' }}
        >
          {/* Paper Grid Overlay - Visible during interaction */}
          <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 bg-grid-paper ${isRotating || rotation !== 0 ? 'opacity-30' : 'opacity-0'}`}></div>

          <img
            ref={imageRef}
            src={imageSrc}
            onLoad={onImageLoad}
            alt="Crop Source"
            className="max-w-full max-h-full object-contain block opacity-50"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              width: '100%',
              height: '100%'
            }}
            draggable={false}
          />
          
          <div
            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] cursor-move z-20"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.width,
              height: crop.height,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            onTouchStart={(e) => handleMouseDown(e, 'drag')}
          >
            {/* Guide Grid within the box */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
            </div>

            {/* Safe Area Warning */}
            <div className="absolute inset-[4%] border border-dashed border-blue-400/80 pointer-events-none flex items-center justify-center">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-bold shadow-lg whitespace-nowrap tracking-widest uppercase">
                額縁セーフエリア
              </div>
            </div>

            {/* Resize Handle */}
            <div
              className="absolute -bottom-5 -right-5 w-12 h-12 bg-blue-600 cursor-nwse-resize flex items-center justify-center hover:bg-blue-500 transition-all rounded-full border-4 border-white shadow-xl active:scale-90"
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
              onTouchStart={(e) => handleMouseDown(e, 'resize')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tilt Adjustment Slider */}
        <div className="w-full max-w-lg mt-8 mb-4 space-y-5 px-2">
          <div className="flex items-center justify-between text-sm font-bold text-gray-700">
            <span className="flex items-center gap-2 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              傾きの微調整
            </span>
            <div 
              onClick={() => setRotation(0)}
              className="group flex items-center gap-1.5 cursor-pointer select-none"
            >
              <span className={`transition-colors font-mono tracking-tight text-sm px-2 py-0.5 rounded ${rotation !== 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-100'}`}>
                {rotation > 0 ? '+' : ''}{rotation.toFixed(1)}°
              </span>
              <span className="text-[11px] text-gray-300 font-bold group-hover:text-blue-400 transition-colors uppercase">Reset</span>
            </div>
          </div>
          
          <div className="relative flex items-center gap-4">
            <span className="text-[10px] text-gray-300 font-bold font-mono">-15°</span>
            <div className="relative flex-1 group">
              {/* Slider Track Decor */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-3 bg-gray-300 pointer-events-none"></div>
              
              <input 
                type="range" 
                min="-15" 
                max="15" 
                step="0.1" 
                value={rotation}
                onChange={(e) => setRotation(parseFloat(e.target.value))}
                onMouseDown={() => setIsRotating(true)}
                onMouseUp={() => setIsRotating(false)}
                onTouchStart={() => setIsRotating(true)}
                onTouchEnd={() => setIsRotating(false)}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <span className="text-[10px] text-gray-300 font-bold font-mono">+15°</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-lg">
           <button
            onClick={onCancel}
            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm active:scale-95"
          >
            写真を変更する
          </button>
          <button
            onClick={executeCrop}
            className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg text-sm flex items-center justify-center gap-3 active:scale-95 hover:shadow-blue-200 hover:shadow-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            この範囲で加工へ進む
          </button>
        </div>
      </div>

      <style>{`
        .bg-grid-paper {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 4px solid white;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          margin-top: -10px;
          transition: transform 0.1s ease;
        }

        input[type=range]:active::-webkit-slider-thumb {
          transform: scale(1.1);
          background: #1d4ed8;
        }

        input[type=range]::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 4px solid white;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
      `}</style>
    </div>
  );
};

export default CropTool;
