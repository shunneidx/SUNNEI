
import React, { useRef, useState } from 'react';
import heic2any from 'heic2any';
import { repairHeicImage } from '../services/geminiService';

interface UploadAreaProps {
  onImageSelected: (base64: string) => void;
}

const MAX_IMAGE_DIMENSION = 4096;

const UploadArea: React.FC<UploadAreaProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("写真を解析・最適化中...");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resizeImageIfNeeded = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const processFile = async (file: File) => {
    setWarning(null);
    setIsProcessing(true);
    setProcessingMsg("写真を解析・最適化中...");
    
    let targetDataUrl: string | null = null;

    if (file.size > 50 * 1024 * 1024) {
      setWarning("ファイルサイズが50MBを超えています。");
      setIsProcessing(false);
      return;
    }

    const fileName = file.name.toLowerCase();
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                   file.type === 'image/heic' || file.type === 'image/heif';

    if (isHeic) {
      try {
        // Step 1: Try local browser conversion
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.4
        });
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        targetDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(finalBlob);
        });
      } catch (err: any) {
        console.warn("Local HEIC conversion failed, trying AI decoding...", err);
        
        // Step 2: Fallback to AI Repair
        setProcessingMsg("最新のiPhone形式を検出しました。AIで画像を最適化しています...");
        try {
          const base64Heic = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          targetDataUrl = await repairHeicImage(base64Heic);
        } catch (repairErr) {
          console.error("AI Repair failed:", repairErr);
          setWarning("写真の読み込みに失敗しました（最新のiPhone形式）。\n\n【解決策】写真をiPhoneで表示し、スクリーンショットを撮って、その画像をアップロードしてください。");
          setIsProcessing(false);
          return;
        }
      }
    } else {
      // Normal images (JPEG, PNG)
      targetDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    if (!targetDataUrl) {
      setWarning("画像のデータ化に失敗しました。");
      setIsProcessing(false);
      return;
    }

    const img = new Image();
    img.onerror = () => {
      setWarning("画像として認識できませんでした。");
      setIsProcessing(false);
    };

    img.onload = () => {
      if (img.width < 1000 || img.height < 1000) {
        setWarning(`※ 画像サイズが小さいです（${img.width}x${img.height}px）。印刷時に粗くなる可能性があります。`);
      }

      try {
        const optimizedBase64 = resizeImageIfNeeded(img);
        onImageSelected(optimizedBase64);
      } catch (e) {
        setWarning("画像の最適化中にエラーが発生しました。");
      } finally {
        setIsProcessing(false);
      }
    };
    img.src = targetDataUrl;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div 
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          isProcessing ? 'border-memorial-accent bg-memorial-50 cursor-wait' :
          warning?.includes('解決策') ? 'border-red-300 bg-red-50 cursor-pointer' : 
          warning ? 'border-amber-400 bg-amber-50 cursor-pointer' : 
          'border-gray-400 hover:border-gray-600 hover:bg-gray-50 cursor-pointer'
        }`}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.heic,.heif" onChange={handleFileChange} />
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-memorial-accent border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-lg font-serif text-gray-700 font-bold">{processingMsg}</p>
              <p className="text-xs text-gray-400 mt-1">数秒から数十秒かかる場合があります</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-full ${warning?.includes('解決策') ? 'bg-red-100 text-red-500' : warning ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-serif text-gray-700 font-bold">写真をアップロード</p>
              <p className="text-sm text-gray-500 mt-2">クリックまたはドラッグ＆ドロップ</p>
              <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-sans">最大 50MB | JPEG, PNG, HEIC形式</p>
            </div>
          </div>
        )}
      </div>

      {warning && (
        <div className={`border px-5 py-4 rounded-xl flex items-start gap-4 text-sm animate-fade-in shadow-sm ${
          warning.includes('解決策') ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
           <div className={`mt-0.5 p-1 rounded-full ${warning.includes('解決策') ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
               <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
             </svg>
           </div>
           <div className="whitespace-pre-line leading-relaxed font-sans font-medium">{warning}</div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
