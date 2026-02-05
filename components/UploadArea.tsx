
import React, { useRef, useState } from 'react';
import heic2any from 'heic2any';

interface UploadAreaProps {
  onImageSelected: (base64: string) => void;
}

const MAX_IMAGE_DIMENSION = 4096; // 4K相当。印刷に十分な高画質を維持

const UploadArea: React.FC<UploadAreaProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * 画像をブラウザ側でリサイズし、AI処理を安定させる
   */
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
    let targetFile: File | Blob = file;

    // ファイルサイズチェック (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setWarning("ファイルサイズが50MBを超えています。より小さいサイズ、またはスクリーンショットでお試しください。");
      setIsProcessing(false);
      return;
    }

    // HEIC/HEIF判定
    const fileName = file.name.toLowerCase();
    const isHeic = fileName.endsWith('.heic') || 
                   fileName.endsWith('.heif') ||
                   file.type === 'image/heic' || 
                   file.type === 'image/heif';

    if (isHeic) {
      try {
        // メモリ負荷を抑えるため、変換品質を0.4に調整（大容量HEIC対策）
        // ライブラリのバージョンアップ(0.0.5)と併せて安定性を高める
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.4
        });

        targetFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      } catch (err: any) {
        console.error("HEIC conversion error:", err);
        let msg = "写真の読み込みに失敗しました（大容量HEIC）。";
        msg += "\n\n【確実な解決策】";
        msg += "\nこの写真をiPhoneで表示し、スクリーンショットを撮ってください。そのスクリーンショットをアップロードすると、正常に進むことができます。";
        setWarning(msg);
        setIsProcessing(false);
        return;
      }
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setWarning("ファイルの読み込み中にエラーが発生しました。");
      setIsProcessing(false);
    };

    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl || dataUrl === 'data:') {
        setWarning("画像のデータ化に失敗しました。");
        setIsProcessing(false);
        return;
      }
      
      const img = new Image();
      img.onerror = () => {
        setWarning("画像として認識できませんでした。別の画像をお試しください。");
        setIsProcessing(false);
      };

      img.onload = () => {
        // 低解像度警告
        if (img.width < 1000 || img.height < 1000) {
          setWarning(`※ 画像サイズが小さいです（${img.width}x${img.height}px）。\n印刷時に粗くなる可能性があるため、高画質な写真をお勧めします。`);
        }

        try {
          // AI処理の安定化のため、巨大画像はリサイズ
          const optimizedBase64 = resizeImageIfNeeded(img);
          onImageSelected(optimizedBase64);
        } catch (e) {
          setWarning("画像の最適化中にエラーが発生しました。");
        } finally {
          setIsProcessing(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(targetFile);
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
              <p className="text-lg font-serif text-gray-700 font-bold">写真を解析・最適化中...</p>
              <p className="text-xs text-gray-400 mt-1">大容量ファイルの場合、数十秒かかることがあります</p>
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
