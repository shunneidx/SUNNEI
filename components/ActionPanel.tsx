
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
  deceasedName: string;
  onDeceasedNameChange: (name: string) => void;
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
          <div className="absolute top-0 w-full h-full flex justify-between px-0.5">
            <div className="w-5 h-12 bg-inherit border-r border-white/10 -rotate-12 origin-top-left shadow-lg"></div>
            <div className="w-5 h-12 bg-inherit border-l border-white/10 rotate-12 origin-top-right shadow-lg"></div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center">
          <div className="absolute top-0 w-6 h-12 bg-white/90 rotate-[30deg] origin-top translate-x-[-1px]"></div>
          <div className="absolute top-0 w-6 h-12 bg-white/90 -rotate-[30deg] origin-top translate-x-[1px]"></div>
          <div className="absolute top-0 w-8 h-16 bg-inherit border-r border-white/5 rotate-[30deg] origin-top translate-x-[-3px] shadow-sm"></div>
          <div className="absolute top-0 w-8 h-16 bg-inherit border-l border-white/5 -rotate-[30deg] origin-top translate-x-[3px] shadow-md"></div>
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
  usageCount,
  deceasedName,
  onDeceasedNameChange
}) => {
  const [selectedBg, setSelectedBg] = useState<EditAction | "">("");
  const [selectedClothing, setSelectedClothing] = useState<EditAction | "">("");
  const [clothingTab, setClothingTab] = useState<'mens' | 'womens'>('mens');
  
  // 親からの適用状態が変わった際（リセット含む）に、UI側の選択状態を同期させる
  useEffect(() => {
    setSelectedBg(appliedBg || "");
    setSelectedClothing(appliedClothing || "");
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

  const bgItems = [
    { 
      action: EditAction.REMOVE_BG_BLUE, 
      label: 'ブルー', 
      style: { background: 'radial-gradient(circle at center, #ffffff 0%, #bfdbfe 100%)' },
      borderClass: 'border-blue-100',
      selectedClass: 'border-blue-600 bg-blue-50 text-blue-800',
      hoverClass: 'hover:border-blue-300'
    },
    { 
      action: EditAction.REMOVE_BG_GRAY, 
      label: 'グレー', 
      style: { background: 'radial-gradient(circle at center, #ffffff 0%, #d1d5db 100%)' },
      borderClass: 'border-gray-200',
      selectedClass: 'border-gray-600 bg-gray-50 text-gray-800',
      hoverClass: 'hover:border-gray-400'
    },
    { 
      action: EditAction.REMOVE_BG_PINK, 
      label: 'ピンク', 
      style: { background: 'radial-gradient(circle at center, #ffffff 0%, #fbcfe8 100%)' },
      borderClass: 'border-pink-100',
      selectedClass: 'border-pink-600 bg-pink-50 text-pink-800',
      hoverClass: 'hover:border-pink-300'
    },
    { 
      action: EditAction.REMOVE_BG_YELLOW, 
      label: 'イエロー', 
      style: { background: 'radial-gradient(circle at center, #ffffff 0%, #fef3c7 100%)' },
      borderClass: 'border-amber-100',
      selectedClass: 'border-amber-600 bg-amber-50 text-amber-800',
      hoverClass: 'hover:border-amber-300'
    },
    { 
      action: EditAction.REMOVE_BG_PURPLE, 
      label: 'パープル', 
      style: { background: 'radial-gradient(circle at center, #ffffff 0%, #e9d5ff 100%)' },
      borderClass: 'border-purple-100',
      selectedClass: 'border-purple-600 bg-purple-50 text-purple-800',
      hoverClass: 'hover:border-purple-300'
    },
    { 
      action: EditAction.REMOVE_BG_WHITE, 
      label: 'ホワイト', 
      style: { background: '#ffffff' },
      borderClass: 'border-gray-200',
      selectedClass: 'border-gray-900 bg-gray-50 text-gray-900',
      hoverClass: 'hover:border-gray-400'
    }
  ];

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-y-auto font-sans">
      
      <div className="flex items-center justify-between mb-6">
        <button 
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-800 transition-colors text-sm font-bold group cursor-pointer"
        >
          <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
          </div>
          戻る
        </button>

        <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-right min-w-[90px]">
          <p className="text-[10px] text-gray-400 font-sans tracking-widest uppercase mb-0.5 leading-none">{userPlan}プラン</p>
          <p className="text-[12px] font-sans font-bold text-gray-700 leading-none">
            残り: {remaining}{typeof remaining === 'number' && '枚'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        
        {/* Step 0: Deceased Name */}
        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <h3 className="font-bold text-blue-800 text-sm">故人様のお名前</h3>
          </div>
          <input 
            type="text" 
            value={deceasedName}
            onChange={(e) => onDeceasedNameChange(e.target.value)}
            placeholder="お名前を入力（ファイル名に反映）"
            className="w-full px-4 py-3 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all font-bold placeholder:font-normal placeholder:text-blue-300 shadow-inner"
          />
          <p className="text-[11px] text-blue-500 font-medium">※ ダウンロード時の取り違え防止のため、入力をご協力ください</p>
        </div>

        {/* Section 1: Background */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[11px] font-bold">1</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">背景を選択</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {bgItems.map((item) => (
              <button 
                key={item.action}
                type="button" 
                onClick={() => setSelectedBg(item.action)} 
                className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-32 ${
                  selectedBg === item.action 
                  ? `${item.selectedClass} shadow-md` 
                  : `bg-white text-gray-600 ${item.borderClass} ${item.hoverClass} hover:shadow-sm`
                }`}
              >
                <div 
                  className={`w-14 h-14 rounded-full shadow-inner border border-black/5 transition-transform duration-300 ${selectedBg === item.action ? 'scale-110 shadow-lg' : ''}`}
                  style={item.style}
                ></div>
                <span className="font-bold text-[13px] whitespace-nowrap">{item.label}</span>
                {appliedBg === item.action && (
                  <div className="absolute top-2.5 right-2.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={handleBgAction}
            disabled={disabled || !isBgPending}
            className={`w-full py-4 font-bold rounded-lg transition-all text-sm shadow-sm active:scale-[0.98] ${
              isBgPending ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isBgPending ? '背景変更を確定する' : '背景適用済み'}
          </button>
        </div>

        {/* Section 2: Clothing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[11px] font-bold">2</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">服装を選択</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-100 p-0.5 rounded-lg flex gap-1">
              <button
                type="button"
                onClick={() => setClothingTab('mens')}
                className={`flex-1 py-3 text-xs font-bold rounded-md transition-all ${
                  clothingTab === 'mens' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                男性用
              </button>
              <button
                type="button"
                onClick={() => setClothingTab('womens')}
                className={`flex-1 py-3 text-xs font-bold rounded-md transition-all ${
                  clothingTab === 'womens' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                女性用
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {clothingTab === 'mens' ? (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_MENS)} className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-32 ${selectedClothing === EditAction.SUIT_MENS ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="suit" gender="mens" color="bg-gray-800" />
                    <span className="font-bold text-[12px] whitespace-nowrap">礼服(スーツ)</span>
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_MENS)} className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-32 ${selectedClothing === EditAction.KIMONO_MENS ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="kimono" gender="mens" color="bg-gray-900" />
                    <span className="font-bold text-[12px] whitespace-nowrap">和装</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_WOMENS)} className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-32 ${selectedClothing === EditAction.SUIT_WOMENS ? 'border-rose-500 bg-rose-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="suit" gender="womens" color="bg-gray-900" />
                    <span className="font-bold text-[12px] whitespace-nowrap">洋装</span>
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_WOMENS)} className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-32 ${selectedClothing === EditAction.KIMONO_WOMENS ? 'border-rose-500 bg-rose-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="kimono" gender="womens" color="bg-gray-950" />
                    <span className="font-bold text-[12px] whitespace-nowrap">和装</span>
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleClothingAction}
              disabled={disabled || !isClothingPending}
              className={`w-full py-4 font-bold rounded-lg transition-all text-sm shadow-sm active:scale-[0.98] ${
                isClothingPending 
                  ? (clothingTab === 'mens' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-rose-500 text-white hover:bg-rose-600') 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isClothingPending ? '服装着せ替えを実行' : '服装適用済み'}
            </button>
          </div>
        </div>

        {/* Section 3: Final Adjustments */}
        <div className="pt-6 mt-auto border-t border-gray-100 space-y-3">
          <p className="text-[12px] text-center text-gray-400 font-bold uppercase tracking-widest mb-1">出力・調整</p>
          <button
            onClick={onStartCrop}
            disabled={disabled}
            className="w-full py-4 bg-white text-gray-700 border border-gray-300 font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[13px] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            トリミングを微調整
          </button>
          <button
            onClick={onDownload}
            disabled={disabled}
            className="w-full py-5 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            画像を保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
