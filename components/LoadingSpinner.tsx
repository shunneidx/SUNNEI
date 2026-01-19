import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "処理中..." }) => {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gray-800 mb-4"></div>
      <p className="text-gray-800 font-serif text-lg animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingSpinner;