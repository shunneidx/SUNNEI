
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
      {/* Main Image Container */}
      <div 
        className="aspect-square overflow-hidden relative select-none rounded-lg border-4 border-white shadow-xl bg-gray-200"
      >
        {isLoading && <LoadingSpinner message={loadingMessage} />}
        
        {/* The Photo */}
        <img 
          src={imageSrc} 
          alt="Memorial Photo" 
          className="w-full h-full object-cover block"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default PhotoCanvas;
