
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
    
    const canvas = document.createElement('canvas');
    const scaleX = imageDimensions.naturalWidth / imageDimensions.width;
    const scaleY = imageDimensions.naturalHeight / imageDimensions.height;

    // Output crop size
    const outWidth = crop.width * scaleX;
    const outHeight = crop.height * scaleY;
    
    canvas.width = outWidth;
    canvas.height = outHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Move origin to the center of the canvas
    ctx.translate(outWidth / 2, outHeight / 2);
    
    // 2. Rotate the context
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Draw image centered on the crop area
    // Calculate the center point of the crop in the original (unrotated) image coordinates
    const centerXInOrig = (crop.x + crop.width / 2) * scaleX;
    const centerYInOrig = (crop.y + crop.height / 2) * scaleY;

    // Since the context is translated to canvas center and rotated,
    // we need to draw the original image offset by the center coordinates
    ctx.drawImage(
      imageRef.current,
      -centerXInOrig,
      -centerYInOrig,
      imageDimensions.naturalWidth,
      imageDimensions.naturalHeight
    );

    const croppedBase64 = canvas.toDataURL('image/png');
    onConfirm(croppedBase64);
  };

  const handleResetRotation = () => {
    setRotation(0);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 animate-fade-in font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center border border-gray-100">
        
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
            スライダーで傾きを直し、点線の範囲内にお顔を収めてください。
          </p>
        </div>

        {/* Image Container */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden select-none bg-gray-900 rounded-xl shadow-2xl touch-none ring-4 ring-gray-100"
          style={{ width: '100%', height: '45vh', maxWidth: '100%' }}
        >
          {/* Grid Overlay - Visible during rotation */}
          {(isRotating || rotation !== 0) && (
            <div className="absolute inset-0 z-10 pointer-events-none opacity-20 bg-grid-pattern"></div>
          )}

          <img
            ref={imageRef}
            src={imageSrc}
            onLoad={onImageLoad}
            alt="Crop Source"
            className="max-w-full max-h-full object-contain block opacity-50 transition-transform duration-75"
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
            {/* Safe Area Guide */}
            <div className="absolute inset-[3%] border border-dashed border-blue-400/80 pointer-events-none">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                額縁セーフエリア
              </div>
            </div>

            {/* Resize handle */}
            <div
              className="absolute -bottom-4 -right-4 w-10 h-10 bg-blue-600 cursor-nwse-resize flex items-center justify-center hover:bg-blue-500 transition-all rounded-full border-4 border-white shadow-lg active:scale-90"
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
              onTouchStart={(e) => handleMouseDown(e, 'resize')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Rotation Slider Control */}
        <div className="w-full max-w-lg mt-8 mb-4 space-y-4">
          <div className="flex items-center justify-between text-sm font-bold text-gray-700">
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              傾きの微調整
            </span>
            <button 
              onClick={handleResetRotation}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-colors flex items-center gap-1 active:scale-95"
            >
              <span className={rotation !== 0 ? "text-blue-600" : "text-gray-400"}>
                {rotation > 0 ? '+' : ''}{rotation.toFixed(1)}°
              </span>
              <span className="text-gray-400 font-normal">リセット</span>
            </button>
          </div>
          <div className="relative flex items-center gap-4">
            <span className="text-[10px] text-gray-300 font-bold">-15°</span>
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
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[10px] text-gray-300 font-bold">+15°</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-lg">
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

      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-top: -8px;
        }
      `}</style>
    </div>
  );
};

export default CropTool;
