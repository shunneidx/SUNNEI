
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

const ASPECT_RATIO = 5 / 6; // Width / Height for 3000x3600

const CropTool: React.FC<CropToolProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isAdjustingRotation, setIsAdjustingRotation] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  const onImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const { width, height, naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width, height, naturalWidth, naturalHeight });

      let cropWidth = width * 0.8;
      let cropHeight = cropWidth / ASPECT_RATIO;

      if (cropHeight > height) {
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
    
    if (isDragging) {
      const dy = coords.y - dragStart.y;
      let newX = startCrop.x + dx;
      let newY = startCrop.y + dy;

      newX = Math.max(0, Math.min(newX, imageDimensions.width - crop.width));
      newY = Math.max(0, Math.min(newY, imageDimensions.height - crop.height));

      setCrop(c => ({ ...c, x: newX, y: newY }));
    }

    if (isResizing) {
      let newWidth = startCrop.width + dx;
      let newHeight = newWidth / ASPECT_RATIO;

      if (newWidth < 100) {
          newWidth = 100;
          newHeight = newWidth / ASPECT_RATIO;
      }

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

  const executeCrop = () => {
    if (!imageRef.current) return;
    
    const scaleX = imageDimensions.naturalWidth / imageDimensions.width;
    const scaleY = imageDimensions.naturalHeight / imageDimensions.height;

    const canvas = document.createElement('canvas');
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 高品質な描画設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // キャンバスの中心へ移動
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // 回転を適用
    ctx.rotate(rotation * Math.PI / 180);
    
    // クロップ範囲の中心座標（元画像基準）を計算
    const centerX = (crop.x + crop.width / 2) * scaleX;
    const centerY = (crop.y + crop.height / 2) * scaleY;

    // 画像を描画（中心を基準にオフセット）
    ctx.drawImage(
      imageRef.current,
      -centerX,
      -centerY,
      imageDimensions.naturalWidth,
      imageDimensions.naturalHeight
    );

    const croppedBase64 = canvas.toDataURL('image/png');
    onConfirm(croppedBase64);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 md:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center border border-gray-100 my-4">
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm md:text-base shadow-md">1</div>
            <span className="text-[11px] md:text-[12px] mt-1 text-blue-600 font-bold">範囲調整</span>
          </div>
          <div className="w-12 md:w-16 h-0.5 bg-gray-200"></div>
          <div className="flex flex-col items-center opacity-30">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold text-sm md:text-base">2</div>
            <span className="text-[11px] md:text-[12px] mt-1 text-gray-500 font-bold">画像加工</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-gray-800">写真の範囲と傾きを調整</h2>
          <p className="text-sm md:text-base text-gray-500 mt-2 leading-relaxed">
            お顔が真っ直ぐになるようスライダーで微調整し、<br className="hidden sm:block"/>
            <span className="text-blue-600 font-bold">点線の範囲内</span>にお顔を収めてください。
          </p>
        </div>

        <div 
          ref={containerRef}
          className="relative overflow-hidden select-none bg-gray-900 rounded-xl shadow-2xl touch-none ring-4 ring-gray-100"
          style={{ maxWidth: '100%', maxHeight: '45vh' }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            onLoad={onImageLoad}
            alt="Crop Source"
            className="max-w-full max-h-[45vh] object-contain block opacity-40 transition-transform duration-75 ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
            draggable={false}
          />

          {/* Guide Grid Overlay (Visible during adjustment) */}
          {(isAdjustingRotation || isDragging || isResizing) && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               <div className="absolute inset-0 opacity-20" 
                    style={{ 
                        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}>
               </div>
               <div className="absolute inset-x-0 top-1/2 -translate-y-px h-px bg-white/40"></div>
               <div className="absolute inset-y-0 left-1/2 -translate-x-px w-px bg-white/40"></div>
            </div>
          )}
          
          <div
            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move touch-none"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.width,
              height: crop.height,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            onTouchStart={(e) => handleMouseDown(e, 'drag')}
          >
            {/* Safe Area Guide */}
            <div className="absolute inset-[3%] border border-dashed border-blue-400/80 pointer-events-none">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                額縁セーフエリア
              </div>
            </div>

            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                <div className="border-r border-white/50 h-full"></div>
                <div className="border-r border-white/50 h-full"></div>
                <div className="col-start-1 row-start-2 border-t border-white/50 w-full"></div>
                <div className="col-start-1 row-start-3 border-t border-white/50 w-full"></div>
            </div>

            <div
              className="absolute -bottom-4 -right-4 w-10 h-10 md:w-12 md:h-12 bg-blue-600 cursor-nwse-resize flex items-center justify-center hover:bg-blue-500 transition-all rounded-full border-4 border-white shadow-lg active:scale-90"
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
              onTouchStart={(e) => handleMouseDown(e, 'resize')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-5 h-5 md:w-6 md:h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Rotation Slider */}
        <div className="w-full max-w-lg mt-8 px-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">傾きの微調整</span>
                <button 
                    onClick={() => setRotation(0)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                        rotation !== 0 ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-gray-300'
                    }`}
                >
                    {rotation.toFixed(1)}° <span className="ml-1 opacity-60">リセット</span>
                </button>
            </div>
            <div className="relative flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-400 w-6">-45°</span>
                <input 
                    type="range"
                    min="-45"
                    max="45"
                    step="0.1"
                    value={rotation}
                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                    onMouseDown={() => setIsAdjustingRotation(true)}
                    onTouchStart={() => setIsAdjustingRotation(true)}
                    onMouseUp={() => setIsAdjustingRotation(false)}
                    onTouchEnd={() => setIsAdjustingRotation(false)}
                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] font-bold text-gray-400 w-6">+45°</span>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-lg">
           <button
            onClick={onCancel}
            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm active:scale-95"
          >
            やり直す
          </button>
          <button
            onClick={executeCrop}
            className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg text-sm flex items-center justify-center gap-3 active:scale-95 hover:shadow-blue-200 hover:shadow-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            この範囲で決定する
          </button>
        </div>
      </div>
    </div>
  );
};

export default CropTool;
