
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface PhotoCanvasProps {
  imageSrc: string | null;
  isLoading: boolean;
  loadingMessage: string;
}

const PhotoCanvas: React.FC<PhotoCanvasProps> = ({ 
  imageSrc, 
  isLoading, 
  loadingMessage
}) => {
  if (!imageSrc) return null;

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Main Image Container with 5:6 Aspect Ratio (Vertical) */}
      <div 
        className="aspect-[5/6] overflow-hidden relative select-none rounded-lg border-4 border-white shadow-xl bg-gray-200"
      >
        {isLoading && <LoadingSpinner message={loadingMessage} />}
        
        {/* The Photo */}
        <img 
          src={imageSrc} 
          alt="Memorial Photo" 
          className="w-full h-full object-cover block"
          draggable={false}
        />

        {/* Frame Overlap Simulation (approx 3% of area) */}
        {!isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Inner "Safe" zone indicator */}
            <div className="absolute inset-[3%] border border-dashed border-white/30 rounded-sm"></div>
            {/* Semi-transparent outer edge indicating frame overlap */}
            <div className="absolute inset-0 shadow-[inset_0_0_0_12px_rgba(0,0,0,0.1)]"></div>
          </div>
        )}
      </div>
      
      {!isLoading && (
        <div className="mt-2 text-center">
          <p className="text-[10px] text-gray-400 font-sans tracking-wider">
            ※薄い枠線は額縁（四つ切りサイズ）で隠れるエリアの目安です
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoCanvas;
