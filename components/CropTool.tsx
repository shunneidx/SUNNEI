
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

const CropTool: React.FC<CropToolProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  // Initialize crop box when image loads
  const onImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const { width, height, naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width, height, naturalWidth, naturalHeight });

      // Default crop: 3:4 aspect ratio, centered, 80% height
      const initialHeight = height * 0.8;
      const initialWidth = initialHeight * (3/4);
      
      setCrop({
        x: (width - initialWidth) / 2,
        y: (height - initialHeight) / 2,
        width: initialWidth,
        height: initialHeight
      });
    }
  };

  // Helper to handle coordinate mapping from mouse/touch to crop rect
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

      // Constrain to image bounds
      newX = Math.max(0, Math.min(newX, imageDimensions.width - crop.width));
      newY = Math.max(0, Math.min(newY, imageDimensions.height - crop.height));

      setCrop(c => ({ ...c, x: newX, y: newY }));
    }

    if (isResizing) {
      // Maintain 3:4 aspect ratio during resize
      let newWidth = startCrop.width + dx;
      let newHeight = newWidth * (4/3);

      // Minimum size
      if (newWidth < 100) {
        newWidth = 100;
        newHeight = newWidth * (4/3);
      }

      // Constrain to image bounds
      if (startCrop.x + newWidth > imageDimensions.width) {
        newWidth = imageDimensions.width - startCrop.x;
        newHeight = newWidth * (4/3);
      }
      if (startCrop.y + newHeight > imageDimensions.height) {
        newHeight = imageDimensions.height - startCrop.y;
        newWidth = newHeight * (3/4);
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

    // Use a high-quality fixed size or relative to crop box
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imageRef.current,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedBase64 = canvas.toDataURL('image/png');
    onConfirm(croppedBase64);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center border border-gray-100">
        
        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">1</div>
            <span className="text-[10px] mt-1 text-blue-600 font-bold">範囲選択</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-200"></div>
          <div className="flex flex-col items-center opacity-30">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold text-sm">2</div>
            <span className="text-[10px] mt-1 text-gray-500 font-bold">画像加工</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-serif text-gray-800">写真の範囲を調整</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            故人様のお顔が枠の<strong>中央（上から1/3程度）</strong>に来るように調整してください。<br/>
            枠の端をドラッグすると大きさを変更できます。
          </p>
        </div>

        {/* Editor Area */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden select-none bg-gray-900 rounded-xl shadow-2xl touch-none ring-4 ring-gray-100"
          style={{ maxWidth: '100%', maxHeight: '55vh' }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            onLoad={onImageLoad}
            alt="Crop Source"
            className="max-w-full max-h-[55vh] object-contain block opacity-50"
            draggable={false}
          />
          
          {/* Active Crop Area (Clean visual) */}
          <div
            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] cursor-move touch-none"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.width,
              height: crop.height,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            onTouchStart={(e) => handleMouseDown(e, 'drag')}
          >
             {/* Grid lines for composition rule of thirds */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-white/50 h-full"></div>
                <div className="border-r border-white/50 h-full"></div>
                <div className="col-start-1 row-start-2 border-t border-white/50 w-full"></div>
                <div className="col-start-1 row-start-3 border-t border-white/50 w-full"></div>
            </div>

            {/* Resize Handle (Bottom Right) */}
            <div
              className="absolute -bottom-3 -right-3 w-10 h-10 bg-blue-600 cursor-nwse-resize flex items-center justify-center hover:bg-blue-500 transition-all rounded-full border-4 border-white shadow-lg active:scale-90"
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
              onTouchStart={(e) => handleMouseDown(e, 'resize')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" />
              </svg>
            </div>
            
            {/* Corner Markers for visibility */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
          </div>
        </div>

        {/* Actions */}
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
