
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, EditAction, ProcessingStatus, UserPlan, PLAN_LIMITS, CompanyInfo } from './types';
import UploadArea from './components/UploadArea';
import ActionPanel from './components/ActionPanel';
import PhotoCanvas from './components/PhotoCanvas';
import CropTool from './components/CropTool';
import LoginScreen from './components/LoginScreen';
import { processImage } from './services/geminiService';
import { authService, AuthSession } from './services/authService';

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
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null); 
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [usageCount, setUsageCount] = useState<number>(0);

  const [appliedBg, setAppliedBg] = useState<EditAction | null>(null);
  const [appliedClothing, setAppliedClothing] = useState<EditAction | null>(null);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLimitReachedOpen, setIsLimitReachedOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    message: '',
  });

  // セッションの復元
  useEffect(() => {
    const session = authService.getSession();
    if (session) {
      setCompanyInfo(session.company);
      const storedUsage = localStorage.getItem(`shunnei_usage_${session.company.id}`);
      setUsageCount(storedUsage ? parseInt(storedUsage, 10) : 0);
      setAppState(AppState.UPLOAD);
    }
  }, []);

  const handleLogin = useCallback((session: AuthSession) => {
    setCompanyInfo(session.company);
    const storedUsage = localStorage.getItem(`shunnei_usage_${session.company.id}`);
    setUsageCount(storedUsage ? parseInt(storedUsage, 10) : 0);
    setAppState(AppState.UPLOAD);
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

  const handleStartCrop = useCallback(() => {
    setAppState(AppState.CROPPING);
  }, []);

  const executeLogout = useCallback(() => {
    authService.logout();
    setCompanyInfo(null);
    setCurrentImage(null);
    setOriginalImage(null);
    setUploadedImage(null);
    setAppState(AppState.LOGIN);
    setIsLogoutConfirmOpen(false);
  }, []);

  const handleEditAction = useCallback(async (action: EditAction, customPrompt?: string) => {
    if (!originalImage) return;

    let nextBg = appliedBg;
    let nextClothing = appliedClothing;

    const isBgAction = action.startsWith('REMOVE_BG_');
    const isClothingAction = [
      EditAction.SUIT_MENS, EditAction.SUIT_WOMENS, 
      EditAction.KIMONO_MENS, EditAction.KIMONO_WOMENS
    ].includes(action);

    if (isBgAction) nextBg = action;
    if (isClothingAction) nextClothing = action;

    setStatus({ 
      isProcessing: true, 
      message: '画像を生成しています。しばらくお待ちください。' 
    });

    try {
      const resultImage = await processImage(
        originalImage,
        nextBg || undefined, 
        nextClothing || undefined,
        customPrompt
      );

      setCurrentImage(resultImage);
      if (isBgAction) setAppliedBg(action);
      if (isClothingAction) setAppliedClothing(action);
      
    } catch (error: any) {
      console.error("Processing Error:", error);
      setErrorModal({
        isOpen: true,
        title: '画像生成に失敗しました',
        message: 'AI処理中にエラーが発生しました。別の写真でお試しいただくか、しばらく時間を置いてから再度実行してください。'
      });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  }, [originalImage, appliedBg, appliedClothing]);

  const handleDownload = useCallback(() => {
    if (!currentImage || !companyInfo) return;

    const limit = PLAN_LIMITS[companyInfo.plan];
    if (usageCount >= limit) {
      setIsLimitReachedOpen(true);
      return;
    }

    const filename = `瞬影_${new Date().getTime()}.png`;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const newCount = usageCount + 1;
    setUsageCount(newCount);
    localStorage.setItem(`shunnei_usage_${companyInfo.id}`, newCount.toString());
  }, [currentImage, usageCount, companyInfo]);

  return (
    <div className="h-screen bg-memorial-100 text-gray-800 font-serif flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm border-b border-memorial-200 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo />
          {companyInfo && (
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end mr-4">
                  <div className="text-sm font-bold text-gray-800">{companyInfo.name} <span className="text-[10px] font-normal text-gray-400">様</span></div>
                  <div className="text-[9px] text-blue-600 font-sans tracking-widest uppercase">{companyInfo.plan} プラン適用中</div>
               </div>
               <button onClick={() => setIsLogoutConfirmOpen(true)} className="text-xs text-gray-400 hover:text-red-600 transition-colors font-sans underline">ログアウト</button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4 overflow-y-auto w-full relative">
        {appState === AppState.LOGIN && <LoginScreen onLogin={handleLogin} />}
        {appState === AppState.UPLOAD && (
          <div className="w-full max-w-4xl animate-fade-in my-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-medium mb-4 tracking-tight">大切な思い出を、永遠の一枚に</h2>
              <p className="text-gray-500 text-sm max-w-lg mx-auto">お手持ちの写真から、遺影にふさわしい背景の変更や服装の着せ替えを行えます。</p>
            </div>
            <UploadArea onImageSelected={handleImageSelected} />
          </div>
        )}
        {appState === AppState.CROPPING && (currentImage || uploadedImage) && (
          <CropTool imageSrc={currentImage || (uploadedImage as string)} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
        )}
        {appState === AppState.EDITING && companyInfo && (
          <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-6 h-full max-h-[90vh]">
            <div className="md:col-span-8 lg:col-span-9 flex items-center justify-center bg-gray-200/50 rounded-2xl p-4 h-full relative">
              <PhotoCanvas imageSrc={currentImage} isLoading={status.isProcessing} loadingMessage={status.message} />
            </div>
            <div className="md:col-span-4 lg:col-span-3 flex flex-col h-full overflow-hidden">
              <ActionPanel 
                onAction={handleEditAction} disabled={status.isProcessing} onDownload={handleDownload}
                onReset={() => setIsResetConfirmOpen(true)} onStartCrop={handleStartCrop}
                appliedBg={appliedBg} appliedClothing={appliedClothing}
                userPlan={companyInfo.plan} usageCount={usageCount}
              />
            </div>
          </div>
        )}
      </main>

      {appState !== AppState.LOGIN && (
        <footer className="bg-white border-t border-gray-100 py-3 text-center text-gray-400 text-[10px] shrink-0 font-sans tracking-widest">
          <p>&copy; {new Date().getFullYear()} 瞬影-SHUNNEI- | 加盟店専用ポータル</p>
        </footer>
      )}

      {/* Modals */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{errorModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6 whitespace-pre-line">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg">閉じる</button>
          </div>
        </div>
      )}

      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">作業を中断しますか？</h3>
            <p className="text-sm text-gray-500 mb-6">現在の加工内容は破棄されます。</p>
            <div className="flex gap-3">
              <button onClick={() => setIsResetConfirmOpen(false)} className="flex-1 py-2 text-gray-600 font-bold">キャンセル</button>
              <button onClick={() => { setAppState(AppState.UPLOAD); setIsResetConfirmOpen(false); }} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg">中断する</button>
            </div>
          </div>
        </div>
      )}

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">ログアウトしますか？</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setIsLogoutConfirmOpen(false)} className="flex-1 py-2 text-gray-600 font-bold">キャンセル</button>
              <button onClick={executeLogout} className="flex-1 py-2 bg-gray-800 text-white font-bold rounded-lg">ログアウト</button>
            </div>
          </div>
        </div>
      )}

      {isLimitReachedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-red-600 mb-2">作成上限に達しました</h3>
            <p className="text-sm text-gray-500 mb-6">今月の作成可能枚数を超えています。本部にプランの相談を行ってください。</p>
            <button onClick={() => setIsLimitReachedOpen(false)} className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
