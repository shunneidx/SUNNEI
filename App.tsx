
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
import { drawMemorialPhoto } from './services/renderService';

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
  
  const [originalCropped, setOriginalCropped] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
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

  const handleCropConfirm = useCallback((croppedImage: string) => {
    setOriginalCropped(croppedImage);
    setAppState(AppState.EDITING);
    setPersonImage(null);
    setAppliedBg(null);
    setAppliedClothing(null);
  }, []);

  const handleCropCancel = useCallback(() => {
    setAppState(originalCropped ? AppState.EDITING : AppState.UPLOAD);
  }, [originalCropped]);

  const handleEditAction = useCallback(async (action: EditAction | null) => {
    if (!originalCropped) return;
    const isBgAction = action === null || action.startsWith('REMOVE_BG_');

    if (action === null) {
      if (isBgAction) setAppliedBg(null);
      else {
        setAppliedClothing(null);
        if (appliedBg) {
          setStatus({ isProcessing: true, message: '元の服装の人物を再抽出しています...' });
          try {
            const extracted = await extractPerson(originalCropped);
            setPersonImage(extracted);
          } catch (e) {
            setErrorModal({ isOpen: true, title: '復元エラー', message: '画像の処理に失敗しました。' });
          } finally {
            setStatus({ isProcessing: false, message: '' });
          }
        } else {
          setPersonImage(null);
        }
      }
      return;
    }

    if (!personImage) {
      setStatus({ isProcessing: true, message: '初回のみ、人物を高品質に切り抜いています...' });
      try {
        const extracted = await extractPerson(originalCropped);
        setPersonImage(extracted);
      } catch (error: any) {
        setErrorModal({ 
          isOpen: true, 
          title: '解析エラー', 
          message: '人物の抽出に失敗しました。別の写真でお試しください。' 
        });
        setStatus({ isProcessing: false, message: '' });
        return;
      }
    }

    if (isBgAction) {
      setAppliedBg(action);
      setStatus({ isProcessing: false, message: '' });
    } else {
      setStatus({ isProcessing: true, message: '服装を着せ替え中です...' });
      try {
        const newPerson = await changeClothing(originalCropped, action);
        setPersonImage(newPerson);
        setAppliedClothing(action);
      } catch (error: any) {
        setErrorModal({ isOpen: true, title: '着せ替え失敗', message: '服装の生成に失敗しました。' });
      } finally {
        setStatus({ isProcessing: false, message: '' });
      }
    }
  }, [originalCropped, personImage, appliedBg, appliedClothing]);

  /**
   * 画像の保存処理
   * プレビューと同じ描画関数(drawMemorialPhoto)を使い、高解像度で出力する
   */
  const handleDownload = useCallback(async () => {
    if (!originalCropped || !companyInfo) return;
    
    setStatus({ isProcessing: true, message: '最高画質(3000x3600)で画像を合成中...' });

    try {
      const canvas = document.createElement('canvas');
      // 遺影標準：四つ切り（254x305mm）を300dpiで作成する場合のピクセル数
      const width = 3000;
      const height = 3600;

      await drawMemorialPhoto({
        canvas,
        originalCropped,
        personImage,
        appliedBg,
        width,
        height,
        isHighRes: true
      });

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
      console.error(err);
      setStatus({ isProcessing: false, message: '' });
      setErrorModal({ isOpen: true, title: '保存失敗', message: '画像の合成処理中にエラーが発生しました。' });
    }
  }, [originalCropped, personImage, appliedBg, companyInfo, deceasedName]);

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
