
import React, { useState, useEffect } from 'react';
import { EditAction, UserPlan, PLAN_LIMITS } from '../types';

interface ActionPanelProps {
  onAction: (action: EditAction | null, customPrompt?: string) => void;
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
  isNone = false
}: { 
  type: 'suit' | 'kimono' | 'none', 
  gender?: 'mens' | 'womens', 
  color?: string,
  isNone?: boolean
}) => {
  if (isNone) {
    return (
      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 17.772 17.772m0 0a10.446 10.446 0 0 1-2.863.395m2.863-.395a10.704 10.704 0 0 1-3.235-3.235" />
        </svg>
      </div>
    );
  }
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
  // selectedBg/Clothing が "" の場合は「未選択」状態。null を明示的に「元のまま」として扱う。
  const [selectedBg, setSelectedBg] = useState<EditAction | null | "">("");
  const [selectedClothing, setSelectedClothing] = useState<EditAction | null | "">("");
  const [clothingTab, setClothingTab] = useState<'mens' | 'womens'>('mens');
  
  useEffect(() => {
    setSelectedBg(appliedBg);
    setSelectedClothing(appliedClothing);
  }, [appliedBg, appliedClothing]);

  const handleBgAction = () => {
    if (selectedBg !== "") onAction(selectedBg);
  };

  const handleClothingAction = () => {
    if (selectedClothing !== "") onAction(selectedClothing);
  };

  const isBgPending = selectedBg !== "" && selectedBg !== appliedBg;
  const isClothingPending = selectedClothing !== "" && selectedClothing !== appliedClothing;

  const limit = PLAN_LIMITS[userPlan];
  const remaining = limit === Infinity ? '無制限' : Math.max(0, limit - usageCount);

  const bgItems = [
    { 
      action: null, 
      label: '元のまま', 
      style: { background: 'white' },
      isNone: true,
      borderClass: 'border-gray-200',
      selectedClass: 'border-gray-900 bg-gray-50 text-gray-900',
      hoverClass: 'hover:border-gray-400'
    },
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

  const getBgButtonLabel = () => {
    if (selectedBg === "") return "背景を選択してください";
    if (isBgPending) return "背景変更を確定する";
    return "背景適用済み";
  };

  const getClothingButtonLabel = () => {
    if (selectedClothing === "") return "服装を選択してください";
    if (isClothingPending) return "服装着せ替えを実行";
    return "服装適用済み";
  };

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
        </div>

        {/* Section 1: Background */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[11px] font-bold">1</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">背景を選択</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bgItems.map((item) => (
              <button 
                key={String(item.action)}
                type="button" 
                onClick={() => setSelectedBg(item.action)} 
                className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 ${
                  selectedBg === item.action 
                  ? `${item.selectedClass} shadow-md` 
                  : `bg-white text-gray-600 ${item.borderClass} ${item.hoverClass} hover:shadow-sm`
                }`}
              >
                {item.isNone ? (
                  <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 17.772 17.772m0 0a10.446 10.446 0 0 1-2.863.395m2.863-.395a10.704 10.704 0 0 1-3.235-3.235" />
                    </svg>
                  </div>
                ) : (
                  <div 
                    className={`w-10 h-10 rounded-full shadow-inner border border-black/5 transition-transform duration-300 ${selectedBg === item.action ? 'scale-110 shadow-lg' : ''}`}
                    style={item.style}
                  ></div>
                )}
                <span className="font-bold text-[11px] whitespace-nowrap">{item.label}</span>
                {appliedBg === item.action && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>
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
            {getBgButtonLabel()}
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

            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setSelectedClothing(null)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 ${selectedClothing === null ? 'border-gray-900 bg-gray-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                <ClothingThumbnail type="none" isNone={true} />
                <span className="font-bold text-[11px] whitespace-nowrap text-gray-500">元のまま</span>
                {appliedClothing === null && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>
                  </div>
                )}
              </button>
              
              {clothingTab === 'mens' ? (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_MENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 ${selectedClothing === EditAction.SUIT_MENS ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="suit" gender="mens" color="bg-gray-800" />
                    <span className="font-bold text-[11px] whitespace-nowrap">礼服スーツ</span>
                    {appliedClothing === EditAction.SUIT_MENS && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>
                      </div>
                    )}
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_MENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 ${selectedClothing === EditAction.KIMONO_MENS ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                    <ClothingThumbnail type="kimono" gender="mens" color="bg-gray-900" />
                    <span className="font-bold text-[11px] whitespace-nowrap">和装</span>
                    {appliedClothing === EditAction.KIMONO_MENS && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>
                      </div>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectedClothing(EditAction.SUIT_WOMENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 ${selectedClothing === EditAction.SUIT_WOMENS ? 'border-rose-500 bg-rose-50 shadow-md' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="suit" gender="womens" color="bg-gray-900" />
                    <span className="font-bold text-[11px] whitespace-nowrap">洋装</span>
                    {appliedClothing === EditAction.SUIT_WOMENS && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>
                      </div>
                    )}
                  </button>
                  <button onClick={() => setSelectedClothing(EditAction.KIMONO_WOMENS)} className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 ${selectedClothing === EditAction.KIMONO_WOMENS ? 'border-rose-500 bg-rose-50 shadow-md' : 'border-gray-100 bg-white hover:border-rose-200'}`}>
                    <ClothingThumbnail type="kimono" gender="womens" color="bg-gray-950" />
                    <span className="font-bold text-[11px] whitespace-nowrap">和装</span>
                    {appliedClothing === EditAction.KIMONO_WOMENS && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>
                      </div>
                    )}
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
              {getClothingButtonLabel()}
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
