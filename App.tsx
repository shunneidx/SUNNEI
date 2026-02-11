
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, EditAction, ProcessingStatus, PLAN_LIMITS, CompanyInfo } from './types';
import UploadArea from './components/UploadArea';
import ActionPanel from './components/ActionPanel';
import PhotoCanvas from './components/PhotoCanvas';
import CropTool from './components/CropTool';
import LoginScreen from './components/LoginScreen';
import ManagementDashboard from './components/ManagementDashboard';
import { extractPerson, changeClothing } from './services/geminiService';
import { authService, AuthSession } from './services/authService';
import { usageService } from './services/usageService';

const Logo = ({ className = "h-8" }: { className?: string }) => (
  <div className={`flex items-center gap-3 select-none ${className}`}>
    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm">
      瞬
    </div>
    <div className="flex flex-col justify-center">
      <span className="text-2xl font-serif font-bold text-gray-900 tracking-wider leading-none">瞬影</span>
      <span className="text-[12px] font-sans tracking-[0.3em] text-gray-500 uppercase mt-0.5 leading-none">SHUNNEI</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // レイヤー管理用ステート
  const [originalCropped, setOriginalCropped] = useState<string | null>(null); // 背景用の元画像
  const [personImage, setPersonImage] = useState<string | null>(null);         // 人物レイヤー（AI抽出後）
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [deceasedName, setDeceasedName] = useState<string>('');
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [usageCount, setUsageCount] = useState<number>(0);

  const [appliedBg, setAppliedBg] = useState<EditAction | null>(null);
  const [appliedClothing, setAppliedClothing] = useState<EditAction | null>(null);

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    message: '',
  });

  const checkAdmin = (id: string) => id === 'admin';

  useEffect(() => {
    const session = authService.getSession();
    if (session) {
      setCompanyInfo(session.company);
      setUsageCount((session.company as any).usageCount || 0);
      setIsAdminMode(checkAdmin(session.company.id));
      setAppState(AppState.UPLOAD);
    }
  }, []);

  const handleLogin = useCallback((session: AuthSession) => {
    setCompanyInfo(session.company);
    setUsageCount((session.company as any).usageCount || 0);
    setIsAdminMode(checkAdmin(session.company.id));
    setAppState(AppState.UPLOAD);
  }, []);

  const executeLogout = useCallback(() => {
    authService.logout();
    setCompanyInfo(null);
    setPersonImage(null);
    setUploadedImage(null);
    setOriginalCropped(null);
    setDeceasedName('');
    setIsAdminMode(false);
    setAppState(AppState.LOGIN);
    setIsLogoutConfirmOpen(false);
  }, []);

  const handleImageSelected = useCallback((base64: string) => {
    setUploadedImage(base64);
    setAppState(AppState.CROPPING);
  }, []);

  /**
   * 1. トリミング確定
   * 確定後、直ちにAIを呼び出して人物を抽出（セグメンテーション）する
   */
  const handleCropConfirm = useCallback(async (croppedImage: string) => {
    setOriginalCropped(croppedImage);
    setAppState(AppState.EDITING);
    setAppliedBg(null);
    setAppliedClothing(null);

    setStatus({ isProcessing: true, message: '高品質なレイヤーに分離中です。' });
    try {
      // 人物抽出を実行（背景白の画像が返る）
      const extracted = await extractPerson(croppedImage);
      setPersonImage(extracted);
    } catch (error: any) {
      setErrorModal({ 
        isOpen: true, 
        title: '初期解析エラー', 
        message: '人物の抽出に失敗しました。このまま背景変更を行いたい場合は、元の写真をご利用ください。' 
      });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  }, []);

  const handleCropCancel = useCallback(() => {
    setAppState(originalCropped ? AppState.EDITING : AppState.UPLOAD);
  }, [originalCropped]);

  /**
   * 2. 編集アクションの実行
   * 背景変更：AIを叩かず、ステートの更新のみ（即時反映）
   * 服装変更：AIを叩いて、人物レイヤーを更新
   */
  const handleEditAction = useCallback(async (action: EditAction | null) => {
    // 背景アクションか判定
    const isBgAction = action === null || action.startsWith('REMOVE_BG_');

    if (isBgAction) {
      // 背景変更はAIを介さずステート更新のみ
      setAppliedBg(action);
      return;
    }

    // 服装アクションの場合（AI処理が必要）
    if (!originalCropped) return;
    setStatus({ isProcessing: true, message: '服装を着せ替え中です。' });
    try {
      const newPerson = await changeClothing(originalCropped, action);
      setPersonImage(newPerson);
      setAppliedClothing(action);
    } catch (error: any) {
      setErrorModal({ isOpen: true, title: '着せ替え失敗', message: '服装の生成に失敗しました。別の写真か、時間をおいてお試しください。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  }, [originalCropped]);

  /**
   * 3. 画像の保存
   * レイヤー（背景色＋人物）をCanvasで1つに合成してダウンロード
   */
  const handleDownload = useCallback(async () => {
    if (!originalCropped || !companyInfo) return;
    
    setStatus({ isProcessing: true, message: '最高画質で画像を合成・出力中...' });

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 3000;
      canvas.height = 3600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. 背景の描画
      if (!appliedBg) {
        const bgImg = await loadImage(originalCropped);
        ctx.drawImage(bgImg, 0, 0, 3000, 3600);
      } else {
        // 背景色の描画
        const gradient = ctx.createRadialGradient(1500, 1800, 0, 1500, 1800, 2500);
        switch (appliedBg) {
          case EditAction.REMOVE_BG_BLUE: gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, '#bfdbfe'); break;
          case EditAction.REMOVE_BG_GRAY: gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, '#d1d5db'); break;
          case EditAction.REMOVE_BG_PINK: gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, '#fbcfe8'); break;
          case EditAction.REMOVE_BG_YELLOW: gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, '#fef3c7'); break;
          case EditAction.REMOVE_BG_PURPLE: gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, '#e9d5ff'); break;
          case EditAction.REMOVE_BG_WHITE: ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,3000,3600); break;
        }
        if (appliedBg !== EditAction.REMOVE_BG_WHITE) {
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 3000, 3600);
        }
      }

      // 2. 人物レイヤーの描画（透過処理を含む）
      if (personImage) {
        const personImg = await loadImage(personImage);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 3000;
        tempCanvas.height = 3600;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(personImg, 0, 0, 3000, 3600);
          const imgData = tempCtx.getImageData(0, 0, 3000, 3600);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) data[i+3] = 0;
          }
          tempCtx.putImageData(imgData, 0, 0);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      } else if (!appliedBg) {
        // 人物レイヤーがない（＝まだ抽出が終わっていない）かつ背景色も選択していない場合は
        // すでに背景としてoriginalCroppedを描画済みなので何もしない
      }

      const highResBase64 = canvas.toDataURL('image/png');
      
      const newCount = await usageService.incrementUsage(companyInfo.id);
      setUsageCount(newCount);
      
      const fileName = deceasedName.trim() ? `瞬影_${deceasedName}.png` : `瞬影_遺影.png`;
      const link = document.createElement('a');
      link.href = highResBase64;
      link.download = fileName;
      link.click();
      
      setStatus({ isProcessing: false, message: '' });
    } catch (err) { 
      setStatus({ isProcessing: false, message: '' });
      setErrorModal({ isOpen: true, title: '保存失敗', message: '画像の合成処理中にエラーが発生しました。' });
    }
  }, [originalCropped, personImage, appliedBg, companyInfo, deceasedName]);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const getStep = () => {
    switch(appState) {
      case AppState.UPLOAD: return 1;
      case AppState.CROPPING: return 2;
      case AppState.EDITING: return 3;
      default: return 1;
    }
  };

  return (
    <div className="h-screen bg-[#f8f9fa] text-gray-800 font-serif flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200 shrink-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo />
          {companyInfo && !isAdminMode && appState !== AppState.LOGIN && (
            <div className="hidden md:flex items-center gap-8">
              {[
                { n: 1, label: '写真選択' },
                { n: 2, label: '範囲調整' },
                { n: 3, label: '加工・保存' }
              ].map(s => (
                <div key={s.n} className={`flex items-center gap-2 transition-opacity ${getStep() >= s.n ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${getStep() === s.n ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>{s.n}</div>
                  <span className="text-sm font-bold font-sans">{s.label}</span>
                  {s.n < 3 && <div className="w-10 h-[1px] bg-gray-300 ml-2"></div>}
                </div>
              ))}
            </div>
          )}
          {companyInfo && (
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end mr-4">
                  <div className="text-sm font-bold">{companyInfo.name}</div>
                  <div className="text-[11px] text-blue-600 font-sans tracking-widest uppercase">{isAdminMode ? 'System Admin' : companyInfo.plan}</div>
               </div>
               <button onClick={() => setIsLogoutConfirmOpen(true)} className="text-sm text-gray-400 hover:text-red-600 transition-colors cursor-pointer">ログアウト</button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center overflow-y-auto w-full relative">
        {appState === AppState.LOGIN ? <LoginScreen onLogin={handleLogin} /> : (
          isAdminMode ? <ManagementDashboard /> : (
            <>
              {appState === AppState.UPLOAD && (
                <div className="w-full max-w-4xl animate-fade-in my-auto p-4 flex flex-col items-center">
                  <div className="text-center mb-10 max-w-xl">
                    <h2 className="text-3xl font-medium mb-6 text-gray-900">大切な思い出を、永遠の一枚に</h2>
                    <p className="text-gray-500 text-base leading-relaxed mb-8">故人様らしい自然な表情を活かしたまま、<br/>背景の変更や礼服・和装への着せ替えを数秒で行えます。</p>
                    <UploadArea onImageSelected={handleImageSelected} />
                  </div>
                </div>
              )}
              {appState === AppState.CROPPING && uploadedImage && <CropTool imageSrc={uploadedImage} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}
              {appState === AppState.EDITING && companyInfo && (
                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-6 p-6 h-full max-h-[92vh]">
                  <div className="md:col-span-7 lg:col-span-8 flex items-center justify-center bg-gray-100 rounded-2xl p-4 overflow-hidden shadow-inner relative">
                    <PhotoCanvas 
                      originalCropped={originalCropped} 
                      personImage={personImage}
                      appliedBg={appliedBg} 
                      isLoading={status.isProcessing} 
                      loadingMessage={status.message} 
                    />
                  </div>
                  <div className="md:col-span-5 lg:col-span-4 h-full overflow-hidden">
                    <ActionPanel 
                      onAction={handleEditAction} disabled={status.isProcessing} onDownload={handleDownload}
                      onReset={() => {
                        setUploadedImage(null);
                        setPersonImage(null);
                        setOriginalCropped(null);
                        setAppliedBg(null);
                        setAppliedClothing(null);
                        setDeceasedName('');
                        setAppState(AppState.UPLOAD);
                      }} 
                      onStartCrop={() => setAppState(AppState.CROPPING)}
                      appliedBg={appliedBg} appliedClothing={appliedClothing} userPlan={companyInfo.plan} usageCount={usageCount}
                      deceasedName={deceasedName}
                      onDeceasedNameChange={setDeceasedName}
                    />
                  </div>
                </div>
              )}
            </>
          )
        )}
      </main>

      {/* Modals... */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-center">
            <h3 className="text-xl font-bold mb-4">ログアウトしますか？</h3>
            <div className="flex gap-4">
              <button onClick={() => setIsLogoutConfirmOpen(false)} className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 rounded-lg text-sm">キャンセル</button>
              <button onClick={executeLogout} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md text-sm">ログアウト</button>
            </div>
          </div>
        </div>
      )}

      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
            <h3 className="text-xl font-bold mb-4">{errorModal.title}</h3>
            <p className="text-base text-gray-500 mb-8">{errorModal.message}</p>
            <button onClick={() => setErrorModal(prev => ({...prev, isOpen: false}))} className="w-full py-4 bg-gray-900 text-white font-bold rounded-lg text-sm">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
