
import React, { useState, useEffect } from 'react';
import { UserPlan, PLAN_LIMITS } from '../types';

interface ClientData {
  id: string;
  name: string;
  plan: UserPlan;
  usage_count: number;
  contact_person: string;
  created_at: string;
}

const ManagementDashboard: React.FC = () => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    id: '',
    name: '',
    plan: UserPlan.STANDARD,
    contactPerson: '',
    password: 'password123' // 初期パスワード
  });

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/companies');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    } catch (e) {
      return '不明';
    }
  };

  const handlePlanChange = async (id: string, newPlan: UserPlan) => {
    if (id === 'admin') return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/companies/${id}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan })
      });

      if (res.ok) {
        setClients(prev => prev.map(c => c.id === id ? { ...c, plan: newPlan } : c));
      } else {
        alert('プランの更新に失敗しました。');
      }
    } catch (error) {
      alert('通信エラーが発生しました。');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const msgUint8 = new TextEncoder().encode(newClientForm.password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newClientForm.id,
          name: newClientForm.name,
          plan: newClientForm.plan,
          contactPerson: newClientForm.contactPerson,
          passwordHash
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewClientForm({ id: '', name: '', plan: UserPlan.STANDARD, contactPerson: '', password: 'password123' });
        fetchClients();
      } else {
        alert('登録に失敗しました。IDが重複している可能性があります。');
      }
    } catch (error) {
      alert('通信エラーが発生しました。');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (id === 'admin') return alert('管理者は削除できません。');
    if (!window.confirm('この加盟店を削除しますか？データは復旧できません。')) return;

    try {
      const res = await fetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
      if (res.ok) fetchClients();
    } catch (error) {
      alert('削除に失敗しました。');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.includes(searchQuery) || c.id.includes(searchQuery)
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in bg-gray-50/50 min-h-full font-sans text-gray-800">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-3">
            <span className="bg-gray-800 text-white w-8 h-8 rounded flex items-center justify-center text-sm font-serif">瞬</span>
            管理ダッシュボード
          </h2>
          <p className="text-sm text-gray-500 mt-1">加盟店データベース・利用状況監視</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          新規加盟店登録
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase">全作成数</p>
          <p className="text-3xl font-bold mt-1">{clients.reduce((acc, c) => acc + c.usage_count, 0)} <span className="text-sm font-normal text-gray-400">枚</span></p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase">稼働社数</p>
          <p className="text-3xl font-bold mt-1">{clients.length} <span className="text-sm font-normal text-gray-400">社</span></p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xl font-bold">システム稼働中</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold">加盟店一覧</h3>
          <div className="flex flex-wrap items-center gap-4 justify-end">
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">※ プルダウンからプランを直接変更できます</span>
            <input 
              type="text" placeholder="検索..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none w-full sm:w-64 bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading && clients.length === 0 ? (
            <div className="py-20 text-center text-gray-400">読込中...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">ID / 名前</th>
                  <th className="px-6 py-3">契約開始</th>
                  <th className="px-6 py-3">プラン / 担当者</th>
                  <th className="px-6 py-3">利用状況</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredClients.map(client => {
                  const limit = PLAN_LIMITS[client.plan as UserPlan];
                  const percent = limit === Infinity ? 0 : (client.usage_count / limit) * 100;
                  const isUpdating = updatingId === client.id;

                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-gray-400">ID: {client.id}</div>
                        <div className="font-bold">{client.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 font-medium">{formatDate(client.created_at)}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">登録済</div>
                      </td>
                      <td className="px-6 py-4">
                        {client.id === 'admin' ? (
                          <div className="text-blue-600 font-bold text-xs">{client.plan}</div>
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={client.plan}
                              onChange={(e) => handlePlanChange(client.id, e.target.value as UserPlan)}
                              disabled={isUpdating}
                              className={`appearance-none bg-white border border-gray-200 text-blue-600 font-bold text-xs rounded-lg pl-2 pr-8 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer disabled:opacity-50 ${isUpdating ? 'animate-pulse' : ''}`}
                            >
                              <option value={UserPlan.LITE}>ライト</option>
                              <option value={UserPlan.STANDARD}>スタンダード</option>
                              <option value={UserPlan.ENTERPRISE}>エンタープライズ</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-blue-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="text-gray-500 mt-1 text-xs">{client.contact_person}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="font-bold">{client.usage_count} <span className="text-gray-400 font-normal">/ {limit === Infinity ? '∞' : limit}</span></span>
                          {limit !== Infinity && <span className={percent > 90 ? 'text-red-500 font-bold' : 'text-gray-400'}>{Math.round(percent)}%</span>}
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${percent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {client.id !== 'admin' && (
                          <button onClick={() => handleDeleteClient(client.id)} className="text-gray-300 hover:text-red-600 transition-colors cursor-pointer p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-gray-800 p-4 text-white font-bold flex justify-between">
              新規加盟店登録
              <button onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleRegisterClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">加盟店ID (英数字)</label>
                <input required type="text" value={newClientForm.id} onChange={e => setNewClientForm({...newClientForm, id: e.target.value})} className="w-full px-3 py-2 border rounded" placeholder="shop01" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">加盟店名</label>
                <input required type="text" value={newClientForm.name} onChange={e => setNewClientForm({...newClientForm, name: e.target.value})} className="w-full px-3 py-2 border rounded" placeholder="瞬影葬儀社" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">契約プラン</label>
                <select value={newClientForm.plan} onChange={e => setNewClientForm({...newClientForm, plan: e.target.value as UserPlan})} className="w-full px-3 py-2 border rounded bg-white">
                  <option value={UserPlan.LITE}>ライト (60枚)</option>
                  <option value={UserPlan.STANDARD}>スタンダード (200枚)</option>
                  <option value={UserPlan.ENTERPRISE}>エンタープライズ (無制限)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">担当者名</label>
                <input required type="text" value={newClientForm.contactPerson} onChange={e => setNewClientForm({...newClientForm, contactPerson: e.target.value})} className="w-full px-3 py-2 border rounded" placeholder="山田 太郎" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">初期パスワード</label>
                <input required type="text" value={newClientForm.password} onChange={e => setNewClientForm({...newClientForm, password: e.target.value})} className="w-full px-3 py-2 border rounded" />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded shadow-lg active:scale-95 transition-all cursor-pointer">登録を実行する</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementDashboard;
