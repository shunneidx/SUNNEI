
import React, { useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { EditAction } from '../types';
import { drawMemorialPhoto } from '../services/renderService';

interface PhotoCanvasProps {
  originalCropped: string | null;
  personImage: string | null;
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

  useEffect(() => {
    const render = async () => {
      if (!canvasRef.current || !originalCropped) return;
      
      // プレビュー用のサイズ（解像度とパフォーマンスのバランス）
      const width = 800;
      const height = 960; // 5:6
      
      await drawMemorialPhoto({
        canvas: canvasRef.current,
        originalCropped,
        personImage,
        appliedBg,
        width,
        height,
        isHighRes: false
      });
    };

    render();
  }, [originalCropped, personImage, appliedBg]);

  if (!originalCropped) return null;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div 
        className="aspect-[5/6] overflow-hidden relative select-none rounded-lg border-4 border-white shadow-xl bg-gray-200"
      >
        {isLoading && <LoadingSpinner message={loadingMessage} />}
        
        {/* メインCanvas */}
        <canvas 
          ref={canvasRef}
          className="w-full h-full object-contain block"
        />
      </div>
      
      {!isLoading && (
        <div className="mt-4 text-center">
          <p className="text-[12px] text-gray-400 font-sans tracking-wider font-bold">
            ※画面に表示されている通りの品質で保存されます
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoCanvas;
