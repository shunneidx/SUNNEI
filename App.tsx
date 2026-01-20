
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

    setStatus({ isProcessing: true, message: '画像を生成しています。' });
    try {
      const resultImage = await processImage(originalImage, nextBg || undefined, nextClothing || undefined, customPrompt);
      setCurrentImage(resultImage);
      if (isBgAction) setAppliedBg(action);
      if (isClothingAction) setAppliedClothing(action);
    } catch (error: any) {
      setErrorModal({ isOpen: true, title: '失敗', message: 'エラーが発生しました。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  }, [originalImage, appliedBg, appliedClothing]);

  const handleDownload = useCallback(async () => {
    if (!currentImage || !companyInfo) return;
    const limit = PLAN_LIMITS[companyInfo.plan];
    if (usageCount >= limit) {
      setIsLimitReachedOpen(true);
      return;
    }
    try {
      const newCount = await usageService.incrementUsage(companyInfo.id);
      setUsageCount(newCount);
      const link = document.createElement('a');
      link.href = currentImage;
      link.download = `瞬影_${new Date().getTime()}.png`;
      link.click();
    } catch (err) { alert('保存失敗'); }
  }, [currentImage, usageCount, companyInfo]);

  return (
    <div className="h-screen bg-memorial-100 text-gray-800 font-serif flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm border-b border-memorial-200 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo />
          {companyInfo && (
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end mr-4">
                  <div className="text-sm font-bold">{companyInfo.name}</div>
                  <div className="text-[9px] text-blue-600 font-sans tracking-widest uppercase">{isAdminMode ? 'System Admin' : companyInfo.plan}</div>
               </div>
               <button onClick={() => setIsLogoutConfirmOpen(true)} className="text-xs text-gray-400 hover:text-red-600 underline cursor-pointer">ログアウト</button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center overflow-y-auto w-full relative">
        {appState === AppState.LOGIN ? <LoginScreen onLogin={handleLogin} /> : (
          isAdminMode ? <ManagementDashboard /> : (
            <>
              {appState === AppState.UPLOAD && (
                <div className="w-full max-w-4xl animate-fade-in my-auto p-4">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-medium mb-4">大切な思い出を、永遠の一枚に</h2>
                    <UploadArea onImageSelected={handleImageSelected} />
                  </div>
                </div>
              )}
              {appState === AppState.CROPPING && <CropTool imageSrc={currentImage || uploadedImage!} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}
              {appState === AppState.EDITING && companyInfo && (
                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-4 p-4 h-full max-h-[90vh]">
                  {/* 比率を md:col-span-8 から md:col-span-7 に変更して右側のスペースを広げる */}
                  <div className="md:col-span-7 lg:col-span-8 flex items-center justify-center bg-gray-200/50 rounded-2xl p-4 overflow-hidden">
                    <PhotoCanvas imageSrc={currentImage} isLoading={status.isProcessing} loadingMessage={status.message} />
                  </div>
                  {/* パネル側を md:col-span-5 に広げる */}
                  <div className="md:col-span-5 lg:col-span-4 h-full overflow-hidden">
                    <ActionPanel 
                      onAction={handleEditAction} disabled={status.isProcessing} onDownload={handleDownload}
                      onReset={() => setAppState(AppState.UPLOAD)} onStartCrop={() => setAppState(AppState.CROPPING)}
                      appliedBg={appliedBg} appliedClothing={appliedClothing} userPlan={companyInfo.plan} usageCount={usageCount}
                    />
                  </div>
                </div>
              )}
            </>
          )
        )}
      </main>

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold mb-4">ログアウトしますか？</h3>
            <div className="flex gap-3">
              <button onClick={() => setIsLogoutConfirmOpen(false)} className="flex-1 py-2 text-gray-600 font-bold">キャンセル</button>
              <button onClick={executeLogout} className="flex-1 py-2 bg-gray-800 text-white font-bold rounded-lg">ログアウト</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
