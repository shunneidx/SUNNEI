
import React, { useRef, useState } from 'react';
import heic2any from 'heic2any';

interface UploadAreaProps {
  onImageSelected: (base64: string) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setWarning(null);
    setIsProcessing(true);
    
    let targetFile: File | Blob = file;

    // Check if the file is HEIC/HEIF
    const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif') || 
                   file.type === 'image/heic' || 
                   file.type === 'image/heif';

    if (isHeic) {
      try {
        const result = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9,
        });
        targetFile = Array.isArray(result) ? result[0] : result;
      } catch (err) {
        console.error("HEIC conversion error:", err);
        setWarning("iPhoneの写真形式（HEIC）の変換に失敗しました。お手数ですが、通常の写真でお試しください。");
        setIsProcessing(false);
        return;
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      
      const img = new Image();
      img.onload = () => {
        const minSide = Math.min(img.width, img.height);
        if (minSide < 1000) {
          setWarning(`※ 画像サイズが小さいです（${img.width}x${img.height}px）。\n印刷時に粗くなる可能性があります。できるだけ高画質な写真をお使いください。`);
        }
        onImageSelected(result);
        setIsProcessing(false);
      };
      img.onerror = () => {
        setWarning("画像の読み込みに失敗しました。ファイル形式を確認してください。");
        setIsProcessing(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setWarning("ファイルの読み取りに失敗しました。");
      setIsProcessing(false);
    };
    reader.readAsDataURL(targetFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className="w-full max-w-2xl mx-auto space-y-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div 
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors duration-300 ${
          isProcessing ? 'border-gray-200 bg-gray-50 cursor-wait' : 
          warning ? 'border-amber-400 bg-amber-50 cursor-pointer' : 
          'border-gray-400 hover:border-gray-600 hover:bg-gray-50 cursor-pointer'
        }`}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
            <p className="text-lg font-serif text-gray-700">写真を処理中...</p>
            <p className="text-xs text-gray-400">iPhoneの写真形式を変換しています</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-16 h-16 ${warning ? 'text-amber-500' : 'text-gray-400'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <div>
              <p className="text-xl font-serif text-gray-700 font-medium">写真をアップロード</p>
              <p className="text-sm text-gray-500 mt-2">クリックまたはドラッグ＆ドロップ</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, HEICに対応</p>
            </div>
          </div>
        )}
      </div>

      {warning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3 text-sm animate-fade-in">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5 text-amber-500">
             <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
           </svg>
           <div className="whitespace-pre-line">{warning}</div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
