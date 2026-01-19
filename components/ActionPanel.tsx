
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
    <div className={`w-14 h-14 rounded-lg ${color} relative overflow-hidden shadow-inner flex items-center justify-center border border-white/10`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
      
      {type === 'suit' ? (
        <div className="relative w-full h-full flex flex-col items-center">
          <div className="absolute top-0 w-8 h-6 bg-white clip-path-v-neck"></div>
          {gender === 'mens' && (
            <div className="absolute top-0 w-2 h-10 bg-gray-800 shadow-sm z-10"></div>
          )}
          <div className="absolute top-0 w-full h-full flex justify-between px-1">
            <div className="w-5 h-12 bg-inherit border-r border-white/10 -rotate-12 origin-top-left shadow-lg"></div>
            <div className="w-5 h-12 bg-inherit border-l border-white/10 rotate-12 origin-top-right shadow-lg"></div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center">
          <div className="absolute top-0 w-6 h-12 bg-white/90 rotate-[30deg] origin-top translate-x-[-2px]"></div>
          <div className="absolute top-0 w-6 h-12 bg-white/90 -rotate-[30deg] origin-top translate-x-[2px]"></div>
          <div className="absolute top-0 w-8 h-16 bg-inherit border-r border-white/5 rotate-[30deg] origin-top translate-x-[-4px] shadow-sm"></div>
          <div className="absolute top-0 w-8 h-16 bg-inherit border-l border-white/5 -rotate-[30deg] origin-top translate-x-[4px] shadow-md"></div>
          {pattern ? (
            <div className="absolute bottom-2 right-2 w-4 h-4 opacity-30 text-white">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/></svg>
            </div>
          ) : null}
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-y-auto relative font-sans">
      
      <div className="flex items-center justify-between mb-4">
        <button 
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-800 transition-colors text-sm font-bold group cursor-pointer"
        >
          <div className="p-1 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
          </div>
          戻る
        </button>

        <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-right">
          <p className="text-[9px] text-gray-400 font-sans tracking-widest uppercase mb-1">{userPlan}プラン</p>
          <p className="text-xs font-sans font-bold text-gray-700 leading-none">
            残り: {remaining}{typeof remaining === 'number' && '枚'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        
        {/* Section 1: Background */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px] font-bold">1</div>
            <h3 className="font-bold text-gray-800 text-sm">背景を選択</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { action: EditAction.REMOVE_BG_BLUE, label: 'ブルー', color: 'from-blue-50 to-blue-200' },
              { action: EditAction.REMOVE_BG_GRAY, label: 'グレー', color: 'from-gray-200 to-gray-400' },
              { action: EditAction.REMOVE_BG_PINK, label: 'ピンク', color: 'from-pink-100 to-pink-200' },
              { action: EditAction.REMOVE_BG_YELLOW, label: 'イエロー', color: 'from-amber-100 to-amber-200' },
              { action: EditAction.REMOVE_BG_PURPLE, label: 'パープル', color: 'from-purple-100 to-purple-200' },
              { action: EditAction.REMOVE_BG_WHITE, label: 'ホワイト', color: 'bg-white border-gray-200' }
            ].map((item) => (
              <button 
                key={item.action}
                type="button" 
                onClick={() => setSelectedBg(item.action)} 
                className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-20 ${selectedBg === item.action ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'}`}
              >
                <div className={`w-6 h-6 rounded-full shadow-sm ${item.color.includes('from') ? `bg-gradient-to-br ${item.color}` : item.color}`}></div>
                <span className="font-bold text-[11px]">{item.label}</span>
                {appliedBg === item.action && <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></div>}
              </button>
            ))}
          </div>
          <button
            onClick={handleBgAction}
            disabled={disabled || !isBgPending}
            className={`w-full px-4 py-2 font-bold rounded-lg transition-colors text-sm ${
              isBgPending ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isBgPending ? '背景を変更する' : '適用済み'}
          </button>
        </div>

        {/* Section 2: Clothing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px] font-bold">2</div>
            <h3 className="font-bold text-gray-800 text-sm">服装を選択</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
              <button
                type="button"
                onClick={() => setClothingTab('mens')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  clothingTab === 'mens' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                男性
              </button>
              <button
                type="button"
                onClick={() => setClothingTab('womens')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  clothingTab === 'womens' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                女性
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {clothingTab === 'mens' ? (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_MENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.SUIT_MENS ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="suit" gender="mens" color="bg-gray-800" />
                    <span className="font-bold text-[10px]">礼服（スーツ）</span>
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_MENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.KIMONO_MENS ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="kimono" gender="mens" color="bg-gray-900" />
                    <span className="font-bold text-[10px]">和装</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_WOMENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.SUIT_WOMENS ? 'border-rose-500 bg-rose-50' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="suit" gender="womens" color="bg-gray-900" />
                    <span className="font-bold text-[10px]">洋装</span>
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_WOMENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 h-24 ${selectedClothing === EditAction.KIMONO_WOMENS ? 'border-rose-500 bg-rose-50' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="kimono" gender="womens" color="bg-gray-950" />
                    <span className="font-bold text-[10px]">和装</span>
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleClothingAction}
              disabled={disabled || !isClothingPending}
              className={`w-full px-4 py-2 font-bold rounded-lg transition-colors text-sm shadow-sm ${
                isClothingPending 
                  ? (clothingTab === 'mens' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-rose-500 text-white hover:bg-rose-600') 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isClothingPending ? '服装を変更する' : '適用済み'}
            </button>
          </div>
        </div>

        {/* Section 3: Final Adjustments */}
        <div className="pt-4 mt-auto border-t border-gray-100 space-y-3">
          <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">最終仕上げ</p>
          <button
            onClick={onStartCrop}
            disabled={disabled}
            className="w-full py-3 bg-white text-gray-700 border border-gray-300 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            仕上がりの調整（切り抜き）
          </button>
          <button
            onClick={onDownload}
            disabled={disabled}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            完成した画像を保存する
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
