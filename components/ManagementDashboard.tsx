import React, { useState, useEffect } from 'react';

interface ClientData {
  id: string;
  name: string;
  plan: 'ライト' | 'スタンダード' | 'エンタープライズ';
  lastActive: string;
  monthlyUsage: number;
  totalUsage: number;
  status: 'active' | 'inactive';
  contactPerson: string;
}

interface ActivityLog {
  id: number;
  time: string;
  client: string;
  action: string;
  type: 'create' | 'login' | 'upload' | 'alert';
}

const PLAN_LIMITS: Record<string, number> = {
  'ライト': 60,
  'スタンダード': 200,
  'エンタープライズ': Infinity,
};

const ManagementDashboard: React.FC = () => {
  // Production: Initialize with empty arrays and fetch from API
  const [clients, setClients] = useState<ClientData[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState<{
    name: string;
    plan: 'ライト' | 'スタンダード' | 'エンタープライズ';
    contactPerson: string;
  }>({
    name: '',
    plan: 'スタンダード',
    contactPerson: ''
  });

  /**
   * [Production Note]
   * Fetch actual data from backend DB
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Mocking an empty initial state for a clean production start
        setClients([]);
        setActivities([]);
      } catch (error) {
        console.error("Failed to fetch client data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtering Logic
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.includes(searchQuery) || client.id.includes(searchQuery);
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalMonthlyUsage = clients.reduce((acc, client) => acc + client.monthlyUsage, 0);

  // Handlers
  const handleExportCSV = () => {
    if (clients.length === 0) {
      alert("出力するデータがありません。");
      return;
    }
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name || !newClientForm.contactPerson) return;

    const newId = `C${String(clients.length + 1).padStart(3, '0')}`;
    const newClient: ClientData = {
      id: newId,
      name: newClientForm.name.endsWith('様') ? newClientForm.name : `${newClientForm.name} 様`,
      plan: newClientForm.plan,
      contactPerson: newClientForm.contactPerson,
      status: 'active',
      monthlyUsage: 0,
      totalUsage: 0,
      lastActive: '未アクセス',
    };

    setClients([newClient, ...clients]);
    setNewClientForm({ name: '', plan: 'スタンダード', contactPerson: '' });
    setIsModalOpen(false);
  };

  const handleDeleteClient = (id: string) => {
    if(window.confirm('この加盟店を削除してもよろしいですか？')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const handleEmergencyStop = () => {
    if (window.confirm("⚠ 警告：緊急停止モード\n\nただちに全加盟店のサービス利用を停止しますか？")) {
      alert("システム停止コマンドを送信しました。");
    }
  };

  const getProgressColor = (usage: number, limit: number) => {
    if (limit === Infinity) return 'bg-emerald-500';
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in bg-gray-50/50 min-h-full relative font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-3">
            <span className="bg-gray-800 text-white w-8 h-8 rounded flex items-center justify-center text-sm font-serif">瞬</span>
            管理ダッシュボード
          </h2>
          <p className="text-sm text-gray-500 mt-1 pl-11">Senior & Co. 本部専用・加盟店管理パネル</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-all"
          >
            レポート出力 (CSV)
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新規加盟店登録
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">今月の作成総数</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{totalMonthlyUsage}</span>
                <span className="text-sm text-gray-500">枚</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">登録加盟店数</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{clients.length}</span>
                <span className="text-sm text-gray-500">社</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">システム状態</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xl font-bold text-gray-800">正常</span>
              </div>
            </div>
          </div>

          {/* Client List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-gray-800">加盟店一覧</h3>
              
              <div className="flex gap-2">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="名前・IDで検索" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 absolute left-3 top-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">加盟店名</th>
                    <th className="px-6 py-3 font-medium">プラン / 担当者</th>
                    <th className="px-6 py-3 font-medium">利用状況</th>
                    <th className="px-6 py-3 font-medium text-center">状態</th>
                    <th className="px-6 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredClients.map((client) => {
                    const limit = PLAN_LIMITS[client.plan];
                    const usagePercent = limit === Infinity ? 0 : (client.monthlyUsage / limit) * 100;

                    return (
                      <tr key={client.id} className="bg-white hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4 font-bold text-gray-900">{client.name}</td>
                        <td className="px-6 py-4 text-xs">
                          <span className="font-bold text-blue-600 uppercase block mb-1">{client.plan}</span>
                          {client.contactPerson}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between mb-1 text-[10px]">
                            <span>{client.monthlyUsage} / {limit === Infinity ? '∞' : limit}</span>
                          </div>
                          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getProgressColor(client.monthlyUsage, limit)}`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {client.status === 'active' ? '稼働' : '停止'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-gray-300 hover:text-red-600 transition-colors p-1"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
             <h3 className="font-bold text-xs uppercase tracking-wider mb-4">活動履歴</h3>
             <div className="space-y-4">
               {activities.length === 0 ? (
                 <p className="text-xs text-gray-400 text-center py-4">履歴はありません</p>
               ) : (
                 activities.map(log => (
                   <div key={log.id} className="text-xs border-l-2 border-blue-500 pl-3">
                     <p className="font-bold text-gray-800">{log.client}</p>
                     <p className="text-gray-500">{log.action}</p>
                   </div>
                 ))
               )}
             </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 text-white">
            <h3 className="font-bold text-sm mb-4">緊急アクション</h3>
            <button 
              onClick={handleEmergencyStop}
              className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-xs font-bold transition-colors"
            >
              全サービス緊急停止
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">新規加盟店登録</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleRegisterClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">加盟店名</label>
                <input 
                  type="text" 
                  required
                  placeholder="例：株式会社メモリアル" 
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({...newClientForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">契約プラン</label>
                <select 
                  value={newClientForm.plan}
                  onChange={(e) => setNewClientForm({...newClientForm, plan: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="ライト">ライト (月60枚)</option>
                  <option value="スタンダード">スタンダード (月200枚)</option>
                  <option value="エンタープライズ">エンタープライズ (無制限)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">担当者名</label>
                <input 
                  type="text" 
                  required
                  placeholder="例：山田 太郎" 
                  value={newClientForm.contactPerson}
                  onChange={(e) => setNewClientForm({...newClientForm, contactPerson: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm">
                  登録完了
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementDashboard;