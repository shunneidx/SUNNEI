
import React, { useState, useEffect } from 'react';
import { EditAction, UserPlan, PLAN_LIMITS } from '../types';

interface ActionPanelProps {
  onAction: (action: EditAction, customPrompt?: string) => void;
  disabled: boolean;
  onDownload: () => void;
  onReset: () => void;
  onStartCrop: () => void;
  appliedBg: EditAction | null;
  appliedClothing: EditAction | null;
  userPlan: UserPlan;
  usageCount: number;
}

const ClothingThumbnail = ({ 
  type, 
  gender, 
  color = "bg-gray-900", 
  pattern = false 
}: { 
  type: 'suit' | 'kimono', 
  gender: 'mens' | 'womens', 
  color?: string,
  pattern?: boolean
}) => {
  return (
    <div className={`w-12 h-12 rounded-lg ${color} relative overflow-hidden shadow-inner flex items-center justify-center border border-white/10`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
      
      {type === 'suit' ? (
        <div className="relative w-full h-full flex flex-col items-center">
          <div className="absolute top-0 w-6 h-5 bg-white clip-path-v-neck"></div>
          {gender === 'mens' && (
            <div className="absolute top-0 w-1.5 h-8 bg-gray-800 shadow-sm z-10"></div>
          )}
          <div className="absolute top-0 w-full h-full flex justify-between px-0.5">
            <div className="w-4 h-10 bg-inherit border-r border-white/10 -rotate-12 origin-top-left shadow-lg"></div>
            <div className="w-4 h-10 bg-inherit border-l border-white/10 rotate-12 origin-top-right shadow-lg"></div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center">
          <div className="absolute top-0 w-5 h-10 bg-white/90 rotate-[30deg] origin-top translate-x-[-1px]"></div>
          <div className="absolute top-0 w-5 h-10 bg-white/90 -rotate-[30deg] origin-top translate-x-[1px]"></div>
          <div className="absolute top-0 w-7 h-14 bg-inherit border-r border-white/5 rotate-[30deg] origin-top translate-x-[-3px] shadow-sm"></div>
          <div className="absolute top-0 w-7 h-14 bg-inherit border-l border-white/5 -rotate-[30deg] origin-top translate-x-[3px] shadow-md"></div>
        </div>
      )}
      <style>{`
        .clip-path-v-neck {
          clip-path: polygon(0 0, 100% 0, 50% 100%);
        }
      `}</style>
    </div>
  );
};

const ActionPanel: React.FC<ActionPanelProps> = ({ 
  onAction, 
  disabled, 
  onDownload, 
  onReset, 
  onStartCrop,
  appliedBg,
  appliedClothing,
  userPlan,
  usageCount
}) => {
  const [selectedBg, setSelectedBg] = useState<EditAction | "">("");
  const [selectedClothing, setSelectedClothing] = useState<EditAction | "">("");
  const [clothingTab, setClothingTab] = useState<'mens' | 'womens'>('mens');
  
  useEffect(() => {
    if (appliedBg) setSelectedBg(appliedBg);
    if (appliedClothing) setSelectedClothing(appliedClothing);
  }, [appliedBg, appliedClothing]);

  const handleBgAction = () => {
    if (selectedBg) onAction(selectedBg as EditAction);
  };

  const handleClothingAction = () => {
    if (selectedClothing) onAction(selectedClothing as EditAction);
  };

  const isBgPending = selectedBg !== "" && selectedBg !== appliedBg;
  const isClothingPending = selectedClothing !== "" && selectedClothing !== appliedClothing;

  const limit = PLAN_LIMITS[userPlan];
  const remaining = limit === Infinity ? '無制限' : Math.max(0, limit - usageCount);

  return (
    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-y-auto font-sans">
      
      <div className="flex items-center justify-between mb-4">
        <button 
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-800 transition-colors text-xs font-bold group cursor-pointer"
        >
          <div className="p-1 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
          </div>
          戻る
        </button>

        <div className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 text-right min-w-[80px]">
          <p className="text-[8px] text-gray-400 font-sans tracking-widest uppercase mb-0.5 leading-none">{userPlan}プラン</p>
          <p className="text-[10px] font-sans font-bold text-gray-700 leading-none">
            残り: {remaining}{typeof remaining === 'number' && '枚'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-5">
        
        {/* Section 1: Background */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[9px] font-bold">1</div>
            <h3 className="font-bold text-gray-800 text-xs">背景を選択</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { 
                action: EditAction.REMOVE_BG_BLUE, 
                label: 'ブルー', 
                style: { background: 'radial-gradient(circle at center, #ffffff 0%, #bfdbfe 100%)' } 
              },
              { 
                action: EditAction.REMOVE_BG_GRAY, 
                label: 'グレー', 
                style: { background: 'radial-gradient(circle at center, #ffffff 0%, #d1d5db 100%)' } 
              },
              { 
                action: EditAction.REMOVE_BG_PINK, 
                label: 'ピンク', 
                style: { background: 'radial-gradient(circle at center, #ffffff 0%, #fbcfe8 100%)' } 
              },
              { 
                action: EditAction.REMOVE_BG_YELLOW, 
                label: 'イエロー', 
                style: { background: 'radial-gradient(circle at center, #ffffff 0%, #fef3c7 100%)' } 
              },
              { 
                action: EditAction.REMOVE_BG_PURPLE, 
                label: 'パープル', 
                style: { background: 'radial-gradient(circle at center, #ffffff 0%, #e9d5ff 100%)' } 
              },
              { 
                action: EditAction.REMOVE_BG_WHITE, 
                label: 'ホワイト', 
                style: { background: '#ffffff' } 
              }
            ].map((item) => (
              <button 
                key={item.action}
                type="button" 
                onClick={() => setSelectedBg(item.action)} 
                className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${
                  selectedBg === item.action 
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-md' 
                  : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div 
                  className={`w-10 h-10 rounded-full shadow-inner border border-gray-100`}
                  style={item.style}
                ></div>
                <span className="font-bold text-[11px] whitespace-nowrap">{item.label}</span>
                {appliedBg === item.action && (
                  <div className="absolute top-1.5 right-1.5 flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={handleBgAction}
            disabled={disabled || !isBgPending}
            className={`w-full py-2.5 font-bold rounded-lg transition-colors text-xs ${
              isBgPending ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isBgPending ? 'この背景を適用する' : '背景適用済み'}
          </button>
        </div>

        {/* Section 2: Clothing */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[9px] font-bold">2</div>
            <h3 className="font-bold text-gray-800 text-xs">服装を選択</h3>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-gray-100 p-0.5 rounded-lg flex gap-0.5">
              <button
                type="button"
                onClick={() => setClothingTab('mens')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  clothingTab === 'mens' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                男性用
              </button>
              <button
                type="button"
                onClick={() => setClothingTab('womens')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  clothingTab === 'womens' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                女性用
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {clothingTab === 'mens' ? (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_MENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.SUIT_MENS ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="suit" gender="mens" color="bg-gray-800" />
                    <span className="font-bold text-[10px] whitespace-nowrap">礼服（洋装）</span>
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_MENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.KIMONO_MENS ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="kimono" gender="mens" color="bg-gray-900" />
                    <span className="font-bold text-[10px] whitespace-nowrap">紋付袴（和装）</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_WOMENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.SUIT_WOMENS ? 'border-rose-500 bg-rose-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="suit" gender="womens" color="bg-gray-900" />
                    <span className="font-bold text-[10px] whitespace-nowrap">ブラックフォーマル</span>
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_WOMENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.KIMONO_WOMENS ? 'border-rose-500 bg-rose-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="kimono" gender="womens" color="bg-gray-950" />
                    <span className="font-bold text-[10px] whitespace-nowrap">黒喪服（和装）</span>
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleClothingAction}
              disabled={disabled || !isClothingPending}
              className={`w-full py-2.5 font-bold rounded-lg transition-colors text-xs shadow-sm ${
                isClothingPending 
                  ? (clothingTab === 'mens' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-rose-500 text-white hover:bg-rose-600') 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isClothingPending ? '服装を着せ替える' : '服装適用済み'}
            </button>
          </div>
        </div>

        {/* Section 3: Final Adjustments */}
        <div className="pt-4 mt-auto border-t border-gray-100 space-y-2.5">
          <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">出力・調整</p>
          <button
            onClick={onStartCrop}
            disabled={disabled}
            className="w-full py-2.5 bg-white text-gray-700 border border-gray-300 font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[11px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            トリミングを微調整する
          </button>
          <button
            onClick={onDownload}
            disabled={disabled}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            高画質で画像を保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
