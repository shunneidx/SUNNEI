
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, EditAction, ProcessingStatus, PLAN_LIMITS, CompanyInfo } from './types';
import UploadArea from './components/UploadArea';
import ActionPanel from './components/ActionPanel';
import PhotoCanvas from './components/PhotoCanvas';
import CropTool from './components/CropTool';
import LoginScreen from './components/LoginScreen';
import ManagementDashboard from './components/ManagementDashboard';
import { processImage } from './services/geminiService';
import { authService, AuthSession } from './services/authService';
import { usageService } from './services/usageService';

const Logo = ({ className = "h-8" }: { className?: string }) => (
  <div className={`flex items-center gap-3 select-none ${className}`}>
    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm">
      瞬
    </div>
    <div className="flex flex-col justify-center">
      <span className="text-2xl font-serif font-bold text-gray-900 tracking-wider leading-none">瞬影</span>
      <span className="text-[10px] font-sans tracking-[0.3em] text-gray-500 uppercase mt-0.5 leading-none">SHUNNEI</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null); 
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
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
    setCurrentImage(null);
    setUploadedImage(null);
    setOriginalImage(null);
    setIsAdminMode(false);
    setAppState(AppState.LOGIN);
    setIsLogoutConfirmOpen(false);
  }, []);

  const handleImageSelected = useCallback((base64: string) => {
    setUploadedImage(base64);
    setAppState(AppState.CROPPING);
  }, []);

  const handleCropConfirm = useCallback((croppedImage: string) => {
    setOriginalImage(croppedImage);
    setCurrentImage(croppedImage);
    setAppState(AppState.EDITING);
  }, []);

  const handleCropCancel = useCallback(() => {
    setAppState(currentImage ? AppState.EDITING : AppState.UPLOAD);
  }, [currentImage]);

  const handleEditAction = useCallback(async (action: EditAction, customPrompt?: string) => {
    if (!originalImage) return;
    let nextBg = appliedBg;
    let nextClothing = appliedClothing;
    const isBgAction = action.startsWith('REMOVE_BG_');
    const isClothingAction = [EditAction.SUIT_MENS, EditAction.SUIT_WOMENS, EditAction.KIMONO_MENS, EditAction.KIMONO_WOMENS].includes(action);
    
    if (isBgAction) nextBg = action;
    if (isClothingAction) nextClothing = action;

    setStatus({ isProcessing: true, message: '高品質な画像を生成中です。しばらくお待ちください。' });
    try {
      const resultImage = await processImage(originalImage, nextBg || undefined, nextClothing || undefined, customPrompt);
      setCurrentImage(resultImage);
      if (isBgAction) setAppliedBg(action);
      if (isClothingAction) setAppliedClothing(action);
    } catch (error: any) {
      setErrorModal({ isOpen: true, title: '生成エラー', message: '画像の処理に失敗しました。別の写真でお試しいただくか、しばらく時間を置いてから再度実行してください。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  }, [originalImage, appliedBg, appliedClothing]);

  const handleDownload = useCallback(async () => {
    if (!currentImage || !companyInfo) return;
    const limit = PLAN_LIMITS[companyInfo.plan];
    if (usageCount >= limit) {
      setErrorModal({ isOpen: true, title: '上限到達', message: '今月の作成可能枚数の上限に達しました。プラン変更をご検討ください。' });
      return;
    }

    setStatus({ isProcessing: true, message: '四つ切りサイズ(3000px)へ最適化して保存中...' });

    try {
      // 3000x3000pxへリサイズしてダウンロード
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 3000;
        canvas.height = 3000;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 高画質スケーリングの設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 3000, 3000);

        const highResBase64 = canvas.toDataURL('image/png');
        
        const newCount = await usageService.incrementUsage(companyInfo.id);
        setUsageCount(newCount);
        
        const link = document.createElement('a');
        link.href = highResBase64;
        link.download = `瞬影_3000px_${new Date().getTime()}.png`;
        link.click();
        
        setStatus({ isProcessing: false, message: '' });
      };
      img.onerror = () => {
        setStatus({ isProcessing: false, message: '' });
        setErrorModal({ isOpen: true, title: '保存失敗', message: '画像の読み込み中にエラーが発生しました。' });
      };
      img.src = currentImage;
    } catch (err) { 
      setStatus({ isProcessing: false, message: '' });
      setErrorModal({ isOpen: true, title: '保存失敗', message: '画像のダウンロード中にエラーが発生しました。' });
    }
  }, [currentImage, usageCount, companyInfo]);

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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getStep() === s.n ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>{s.n}</div>
                  <span className="text-xs font-bold font-sans">{s.label}</span>
                  {s.n < 3 && <div className="w-8 h-[1px] bg-gray-300 ml-2"></div>}
                </div>
              ))}
            </div>
          )}
          {companyInfo && (
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end mr-4">
                  <div className="text-sm font-bold">{companyInfo.name}</div>
                  <div className="text-[9px] text-blue-600 font-sans tracking-widest uppercase">{isAdminMode ? 'System Admin' : companyInfo.plan}</div>
               </div>
               <button onClick={() => setIsLogoutConfirmOpen(true)} className="text-xs text-gray-400 hover:text-red-600 transition-colors cursor-pointer">ログアウト</button>
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
                  <div className="text-center mb-10 max-w-lg">
                    <h2 className="text-3xl font-medium mb-4 text-gray-900">大切な思い出を、永遠の一枚に</h2>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8">故人様らしい自然な表情を活かしたまま、<br/>背景の変更や礼服・和装への着せ替えを数秒で行えます。</p>
                    <UploadArea onImageSelected={handleImageSelected} />
                  </div>
                </div>
              )}
              {appState === AppState.CROPPING && uploadedImage && <CropTool imageSrc={uploadedImage} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}
              {appState === AppState.EDITING && companyInfo && (
                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-6 p-6 h-full max-h-[90vh]">
                  <div className="md:col-span-7 lg:col-span-8 flex items-center justify-center bg-gray-100 rounded-2xl p-4 overflow-hidden shadow-inner relative">
                    <PhotoCanvas imageSrc={currentImage} isLoading={status.isProcessing} loadingMessage={status.message} />
                  </div>
                  <div className="md:col-span-5 lg:col-span-4 h-full overflow-hidden">
                    <ActionPanel 
                      onAction={handleEditAction} disabled={status.isProcessing} onDownload={handleDownload}
                      onReset={() => {
                        setUploadedImage(null);
                        setOriginalImage(null);
                        setCurrentImage(null);
                        setAppliedBg(null);
                        setAppliedClothing(null);
                        setAppState(AppState.UPLOAD);
                      }} 
                      onStartCrop={() => setAppState(AppState.CROPPING)}
                      appliedBg={appliedBg} appliedClothing={appliedClothing} userPlan={companyInfo.plan} usageCount={usageCount}
                    />
                  </div>
                </div>
              )}
            </>
          )
        )}
      </main>

      {/* Logout Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold mb-4">ログアウトしますか？</h3>
            <p className="text-sm text-gray-500 mb-6">編集中の内容は破棄されます。</p>
            <div className="flex gap-3">
              <button onClick={() => setIsLogoutConfirmOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-lg">キャンセル</button>
              <button onClick={executeLogout} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md">ログアウト</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">{errorModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{errorModal.message}</p>
            <button onClick={() => setErrorModal(prev => ({...prev, isOpen: false}))} className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
