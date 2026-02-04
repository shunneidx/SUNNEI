
import React, { useRef, useState } from 'react';
import heic2any from 'heic2any';
import UTIF from 'utif';

interface UploadAreaProps {
  onImageSelected: (base64: string) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const convertTiffToDataUrl = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    
    const canvas = document.createElement('canvas');
    canvas.width = ifds[0].width;
    canvas.height = ifds[0].height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    imgData.data.set(rgba);
    ctx.putImageData(imgData, 0, 0);
    
    return canvas.toDataURL('image/png');
  };

  const handleFileUpload = async (file: File) => {
    setWarning(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      let finalDataUrl = '';

      // HEIC/HEIF Support
      if (extension === 'heic' || extension === 'heif') {
        setIsConverting(true);
        try {
          // File を一度純粋な Blob に変換してから渡す（古い実装での File オブジェクトの互換性問題回避）
          const fileBlob = new Blob([file], { type: file.type });
          
          const result = await heic2any({
            blob: fileBlob,
            toType: 'image/jpeg',
            quality: 0.8,
            multiple: false // 確実に単一の Blob を受け取る
          });
          
          const convertedBlob = Array.isArray(result) ? result[0] : result;
          
          finalDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(convertedBlob);
          });
        } catch (heicErr) {
          console.error('HEIC specific conversion error:', heicErr);
          throw heicErr;
        } finally {
          setIsConverting(false);
        }
      } 
      // TIFF Support
      else if (extension === 'tiff' || extension === 'tif') {
        setIsConverting(true);
        finalDataUrl = await convertTiffToDataUrl(file);
        setIsConverting(false);
      }
      // Standard Images
      else if (file.type.startsWith('image/')) {
        finalDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        setWarning('対応していないファイル形式です。画像ファイル（JPG, PNG, HEIC, TIFFなど）を選択してください。');
        return;
      }

      if (finalDataUrl) {
        processBase64Image(finalDataUrl);
      }
    } catch (err) {
      console.error('File conversion error:', err);
      setWarning('ファイルの読み込みに失敗しました。HEIC形式の解析ができなかったか、ファイルが破損している可能性があります。');
      setIsConverting(false);
    }
  };

  const processBase64Image = (base64: string) => {
    const img = new Image();
    img.onload = () => {
      const minSide = Math.min(img.width, img.height);
      if (minSide < 1000) {
        setWarning(`※ 画像サイズが小さいです（${img.width}x${img.height}px）。\n印刷時に粗くなる可能性があります。できるだけ高画質な写真をお使いください。`);
      }
      onImageSelected(base64);
    };
    img.src = base64;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
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
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
          isConverting ? 'border-blue-300 bg-blue-50 cursor-wait' : 
          warning ? 'border-amber-400 bg-amber-50' : 
          'border-gray-400 hover:border-gray-600 hover:bg-gray-50'
        }`}
        onClick={() => !isConverting && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,.heic,.heif,.tiff,.tif"
          onChange={handleFileChange}
          disabled={isConverting}
        />
        
        <div className="flex flex-col items-center gap-4">
          {isConverting ? (
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-xl font-serif text-blue-700 font-medium animate-pulse">画像を最適化中...</p>
               <p className="text-sm text-blue-500 mt-2">HEIC/TIFF形式を変換しています。そのままお待ちください。</p>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-16 h-16 ${warning ? 'text-amber-500' : 'text-gray-400'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <div>
                <p className="text-xl font-serif text-gray-700 font-medium">写真をアップロード</p>
                <p className="text-sm text-gray-500 mt-2">クリックまたはドラッグ＆ドロップ</p>
                <p className="text-xs text-gray-400 mt-1">対応: JPG, PNG, HEIC, TIFF</p>
              </div>
            </>
          )}
        </div>
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
